from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Header, Response, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

# ── Transactional email (Emergent managed Resend) ──
import re as _re
import ipaddress as _ipaddress
import httpx as _httpx
from html import escape as _escape
from html.parser import HTMLParser as _HTMLParser
from urllib.parse import urlparse as _urlparse

EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "NALAYAK")
SITE_URL = os.environ.get("SITE_URL", "")

_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "reply with the code", "send your password", "cvv",
             "send us your password", "enter your password below", "confirm your card number",
             "your full card number", "seed phrase", "recovery phrase", "verify your card",
             "social security number", "confirm your bank details")
_HOSTISH = _re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", _re.I)

def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        _ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)

def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)

class _EmailScan(_HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []
    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []
    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)
    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []

def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan(); scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = _urlparse(low).hostname or ""
        if not _host_ok(host) or _urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = _urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} != real link host {real!r} (G3)")

async def send_email(*, to: str, subject: str, html: str) -> str | None:
    _assert_safe_email(subject, html)
    if not EMAIL_KEY:
        raise HTTPException(status_code=503, detail="email_not_configured")
    payload = {"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    try:
        async with _httpx.AsyncClient(timeout=30) as client_http:
            resp = await client_http.post(
                f"{EMAIL_BASE_URL}/api/v1/email/send",
                headers={"X-Email-Key": EMAIL_KEY},
                json=payload,
            )
        resp.raise_for_status()
        return resp.json().get("id")
    except Exception as e:
        logger.error(f"Email send failed: {e}")
        raise HTTPException(status_code=502, detail="Failed to send email")

class WelcomeEmailInput(BaseModel):
    email: str
    name: str = ""
    kind: str = "member"

@api_router.post("/email/welcome")
async def send_welcome_email(input: WelcomeEmailInput):
    if not _re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", input.email or ""):
        raise HTTPException(status_code=400, detail="invalid_email")
    kind = input.kind if input.kind in ("member", "club") else "member"
    existing = await db.welcome_emails.find_one({"email": input.email, "kind": kind}, {"_id": 0})
    if existing:
        return {"status": "already_sent"}
    name = _escape((input.name or "").split()[0] or "there")
    base = SITE_URL.rstrip("/")
    if kind == "club":
        subject = "Welcome to Nalayak Club."
        headline = "ACCESS IS THE REWARD."
        body = ("Early drops, private pieces, member-only releases. You now get there "
                "before everyone else.")
        cta_href = f"{base}/club/drops"
        cta_text = "VIEW CLUB DROPS"
    else:
        subject = "You're in the wrong crowd."
        headline = "START WITH BELONGING."
        body = ("Membership is free. The good stuff comes with it — first looks, "
                "restock access and a status you earn, not buy.")
        cta_href = f"{base}/new-arrivals"
        cta_text = "SHOP NEW ARRIVALS"
    html = (
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">'
        '<tr><td style="padding:32px 24px;font-family:Arial,sans-serif;background:#0A0A0A">'
        '<p style="color:#F7F7F5;font-size:28px;font-weight:800;letter-spacing:-1px;margin:0">NALAYAK</p>'
        f'</td></tr><tr><td style="padding:40px 24px;font-family:Arial,sans-serif">'
        f'<p style="font-size:11px;letter-spacing:3px;color:#8C8C8C;margin:0 0 12px">NALAYAK {"CLUB" if kind == "club" else "MEMBERS"}</p>'
        f'<h1 style="font-size:32px;font-weight:800;letter-spacing:-1px;margin:0 0 16px">{headline}</h1>'
        f'<p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 28px">Hi {name}. {body}</p>'
        f'<a href="{cta_href}" style="display:inline-block;background:#0A0A0A;color:#F7F7F5;'
        f'font-size:11px;letter-spacing:3px;text-decoration:none;padding:14px 28px">{cta_text}</a>'
        f'<p style="font-size:11px;color:#8C8C8C;margin:32px 0 0">Sent by {EMAIL_FROM_NAME}. '
        'We never ask for your password or card details by email.</p>'
        '</td></tr></table>'
    )
    email_id = await send_email(to=input.email, subject=subject, html=html)
    await db.welcome_emails.insert_one({
        "email": input.email, "kind": kind, "email_id": email_id,
        "sent_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"status": "sent", "email_id": email_id}

# ── Drop alerts + custom design requests ──
class AlertRegisterInput(BaseModel):
    email: str
    slug: str

@api_router.post("/alerts/register")
async def register_alert(input: AlertRegisterInput):
    if not _re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", input.email or ""):
        raise HTTPException(status_code=400, detail="invalid_email")
    await db.drop_alert_registrations.update_one(
        {"email": input.email, "slug": input.slug},
        {"$setOnInsert": {
            "email": input.email, "slug": input.slug, "notified": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"status": "registered"}

class DropGoLiveInput(BaseModel):
    slug: str
    name: str

@api_router.post("/drops/go-live")
async def drop_go_live(input: DropGoLiveInput, x_admin_key: str = Header(None)):
    admin_guard(x_admin_key)
    # Triggered when a coming-soon piece goes live (cron/admin hook in production).
    if not EMAIL_KEY:
        return {"status": "skipped", "reason": "email_not_configured"}
    regs = await db.drop_alert_registrations.find(
        {"slug": input.slug, "notified": {"$ne": True}}, {"_id": 0}
    ).to_list(500)
    name = _escape(input.name)
    href = f"{SITE_URL.rstrip('/')}/product/{input.slug}"
    subject = f"{name} is live."
    html = (
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">'
        '<tr><td style="padding:32px 24px;font-family:Arial,sans-serif;background:#0A0A0A">'
        '<p style="color:#F7F7F5;font-size:28px;font-weight:800;letter-spacing:-1px;margin:0">NALAYAK</p>'
        '</td></tr><tr><td style="padding:40px 24px;font-family:Arial,sans-serif">'
        '<p style="font-size:11px;letter-spacing:3px;color:#8C8C8C;margin:0 0 12px">DROP ALERT</p>'
        f'<h1 style="font-size:32px;font-weight:800;letter-spacing:-1px;margin:0 0 16px">{name} IS LIVE.</h1>'
        '<p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 28px">You asked. It landed. '
        'Get there before the crowd does.</p>'
        f'<a href="{href}" style="display:inline-block;background:#0A0A0A;color:#F7F7F5;'
        'font-size:11px;letter-spacing:3px;text-decoration:none;padding:14px 28px">SHOP THE PIECE</a>'
        f'<p style="font-size:11px;color:#8C8C8C;margin:32px 0 0">Sent by {EMAIL_FROM_NAME}. '
        'We never ask for your password or card details by email.</p>'
        '</td></tr></table>'
    )
    sent = 0
    for r in regs:
        await send_email(to=r["email"], subject=subject, html=html)
        await db.drop_alert_registrations.update_one(
            {"email": r["email"], "slug": input.slug}, {"$set": {"notified": True}}
        )
        sent += 1
    return {"status": "done", "sent": sent}

class CustomRequestInput(BaseModel):
    name: str
    email: str
    phone: str = ""
    garment: str = ""
    size: str = ""
    vibes: list = []
    colours: list = []
    budget: str = ""
    description: str = ""
    images: list = []

@api_router.post("/custom-requests")
async def create_custom_request(input: CustomRequestInput):
    if not _re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", input.email or ""):
        raise HTTPException(status_code=400, detail="invalid_email")
    import random
    ref = f"NL-{random.randint(1000, 9999)}"
    while await db.custom_requests.find_one({"ref": ref}, {"_id": 0}):
        ref = f"NL-{random.randint(1000, 9999)}"
    doc = input.dict()
    doc.update({"ref": ref, "created_at": datetime.now(timezone.utc).isoformat(), "status": "received"})
    await db.custom_requests.insert_one(doc)
    emailed = False
    if EMAIL_KEY:
        garment = _escape(input.garment or "—")
        size = _escape(input.size or "—")
        subject = f"Request {ref} — received."
        html = (
            '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">'
            '<tr><td style="padding:32px 24px;font-family:Arial,sans-serif;background:#0A0A0A">'
            '<p style="color:#F7F7F5;font-size:28px;font-weight:800;letter-spacing:-1px;margin:0">NALAYAK</p>'
            '</td></tr><tr><td style="padding:40px 24px;font-family:Arial,sans-serif">'
            '<p style="font-size:11px;letter-spacing:3px;color:#8C8C8C;margin:0 0 12px">CUSTOM DESIGN</p>'
            '<h1 style="font-size:32px;font-weight:800;letter-spacing:-1px;margin:0 0 16px">REQUEST RECEIVED.</h1>'
            f'<p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 8px">Hi {_escape((input.name or "").split()[0] or "there")}. '
            'Your idea is now with the Nalayak team. We&#39;ll review it and get back to you with the next step.</p>'
            f'<p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 28px">Reference <strong>{ref}</strong> · '
            f'{garment} · Size {size}</p>'
            f'<p style="font-size:11px;color:#8C8C8C;margin:32px 0 0">Sent by {EMAIL_FROM_NAME}. '
            'We never ask for your password or card details by email.</p>'
            '</td></tr></table>'
        )
        await send_email(to=input.email, subject=subject, html=html)
        emailed = True
    return {"ref": ref, "emailed": emailed}

# ── Orders (mock checkout, real receipts) ──
class OrderInput(BaseModel):
    email: str
    name: str = ""
    items: list = []
    subtotal: int = 0
    shipping: int = 0
    total: int = 0

@api_router.post("/orders")
async def create_order(input: OrderInput):
    if not _re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", input.email or ""):
        raise HTTPException(status_code=400, detail="invalid_email")
    if not input.items:
        raise HTTPException(status_code=400, detail="empty_order")
    import random
    order_id = f"NLO-{random.randint(1000, 9999)}"
    while await db.orders.find_one({"order_id": order_id}, {"_id": 0}):
        order_id = f"NLO-{random.randint(1000, 9999)}"
    doc = input.dict()
    doc.update({
        "order_id": order_id,
        "status": "placed",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await db.orders.insert_one(doc)
    emailed = False
    if EMAIL_KEY:
        rows = "".join(
            f'<tr><td style="padding:8px 0;font-size:13px;color:#333">{_escape(str(i.get("name", "")))} '
            f'<span style="color:#8C8C8C">· {_escape(str(i.get("size", "")))} × {int(i.get("qty", 1))}</span></td>'
            f'<td style="padding:8px 0;font-size:13px;color:#333;text-align:right">₹{int(i.get("price", 0)) * int(i.get("qty", 1)):,}</td></tr>'
            for i in input.items
        )
        subject = f"Order {order_id} — confirmed."
        html = (
            '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">'
            '<tr><td style="padding:32px 24px;font-family:Arial,sans-serif;background:#0A0A0A">'
            '<p style="color:#F7F7F5;font-size:28px;font-weight:800;letter-spacing:-1px;margin:0">NALAYAK</p>'
            '</td></tr><tr><td style="padding:40px 24px;font-family:Arial,sans-serif">'
            '<p style="font-size:11px;letter-spacing:3px;color:#8C8C8C;margin:0 0 12px">ORDER CONFIRMED</p>'
            f'<h1 style="font-size:32px;font-weight:800;letter-spacing:-1px;margin:0 0 16px">GOOD CHOICE, {_escape((input.name or "").split()[0] or "NALAYAK").upper()}.</h1>'
            f'<p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 24px">Order <strong>{order_id}</strong> is in. '
            'It ships from Mumbai within 48 hours.</p>'
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #E5E5E5">{rows}'
            f'<tr><td style="padding:12px 0;font-size:13px;color:#8C8C8C;border-top:1px solid #E5E5E5">Shipping</td>'
            f'<td style="padding:12px 0;font-size:13px;text-align:right;border-top:1px solid #E5E5E5">{"FREE" if input.shipping == 0 else f"₹{input.shipping:,}"}</td></tr>'
            f'<tr><td style="padding:4px 0 12px;font-size:15px;font-weight:700">Total</td>'
            f'<td style="padding:4px 0 12px;font-size:15px;font-weight:700;text-align:right">₹{input.total:,}</td></tr></table>'
            f'<a href="{SITE_URL.rstrip("/")}/track/{order_id}" style="display:inline-block;background:#0A0A0A;color:#F7F7F5;'
            'font-size:11px;letter-spacing:3px;text-decoration:none;padding:14px 28px;margin-top:8px">TRACK YOUR ORDER</a>'
            f'<p style="font-size:11px;color:#8C8C8C;margin:32px 0 0">Sent by {EMAIL_FROM_NAME}. '
            'We never ask for your password or card details by email.</p>'
            '</td></tr></table>'
        )
        await send_email(to=input.email, subject=subject, html=html)
        emailed = True
    return {"orderId": order_id, "emailed": emailed}

@api_router.get("/orders")
async def list_orders(email: str = ""):
    if not _re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email or ""):
        return {"orders": []}
    orders = await db.orders.find({"email": email}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"orders": orders}

class RequestStatusInput(BaseModel):
    status: str

@api_router.post("/custom-requests/{ref}/status")
async def update_custom_request_status(ref: str, input: RequestStatusInput, x_admin_key: str = Header(None)):
    admin_guard(x_admin_key)
    allowed = ["received", "in-progress", "completed"]
    if input.status not in allowed:
        raise HTTPException(status_code=400, detail="invalid_status")
    req = await db.custom_requests.find_one({"ref": ref}, {"_id": 0})
    if not req:
        raise HTTPException(status_code=404, detail="not_found")
    await db.custom_requests.update_one({"ref": ref}, {"$set": {"status": input.status}})
    emailed = False
    if EMAIL_KEY and req.get("email"):
        label = input.status.replace("-", " ").upper()
        name = _escape((req.get("name") or "").split()[0] or "there")
        subject = f"Request {ref} — {input.status.replace('-', ' ')}."
        html = (
            '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">'
            '<tr><td style="padding:32px 24px;font-family:Arial,sans-serif;background:#0A0A0A">'
            '<p style="color:#F7F7F5;font-size:28px;font-weight:800;letter-spacing:-1px;margin:0">NALAYAK</p>'
            '</td></tr><tr><td style="padding:40px 24px;font-family:Arial,sans-serif">'
            '<p style="font-size:11px;letter-spacing:3px;color:#8C8C8C;margin:0 0 12px">CUSTOM DESIGN</p>'
            f'<h1 style="font-size:32px;font-weight:800;letter-spacing:-1px;margin:0 0 16px">YOUR PIECE IS {label}.</h1>'
            f'<p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 28px">Hi {name}. Request '
            f'<strong>{ref}</strong> just moved to {label.lower()}. We&#39;ll keep you posted.</p>'
            f'<a href="{SITE_URL.rstrip("/")}/account" style="display:inline-block;background:#0A0A0A;color:#F7F7F5;'
            'font-size:11px;letter-spacing:3px;text-decoration:none;padding:14px 28px">VIEW YOUR ACCOUNT</a>'
            f'<p style="font-size:11px;color:#8C8C8C;margin:32px 0 0">Sent by {EMAIL_FROM_NAME}. '
            'We never ask for your password or card details by email.</p>'
            '</td></tr></table>'
        )
        await send_email(to=req["email"], subject=subject, html=html)
        emailed = True
    return {"ref": ref, "status": input.status, "emailed": emailed}

# ── Order tracking + shipping status ──
@api_router.get("/orders/{order_id}")
async def get_order(order_id: str):
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="not_found")
    return order

class OrderStatusInput(BaseModel):
    status: str

@api_router.post("/orders/{order_id}/status")
async def update_order_status(order_id: str, input: OrderStatusInput, x_admin_key: str = Header(None)):
    admin_guard(x_admin_key)
    allowed = ["placed", "shipped", "delivered"]
    if input.status not in allowed:
        raise HTTPException(status_code=400, detail="invalid_status")
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="not_found")
    await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {"status": input.status, f"{input.status}_at": datetime.now(timezone.utc).isoformat()}},
    )
    emailed = False
    if EMAIL_KEY and order.get("email") and input.status in ("shipped", "delivered"):
        name = _escape((order.get("name") or "").split()[0] or "there")
        shipped = input.status == "shipped"
        headline = "IT'S ON ITS WAY." if shipped else "IT'S THERE."
        if shipped:
            body = "left the studio and is moving. Track it below."
            cta_href = f'{SITE_URL.rstrip("/")}/track/{order_id}'
            cta_text = "TRACK YOUR ORDER"
        else:
            body = ("has landed. Now the important part: wear it out, shoot it, tag @NALAYAK — "
                    "we repost the good ones. Loved it? Hated it? Reply and tell us.")
            cta_href = SITE_URL.rstrip("/")
            cta_text = "SEE NALAYAK IRL"
        subject = f"Order {order_id} — {'shipped' if shipped else 'delivered'}."
        html = (
            '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">'
            '<tr><td style="padding:32px 24px;font-family:Arial,sans-serif;background:#0A0A0A">'
            '<p style="color:#F7F7F5;font-size:28px;font-weight:800;letter-spacing:-1px;margin:0">NALAYAK</p>'
            '</td></tr><tr><td style="padding:40px 24px;font-family:Arial,sans-serif">'
            '<p style="font-size:11px;letter-spacing:3px;color:#8C8C8C;margin:0 0 12px">ORDER UPDATE</p>'
            f'<h1 style="font-size:32px;font-weight:800;letter-spacing:-1px;margin:0 0 16px">{headline}</h1>'
            f'<p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 28px">Hi {name}. Order '
            f'<strong>{order_id}</strong> {body}</p>'
            f'<a href="{cta_href}" style="display:inline-block;background:#0A0A0A;color:#F7F7F5;'
            f'font-size:11px;letter-spacing:3px;text-decoration:none;padding:14px 28px">{cta_text}</a>'
            f'<p style="font-size:11px;color:#8C8C8C;margin:32px 0 0">Sent by {EMAIL_FROM_NAME}. '
            'We never ask for your password or card details by email.</p>'
            '</td></tr></table>'
        )
        await send_email(to=order["email"], subject=subject, html=html)
        emailed = True
    return {"order_id": order_id, "status": input.status, "emailed": emailed}

# ── Object storage (Emergent) + IRL uploads + admin ──
import uuid as _uuid
import asyncio as _asyncio
import requests as _requests

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "nalayak"
ADMIN_KEY = os.environ.get("ADMIN_KEY")
_storage_key = None

def init_storage(force: bool = False):
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    resp = _requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = _requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120,
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    key = init_storage()
    resp = _requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

def admin_guard(x_admin_key: str = Header(None)):
    if ADMIN_KEY and x_admin_key != ADMIN_KEY:
        raise HTTPException(status_code=401, detail="unauthorized")

@api_router.post("/irl/upload")
async def irl_upload(file: UploadFile = File(...), order_id: str = "", name: str = ""):
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=400, detail="images_only")
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="file_too_large")
    ext = (file.filename or "jpg").split(".")[-1].lower()
    if ext not in ("jpg", "jpeg", "png", "webp", "gif", "heic"):
        ext = "jpg"
    path = f"{APP_NAME}/irl/{_uuid.uuid4()}.{ext}"
    result = await _asyncio.to_thread(put_object, path, data, file.content_type or "image/jpeg")
    doc = {
        "id": str(_uuid.uuid4()),
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": file.content_type or "image/jpeg",
        "order_id": order_id,
        "name": name,
        "status": "pending",
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.irl_uploads.insert_one(doc)
    return {"id": doc["id"], "status": "pending"}

@api_router.get("/irl/approved")
async def irl_approved():
    items = await db.irl_uploads.find(
        {"status": "approved", "is_deleted": False}, {"_id": 0, "id": 1, "name": 1}
    ).sort("created_at", -1).to_list(12)
    return {"items": items}

@api_router.get("/irl/mine")
async def irl_mine(email: str = ""):
    if not _re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email or ""):
        return {"items": []}
    orders = await db.orders.find({"email": email}, {"_id": 0, "order_id": 1}).to_list(100)
    ids = [o["order_id"] for o in orders]
    if not ids:
        return {"items": []}
    items = await db.irl_uploads.find(
        {"order_id": {"$in": ids}, "status": "approved", "is_deleted": False},
        {"_id": 0, "id": 1, "order_id": 1, "created_at": 1},
    ).to_list(50)
    return {"items": items}

@api_router.get("/irl/file/{file_id}")
async def irl_file(file_id: str):
    record = await db.irl_uploads.find_one(
        {"id": file_id, "status": "approved", "is_deleted": False}, {"_id": 0}
    )
    if not record:
        raise HTTPException(status_code=404, detail="not_found")
    data, content_type = await _asyncio.to_thread(get_object, record["storage_path"])
    return Response(content=data, media_type=record.get("content_type", content_type))

@api_router.get("/admin/orders")
async def admin_orders(x_admin_key: str = Header(None)):
    admin_guard(x_admin_key)
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"orders": orders}

@api_router.get("/admin/custom-requests")
async def admin_custom_requests(x_admin_key: str = Header(None)):
    admin_guard(x_admin_key)
    reqs = await db.custom_requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"requests": reqs}

@api_router.get("/admin/irl")
async def admin_irl(x_admin_key: str = Header(None)):
    admin_guard(x_admin_key)
    items = await db.irl_uploads.find({"is_deleted": False}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"items": items}

@api_router.post("/admin/irl/{file_id}/status")
async def admin_irl_status(file_id: str, input: OrderStatusInput, x_admin_key: str = Header(None)):
    admin_guard(x_admin_key)
    if input.status not in ("approved", "rejected", "pending"):
        raise HTTPException(status_code=400, detail="invalid_status")
    await db.irl_uploads.update_one({"id": file_id}, {"$set": {"status": input.status}})
    return {"id": file_id, "status": input.status}

@api_router.get("/admin/irl-file/{file_id}")
async def admin_irl_file(file_id: str, x_admin_key: str = Header(None), auth: str = Query(None)):
    admin_guard(x_admin_key or auth)
    record = await db.irl_uploads.find_one({"id": file_id, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="not_found")
    data, content_type = await _asyncio.to_thread(get_object, record["storage_path"])
    return Response(content=data, media_type=record.get("content_type", content_type))

# ── Razorpay membership checkout ──
# One-time membership purchase. Recurring Club subscriptions come later via
# Razorpay Subscriptions API; activation is only marked after server-side
# signature verification — never from frontend state alone.
CLUB_PLANS = {
    "founding": {"amount": 99900, "description": "NALAYAK CLUB — Founding 500"},
    "club-yearly": {"amount": 99900, "description": "NALAYAK CLUB — Yearly"},
}

def razorpay_client():
    key_id = os.environ.get("RAZORPAY_KEY_ID")
    key_secret = os.environ.get("RAZORPAY_KEY_SECRET")
    if not key_id or not key_secret:
        return None, key_id
    import razorpay
    return razorpay.Client(auth=(key_id, key_secret)), key_id

class CreateOrderInput(BaseModel):
    plan: str

@api_router.post("/razorpay/create-order")
async def create_razorpay_order(input: CreateOrderInput):
    plan = CLUB_PLANS.get(input.plan)
    if not plan:
        raise HTTPException(status_code=400, detail="unknown_plan")
    rzp, key_id = razorpay_client()
    if not rzp:
        raise HTTPException(status_code=503, detail="razorpay_not_configured")
    order = rzp.order.create({
        "amount": plan["amount"],
        "currency": "INR",
        "payment_capture": 1,
        "notes": {"plan": input.plan},
    })
    await db.membership_orders.insert_one({
        "order_id": order["id"],
        "plan": input.plan,
        "amount": plan["amount"],
        "status": "created",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {
        "id": order["id"],
        "amount": order["amount"],
        "currency": "INR",
        "keyId": key_id,
        "description": plan["description"],
    }

class VerifyPaymentInput(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan: str

@api_router.post("/razorpay/verify")
async def verify_razorpay_payment(input: VerifyPaymentInput):
    rzp, _ = razorpay_client()
    if not rzp:
        raise HTTPException(status_code=503, detail="razorpay_not_configured")
    try:
        rzp.utility.verify_payment_signature({
            "razorpay_order_id": input.razorpay_order_id,
            "razorpay_payment_id": input.razorpay_payment_id,
            "razorpay_signature": input.razorpay_signature,
        })
    except Exception:
        await db.membership_orders.update_one(
            {"order_id": input.razorpay_order_id}, {"$set": {"status": "failed"}}
        )
        raise HTTPException(status_code=400, detail="invalid_signature")
    await db.membership_orders.update_one(
        {"order_id": input.razorpay_order_id},
        {"$set": {"status": "paid", "payment_id": input.razorpay_payment_id}},
    )
    return {"verified": True, "plan": input.plan}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_storage():
    try:
        await _asyncio.to_thread(init_storage)
        logger.info("Object storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()