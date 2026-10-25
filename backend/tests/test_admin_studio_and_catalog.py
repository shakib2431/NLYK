"""
NALAYAK ADMIN STUDIO & CATALOG INTEGRATION TEST SUITE
Tests:
1. Admin authentication & session security
2. Product & Variant CRUD operations
3. Real-time Inventory adjustments
4. Server-Authoritative Order Pricing (Tamper rejection & coupon validation)
5. Inventory decrement on order placement
6. Strict Razorpay Club Membership isolation
"""

import asyncio
import os
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from fastapi import HTTPException

import server
from catalog_db import catalog_store


def test_admin_authentication_and_sessions():
    """Verify admin login with master key, session generation, and rejection of invalid keys."""
    async def run():
        # Set dummy ADMIN_KEY for test
        with patch.dict(os.environ, {"ADMIN_KEY": "test-super-secret-key-2026"}):
            with patch.object(server, "ADMIN_KEY", "test-super-secret-key-2026"):
                # 1. Invalid key rejected
                from admin_catalog_routes import AdminLoginInput, admin_login, verify_admin
                with pytest.raises(HTTPException) as exc:
                    await admin_login(AdminLoginInput(key="wrong-key"))
                assert exc.value.status_code == 401

                # 2. Valid key accepted
                res = await admin_login(AdminLoginInput(key="test-super-secret-key-2026"))
                assert res["authenticated"] is True
                token = res["token"]
                assert token.startswith("nlyk_adm_")

                # 3. Session token authorizes admin requests
                admin_info = verify_admin(x_admin_session=token)
                assert admin_info["type"] == "session"

                # 4. Master key authorizes admin requests
                admin_master = verify_admin(x_admin_key="test-super-secret-key-2026")
                assert admin_master["type"] == "master_key"

                # 5. Invalid session token rejected
                with pytest.raises(HTTPException) as exc:
                    verify_admin(x_admin_session="fake_token_123")
                assert exc.value.status_code == 401

    asyncio.run(run())


def test_product_crud_and_duplication():
    """Verify adding, updating, duplicating, and archiving products."""
    admin_identity = "test_admin"

    # 1. Create product
    new_product_data = {
        "slug": "test-streetwear-tee",
        "name": "TEST STREETWEAR TEE",
        "price": 1499,
        "category": "tees",
        "stock": 30,
        "sizes": ["S", "M", "L"],
        "colors": [{"name": "BLACK", "hex": "#000000"}],
    }
    created = catalog_store.create_product(new_product_data, admin_identity=admin_identity)
    assert created["id"] is not None
    assert created["slug"] == "test-streetwear-tee"
    assert created["price"] == 1499
    assert len(created["variants"]) == 3  # S, M, L

    pid = created["id"]

    # 2. Update price and name
    updated = catalog_store.update_product(pid, {"price": 1699, "name": "UPDATED TEE"}, admin_identity=admin_identity)
    assert updated["price"] == 1699
    assert updated["name"] == "UPDATED TEE"

    # 3. Duplicate product
    cloned = catalog_store.duplicate_product(pid, admin_identity=admin_identity)
    assert cloned["status"] == "draft"
    assert "COPY" in cloned["name"]
    assert cloned["id"] != pid

    # 4. Archive product
    archived = catalog_store.delete_product(pid, permanent=False, admin_identity=admin_identity)
    assert archived is True
    assert catalog_store.get_product(pid)["status"] == "archived"

    # Clean up test products
    catalog_store.delete_product(pid, permanent=True, admin_identity=admin_identity)
    catalog_store.delete_product(cloned["id"], permanent=True, admin_identity=admin_identity)


def test_inventory_adjustment_and_atomic_decrement():
    """Verify inventory batch updates and stock decrement during order placement."""
    admin_identity = "test_admin"

    # Create temporary product with known stock
    test_prod = catalog_store.create_product({
        "slug": "test-inventory-hoodie",
        "name": "TEST HOODIE",
        "price": 2999,
        "sizes": ["M"],
        "colors": [{"name": "GREY", "hex": "#888888"}],
        "stock": 20,
    }, admin_identity=admin_identity)

    pid = test_prod["id"]
    sku = test_prod["variants"][0]["sku"]

    # 1. Update stock to 50 via batch inventory
    updated_count = catalog_store.update_inventory_batch([
        {"product_id": pid, "sku": sku, "stock": 50}
    ], admin_identity=admin_identity)
    assert updated_count == 1

    fetched = catalog_store.get_product(pid)
    assert fetched["stock"] == 50
    assert fetched["variants"][0]["stock"] == 50

    # 2. Decrement stock for order of 3 items
    adjusted = catalog_store.decrement_inventory_for_order([
        {"slug": "test-inventory-hoodie", "size": "M", "color": "GREY", "qty": 3}
    ])
    assert len(adjusted) == 1
    assert adjusted[0]["remaining"] == 47

    fetched_after = catalog_store.get_product(pid)
    assert fetched_after["stock"] == 47

    # Clean up
    catalog_store.delete_product(pid, permanent=True, admin_identity=admin_identity)


def test_server_authoritative_price_tamper_rejection():
    """
    Critical security test:
    Verify that if a client sends tampered subtotal: 10, total: 10 for a ₹999 tee,
    the server recalculates the real price (₹999), free shipping over ₹999, total ₹999,
    and saves the authoritative amount, rejecting the client spoof.
    """
    async def run():
        fake_client = AsyncMock()
        # Session check mock
        session_resp = MagicMock()
        session_resp.status_code = 200
        session_resp.json.return_value = [{"member_id": "test-member-uuid", "expires_at": "2030-01-01T00:00:00Z"}]

        # Order uniqueness check mock
        check_resp = MagicMock()
        check_resp.status_code = 200
        check_resp.json.return_value = []

        # Order insert mock
        insert_resp = MagicMock()
        insert_resp.status_code = 200
        insert_resp.json.return_value = [{"order_id": "NLO-9999"}]

        fake_client.get.side_effect = [session_resp, check_resp]
        fake_client.post.return_value = insert_resp

        with (
            patch.object(server, "supabase_rest_headers", return_value={}),
            patch.object(server, "supabase_rest_url", return_value="https://example.invalid"),
            patch.object(server._httpx, "AsyncClient") as client_class,
        ):
            client_class.return_value.__aenter__.return_value = fake_client

            # Client attempts malicious tampering:
            # Submitting price: 5, subtotal: 5, total: 5 for p01 (NALAYAK STANDARD TEE - price is 999)
            tampered_input = server.OrderInput(
                email="test@example.com",
                name="Test Customer",
                phone="9876543210",
                shipping_address="123 Street",
                items=[{
                    "slug": "nalayak-standard-tee",
                    "name": "NALAYAK STANDARD TEE",
                    "size": "M",
                    "color": "JET BLACK",
                    "qty": 2,
                    "price": 5,  # Tampered client price!
                }],
                subtotal=10,    # Tampered client subtotal!
                shipping=0,
                total=10,       # Tampered client total!
            )

            result = await server.create_order(tampered_input, nalayak_session="valid_test_session")

            # Assert server rejected the ₹10 spoof and recalculated authoritative amounts:
            # 2 * ₹999 = ₹1,998 subtotal
            # Over ₹999 -> Free shipping (₹0)
            # Total = ₹1,998
            assert result["subtotal"] == 1998
            assert result["shipping"] == 0
            assert result["total"] == 1998

            # Verify the payload posted to Supabase database has the authoritative amounts
            order_call = [c for c in fake_client.post.call_args_list if "orders" in c.args[0]][0]
            inserted_doc = order_call.kwargs["json"]
            assert inserted_doc["subtotal"] == 1998
            assert inserted_doc["total"] == 1998
            assert inserted_doc["items"][0]["price"] == 999
            assert inserted_doc["items"][0]["line_total"] == 1998

    asyncio.run(run())


def test_coupon_validation_in_checkout():
    """Verify server applies valid coupons (e.g. WELCOME10) and calculates correct discount."""
    async def run():
        fake_client = AsyncMock()
        session_resp = MagicMock()
        session_resp.status_code = 200
        session_resp.json.return_value = [{"member_id": "test-member-uuid", "expires_at": "2030-01-01T00:00:00Z"}]

        check_resp = MagicMock()
        check_resp.status_code = 200
        check_resp.json.return_value = []

        insert_resp = MagicMock()
        insert_resp.status_code = 200
        insert_resp.json.return_value = [{"order_id": "NLO-8888"}]

        fake_client.get.side_effect = [session_resp, check_resp]
        fake_client.post.return_value = insert_resp

        with (
            patch.object(server, "supabase_rest_headers", return_value={}),
            patch.object(server, "supabase_rest_url", return_value="https://example.invalid"),
            patch.object(server._httpx, "AsyncClient") as client_class,
        ):
            client_class.return_value.__aenter__.return_value = fake_client

            # 2 * 999 = 1998. WELCOME10 gives 10% off = ₹200.
            order_input = server.OrderInput(
                email="coupon_customer@example.com",
                name="Coupon User",
                phone="9876543210",
                shipping_address="Street 42",
                items=[{
                    "slug": "nalayak-standard-tee",
                    "name": "NALAYAK STANDARD TEE",
                    "size": "L",
                    "color": "JET BLACK",
                    "qty": 2,
                    "price": 999,
                }],
                discount_code="WELCOME10",
            )

            result = await server.create_order(order_input, nalayak_session="valid_test_session")
            assert result["subtotal"] == 1998
            assert result["discount"] == 200
            assert result["total"] == 1798

            order_call = [c for c in fake_client.post.call_args_list if "orders" in c.args[0]][0]
            inserted_doc = order_call.kwargs["json"]
            assert inserted_doc["discount_code"] == "WELCOME10"
            assert inserted_doc["discount_amount"] == 200
            assert inserted_doc["total"] == 1798

    asyncio.run(run())


def test_razorpay_club_membership_isolated_and_untouched():
    """Verify Club membership Razorpay checkout endpoints remain intact and registered."""
    import inspect
    routes = [r.path for r in server.api_router.routes]

    # Membership Razorpay routes must be present
    assert "/api/razorpay/create-order" in routes
    assert "/api/razorpay/verify" in routes

    # Functions must exist and accept input
    assert callable(server.create_razorpay_order)
    assert callable(server.verify_razorpay_payment)

    # Check that Razorpay functions have not been repurposed for catalog
    sig = inspect.signature(server.create_razorpay_order)
    assert "nalayak_session" in sig.parameters
