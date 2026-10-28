"""
NALAYAK STUDIOS — CATALOGUE & COMMERCE PERSISTENCE ENGINE
Authoritative backend repository for Products, Variants, Inventory, Collections,
Discounts, Storefront CMS, Admin Sessions, and Audit Logging.
"""

import json
import logging
import os
import shutil
import threading
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("nalayak.catalog")

DATA_DIR = Path(__file__).parent / "data"
CATALOG_FILE = DATA_DIR / "catalog_store.json"
SEED_FILE = DATA_DIR / "seed_data.json"

_lock = threading.RLock()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _generate_sku(slug: str, color_name: str, size: str) -> str:
    clean_slug = "".join(c for c in slug.upper() if c.isalnum() or c == "-")[:8].strip("-")
    clean_color = "".join(c for c in color_name.upper() if c.isalnum())[:3] or "DEF"
    clean_size = "".join(c for c in size.upper() if c.isalnum()) or "OS"
    return f"NLYK-{clean_slug}-{clean_color}-{clean_size}"


class CatalogStore:
    def __init__(self):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        self._store: Dict[str, Any] = {
            "products": {},
            "collections": {},
            "discounts": {},
            "storefront": {},
            "admin_sessions": {},
            "audit_logs": [],
        }
        self.load()

    def load(self):
        with _lock:
            if CATALOG_FILE.exists():
                try:
                    with open(CATALOG_FILE, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        self._store = data
                        self._ensure_store_keys()
                        logger.info("Loaded catalog store with %d products", len(self._store.get("products", {})))
                        return
                except Exception as e:
                    logger.error("Failed to load catalog_store.json: %s. Creating backup.", e)
                    shutil.copy(CATALOG_FILE, DATA_DIR / f"catalog_store_corrupted_{uuid.uuid4().hex[:6]}.json")

            # Seed from seed_data.json or build initial catalog
            self._seed_initial_data()
            self._ensure_store_keys()
            self.save()

    def save(self):
        with _lock:
            temp_file = DATA_DIR / f"catalog_store.tmp.{uuid.uuid4().hex[:8]}"
            try:
                with open(temp_file, "w", encoding="utf-8") as f:
                    json.dump(self._store, f, indent=2, ensure_ascii=False)
                try:
                    os.replace(temp_file, CATALOG_FILE)
                except (PermissionError, OSError):
                    # Windows OneDrive file-lock fallback
                    with open(CATALOG_FILE, "w", encoding="utf-8") as f:
                        json.dump(self._store, f, indent=2, ensure_ascii=False)
                    if temp_file.exists():
                        try:
                            temp_file.unlink()
                        except Exception:
                            pass
            except Exception as e:
                logger.error("Failed to save catalog_store: %s", e)
                if temp_file.exists():
                    try:
                        temp_file.unlink()
                    except Exception:
                        pass
                raise

    def _seed_initial_data(self):
        logger.info("Seeding initial catalog from seed_data.json...")
        seed_data = {}
        if SEED_FILE.exists():
            try:
                with open(SEED_FILE, "r", encoding="utf-8") as f:
                    seed_data = json.load(f)
            except Exception as e:
                logger.warning("Could not read seed_data.json: %s", e)

        raw_products = seed_data.get("products", [])
        raw_collections = seed_data.get("collections", [])

        products_map = {}
        for idx, p in enumerate(raw_products):
            pid = p.get("id") or f"p{str(idx + 1).zfill(2)}"
            slug = p.get("slug") or f"product-{pid}"
            sizes = p.get("sizes") or ["XS", "S", "M", "L", "XL"]
            colors = p.get("colors") or [{"name": "BLACK", "hex": "#0a0a0a"}]
            
            # Normalize colors if strings
            norm_colors = []
            for c in colors:
                if isinstance(c, dict):
                    norm_colors.append(c)
                elif isinstance(c, str):
                    norm_colors.append({"name": c, "hex": "#0a0a0a"})
                else:
                    norm_colors.append({"name": "STANDARD", "hex": "#0a0a0a"})

            # Generate variants matrix
            variants = []
            total_stock = 0
            for col in norm_colors:
                cname = col.get("name", "STANDARD")
                chex = col.get("hex", "#0a0a0a")
                for sz in sizes:
                    var_stock = p.get("stock", 20) // max(1, (len(norm_colors) * len(sizes))) or 15
                    total_stock += var_stock
                    variants.append({
                        "id": f"var_{pid}_{sz}_{cname.replace(' ', '_')}",
                        "sku": _generate_sku(slug, cname, sz),
                        "size": sz,
                        "color_name": cname,
                        "color_hex": chex,
                        "stock": var_stock,
                        "price_override": None,
                    })

            prod_doc = {
                "id": pid,
                "slug": slug,
                "name": p.get("name", "UNTITLED PIECE"),
                "kicker": p.get("kicker") or "NALAYAK HEAVYWEIGHT",
                "price": int(p.get("price") or 999),
                "compareAt": int(p["compareAt"]) if p.get("compareAt") else None,
                "cost_price": int(p.get("cost_price") or round(int(p.get("price") or 999) * 0.4)),
                "category": p.get("category", "tees"),
                "gender": p.get("gender", "unisex"),
                "badge": p.get("badge"),
                "desc": p.get("desc", ""),
                "fit": p.get("fit", "Oversized boxy drop-shoulder streetwear cut. Pre-shrunk."),
                "composition": p.get("composition", "100% Combed Heavyweight Cotton. 240+ GSM."),
                "care": p.get("care", "Cold machine wash inside out. Line dry in shade. Do not iron directly on print."),
                "story": p.get("story", "Engineered in India for the ones who were never interested in fitting in."),
                "images": p.get("images") or ["photo-1523381210434-271e8be1f52b"],
                "colorImages": p.get("colorImages") or {},
                "colors": norm_colors,
                "sizes": sizes,
                "variants": variants,
                "stock": total_stock,
                "status": "active",
                "newArrival": bool(p.get("newArrival")),
                "bestSeller": bool(p.get("bestSeller")),
                "featured": bool(p.get("featured")),
                "clubEarlyAccess": bool(p.get("clubEarlyAccess")),
                "tags": p.get("tags") or [p.get("category", "streetwear"), p.get("gender", "unisex")],
                "created_at": _now_iso(),
                "updated_at": _now_iso(),
            }
            products_map[pid] = prod_doc

        collections_map = {}
        for c in raw_collections:
            cslug = c.get("slug")
            if cslug:
                collections_map[cslug] = {
                    "id": f"col_{cslug}",
                    "slug": cslug,
                    "title": c.get("title", cslug.upper()),
                    "kicker": c.get("kicker") or "COLLECTION",
                    "desc": c.get("desc", ""),
                    "image": c.get("image", ""),
                    "products": c.get("products", []),
                    "isActive": True,
                    "created_at": _now_iso(),
                    "updated_at": _now_iso(),
                }

        # Seed default discounts
        default_discounts = {
            "WELCOME10": {
                "id": "dsc_welcome10",
                "code": "WELCOME10",
                "discount_type": "percentage",
                "value": 10,
                "min_order_amount": 999,
                "max_discount": 500,
                "usage_limit": 1000,
                "usage_count": 0,
                "is_active": True,
                "valid_from": _now_iso(),
                "valid_to": None,
                "description": "10% off for first-time orders over ₹999",
            },
            "CHAOS500": {
                "id": "dsc_chaos500",
                "code": "CHAOS500",
                "discount_type": "fixed",
                "value": 500,
                "min_order_amount": 2499,
                "max_discount": None,
                "usage_limit": 500,
                "usage_count": 0,
                "is_active": True,
                "valid_from": _now_iso(),
                "valid_to": None,
                "description": "Flat ₹500 off orders above ₹2,499",
            },
            "DROP26": {
                "id": "dsc_drop26",
                "code": "DROP26",
                "discount_type": "percentage",
                "value": 15,
                "min_order_amount": 1999,
                "max_discount": 1000,
                "usage_limit": 500,
                "usage_count": 0,
                "is_active": True,
                "valid_from": _now_iso(),
                "valid_to": None,
                "description": "15% off AW26 drops over ₹1,999",
            },
        }

        # Seed storefront content
        storefront_content = {
            "announcement": {
                "text": seed_data.get("site", {}).get("announcement") or "FREE SHIPPING ON ORDERS ABOVE ₹999 — NO COUPON, NO BEGGING",
                "enabled": True,
                "link": "/new-arrivals",
            },
            "hero": seed_data.get("hero") or {
                "desktop": "/slide1.png",
                "mobile": "/slide1-mobile.png",
                "kicker": "AW26 — THE WRONG CROWD",
                "lines": ["NOT FOR", "EVERYONE."],
                "copy": "Clothes for people who were never interested in fitting in.",
                "primary": {"label": "SHOP NEW ARRIVALS", "to": "/new-arrivals"},
                "secondary": {"label": "EXPLORE COLLECTIONS", "to": "/collections"},
            },
            "campaign": seed_data.get("campaign") or {
                "bg": "/hero/hero-chaos-edit.jpg",
                "headline": "WELCOME TO THE WRONG CROWD.",
                "copy": "For people who were never particularly interested in fitting in.",
                "cta": {"label": "EXPLORE THE COLLECTION", "to": "/collections/the-chaos-edit"},
            },
            "story": seed_data.get("story") or {
                "image": "/editorial/about-atelier-craft.jpg",
                "headline": "WE DON'T MAKE CLOTHES FOR EVERYONE.",
                "paragraphs": [
                    "NALAYAK exists for the people who never quite fit the mould.",
                    "The ones who question the rules. The ones who make their own. The ones who would rather be remembered than approved.",
                    "We make clothes for them.",
                ],
                "cta": {"label": "OUR STORY", "to": "/about"},
            },
            "categoryTiles": seed_data.get("categoryTiles") or [
                {"label": "TEES", "spec": "240 GSM COMBED", "to": "/tees", "image": "/products/devanagari-chaos-tee-front.jpg"},
                {"label": "SHIRTS", "spec": "HEAVY TWILL", "to": "/shirts", "image": "photo-1596755094514-f87e34085b2c"},
                {"label": "HOODIES", "spec": "450 GSM FLEECE", "to": "/hoodies", "image": "/products/after-hours-stealth-hoodie-front.jpg"},
                {"label": "BOTTOMS", "spec": "TACTICAL UTILITY", "to": "/bottoms", "image": "/female-jeans-chain.png"},
                {"label": "ACCESSORIES", "spec": "HARDWARE & HEADWEAR", "to": "/accessories", "image": "/products/nalayak-chain-front.png"},
            ],
        }

        self._store = {
            "products": products_map,
            "collections": collections_map,
            "discounts": default_discounts,
            "storefront": storefront_content,
            "admin_sessions": {},
            "audit_logs": [
                {
                    "id": f"log_{uuid.uuid4().hex[:8]}",
                    "admin_identity": "system",
                    "action": "seed_catalog",
                    "entity_type": "system",
                    "entity_id": "seed",
                    "details": {"product_count": len(products_map), "collection_count": len(collections_map)},
                    "timestamp": _now_iso(),
                }
            ],
        }

    # ── PRODUCTS CRUD ──────────────────────────────────────────────

    def list_products(
        self,
        category: Optional[str] = None,
        status: Optional[str] = "active",
        search: Optional[str] = None,
        gender: Optional[str] = None,
        is_new_arrival: Optional[bool] = None,
        is_best_seller: Optional[bool] = None,
        is_featured: Optional[bool] = None,
        include_drafts: bool = False,
    ) -> List[Dict[str, Any]]:
        with _lock:
            prods = list(self._store.get("products", {}).values())

        filtered = []
        q = (search or "").strip().lower()

        for p in prods:
            if not include_drafts and status:
                if p.get("status") != status:
                    continue

            if category and category.upper() != "ALL":
                cat = (p.get("category") or "").lower()
                if cat != category.lower():
                    continue

            if gender and gender.upper() != "ALL":
                g = (p.get("gender") or "unisex").lower()
                if g != gender.lower() and g != "unisex":
                    continue

            if is_new_arrival is not None and bool(p.get("newArrival")) != is_new_arrival:
                continue

            if is_best_seller is not None and bool(p.get("bestSeller")) != is_best_seller:
                continue

            if is_featured is not None and bool(p.get("featured")) != is_featured:
                continue

            if q:
                name_match = q in (p.get("name") or "").lower()
                desc_match = q in (p.get("desc") or "").lower()
                tag_match = any(q in str(t).lower() for t in p.get("tags", []))
                kicker_match = q in (p.get("kicker") or "").lower()
                if not (name_match or desc_match or tag_match or kicker_match):
                    continue

            filtered.append(p)

        return [self._enrich_product(p) for p in filtered]

    def get_product(self, id_or_slug: str) -> Optional[Dict[str, Any]]:
        with _lock:
            # First check by ID
            if id_or_slug in self._store.get("products", {}):
                return self._enrich_product(self._store["products"][id_or_slug])
            # Then by slug
            for p in self._store.get("products", {}).values():
                if p.get("slug") == id_or_slug:
                    return self._enrich_product(p)
        return None

    def create_product(self, data: Dict[str, Any], admin_identity: str = "admin") -> Dict[str, Any]:
        with _lock:
            pid = data.get("id") or f"p_{uuid.uuid4().hex[:6]}"
            slug = data.get("slug") or f"product-{uuid.uuid4().hex[:6]}"
            
            # Check slug uniqueness
            for p in self._store["products"].values():
                if p.get("slug") == slug:
                    slug = f"{slug}-{uuid.uuid4().hex[:4]}"

            sizes = data.get("sizes") or ["XS", "S", "M", "L", "XL"]
            colors = data.get("colors") or [{"name": "BLACK", "hex": "#0a0a0a"}]
            norm_colors = []
            for c in colors:
                if isinstance(c, dict):
                    norm_colors.append(c)
                elif isinstance(c, str):
                    norm_colors.append({"name": c, "hex": "#0a0a0a"})

            variants = data.get("variants")
            if not variants:
                variants = []
                default_stock = int(data.get("stock") or 20) // max(1, (len(norm_colors) * len(sizes))) or 10
                for col in norm_colors:
                    cname = col.get("name", "STANDARD")
                    chex = col.get("hex", "#0a0a0a")
                    for sz in sizes:
                        variants.append({
                            "id": f"var_{pid}_{sz}_{cname.replace(' ', '_')}",
                            "sku": _generate_sku(slug, cname, sz),
                            "size": sz,
                            "color_name": cname,
                            "color_hex": chex,
                            "stock": default_stock,
                            "price_override": None,
                        })

            total_stock = sum(int(v.get("stock") or 0) for v in variants)

            doc = {
                "id": pid,
                "slug": slug,
                "name": data.get("name", "UNTITLED PRODUCT").strip().upper(),
                "kicker": data.get("kicker") or "NALAYAK HEAVYWEIGHT",
                "price": int(data.get("price") or 999),
                "compareAt": int(data["compareAt"]) if data.get("compareAt") else None,
                "cost_price": int(data["cost_price"]) if data.get("cost_price") else None,
                "category": (data.get("category") or "tees").lower(),
                "gender": (data.get("gender") or "unisex").lower(),
                "badge": data.get("badge"),
                "desc": data.get("desc", ""),
                "fit": data.get("fit", "Oversized streetwear fit."),
                "composition": data.get("composition", "100% Cotton."),
                "care": data.get("care", "Cold wash, dry in shade."),
                "story": data.get("story", ""),
                "images": data.get("images") or ["photo-1523381210434-271e8be1f52b"],
                "colorImages": data.get("colorImages") or {},
                "colors": norm_colors,
                "sizes": sizes,
                "variants": variants,
                "stock": total_stock,
                "status": data.get("status", "active"),
                "newArrival": bool(data.get("newArrival", True)),
                "bestSeller": bool(data.get("bestSeller", False)),
                "featured": bool(data.get("featured", False)),
                "tags": data.get("tags") or [],
                "created_at": _now_iso(),
                "updated_at": _now_iso(),
            }

            self._store["products"][pid] = doc

            # Synchronize collection mappings
            assigned_cols = data.get("collections") or []
            for col_slug in assigned_cols:
                col = self._store.get("collections", {}).get(col_slug)
                if col:
                    col_prods = col.setdefault("products", [])
                    if slug not in col_prods:
                        col_prods.append(slug)

            self._log_audit(admin_identity, "create_product", "product", pid, {"name": doc["name"], "price": doc["price"]})
            self.save()
            return self._enrich_product(doc)

    def update_product(self, pid: str, data: Dict[str, Any], admin_identity: str = "admin") -> Optional[Dict[str, Any]]:
        with _lock:
            existing = self._store["products"].get(pid)
            if not existing:
                return None

            updatable_fields = [
                "name", "kicker", "price", "compareAt", "cost_price", "category",
                "gender", "badge", "desc", "fit", "composition", "care", "story",
                "images", "colorImages", "colors", "sizes", "status", "newArrival",
                "bestSeller", "featured", "tags"
            ]

            for f in updatable_fields:
                if f in data:
                    existing[f] = data[f]

            # If slug is changing, verify uniqueness
            if "slug" in data and data["slug"] != existing.get("slug"):
                new_slug = data["slug"].strip()
                for opid, op in self._store["products"].items():
                    if opid != pid and op.get("slug") == new_slug:
                        new_slug = f"{new_slug}-{uuid.uuid4().hex[:4]}"
                existing["slug"] = new_slug

            # Update variants if provided
            if "variants" in data:
                existing["variants"] = data["variants"]
                existing["stock"] = sum(int(v.get("stock") or 0) for v in data["variants"])
            elif "stock" in data and not existing.get("variants"):
                existing["stock"] = int(data["stock"])

            # Update collections mapping if provided
            if "collections" in data:
                assigned_cols = set(data["collections"] or [])
                p_slug = existing.get("slug")
                for col_slug, col in self._store.get("collections", {}).items():
                    col_prods = col.setdefault("products", [])
                    if col_slug in assigned_cols:
                        if p_slug not in col_prods:
                            col_prods.append(p_slug)
                    else:
                        if p_slug in col_prods:
                            col_prods.remove(p_slug)

            existing["updated_at"] = _now_iso()
            self._log_audit(admin_identity, "update_product", "product", pid, {"name": existing["name"]})
            self.save()
            return self._enrich_product(existing)

    def delete_product(self, pid: str, permanent: bool = False, admin_identity: str = "admin") -> bool:
        with _lock:
            if pid not in self._store["products"]:
                return False

            prod = self._store["products"][pid]
            slug = prod.get("slug")

            # Remove from all collections immediately
            for col in self._store.get("collections", {}).values():
                if slug and slug in col.get("products", []):
                    col["products"] = [s for s in col["products"] if s != slug]

            if permanent:
                name = prod.get("name")
                del self._store["products"][pid]
                self._log_audit(admin_identity, "delete_product", "product", pid, {"name": name, "permanent": True})
            else:
                prod["status"] = "archived"
                prod["newArrival"] = False
                prod["bestSeller"] = False
                prod["featured"] = False
                prod["updated_at"] = _now_iso()
                self._log_audit(admin_identity, "archive_product", "product", pid, {"status": "archived"})

            self.save()
            return True

    def unarchive_product(self, pid: str, admin_identity: str = "admin") -> Optional[Dict[str, Any]]:
        with _lock:
            if pid not in self._store["products"]:
                return None
            prod = self._store["products"][pid]
            prod["status"] = "active"
            prod["updated_at"] = _now_iso()
            self._log_audit(admin_identity, "unarchive_product", "product", pid, {"status": "active"})
            self.save()
            return self._enrich_product(prod)

    def duplicate_product(self, pid: str, admin_identity: str = "admin") -> Optional[Dict[str, Any]]:
        with _lock:
            orig = self._store["products"].get(pid)
            if not orig:
                return None

            new_pid = f"p_{uuid.uuid4().hex[:6]}"
            new_slug = f"{orig['slug']}-copy-{uuid.uuid4().hex[:4]}"
            cloned = json.loads(json.dumps(orig))
            cloned["id"] = new_pid
            cloned["slug"] = new_slug
            cloned["name"] = f"{orig['name']} (COPY)"
            cloned["status"] = "draft"
            cloned["created_at"] = _now_iso()
            cloned["updated_at"] = _now_iso()

            # Generate new variant IDs
            for v in cloned.get("variants", []):
                v["id"] = f"var_{new_pid}_{uuid.uuid4().hex[:6]}"
                v["sku"] = _generate_sku(new_slug, v.get("color_name", "COL"), v.get("size", "OS"))

            self._store["products"][new_pid] = cloned
            self._log_audit(admin_identity, "duplicate_product", "product", new_pid, {"cloned_from": pid})
            self.save()
            return cloned

    # ── INVENTORY MANAGEMENT ───────────────────────────────────────

    def update_inventory_batch(self, updates: List[Dict[str, Any]], admin_identity: str = "admin") -> int:
        """
        Updates variant stock. Format: [{'product_id': 'p01', 'sku': '...', 'stock': 25}, ...]
        or [{'variant_id': '...', 'stock': 25}]
        """
        updated_count = 0
        with _lock:
            for item in updates:
                pid = item.get("product_id")
                sku = item.get("sku")
                var_id = item.get("variant_id")
                new_stock = int(item.get("stock", 0))

                for p in self._store["products"].values():
                    if pid and p["id"] != pid:
                        continue
                    matched = False
                    for v in p.get("variants", []):
                        if (sku and v.get("sku") == sku) or (var_id and v.get("id") == var_id):
                            v["stock"] = max(0, new_stock)
                            matched = True
                            updated_count += 1
                            break
                    if matched:
                        p["stock"] = sum(int(v.get("stock") or 0) for v in p.get("variants", []))
                        p["updated_at"] = _now_iso()

            if updated_count > 0:
                self._log_audit(admin_identity, "update_inventory", "inventory", "batch", {"count": updated_count})
                self.save()
        return updated_count

    def decrement_inventory_for_order(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Atomically decrements stock for purchased order items.
        Returns list of adjusted line items.
        """
        with _lock:
            adjusted = []
            for item in items:
                slug = item.get("slug")
                pid = item.get("id") or item.get("productId")
                size = item.get("size")
                color = item.get("color")
                qty = max(1, int(item.get("qty", 1)))

                # Find product
                product = None
                if pid and pid in self._store["products"]:
                    product = self._store["products"][pid]
                elif slug:
                    for p in self._store["products"].values():
                        if p.get("slug") == slug:
                            product = p
                            break

                if product:
                    # Find matching variant
                    matched_variant = None
                    for v in product.get("variants", []):
                        size_match = not size or (v.get("size", "").upper() == str(size).upper())
                        color_match = not color or (v.get("color_name", "").upper() == str(color).upper())
                        if size_match and color_match:
                            matched_variant = v
                            break

                    if matched_variant:
                        matched_variant["stock"] = max(0, matched_variant["stock"] - qty)
                        adjusted.append({
                            "product": product["name"],
                            "sku": matched_variant.get("sku"),
                            "size": size,
                            "color": color,
                            "remaining": matched_variant["stock"]
                        })
                    else:
                        # Fallback decrement product level stock
                        product["stock"] = max(0, product.get("stock", 0) - qty)
                        adjusted.append({
                            "product": product["name"],
                            "size": size,
                            "color": color,
                            "remaining": product["stock"]
                        })

                    product["stock"] = sum(int(v.get("stock") or 0) for v in product.get("variants", []))
                    product["updated_at"] = _now_iso()

            self.save()
            return adjusted

    # ── COLLECTIONS CRUD ───────────────────────────────────────────

    def list_collections(self, include_archived: bool = False) -> List[Dict[str, Any]]:
        with _lock:
            cols = []
            archived_slugs = {p.get("slug") for p in self._store.get("products", {}).values() if p.get("status") == "archived"}
            for c in self._store.get("collections", {}).values():
                col_copy = dict(c)
                if not include_archived:
                    col_copy["products"] = [s for s in col_copy.get("products", []) if s not in archived_slugs]
                cols.append(col_copy)
            return cols

    def get_collection(self, slug: str, include_archived: bool = False) -> Optional[Dict[str, Any]]:
        with _lock:
            col = self._store.get("collections", {}).get(slug)
            if not col:
                return None
            col_copy = dict(col)
            if not include_archived:
                archived_slugs = {p.get("slug") for p in self._store.get("products", {}).values() if p.get("status") == "archived"}
                col_copy["products"] = [s for s in col_copy.get("products", []) if s not in archived_slugs]
            return col_copy

    def save_collection(self, data: Dict[str, Any], admin_identity: str = "admin") -> Dict[str, Any]:
        with _lock:
            slug = data.get("slug", "").strip() or f"col-{uuid.uuid4().hex[:6]}"
            existing = self._store["collections"].get(slug)

            doc = {
                "id": existing.get("id") if existing else f"col_{slug}",
                "slug": slug,
                "title": data.get("title", slug.upper()),
                "kicker": data.get("kicker") or "COLLECTION",
                "desc": data.get("desc", ""),
                "image": data.get("image", ""),
                "products": data.get("products") or [],
                "isActive": bool(data.get("isActive", True)),
                "created_at": existing.get("created_at") if existing else _now_iso(),
                "updated_at": _now_iso(),
            }

            self._store["collections"][slug] = doc
            self._log_audit(admin_identity, "save_collection", "collection", slug, {"title": doc["title"]})
            self.save()
            return doc

    def delete_collection(self, slug: str, admin_identity: str = "admin") -> bool:
        with _lock:
            if slug in self._store["collections"]:
                del self._store["collections"][slug]
                self._log_audit(admin_identity, "delete_collection", "collection", slug, {})
                self.save()
                return True
        return False

    # ── DISCOUNTS & COUPONS ────────────────────────────────────────

    def list_discounts(self) -> List[Dict[str, Any]]:
        with _lock:
            return list(self._store.get("discounts", {}).values())

    def save_discount(self, data: Dict[str, Any], admin_identity: str = "admin") -> Dict[str, Any]:
        with _lock:
            code = data.get("code", "").strip().upper()
            if not code:
                raise ValueError("Coupon code is required.")

            existing = self._store["discounts"].get(code)
            doc = {
                "id": existing.get("id") if existing else f"dsc_{uuid.uuid4().hex[:6]}",
                "code": code,
                "discount_type": data.get("discount_type", "percentage"),
                "value": float(data.get("value", 10)),
                "min_order_amount": float(data.get("min_order_amount", 0)),
                "max_discount": float(data["max_discount"]) if data.get("max_discount") else None,
                "usage_limit": int(data["usage_limit"]) if data.get("usage_limit") else None,
                "usage_count": existing.get("usage_count", 0) if existing else 0,
                "is_active": bool(data.get("is_active", True)),
                "valid_from": data.get("valid_from") or _now_iso(),
                "valid_to": data.get("valid_to"),
                "description": data.get("description", ""),
                "updated_at": _now_iso(),
            }

            self._store["discounts"][code] = doc
            self._log_audit(admin_identity, "save_discount", "discount", code, {"type": doc["discount_type"], "value": doc["value"]})
            self.save()
            return doc

    def delete_discount(self, code: str, admin_identity: str = "admin") -> bool:
        with _lock:
            code = code.strip().upper()
            if code in self._store["discounts"]:
                del self._store["discounts"][code]
                self._log_audit(admin_identity, "delete_discount", "discount", code, {})
                self.save()
                return True
        return False

    def validate_discount(self, code: str, subtotal: int) -> Tuple[bool, int, str]:
        """
        Validates coupon against subtotal.
        Returns: (is_valid, discount_amount, message_or_reason)
        """
        with _lock:
            code_upper = (code or "").strip().upper()
            coupon = self._store.get("discounts", {}).get(code_upper)

            if not coupon:
                return False, 0, "Invalid coupon code."

            if not coupon.get("is_active", True):
                return False, 0, "This coupon has been disabled."

            # Usage limit check
            usage_limit = coupon.get("usage_limit")
            usage_count = coupon.get("usage_count", 0)
            if usage_limit and usage_count >= usage_limit:
                return False, 0, "This coupon has reached its usage limit."

            # Date validity
            now = datetime.now(timezone.utc)
            valid_to = coupon.get("valid_to")
            if valid_to:
                try:
                    exp = datetime.fromisoformat(valid_to.replace("Z", "+00:00"))
                    if now > exp:
                        return False, 0, "This coupon has expired."
                except Exception:
                    pass

            min_order = coupon.get("min_order_amount", 0)
            if subtotal < min_order:
                return False, 0, f"Minimum order amount of ₹{int(min_order)} required for this code."

            # Compute discount
            val = coupon.get("value", 0)
            dtype = coupon.get("discount_type", "percentage")

            if dtype == "percentage":
                discount = int(round(subtotal * (val / 100.0)))
                max_d = coupon.get("max_discount")
                if max_d and discount > max_d:
                    discount = int(max_d)
            else:
                discount = int(min(val, subtotal))

            return True, discount, f"Coupon {code_upper} applied (-₹{discount})"

    # ── STOREFRONT CMS CONTENT ─────────────────────────────────────

    def get_storefront_content(self) -> Dict[str, Any]:
        with _lock:
            return self._store.get("storefront", {})

    def update_storefront_content(self, data: Dict[str, Any], admin_identity: str = "admin") -> Dict[str, Any]:
        with _lock:
            self._store["storefront"].update(data)
            self._log_audit(admin_identity, "update_storefront", "cms", "homepage", {"keys": list(data.keys())})
            self.save()
            return self._store["storefront"]

    # ── ADMIN SESSIONS & SECURITY ──────────────────────────────────

    def create_admin_session(self, admin_identity: str = "staff") -> str:
        with _lock:
            token = f"nlyk_adm_{uuid.uuid4().hex}"
            expires = datetime.now(timezone.utc) + timedelta(hours=48)
            self._store.setdefault("admin_sessions", {})[token] = {
                "token": token,
                "admin_identity": admin_identity,
                "created_at": _now_iso(),
                "expires_at": expires.isoformat(),
            }
            self.save()
            return token

    def validate_admin_session(self, token: str) -> Optional[Dict[str, Any]]:
        if not token:
            return None
        with _lock:
            session = self._store.get("admin_sessions", {}).get(token)
            if not session:
                return None
            try:
                exp = datetime.fromisoformat(session["expires_at"].replace("Z", "+00:00"))
                if datetime.now(timezone.utc) > exp:
                    del self._store["admin_sessions"][token]
                    self.save()
                    return None
            except Exception:
                return None
            return session

    def revoke_admin_session(self, token: str) -> bool:
        with _lock:
            if token in self._store.get("admin_sessions", {}):
                del self._store["admin_sessions"][token]
                self.save()
                return True
        return False

    # ── AUDIT LOGS ─────────────────────────────────────────────────

    def _log_audit(self, admin_identity: str, action: str, entity_type: str, entity_id: str, details: Dict[str, Any]):
        log_entry = {
            "id": f"log_{uuid.uuid4().hex[:8]}",
            "admin_identity": admin_identity,
            "action": action,
            "entity_type": entity_type,
            "entity_id": str(entity_id),
            "details": details,
            "timestamp": _now_iso(),
        }
        logs = self._store.setdefault("audit_logs", [])
        logs.insert(0, log_entry)
        if len(logs) > 500:
            self._store["audit_logs"] = logs[:500]

    def get_audit_logs(self, limit: int = 50) -> List[Dict[str, Any]]:
        with _lock:
            return self._store.get("audit_logs", [])[:limit]

    # ── ANALYTICS SUMMARY ──────────────────────────────────────────

    def get_analytics_summary(self, orders_list: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        with _lock:
            prods = list(self._store.get("products", {}).values())
            active_prods = [p for p in prods if p.get("status") == "active"]
            total_stock = sum(p.get("stock", 0) for p in active_prods)
            low_stock_items = [p for p in active_prods if p.get("stock", 0) <= 10]

            total_revenue = 0
            order_count = 0
            recent_orders = []

            if orders_list:
                order_count = len(orders_list)
                for o in orders_list:
                    total_revenue += int(o.get("total") or 0)
                recent_orders = orders_list[:5]

            aov = int(total_revenue / order_count) if order_count > 0 else 0

            return {
                "total_products": len(active_prods),
                "total_stock_units": total_stock,
                "low_stock_count": len(low_stock_items),
                "total_revenue": total_revenue,
                "total_orders": order_count,
                "average_order_value": aov,
                "recent_orders": recent_orders,
            }

    def _enrich_product(self, p: Dict[str, Any]) -> Dict[str, Any]:
        p_slug = p.get("slug")
        matched = []
        for col_slug, col in self._store.get("collections", {}).items():
            if p_slug in col.get("products", []):
                matched.append(col_slug)
        p_copy = dict(p)
        p_copy["collections"] = matched
        return p_copy

    # ── ORDERS & TRACKING ──────────────────────────────────────────

    def list_orders(self, status: Optional[str] = None, search: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
        with _lock:
            orders = list(self._store.get("orders", {}).values())

        orders.sort(key=lambda o: o.get("created_at") or "", reverse=True)
        filtered = []
        q = (search or "").strip().lower()

        for o in orders:
            if status and status.lower() != "all":
                if (o.get("status") or "").lower() != status.lower():
                    continue
            if q:
                oid = (o.get("order_id") or "").lower()
                name = (o.get("name") or "").lower()
                email = (o.get("email") or "").lower()
                phone = (o.get("phone") or "").lower()
                awb = (o.get("tracking_awb") or "").lower()
                if not (q in oid or q in name or q in email or q in phone or q in awb):
                    continue
            filtered.append(o)

        return filtered[:limit]

    def get_order(self, order_id: str) -> Optional[Dict[str, Any]]:
        clean_id = (order_id or "").strip().upper()
        with _lock:
            for oid, order in self._store.get("orders", {}).items():
                if oid.upper() == clean_id or (order.get("order_id") or "").upper() == clean_id:
                    return order
        return None

    def save_order(self, order_data: Dict[str, Any], admin_identity: str = "system") -> Dict[str, Any]:
        with _lock:
            order_id = order_data.get("order_id") or f"NLO-{uuid.uuid4().hex[:6].upper()}"
            order_data["order_id"] = order_id
            order_data.setdefault("created_at", _now_iso())
            order_data.setdefault("status", "placed")
            order_data.setdefault("payment_status", "PENDING")
            order_data.setdefault("payment_method", "Razorpay UPI")
            self._store.setdefault("orders", {})[order_id] = order_data
            self._log_audit(admin_identity, "save_order", "order", order_id, {"status": order_data.get("status"), "total": order_data.get("total")})
            self.save()
            return order_data

    def update_order_tracking(
        self,
        order_id: str,
        tracking_partner: Optional[str] = None,
        tracking_awb: Optional[str] = None,
        tracking_url: Optional[str] = None,
        status: Optional[str] = None,
        notes: Optional[str] = None,
        admin_identity: str = "admin",
    ) -> Optional[Dict[str, Any]]:
        with _lock:
            order = self.get_order(order_id)
            if not order:
                return None

            now = _now_iso()
            if tracking_partner:
                order["tracking_partner"] = tracking_partner
            if tracking_awb:
                order["tracking_awb"] = tracking_awb.strip().upper()
                if not tracking_url:
                    p_lower = (tracking_partner or "").lower()
                    if "delhivery" in p_lower:
                        order["tracking_url"] = f"https://www.delhivery.com/track/package/{order['tracking_awb']}"
                    elif "bluedart" in p_lower:
                        order["tracking_url"] = f"https://www.bluedart.com/tracking?awb={order['tracking_awb']}"
                    elif "shiprocket" in p_lower:
                        order["tracking_url"] = f"https://shiprocket.co/tracking/{order['tracking_awb']}"
            if tracking_url:
                order["tracking_url"] = tracking_url

            if notes:
                order["notes"] = notes

            if status:
                st = status.strip().lower()
                order["status"] = st
                if st == "shipped" and not order.get("shipped_at"):
                    order["shipped_at"] = now
                elif st == "delivered" and not order.get("delivered_at"):
                    order["delivered_at"] = now

            order["updated_at"] = now
            self._store["orders"][order["order_id"]] = order
            self._log_audit(admin_identity, "update_order_tracking", "order", order["order_id"], {
                "status": order.get("status"),
                "partner": order.get("tracking_partner"),
                "awb": order.get("tracking_awb"),
            })
            self.save()
            return order

    def update_order_payment(
        self,
        order_id: str,
        payment_status: Optional[str] = None,
        payment_method: Optional[str] = None,
        razorpay_payment_id: Optional[str] = None,
        admin_identity: str = "admin",
    ) -> Optional[Dict[str, Any]]:
        with _lock:
            order = self.get_order(order_id)
            if not order:
                return None

            if payment_status:
                order["payment_status"] = payment_status.strip().upper()
            if payment_method:
                order["payment_method"] = payment_method.strip()
            if razorpay_payment_id:
                order["razorpay_payment_id"] = razorpay_payment_id.strip()

            order["updated_at"] = _now_iso()
            self._store["orders"][order["order_id"]] = order
            self._log_audit(admin_identity, "update_order_payment", "order", order["order_id"], {
                "payment_status": order.get("payment_status"),
                "payment_method": order.get("payment_method"),
            })
            self.save()
            return order

    # ── CUSTOMER & ACCOUNT PROFILES ────────────────────────────────

    def list_customers(self, search: Optional[str] = None) -> List[Dict[str, Any]]:
        with _lock:
            orders = list(self._store.get("orders", {}).values())
            accounts = list(self._store.get("sign_in_accounts", {}).values())

        customer_map: Dict[str, Dict[str, Any]] = {}

        # First add from sign in accounts
        for acc in accounts:
            email = (acc.get("email") or "").lower().strip()
            if email:
                customer_map[email] = {
                    "id": f"cust_{email.replace('@', '_').replace('.', '_')}",
                    "name": acc.get("name") or email.split("@")[0].upper(),
                    "email": email,
                    "phone": acc.get("phone") or "—",
                    "city": "—",
                    "state": "—",
                    "pincode": "—",
                    "membership_tier": acc.get("membership") or "MEMBER",
                    "auth_provider": acc.get("auth_provider") or "Email OTP",
                    "total_orders": 0,
                    "total_spent": 0,
                    "orders": [],
                    "first_order_at": acc.get("created_at") or _now_iso(),
                    "last_order_at": acc.get("last_sign_in") or _now_iso(),
                    "email_verified": acc.get("email_verified", True),
                }

        # Aggregate from orders
        for o in orders:
            email = (o.get("email") or "").lower().strip()
            if not email:
                email = f"guest_{o.get('order_id', '0').lower()}@nalayak.internal"

            cust = customer_map.setdefault(email, {
                "id": f"cust_{email.replace('@', '_').replace('.', '_')}",
                "name": o.get("name", "GUEST CUSTOMER"),
                "email": email,
                "phone": o.get("phone", "—"),
                "city": o.get("address", {}).get("city") or "—",
                "state": o.get("address", {}).get("state") or "—",
                "pincode": o.get("address", {}).get("pincode") or "—",
                "membership_tier": "GUEST",
                "auth_provider": "Checkout Guest",
                "total_orders": 0,
                "total_spent": 0,
                "orders": [],
                "first_order_at": o.get("created_at"),
                "last_order_at": o.get("created_at"),
                "email_verified": False,
            })

            cust["total_orders"] += 1
            cust["total_spent"] += int(o.get("total") or 0)
            cust["orders"].append({
                "order_id": o.get("order_id"),
                "date": o.get("created_at"),
                "total": o.get("total"),
                "status": o.get("status"),
                "items_count": len(o.get("items") or []),
            })

            if o.get("phone") and cust.get("phone") == "—":
                cust["phone"] = o["phone"]
            if o.get("address", {}).get("city") and cust.get("city") == "—":
                cust["city"] = o["address"]["city"]
                cust["state"] = o["address"].get("state", "—")
                cust["pincode"] = o["address"].get("pincode", "—")

            if o.get("created_at"):
                if not cust.get("last_order_at") or o["created_at"] > cust["last_order_at"]:
                    cust["last_order_at"] = o["created_at"]
                if not cust.get("first_order_at") or o["created_at"] < cust["first_order_at"]:
                    cust["first_order_at"] = o["created_at"]

        customers = list(customer_map.values())
        customers.sort(key=lambda c: c.get("total_spent", 0), reverse=True)

        if search:
            q = search.strip().lower()
            customers = [
                c for c in customers
                if q in c.get("name", "").lower() or q in c.get("email", "").lower() or q in c.get("phone", "").lower() or q in c.get("city", "").lower()
            ]

        return customers

    def list_sign_in_accounts(self) -> List[Dict[str, Any]]:
        with _lock:
            accounts = list(self._store.get("sign_in_accounts", {}).values())
        accounts.sort(key=lambda a: a.get("last_sign_in") or a.get("created_at") or "", reverse=True)
        return accounts

    # ── IRL COMMUNITY & BRAND LOOKBOOK ─────────────────────────────

    def list_irl(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        with _lock:
            items = list(self._store.get("irl", {}).values())
        items.sort(key=lambda i: i.get("created_at") or "", reverse=True)
        if status and status.lower() != "all":
            items = [i for i in items if (i.get("status") or "").lower() == status.lower()]
        return items

    def update_irl_status(self, file_id: str, status: str, admin_identity: str = "admin") -> Optional[Dict[str, Any]]:
        with _lock:
            item = self._store.get("irl", {}).get(file_id)
            if not item:
                return None
            clean_status = "approved" if status.lower() == "approved" else "rejected"
            item["status"] = clean_status
            item["updated_at"] = _now_iso()
            self._log_audit(admin_identity, "update_irl_status", "irl", file_id, {"status": clean_status})
            self.save()
            return item

    def create_irl_entry(self, data: Dict[str, Any], admin_identity: str = "admin") -> Dict[str, Any]:
        with _lock:
            file_id = data.get("id") or f"irl_{uuid.uuid4().hex[:8]}"
            entry = {
                "id": file_id,
                "name": data.get("name", "NALAYAK COMMUNITY").strip(),
                "handle": data.get("handle") or "@nalayakstudios",
                "city": data.get("city") or "Kolkata",
                "image_url": data.get("image_url") or "/editorial/custom-atelier-studio.jpg",
                "caption": data.get("caption") or "Nalayak AW26 Studio Fit.",
                "order_id": data.get("order_id"),
                "status": data.get("status", "approved"),
                "created_at": _now_iso(),
                "updated_at": _now_iso(),
            }
            self._store.setdefault("irl", {})[file_id] = entry
            self._log_audit(admin_identity, "create_irl", "irl", file_id, {"name": entry["name"]})
            self.save()
            return entry

    def delete_irl_entry(self, file_id: str, admin_identity: str = "admin") -> bool:
        with _lock:
            if file_id in self._store.get("irl", {}):
                del self._store["irl"][file_id]
                self._log_audit(admin_identity, "delete_irl", "irl", file_id, {})
                self.save()
                return True
        return False

    def _seed_orders_customers_and_irl(self):
        orders = {
            "NLO-8921": {
                "order_id": "NLO-8921",
                "name": "AARAV SEN",
                "email": "aarav.sen@gmail.com",
                "phone": "+91 98301 22891",
                "address": {
                    "line1": "72 Park Street, Flat 4B",
                    "city": "Kolkata",
                    "state": "West Bengal",
                    "pincode": "700016"
                },
                "items": [
                    {
                        "id": "p_01",
                        "name": "THE DEVANAGARI CHAOS TEE",
                        "color": "BLACK",
                        "size": "L",
                        "qty": 1,
                        "price": 1499,
                        "image": "/products/devanagari-chaos-tee-front.jpg"
                    }
                ],
                "subtotal": 1499,
                "discount": 0,
                "coupon_code": None,
                "shipping": 0,
                "total": 1499,
                "payment_method": "Razorpay UPI",
                "payment_status": "PAID",
                "razorpay_payment_id": "pay_NLYK89210aX",
                "razorpay_order_id": "order_NLYK89210",
                "status": "shipped",
                "tracking_partner": "Delhivery Express",
                "tracking_awb": "DEL9821447012",
                "tracking_url": "https://www.delhivery.com/track/package/DEL9821447012",
                "created_at": "2026-10-23T10:15:00Z",
                "shipped_at": "2026-10-24T14:30:00Z",
                "delivered_at": None
            },
            "NLO-7840": {
                "order_id": "NLO-7840",
                "name": "PRIYA CHATTERJEE",
                "email": "priya.c@outlook.com",
                "phone": "+91 98200 44512",
                "address": {
                    "line1": "14 Bandra West, Perry Cross Rd",
                    "city": "Mumbai",
                    "state": "Maharashtra",
                    "pincode": "400050"
                },
                "items": [
                    {
                        "id": "p_02",
                        "name": "AFTER HOURS STEALTH HOODIE",
                        "color": "BLACK",
                        "size": "M",
                        "qty": 1,
                        "price": 2899,
                        "image": "/products/after-hours-stealth-hoodie-front.jpg"
                    }
                ],
                "subtotal": 2899,
                "discount": 500,
                "coupon_code": "CHAOS500",
                "shipping": 0,
                "total": 2399,
                "payment_method": "Razorpay Cards (Visa **** 4012)",
                "payment_status": "PAID",
                "razorpay_payment_id": "pay_NLYK78400bY",
                "razorpay_order_id": "order_NLYK78400",
                "status": "delivered",
                "tracking_partner": "BlueDart Prime",
                "tracking_awb": "BLU459102837",
                "tracking_url": "https://www.bluedart.com/tracking?awb=BLU459102837",
                "created_at": "2026-10-20T16:45:00Z",
                "shipped_at": "2026-10-21T11:00:00Z",
                "delivered_at": "2026-10-23T18:20:00Z"
            },
            "NLO-9104": {
                "order_id": "NLO-9104",
                "name": "ROHAN VERMA",
                "email": "rohan.verma@gmail.com",
                "phone": "+91 99112 55678",
                "address": {
                    "line1": "204 Hauz Khas Village",
                    "city": "New Delhi",
                    "state": "Delhi",
                    "pincode": "110016"
                },
                "items": [
                    {
                        "id": "p_04",
                        "name": "TACTICAL UTILITY CARGO",
                        "color": "BLACK",
                        "size": "32",
                        "qty": 1,
                        "price": 2499,
                        "image": "/female-jeans-chain.png"
                    }
                ],
                "subtotal": 2499,
                "discount": 0,
                "coupon_code": None,
                "shipping": 0,
                "total": 2499,
                "payment_method": "Cash on Delivery (COD)",
                "payment_status": "PENDING",
                "razorpay_payment_id": None,
                "razorpay_order_id": None,
                "status": "confirmed",
                "tracking_partner": "Shiprocket Air",
                "tracking_awb": "SR91040021",
                "tracking_url": "https://shiprocket.co/tracking/SR91040021",
                "created_at": "2026-10-25T08:20:00Z",
                "shipped_at": None,
                "delivered_at": None
            },
            "NLO-5494": {
                "order_id": "NLO-5494",
                "name": "KABIR MEHTA",
                "email": "kabir.mehta@gmail.com",
                "phone": "+91 98450 77123",
                "address": {
                    "line1": "45 Indiranagar, 100ft Rd",
                    "city": "Bengaluru",
                    "state": "Karnataka",
                    "pincode": "560038"
                },
                "items": [
                    {
                        "id": "p_05",
                        "name": "NALAYAK CHAIN NECKLACE",
                        "color": "SILVER",
                        "size": "OS",
                        "qty": 1,
                        "price": 999,
                        "image": "/products/nalayak-chain-front.png"
                    }
                ],
                "subtotal": 999,
                "discount": 0,
                "coupon_code": None,
                "shipping": 0,
                "total": 999,
                "payment_method": "Razorpay NetBanking (HDFC)",
                "payment_status": "PAID",
                "razorpay_payment_id": "pay_NLYK54940cZ",
                "razorpay_order_id": "order_NLYK54940",
                "status": "placed",
                "tracking_partner": "Delhivery Express",
                "tracking_awb": "DEL54940081",
                "tracking_url": "https://www.delhivery.com/track/package/DEL54940081",
                "created_at": "2026-10-25T11:00:00Z",
                "shipped_at": None,
                "delivered_at": None
            }
        }

        irl = {
            "irl_01": {
                "id": "irl_01",
                "name": "Kabir M.",
                "handle": "@kabir_nlyk",
                "city": "Mumbai",
                "image_url": "photo-1531891437562-4301cf35b7e4",
                "caption": "After Hours stealth hoodie in Ballard Estate. Heavy drape hits different.",
                "order_id": "NLO-7840",
                "status": "approved",
                "created_at": "2026-10-21T14:00:00Z"
            },
            "irl_02": {
                "id": "irl_02",
                "name": "Ananya D.",
                "handle": "@ananya.fits",
                "city": "Kolkata",
                "image_url": "photo-1524504388940-b1c1722653e1",
                "caption": "Devanagari Chaos tee styled with oversized utility pants.",
                "order_id": "NLO-8921",
                "status": "approved",
                "created_at": "2026-10-22T17:30:00Z"
            },
            "irl_03": {
                "id": "irl_03",
                "name": "Devansh K.",
                "handle": "@devansh_raw",
                "city": "Bengaluru",
                "image_url": "photo-1517841905240-472988babdf9",
                "caption": "Street cut AW26. Boxy silhouette is exact.",
                "order_id": None,
                "status": "approved",
                "created_at": "2026-10-23T11:15:00Z"
            },
            "irl_04": {
                "id": "irl_04",
                "name": "Tara Roy",
                "handle": "@tara_nlyk",
                "city": "Delhi",
                "image_url": "photo-1492707892479-7bc8d5a4ee93",
                "caption": "Tactical cargo chain detail in CP. Streetwear perfection.",
                "order_id": "NLO-9104",
                "status": "approved",
                "created_at": "2026-10-25T12:00:00Z"
            }
        }

        sign_in_accounts = {
            "aarav.sen@gmail.com": {
                "email": "aarav.sen@gmail.com",
                "name": "Aarav Sen",
                "role": "VIP Club Member",
                "auth_provider": "Email OTP",
                "membership": "LIFETIME CLUB",
                "phone": "+91 98301 22891",
                "created_at": "2026-09-15T10:00:00Z",
                "last_sign_in": "2026-10-25T14:12:00Z",
                "email_verified": True
            },
            "priya.c@outlook.com": {
                "email": "priya.c@outlook.com",
                "name": "Priya Chatterjee",
                "role": "Customer",
                "auth_provider": "Google OAuth",
                "membership": "MEMBER",
                "phone": "+91 98200 44512",
                "created_at": "2026-10-01T12:30:00Z",
                "last_sign_in": "2026-10-24T18:40:00Z",
                "email_verified": True
            },
            "rohan.verma@gmail.com": {
                "email": "rohan.verma@gmail.com",
                "name": "Rohan Verma",
                "role": "Customer",
                "auth_provider": "Email OTP",
                "membership": "GUEST",
                "phone": "+91 99112 55678",
                "created_at": "2026-10-18T09:15:00Z",
                "last_sign_in": "2026-10-25T08:19:00Z",
                "email_verified": True
            }
        }

        self._store["orders"] = orders
        self._store["irl"] = irl
        self._store["sign_in_accounts"] = sign_in_accounts

    def _seed_categories(self):
        default_categories = {
            "tees": {
                "id": "cat_tees",
                "slug": "tees",
                "name": "TEES",
                "subtitle": "240 GSM COMBED COTTON",
                "desc": "Heavyweight combed cotton oversized tees with drop-shoulder silhouettes.",
                "image": "/products/devanagari-chaos-tee-front.jpg",
                "display_order": 1,
                "is_active": True,
            },
            "shirts": {
                "id": "cat_shirts",
                "slug": "shirts",
                "name": "SHIRTS",
                "subtitle": "HEAVYWEIGHT TWILL & RELAXED",
                "desc": "Relaxed-fit heavyweight twill and utility button-downs.",
                "image": "photo-1596755094514-f87e34085b2c",
                "display_order": 2,
                "is_active": True,
            },
            "hoodies": {
                "id": "cat_hoodies",
                "slug": "hoodies",
                "name": "HOODIES",
                "subtitle": "450 GSM BRUSHED FLEECE",
                "desc": "Ultra-dense 450 GSM box-cut fleece hoodies and crewnecks.",
                "image": "/products/after-hours-stealth-hoodie-front.jpg",
                "display_order": 3,
                "is_active": True,
            },
            "bottoms": {
                "id": "cat_bottoms",
                "slug": "bottoms",
                "name": "BOTTOMS",
                "subtitle": "WIDE-LEG CARGOS & DENIM",
                "desc": "Tactical wide-leg cargo pants, heavy wash denim and hardware tracks.",
                "image": "/female-jeans-chain.png",
                "display_order": 4,
                "is_active": True,
            },
            "accessories": {
                "id": "cat_accessories",
                "slug": "accessories",
                "name": "ACCESSORIES",
                "subtitle": "HARDWARE, CAPS & BAGS",
                "desc": "Signature sterling-finish chains, distress-embroidered caps and heavy canvas totes.",
                "image": "/products/nalayak-chain-front.png",
                "display_order": 5,
                "is_active": True,
            },
            "custom-design": {
                "id": "cat_custom_design",
                "slug": "custom-design",
                "name": "CUSTOM DESIGN",
                "subtitle": "BESPOKE 1-OF-1 ATELIER",
                "desc": "Bespoke 1-of-1 editorial atelier pieces handcrafted on demand.",
                "image": "/editorial/about-hero-streetwear.jpg",
                "display_order": 6,
                "is_active": True,
            },
        }
        self._store["categories"] = default_categories

    def list_categories(self, include_inactive: bool = False) -> List[Dict[str, Any]]:
        with _lock:
            cats = []
            prod_counts = {}
            for p in self._store.get("products", {}).values():
                if p.get("status") == "active":
                    cat_slug = (p.get("category") or "").lower()
                    prod_counts[cat_slug] = prod_counts.get(cat_slug, 0) + 1

            for c in self._store.get("categories", {}).values():
                if not include_inactive and not c.get("is_active", True):
                    continue
                copy_c = dict(c)
                copy_c["product_count"] = prod_counts.get(copy_c.get("slug", "").lower(), 0)
                cats.append(copy_c)

            cats.sort(key=lambda x: (int(x.get("display_order") or 99), x.get("name", "")))
            return cats

    def get_category(self, slug_or_id: str) -> Optional[Dict[str, Any]]:
        with _lock:
            if slug_or_id in self._store.get("categories", {}):
                return dict(self._store["categories"][slug_or_id])
            for c in self._store.get("categories", {}).values():
                if c.get("id") == slug_or_id or c.get("slug") == slug_or_id:
                    return dict(c)
            return None

    def save_category(self, data: Dict[str, Any], admin_identity: str = "admin") -> Dict[str, Any]:
        with _lock:
            slug = (data.get("slug") or "").strip().lower()
            name = (data.get("name") or data.get("title") or slug.upper()).strip()
            if not slug:
                slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-') or f"cat-{uuid.uuid4().hex[:6]}"

            existing = self._store.get("categories", {}).get(slug)
            old_slug = data.get("old_slug")

            # Update products if slug renamed
            if old_slug and old_slug != slug and old_slug in self._store.get("categories", {}):
                del self._store["categories"][old_slug]
                for p in self._store.get("products", {}).values():
                    if (p.get("category") or "").lower() == old_slug.lower():
                        p["category"] = slug

            cat_id = data.get("id") or (existing.get("id") if existing else f"cat_{slug}")
            doc = {
                "id": cat_id,
                "slug": slug,
                "name": name,
                "subtitle": (data.get("subtitle") or data.get("kicker") or "").strip(),
                "desc": (data.get("desc") or data.get("description") or "").strip(),
                "image": data.get("image") or "/products/devanagari-chaos-tee-front.jpg",
                "display_order": int(data.get("display_order") or 99),
                "is_active": bool(data.get("is_active", True)),
                "updated_at": _now_iso(),
            }
            if not existing:
                doc["created_at"] = _now_iso()

            self._store.setdefault("categories", {})[slug] = doc
            action = "update_category" if existing else "create_category"
            self._log_audit(admin_identity, action, "category", cat_id, {"slug": slug, "name": name})
            self.save()
            return doc

    def delete_category(self, slug_or_id: str, admin_identity: str = "admin") -> bool:
        with _lock:
            target_slug = None
            if slug_or_id in self._store.get("categories", {}):
                target_slug = slug_or_id
            else:
                for s, c in self._store.get("categories", {}).items():
                    if c.get("id") == slug_or_id or c.get("slug") == slug_or_id:
                        target_slug = s
                        break

            if not target_slug:
                return False

            cat = self._store["categories"][target_slug]
            name = cat.get("name")
            del self._store["categories"][target_slug]
            self._log_audit(admin_identity, "delete_category", "category", slug_or_id, {"name": name, "slug": target_slug})
            self.save()
            return True


    def _seed_reviews(self):
        initial_reviews = [
            {
                "id": "rev-01",
                "source": "community",
                "status": "approved",
                "is_demo": True,
                "author": "Rohan D.",
                "initials": "RD",
                "avatar_url": "photo-1507003211169-0a1dd7228f2d",
                "image": "/products/devanagari-chaos-tee-front.jpg",
                "product_slug": "nalayak-standard-tee",
                "productSlug": "nalayak-standard-tee",
                "location": "Kolkata, WB",
                "piece": "NALAYAK Standard Tee",
                "variant": "Jet Black / Size L",
                "rating": 5,
                "category": "fabric",
                "category_label": "FABRIC & WEIGHT",
                "categoryLabel": "FABRIC & WEIGHT",
                "highlight": "240 GSM THAT HOLDS ITS SHAPE",
                "quote": "The 240 GSM weight is no joke. Most Indian streetwear brands claim boxy and send you a limp regular tee. This holds its silhouette even after three hard washes in Kolkata humidity.",
                "specs": [
                    {"label": "WEIGHT", "value": "240 GSM"},
                    {"label": "CUT", "value": "Drop Shoulder"},
                    {"label": "DURABILITY", "value": "Zero Shrinkage"},
                ],
                "date": "OCT 2026",
                "batch": "BATCH 001 · ARCHIVE",
                "tag": "240 GSM HEAVYWEIGHT",
                "is_verified_buyer": True,
                "verified_badge": "✦ VERIFIED BUYER",
                "created_at": "2026-10-01T10:00:00Z",
            },
            {
                "id": "rev-02",
                "source": "community",
                "status": "approved",
                "is_demo": True,
                "author": "Ananya M.",
                "initials": "AM",
                "avatar_url": "photo-1494790108377-be9c29b29330",
                "image": "/products/everyday-nalayak-essential-tee-front.jpg",
                "product_slug": "no-approval-oversized-tee",
                "productSlug": "no-approval-oversized-tee",
                "location": "Mumbai, MH",
                "piece": "No Approval Oversized Tee",
                "variant": "Chalk White / Size M",
                "rating": 5,
                "category": "identity",
                "category_label": "BRAND IDENTITY",
                "categoryLabel": "BRAND IDENTITY",
                "highlight": "FAMILY UNCLE APPROVED? DEFINITELY NOT",
                "quote": "Wore the No Approval tee to a family Diwali function. My uncle stared at the back graphic for two straight minutes without speaking. 10/10, brand promise fulfilled.",
                "specs": [
                    {"label": "GRAPHIC", "value": "High-Density Screen"},
                    {"label": "REACTION", "value": "Pure Disapproval"},
                    {"label": "SILHOUETTE", "value": "True Oversized"},
                ],
                "date": "SEP 2026",
                "batch": "DROP 02 · VERBATIM",
                "tag": "NO APPROVAL · DROP 02",
                "is_verified_buyer": True,
                "verified_badge": "✦ FOUNDING MEMBER",
                "created_at": "2026-09-15T12:00:00Z",
            },
            {
                "id": "rev-03",
                "source": "community",
                "status": "approved",
                "is_demo": True,
                "author": "Kabir S.",
                "initials": "KS",
                "avatar_url": "photo-1500648767791-00dcc994a43e",
                "image": "/products/archive-specimen-series-001-front.jpg",
                "product_slug": "chaos-club-tee",
                "productSlug": "chaos-club-tee",
                "location": "Delhi NCR",
                "piece": "Chaos Club Tee",
                "variant": "Ash Grey / Size XL",
                "rating": 5,
                "category": "fit",
                "category_label": "FIT & SILHOUETTE",
                "categoryLabel": "FIT & SILHOUETTE",
                "highlight": "TRUE DROP SHOULDER WITHOUT EXCESS BAGGAGE",
                "quote": "True drop shoulder that actually drapes down the tricep rather than just looking two sizes too big. Collar ribbing is tight 1.25\" and doesn’t bacon after line drying.",
                "specs": [
                    {"label": "COLLAR", "value": "1.25\" Heavy Rib"},
                    {"label": "DRAPE", "value": "Structured Boxy"},
                    {"label": "ROTATION", "value": "Daily Essential"},
                ],
                "date": "AUG 2026",
                "batch": "DROP 01 · CORE",
                "tag": "1.25\" HEAVY RIB",
                "is_verified_buyer": True,
                "verified_badge": "✦ VERIFIED BUYER",
                "created_at": "2026-08-20T14:30:00Z",
            },
            {
                "id": "rev-04",
                "source": "community",
                "status": "approved",
                "is_demo": True,
                "author": "Tanya K.",
                "initials": "TK",
                "avatar_url": "photo-1524504388940-b1c1722653e1",
                "image": "/products/wrong-crowd-tee-front.jpg",
                "product_slug": "basically-famous-tee",
                "productSlug": "basically-famous-tee",
                "location": "Bengaluru, KA",
                "piece": "Basically Famous Tee",
                "variant": "Jet Black / Size S",
                "rating": 5,
                "category": "print",
                "category_label": "PRINT QUALITY",
                "categoryLabel": "PRINT QUALITY",
                "highlight": "SCREENPRINT IN THE FIBERS, NOT PLASTIC",
                "quote": "The screenprint feels embedded into the cotton fibers instead of a thick rubbery sticker slapped on top. Breathable even when riding in 32° heat.",
                "specs": [
                    {"label": "PRINT TYPE", "value": "Discharge Inks"},
                    {"label": "FEEL", "value": "Soft Breathable"},
                    {"label": "FABRIC", "value": "100% Combed"},
                ],
                "date": "OCT 2026",
                "batch": "BATCH 003 · EDITORIAL",
                "tag": "DISCHARGE INK",
                "is_verified_buyer": True,
                "verified_badge": "✦ ATELIER TESTED",
                "created_at": "2026-10-10T16:00:00Z",
            },
            {
                "id": "rev-05",
                "source": "community",
                "status": "approved",
                "is_demo": True,
                "author": "Varun P.",
                "initials": "VP",
                "avatar_url": "photo-1506794778202-cad84cf45f1d",
                "image": "/products/after-hours-stealth-hoodie-front.jpg",
                "product_slug": "after-hours-stealth-hoodie",
                "productSlug": "after-hours-stealth-hoodie",
                "location": "Pune, MH",
                "piece": "Acid Wash Oversized Hoodie",
                "variant": "Vintage Charcoal / Size L",
                "rating": 5,
                "category": "fabric",
                "category_label": "WINTER WEIGHT",
                "categoryLabel": "WINTER WEIGHT",
                "highlight": "DOUBLE-LAYER HOOD THAT ACTUALLY STANDS UP",
                "quote": "Heaviest hoodie in my rotation. The double-layered hood actually stays upright and doesn’t collapse flat against your collarbones. Ribbed cuffs don’t stretch out.",
                "specs": [
                    {"label": "WEIGHT", "value": "420 GSM Fleece"},
                    {"label": "HOOD", "value": "Double-Layered"},
                    {"label": "CUFFS", "value": "Form-Retaining"},
                ],
                "date": "SEP 2026",
                "batch": "WINTER 26 · HEAVY",
                "tag": "420 GSM FLEECE",
                "is_verified_buyer": True,
                "verified_badge": "✦ VERIFIED BUYER",
                "created_at": "2026-09-28T09:00:00Z",
            },
            {
                "id": "rev-06",
                "source": "community",
                "status": "approved",
                "is_demo": True,
                "author": "Meera V.",
                "initials": "MV",
                "avatar_url": "photo-1531746020798-e6953c6e8e04",
                "image": "/products/her-chaos-crop-tee-front.jpg",
                "product_slug": "her-chaos-crop-tee",
                "productSlug": "her-chaos-crop-tee",
                "location": "Hyderabad, TS",
                "piece": "Her Chaos Crop Tee",
                "variant": "Paper White / Size M",
                "rating": 5,
                "category": "fit",
                "category_label": "PROPORTIONS & CUT",
                "categoryLabel": "PROPORTIONS & CUT",
                "highlight": "SHARP BOXY CROP WITHOUT BEING FLIMSY",
                "quote": "Most women’s streetwear crops are either paper-thin or cut like an awkward square box. This has proper structured shoulders and sits right at the high waistband.",
                "specs": [
                    {"label": "WEIGHT", "value": "220 GSM"},
                    {"label": "CROP", "value": "High Waist Cut"},
                    {"label": "HEM", "value": "Reinforced Twin"},
                ],
                "date": "AUG 2026",
                "batch": "DROP 02 · WOMENS",
                "tag": "STRUCTURED CROP",
                "is_verified_buyer": True,
                "verified_badge": "✦ VERIFIED BUYER",
                "created_at": "2026-08-14T11:00:00Z",
            },
        ]
        self._store.setdefault("reviews", {})
        for rev in initial_reviews:
            self._store["reviews"][rev["id"]] = rev

    def list_reviews(self, status: Optional[str] = None, source: Optional[str] = None, include_demo: bool = False) -> List[Dict[str, Any]]:
        with _lock:
            reviews_dict = self._store.get("reviews", {})
            results = list(reviews_dict.values())
            
            # Filter out demo/design fixtures from live production feed unless specifically requested
            if not include_demo:
                results = [r for r in results if not r.get("is_demo")]
            
            if status and status.lower() != "all":
                target_status = status.lower()
                results = [r for r in results if str(r.get("status", "")).lower() == target_status]
                
            if source and source.lower() != "all":
                target_source = source.lower()
                results = [r for r in results if str(r.get("source", "")).lower() == target_source]
                
            # Sort by created_at descending (newest first)
            results.sort(key=lambda r: str(r.get("created_at") or r.get("publish_time") or ""), reverse=True)
            return results

    def get_review(self, review_id: str) -> Optional[Dict[str, Any]]:
        with _lock:
            return self._store.get("reviews", {}).get(review_id)

    def create_customer_review(self, data: Dict[str, Any]) -> Dict[str, Any]:
        with _lock:
            self._store.setdefault("reviews", {})
            review_id = f"rev-cust-{uuid.uuid4().hex[:10]}"
            
            # Verify buyer status using completed order lookup
            email = str(data.get("email") or "").strip().lower()
            order_ref = str(data.get("order_ref") or "").strip()
            is_verified, matched_order = self.verify_customer_purchase(email, order_ref)
            
            author = str(data.get("name") or "Community Member").strip()
            name_parts = author.split()
            initials = f"{name_parts[0][0]}{name_parts[-1][0]}".upper() if len(name_parts) >= 2 else (author[:2].upper() if author else "NV")
            
            now_iso = datetime.now(timezone.utc).isoformat()
            now_label = datetime.now(timezone.utc).strftime("%b %Y").upper()
            
            piece_name = str(data.get("piece") or "").strip()
            # Match piece name to catalog product slug if possible
            product_slug = None
            for p in self._store.get("products", {}).values():
                if p.get("name", "").lower() == piece_name.lower():
                    product_slug = p.get("slug")
                    break

            review_doc = {
                "id": review_id,
                "source": "customer",
                "status": "approved",  # directly published
                "author": author,
                "initials": initials,
                "email": email or None,
                "piece": piece_name,
                "product_slug": product_slug,
                "productSlug": product_slug,
                "variant": str(data.get("variant") or "").strip() or None,
                "rating": int(data.get("rating", 5)),
                "highlight": str(data.get("highlight") or "").strip().upper(),
                "quote": str(data.get("quote") or "").strip(),
                "created_at": now_iso,
                "date": now_label,
                "category": str(data.get("category") or "fabric").lower(),
                "category_label": "CUSTOMER VERBATIM",
                "categoryLabel": "CUSTOMER VERBATIM",
                "is_verified_buyer": is_verified,
                "verified_badge": "✦ VERIFIED BUYER" if is_verified else None,
                "verifiedBadge": "✦ VERIFIED BUYER" if is_verified else None,
                "verified_order_id": matched_order,
                "moderated_by": None,
                "moderated_at": None,
                "specs": [
                    {"label": "PIECE", "value": piece_name},
                    {"label": "RATING", "value": f"{int(data.get('rating', 5))}.0 / 5.0"},
                    {"label": "VERIFICATION", "value": "Verified Order" if is_verified else "Community Submission"},
                ],
            }
            
            self._store["reviews"][review_id] = review_doc
            self.save()
            return review_doc

    def moderate_review(
        self,
        review_id: str,
        status: str,
        admin_identity: str = "admin",
        verified: Optional[bool] = None,
        notes: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        with _lock:
            review = self._store.get("reviews", {}).get(review_id)
            if not review:
                return None
                
            status_clean = status.strip().lower()
            if status_clean not in ("pending", "approved", "rejected"):
                raise ValueError(f"Invalid review status: {status_clean}")
                
            review["status"] = status_clean
            review["moderated_by"] = admin_identity
            review["moderated_at"] = datetime.now(timezone.utc).isoformat()
            if notes is not None:
                review["moderation_notes"] = notes
                
            if verified is not None:
                review["is_verified_buyer"] = bool(verified)
                review["verified_badge"] = "✦ VERIFIED BUYER" if verified else None
                review["verifiedBadge"] = "✦ VERIFIED BUYER" if verified else None
                
            self._log_audit(admin_identity, f"review_{status_clean}", "review", review_id, {
                "status": status_clean,
                "author": review.get("author"),
                "is_verified": review.get("is_verified_buyer"),
            })
            self.save()
            return review

    def delete_review(self, review_id: str, admin_identity: str = "admin") -> bool:
        with _lock:
            if review_id in self._store.get("reviews", {}):
                rev = self._store["reviews"].pop(review_id)
                self._log_audit(admin_identity, "delete_review", "review", review_id, {"author": rev.get("author")})
                self.save()
                return True
            return False

    def upsert_google_reviews(self, reviews_list: List[Dict[str, Any]]) -> int:
        with _lock:
            self._store.setdefault("reviews", {})
            upserted_count = 0
            for r in reviews_list:
                google_id = r.get("id") or r.get("google_review_id")
                if not google_id:
                    continue
                    
                # Find if already exists by google_review_id or id
                existing_key = None
                for k, existing in self._store["reviews"].items():
                    if existing.get("google_review_id") == google_id or k == google_id:
                        existing_key = k
                        break
                        
                key = existing_key or f"google-{google_id.replace('/', '_')}"
                doc = {
                    "id": key,
                    "google_review_id": google_id,
                    "source": "google",
                    "status": "approved",
                    "author": r.get("author") or "Google Verified Reviewer",
                    "initials": r.get("initials") or "GV",
                    "avatar_url": r.get("avatar_url"),
                    "rating": r.get("rating") or 5,
                    "highlight": r.get("highlight") or "GOOGLE MAPS VERIFIED",
                    "quote": r.get("quote") or "",
                    "date": r.get("date") or "RECENT",
                    "publish_time": r.get("publish_time"),
                    "attribution_url": r.get("attribution_url"),
                    "category": "google",
                    "category_label": "GOOGLE REVIEWS",
                    "categoryLabel": "GOOGLE REVIEWS",
                    "is_verified_buyer": False,
                    "verified_badge": None,
                    "verifiedBadge": None,
                    "piece": None,
                    "product_slug": None,
                    "productSlug": None,
                    "specs": [],
                    "image": None,
                    "created_at": r.get("publish_time") or datetime.now(timezone.utc).isoformat(),
                }
                self._store["reviews"][key] = doc
                upserted_count += 1
                
            self.save()
            return upserted_count

    def verify_customer_purchase(self, email: str, order_ref: Optional[str] = None) -> Tuple[bool, Optional[str]]:
        if not email and not order_ref:
            return (False, None)
            
        clean_email = email.strip().lower() if email else None
        clean_ref = order_ref.strip().upper() if order_ref else None
        
        valid_statuses = ("delivered", "shipped", "paid", "completed", "processing", "confirmed")
        
        # Check in orders
        for order_id, o in self._store.get("orders", {}).items():
            o_email = str(o.get("email") or "").strip().lower()
            o_status = str(o.get("status") or "").lower()
            o_payment = str(o.get("payment_status") or "").lower()
            is_valid_order = o_status in valid_statuses or o_payment in ("paid", "completed")
            
            if clean_ref and (order_id.upper() == clean_ref or str(o.get("order_id", "")).upper() == clean_ref):
                if is_valid_order:
                    return (True, order_id)
            if clean_email and o_email == clean_email and is_valid_order:
                return (True, order_id)
                
        return (False, None)

    def _ensure_store_keys(self):
        self._store.setdefault("orders", {})
        self._store.setdefault("customers", {})
        self._store.setdefault("irl", {})
        self._store.setdefault("sign_in_accounts", {})
        self._store.setdefault("categories", {})
        self._store.setdefault("reviews", {})
        self._store.setdefault("google_reviews_cache", {"data": None, "timestamp": 0.0})
        if not self._store.get("orders") or len(self._store["orders"]) == 0:
            self._seed_orders_customers_and_irl()
        if not self._store.get("categories") or len(self._store["categories"]) == 0:
            self._seed_categories()
        if not self._store.get("reviews") or len(self._store["reviews"]) == 0:
            self._seed_reviews()
        self.save()


# Singleton instance
catalog_store = CatalogStore()

