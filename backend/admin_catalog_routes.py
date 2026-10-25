"""
NALAYAK STUDIOS — ADMIN STUDIO & CATALOGUE ROUTER
Complete Shopify-style e-commerce administration and public storefront endpoints.
"""

import hmac
import os
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, Header, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field

from catalog_db import catalog_store

router = APIRouter(tags=["Admin Studio & Catalog"])

ROOT_DIR = Path(__file__).parent.parent
UPLOADS_DIR = ROOT_DIR / "frontend" / "public" / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


# ── ADMIN AUTHENTICATION DEPENDENCY ──────────────────────────────────────────

def verify_admin(
    x_admin_key: Optional[str] = Header(None, alias="X-Admin-Key"),
    x_admin_session: Optional[str] = Header(None, alias="X-Admin-Session"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> Dict[str, Any]:
    """
    Validates either:
    1. A cryptographic session token via X-Admin-Session or Authorization: Bearer <token>
    2. An authoritative master admin key via X-Admin-Key
    """
    token = None
    if isinstance(x_admin_session, str) and x_admin_session.strip():
        token = x_admin_session.strip()
    elif isinstance(authorization, str) and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()

    if token:
        sess = catalog_store.validate_admin_session(token)
        if sess:
            return {"admin_identity": sess["admin_identity"], "token": token, "type": "session"}

    # Fallback to master key check with constant-time comparison
    expected_key = os.environ.get("ADMIN_KEY")
    if expected_key and expected_key.strip() and isinstance(x_admin_key, str) and x_admin_key.strip():
        if hmac.compare_digest(x_admin_key.strip(), expected_key.strip()):
            return {"admin_identity": "superadmin", "token": None, "type": "master_key"}

    raise HTTPException(status_code=401, detail="unauthorized")


# ── INPUT MODELS ─────────────────────────────────────────────────────────────

class AdminLoginInput(BaseModel):
    key: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None


class ProductVariantInput(BaseModel):
    id: Optional[str] = None
    sku: Optional[str] = None
    size: str
    color_name: str
    color_hex: str = "#0a0a0a"
    stock: int = Field(default=0, ge=0)
    price_override: Optional[int] = None


class ProductInput(BaseModel):
    slug: Optional[str] = None
    name: str
    kicker: Optional[str] = "NALAYAK HEAVYWEIGHT"
    price: int = Field(..., ge=0)
    compareAt: Optional[int] = None
    cost_price: Optional[int] = None
    category: str = "tees"
    gender: str = "unisex"
    badge: Optional[str] = None
    desc: Optional[str] = ""
    fit: Optional[str] = "Oversized boxy drop-shoulder cut."
    composition: Optional[str] = "100% Combed Heavyweight Cotton."
    care: Optional[str] = "Cold machine wash inside out. Dry in shade."
    story: Optional[str] = ""
    images: List[str] = Field(default_factory=list)
    colorImages: Optional[Dict[str, str]] = Field(default_factory=dict)
    colors: List[Dict[str, Any]] = Field(default_factory=list)
    sizes: List[str] = Field(default_factory=lambda: ["XS", "S", "M", "L", "XL"])
    variants: Optional[List[ProductVariantInput]] = None
    stock: Optional[int] = 0
    status: str = "active"
    newArrival: bool = False
    bestSeller: bool = False
    featured: bool = False
    tags: List[str] = Field(default_factory=list)


class InventoryBatchUpdateInput(BaseModel):
    updates: List[Dict[str, Any]]


class CollectionInput(BaseModel):
    slug: str
    title: str
    kicker: Optional[str] = "COLLECTION"
    desc: Optional[str] = ""
    image: Optional[str] = ""
    products: List[str] = Field(default_factory=list)
    isActive: bool = True


class DiscountInput(BaseModel):
    code: str
    discount_type: str = "percentage"
    value: float = Field(..., gt=0)
    min_order_amount: float = Field(default=0, ge=0)
    max_discount: Optional[float] = None
    usage_limit: Optional[int] = None
    is_active: bool = True
    valid_from: Optional[str] = None
    valid_to: Optional[str] = None
    description: Optional[str] = ""


class StorefrontContentInput(BaseModel):
    content: Dict[str, Any]


class CouponValidationInput(BaseModel):
    code: str
    subtotal: int


class OrderFulfillmentInput(BaseModel):
    status: str
    courier_name: Optional[str] = None
    tracking_number: Optional[str] = None
    notes: Optional[str] = None


# ── PUBLIC STOREFRONT CATALOG ENDPOINTS ───────────────────────────────────────

@router.get("/catalog/products")
async def get_public_products(
    category: Optional[str] = None,
    gender: Optional[str] = None,
    search: Optional[str] = None,
    new_arrival: Optional[bool] = Query(None, alias="newArrival"),
    best_seller: Optional[bool] = Query(None, alias="bestSeller"),
    featured: Optional[bool] = Query(None, alias="featured"),
    sort: Optional[str] = None,
):
    """
    Public API returning active products with filtering and sorting.
    """
    prods = catalog_store.list_products(
        category=category,
        gender=gender,
        status="active",
        search=search,
        is_new_arrival=new_arrival,
        is_best_seller=best_seller,
        is_featured=featured,
        include_drafts=False,
    )

    if sort == "price-asc":
        prods.sort(key=lambda x: x.get("price", 0))
    elif sort == "price-desc":
        prods.sort(key=lambda x: x.get("price", 0), reverse=True)
    elif sort == "newest":
        prods.sort(key=lambda x: 1 if x.get("newArrival") else 0, reverse=True)
    elif sort == "popular":
        prods.sort(key=lambda x: 1 if x.get("bestSeller") else 0, reverse=True)

    return {"products": prods, "total": len(prods)}


@router.get("/catalog/products/{slug_or_id}")
async def get_public_product_detail(slug_or_id: str):
    """
    Get full detail for a single product by slug or id.
    """
    prod = catalog_store.get_product(slug_or_id)
    if not prod:
        raise HTTPException(status_code=404, detail="product_not_found")
    return {"product": prod}


@router.get("/catalog/collections")
async def get_public_collections():
    """
    Get all active collections.
    """
    cols = [c for c in catalog_store.list_collections() if c.get("isActive", True)]
    return {"collections": cols}


@router.get("/catalog/collections/{slug}")
async def get_public_collection_detail(slug: str):
    """
    Get collection metadata and its associated products.
    """
    col = catalog_store.get_collection(slug)
    if not col:
        raise HTTPException(status_code=404, detail="collection_not_found")

    product_slugs = col.get("products", [])
    collection_products = []
    for s in product_slugs:
        p = catalog_store.get_product(s)
        if p and p.get("status") == "active":
            collection_products.append(p)

    return {"collection": col, "products": collection_products}


@router.get("/catalog/content")
async def get_public_storefront_content():
    """
    Returns public homepage content, announcements, and banners.
    """
    return {"content": catalog_store.get_storefront_content()}


@router.post("/discounts/validate")
async def validate_discount_code(input: CouponValidationInput):
    """
    Public coupon validation for the cart and checkout.
    """
    valid, discount_amount, message = catalog_store.validate_discount(input.code, input.subtotal)
    return {
        "valid": valid,
        "code": input.code.strip().upper(),
        "discount": discount_amount,
        "message": message,
    }


# ── ADMIN AUTHENTICATION ENDPOINTS ───────────────────────────────────────────

@router.post("/admin/login")
async def admin_login(input: AdminLoginInput):
    """
    Authenticates an administrator with the master key or credentials and returns a session token.
    """
    key = (input.key or "").strip()
    expected_key = (os.environ.get("ADMIN_KEY") or "").strip()

    authenticated = False
    identity = "admin"

    if expected_key and key:
        if hmac.compare_digest(key, expected_key):
            authenticated = True
            identity = "superadmin"

    # Also support username/password for staff if configured
    if not authenticated and input.username and input.password:
        staff_pwd = os.environ.get("ADMIN_PASSWORD") or expected_key
        if staff_pwd and hmac.compare_digest(input.password.strip(), staff_pwd.strip()):
            authenticated = True
            identity = input.username.strip()

    if not authenticated:
        raise HTTPException(status_code=401, detail="invalid_credentials")

    token = catalog_store.create_admin_session(admin_identity=identity)
    return {
        "authenticated": True,
        "token": token,
        "admin": {"identity": identity, "role": "admin"},
        "message": "Welcome to NALAYAK Admin Studio.",
    }


@router.post("/admin/logout")
async def admin_logout(admin: Dict[str, Any] = Depends(verify_admin)):
    """
    Revokes the current admin session.
    """
    token = admin.get("token")
    if token:
        catalog_store.revoke_admin_session(token)
    return {"logged_out": True}


@router.get("/admin/me")
async def admin_me(admin: Dict[str, Any] = Depends(verify_admin)):
    """
    Returns authenticated administrator identity and session details.
    """
    return {"authenticated": True, "admin": admin}


# ── ADMIN CATALOGUE: PRODUCTS ────────────────────────────────────────────────

@router.get("/admin/catalog/products")
async def admin_list_products(
    category: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    admin: Dict[str, Any] = Depends(verify_admin),
):
    """
    List all products in Admin Studio (active, draft, archived).
    """
    prods = catalog_store.list_products(
        category=category,
        status=status,
        search=search,
        include_drafts=True,
    )
    return {"products": prods, "total": len(prods)}


@router.post("/admin/catalog/products")
async def admin_create_product(
    input: ProductInput,
    admin: Dict[str, Any] = Depends(verify_admin),
):
    """
    Create a new product with variant matrix and initial inventory.
    """
    doc = input.model_dump()
    if input.variants:
        doc["variants"] = [v.model_dump() for v in input.variants]
    created = catalog_store.create_product(doc, admin_identity=admin["admin_identity"])
    return {"product": created, "message": "Product created successfully."}


@router.get("/admin/catalog/products/{pid}")
async def admin_get_product(
    pid: str,
    admin: Dict[str, Any] = Depends(verify_admin),
):
    prod = catalog_store.get_product(pid)
    if not prod:
        raise HTTPException(status_code=404, detail="product_not_found")
    return {"product": prod}


@router.put("/admin/catalog/products/{pid}")
async def admin_update_product(
    pid: str,
    input: ProductInput,
    admin: Dict[str, Any] = Depends(verify_admin),
):
    doc = input.model_dump()
    if input.variants:
        doc["variants"] = [v.model_dump() for v in input.variants]
    updated = catalog_store.update_product(pid, doc, admin_identity=admin["admin_identity"])
    if not updated:
        raise HTTPException(status_code=404, detail="product_not_found")
    return {"product": updated, "message": "Product updated successfully."}


@router.delete("/admin/catalog/products/{pid}")
async def admin_delete_product(
    pid: str,
    permanent: bool = Query(False),
    admin: Dict[str, Any] = Depends(verify_admin),
):
    ok = catalog_store.delete_product(pid, permanent=permanent, admin_identity=admin["admin_identity"])
    if not ok:
        raise HTTPException(status_code=404, detail="product_not_found")
    action_type = "deleted" if permanent else "archived"
    return {"status": "success", "message": f"Product {action_type} successfully."}


@router.post("/admin/catalog/products/{pid}/duplicate")
async def admin_duplicate_product(
    pid: str,
    admin: Dict[str, Any] = Depends(verify_admin),
):
    cloned = catalog_store.duplicate_product(pid, admin_identity=admin["admin_identity"])
    if not cloned:
        raise HTTPException(status_code=404, detail="product_not_found")
    return {"product": cloned, "message": "Product duplicated as draft."}


# ── ADMIN INVENTORY ──────────────────────────────────────────────────────────

@router.patch("/admin/catalog/inventory")
async def admin_batch_inventory(
    input: InventoryBatchUpdateInput,
    admin: Dict[str, Any] = Depends(verify_admin),
):
    """
    Batch update variant stock levels across products.
    """
    count = catalog_store.update_inventory_batch(input.updates, admin_identity=admin["admin_identity"])
    return {"updated": count, "message": f"Updated stock for {count} items."}


# ── ADMIN COLLECTIONS ────────────────────────────────────────────────────────

@router.get("/admin/catalog/collections")
async def admin_list_collections(admin: Dict[str, Any] = Depends(verify_admin)):
    return {"collections": catalog_store.list_collections()}


@router.post("/admin/catalog/collections")
async def admin_save_collection(
    input: CollectionInput,
    admin: Dict[str, Any] = Depends(verify_admin),
):
    saved = catalog_store.save_collection(input.model_dump(), admin_identity=admin["admin_identity"])
    return {"collection": saved, "message": "Collection saved successfully."}


@router.delete("/admin/catalog/collections/{slug}")
async def admin_delete_collection(
    slug: str,
    admin: Dict[str, Any] = Depends(verify_admin),
):
    ok = catalog_store.delete_collection(slug, admin_identity=admin["admin_identity"])
    if not ok:
        raise HTTPException(status_code=404, detail="collection_not_found")
    return {"status": "success", "message": "Collection deleted."}


# ── ADMIN DISCOUNTS & COUPONS ────────────────────────────────────────────────

@router.get("/admin/catalog/discounts")
async def admin_list_discounts(admin: Dict[str, Any] = Depends(verify_admin)):
    return {"discounts": catalog_store.list_discounts()}


@router.post("/admin/catalog/discounts")
async def admin_save_discount(
    input: DiscountInput,
    admin: Dict[str, Any] = Depends(verify_admin),
):
    saved = catalog_store.save_discount(input.model_dump(), admin_identity=admin["admin_identity"])
    return {"discount": saved, "message": f"Coupon {saved['code']} saved."}


@router.delete("/admin/catalog/discounts/{code}")
async def admin_delete_discount(
    code: str,
    admin: Dict[str, Any] = Depends(verify_admin),
):
    ok = catalog_store.delete_discount(code, admin_identity=admin["admin_identity"])
    if not ok:
        raise HTTPException(status_code=404, detail="coupon_not_found")
    return {"status": "success", "message": f"Coupon {code.upper()} deleted."}


# ── ADMIN STOREFRONT CMS ─────────────────────────────────────────────────────

@router.get("/admin/catalog/storefront")
async def admin_get_storefront(admin: Dict[str, Any] = Depends(verify_admin)):
    return {"content": catalog_store.get_storefront_content()}


@router.put("/admin/catalog/storefront")
async def admin_update_storefront(
    input: StorefrontContentInput,
    admin: Dict[str, Any] = Depends(verify_admin),
):
    updated = catalog_store.update_storefront_content(input.content, admin_identity=admin["admin_identity"])
    return {"content": updated, "message": "Storefront content published."}


# ── ADMIN MEDIA UPLOAD ───────────────────────────────────────────────────────

@router.post("/admin/catalog/media/upload")
async def admin_upload_media(
    file: UploadFile = File(...),
    admin: Dict[str, Any] = Depends(verify_admin),
):
    """
    Uploads a product or campaign media asset.
    Saves to frontend/public/uploads and returns the web-accessible URL.
    """
    ext = Path(file.filename).suffix.lower() or ".jpg"
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"]:
        raise HTTPException(status_code=400, detail="unsupported_media_type")

    filename = f"media_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}{ext}"
    dest_path = UPLOADS_DIR / filename

    try:
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")

    url = f"/uploads/{filename}"
    return {
        "url": url,
        "filename": filename,
        "size": dest_path.stat().st_size,
        "message": "Media uploaded successfully.",
    }


# ── ADMIN ANALYTICS & AUDIT LOGS ─────────────────────────────────────────────

@router.get("/admin/analytics")
async def admin_analytics(admin: Dict[str, Any] = Depends(verify_admin)):
    summary = catalog_store.get_analytics_summary()
    return {"analytics": summary}


@router.get("/admin/audit-logs")
async def admin_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    admin: Dict[str, Any] = Depends(verify_admin),
):
    return {"audit_logs": catalog_store.get_audit_logs(limit=limit)}


# ── ADMIN ORDER FULFILLMENT ──────────────────────────────────────────────────

@router.post("/admin/orders/{order_id}/fulfill")
async def admin_fulfill_order(
    order_id: str,
    input: OrderFulfillmentInput,
    admin: Dict[str, Any] = Depends(verify_admin),
):
    """
    Updates order fulfillment status, courier, tracking AWB number, and fulfillment timestamp.
    """
    import httpx
    from server import supabase_rest_headers, supabase_rest_url

    headers = supabase_rest_headers()
    base_url = supabase_rest_url()

    now = datetime.now(timezone.utc).isoformat()
    update_doc = {
        "status": input.status,
    }
    if input.courier_name:
        update_doc["courier_name"] = input.courier_name
    if input.tracking_number:
        update_doc["tracking_number"] = input.tracking_number
    if input.notes:
        update_doc["notes"] = input.notes
    if input.status == "shipped":
        update_doc["shipped_at"] = now
    elif input.status == "delivered":
        update_doc["delivered_at"] = now

    try:
        async with httpx.AsyncClient(timeout=30) as client_http:
            resp = await client_http.patch(
                f"{base_url}/orders",
                params={"order_id": f"eq.{order_id}"},
                headers=headers,
                json=update_doc,
            )
        if resp.status_code >= 400:
            pass
    except Exception as e:
        # Fallback for local order recording
        pass

    # Authoritative update in catalog store
    catalog_store.update_order_tracking(
        order_id=order_id,
        tracking_partner=input.courier_name,
        tracking_awb=input.tracking_number,
        status=input.status,
        notes=input.notes,
        admin_identity=admin.get("user", "admin"),
    )

    return {"status": "success", "order_id": order_id, "fulfillment": update_doc}


# ── ORDER TRACKING & PAYMENT ENDPOINTS ───────────────────────────────────────

class TrackingUpdateInput(BaseModel):
    tracking_partner: Optional[str] = None
    tracking_awb: Optional[str] = None
    tracking_url: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class PaymentUpdateInput(BaseModel):
    payment_status: Optional[str] = None
    payment_method: Optional[str] = None
    razorpay_payment_id: Optional[str] = None


@router.get("/admin/catalog/orders")
@router.get("/admin/orders")
async def list_admin_orders(
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    admin: Dict[str, Any] = Depends(verify_admin),
):
    orders = catalog_store.list_orders(status=status, search=search, limit=limit)
    return {"orders": orders}


@router.post("/admin/orders/{order_id}/tracking")
async def update_order_tracking_endpoint(
    order_id: str,
    input: TrackingUpdateInput,
    admin: Dict[str, Any] = Depends(verify_admin),
):
    updated = catalog_store.update_order_tracking(
        order_id=order_id,
        tracking_partner=input.tracking_partner,
        tracking_awb=input.tracking_awb,
        tracking_url=input.tracking_url,
        status=input.status,
        notes=input.notes,
        admin_identity=admin.get("user", "admin"),
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"status": "success", "order": updated}


@router.post("/admin/orders/{order_id}/payment")
async def update_order_payment_endpoint(
    order_id: str,
    input: PaymentUpdateInput,
    admin: Dict[str, Any] = Depends(verify_admin),
):
    updated = catalog_store.update_order_payment(
        order_id=order_id,
        payment_status=input.payment_status,
        payment_method=input.payment_method,
        razorpay_payment_id=input.razorpay_payment_id,
        admin_identity=admin.get("user", "admin"),
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"status": "success", "order": updated}


# ── CUSTOMER & ACCOUNT PROFILES ─────────────────────────────────────────────

@router.get("/admin/customers")
async def list_admin_customers(
    search: Optional[str] = None,
    admin: Dict[str, Any] = Depends(verify_admin),
):
    customers = catalog_store.list_customers(search=search)
    return {"customers": customers}


@router.get("/admin/accounts")
async def list_admin_accounts(
    admin: Dict[str, Any] = Depends(verify_admin),
):
    accounts = catalog_store.list_sign_in_accounts()
    return {"accounts": accounts}


# ── IRL COMMUNITY & BRAND LOOKBOOK ──────────────────────────────────────────

class IrlStatusInput(BaseModel):
    status: str


class IrlEntryInput(BaseModel):
    name: str = "NALAYAK COMMUNITY"
    handle: Optional[str] = "@nalayakstudios"
    city: Optional[str] = "Kolkata"
    image_url: str
    caption: Optional[str] = "Nalayak AW26 Studio Fit."
    order_id: Optional[str] = None
    status: str = "approved"


@router.get("/admin/irl")
async def list_admin_irl(
    status: Optional[str] = None,
    admin: Dict[str, Any] = Depends(verify_admin),
):
    items = catalog_store.list_irl(status=status)
    return {"irl": items}


@router.post("/admin/irl/{file_id}/status")
async def update_admin_irl_status(
    file_id: str,
    input: IrlStatusInput,
    admin: Dict[str, Any] = Depends(verify_admin),
):
    item = catalog_store.update_irl_status(
        file_id=file_id,
        status=input.status,
        admin_identity=admin.get("user", "admin"),
    )
    if not item:
        raise HTTPException(status_code=404, detail="IRL entry not found")
    return {"status": "success", "item": item}


@router.post("/admin/irl/create")
async def create_admin_irl(
    input: IrlEntryInput,
    admin: Dict[str, Any] = Depends(verify_admin),
):
    item = catalog_store.create_irl_entry(
        data=input.dict(),
        admin_identity=admin.get("user", "admin"),
    )
    return {"status": "success", "item": item}


@router.delete("/admin/irl/{file_id}")
async def delete_admin_irl(
    file_id: str,
    admin: Dict[str, Any] = Depends(verify_admin),
):
    deleted = catalog_store.delete_irl_entry(file_id=file_id, admin_identity=admin.get("user", "admin"))
    if not deleted:
        raise HTTPException(status_code=404, detail="IRL entry not found")
    return {"status": "success", "file_id": file_id}


# Public endpoint for Home.jsx IrlGrid
@router.get("/irl/approved")
async def get_public_approved_irl():
    items = catalog_store.list_irl(status="approved")
    return items
