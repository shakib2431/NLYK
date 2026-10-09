
import asyncio
import hashlib
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

import server


def test_order_tracking_rejects_missing_token():
    async def run():
        with pytest.raises(HTTPException) as exc:
            await server.get_order("NLO-0000")
        assert exc.value.status_code == 404

    asyncio.run(run())


def test_order_tracking_rejects_invalid_token():
    async def run():
        fake_response = MagicMock()
        fake_response.status_code = 200
        fake_response.json.return_value = []

        fake_client = AsyncMock()
        fake_client.get.return_value = fake_response

        with (
            patch.object(server, "supabase_rest_headers", return_value={}),
            patch.object(server, "supabase_rest_url", return_value="https://example.invalid"),
            patch.object(server._httpx, "AsyncClient") as client_class,
        ):
            client_class.return_value.__aenter__.return_value = fake_client

            with pytest.raises(HTTPException) as exc:
                await server.get_order(
                    "NLO-0000", token="invalid-test-token"
                )

        assert exc.value.status_code == 404

        params = fake_client.get.call_args.kwargs["params"]
        expected_hash = hashlib.sha256(
            b"invalid-test-token"
        ).hexdigest()

        assert params["tracking_token_hash"] == f"eq.{expected_hash}"
        assert params["order_id"] == "eq.NLO-0000"
        assert "email" not in params["select"]
        assert "phone" not in params["select"]
        assert "shipping_address" not in params["select"]

    asyncio.run(run())


def test_order_tracking_returns_selected_fields_for_valid_token():
    async def run():
        token = "local-test-valid-token"
        expected_order = {
            "order_id": "NLO-1234",
            "name": "Test Customer",
            "items": [],
            "shipping": 0,
            "total": 0,
            "status": "placed",
            "created_at": "2026-01-01T00:00:00+00:00",
            "shipped_at": None,
            "delivered_at": None,
        }

        fake_response = MagicMock()
        fake_response.status_code = 200
        fake_response.json.return_value = [expected_order]

        fake_client = AsyncMock()
        fake_client.get.return_value = fake_response

        with (
            patch.object(server, "supabase_rest_headers", return_value={}),
            patch.object(server, "supabase_rest_url", return_value="https://example.invalid"),
            patch.object(server._httpx, "AsyncClient") as client_class,
        ):
            client_class.return_value.__aenter__.return_value = fake_client
            result = await server.get_order("NLO-1234", token=token)

        assert result == expected_order

        params = fake_client.get.call_args.kwargs["params"]
        expected_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()

        assert params["tracking_token_hash"] == f"eq.{expected_hash}"
        assert params["order_id"] == "eq.NLO-1234"
        assert "email" not in params["select"]
        assert "phone" not in params["select"]
        assert "shipping_address" not in params["select"]

    asyncio.run(run())
