from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Header, Response, Query, Cookie
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware

import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict

import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient


# ─────────────────────────────────────────────
# Environment
# ─────────────────────────────────────────────

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")


# ─────────────────────────────────────────────
# MongoDB connection
# ─────────────────────────────────────────────

mongo_url = os.environ.get("MONGO_URL", "").strip()
db_name = os.environ.get("DB_NAME", "").strip()

if not mongo_url:
    raise RuntimeError("MONGO_URL is missing from backend/.env")

if not db_name:
    raise RuntimeError("DB_NAME is missing from backend/.env")

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')



# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")
# ─────────────────────────────────────────────
# Twilio Verify OTP
# ─────────────────────────────────────────────

TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "").strip()
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "").strip()
TWILIO_VERIFY_SERVICE_SID = os.environ.get(
    "TWILIO_VERIFY_SERVICE_SID", ""
).strip()

if not TWILIO_ACCOUNT_SID:
    logging.warning("TWILIO_ACCOUNT_SID is not configured")

if not TWILIO_AUTH_TOKEN:
    logging.warning("TWILIO_AUTH_TOKEN is not configured")

if not TWILIO_VERIFY_SERVICE_SID:
    logging.warning("TWILIO_VERIFY_SERVICE_SID is not configured")


class SendOTPRequest(BaseModel):
    phone: str = Field(..., min_length=10, max_length=20)


class VerifyOTPRequest(BaseModel):
    phone: str = Field(..., min_length=10, max_length=20)
    code: str = Field(..., min_length=4, max_length=8)
    name: str = Field(default="NALAYAK", max_length=100)


def normalize_phone(phone: str) -> str:
    """
    NALAYAK currently accepts Indian 10-digit numbers
    and converts them to E.164 format.
    """

    phone = phone.strip().replace(" ", "").replace("-", "")

    # Indian 10-digit number
    if phone.isdigit() and len(phone) == 10:
        phone = "+91" + phone

    # 91XXXXXXXXXX without +
    elif phone.isdigit() and len(phone) == 12 and phone.startswith("91"):
        phone = "+" + phone

    # Already E.164
    elif phone.startswith("+"):
        pass

    else:
        raise HTTPException(
            status_code=400,
            detail="Please enter a valid phone number."
        )

    return phone


async def twilio_verify_request(
    endpoint: str,
    data: dict,
):
    url = (
        f"https://verify.twilio.com/v2/"
        f"Services/{TWILIO_VERIFY_SERVICE_SID}/{endpoint}"
    )

    async with _httpx.AsyncClient(timeout=15.0) as http:
        response = await http.post(
            url,
            data=data,
            auth=(
                TWILIO_ACCOUNT_SID,
                TWILIO_AUTH_TOKEN,
            ),
        )

    return response


@api_router.post("/auth/send-otp")
async def send_otp(payload: SendOTPRequest):
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        raise HTTPException(
            status_code=500,
            detail="OTP service is not configured."
        )

    if not TWILIO_VERIFY_SERVICE_SID:
        raise HTTPException(
            status_code=500,
            detail="OTP service ID is not configured."
        )

    phone = normalize_phone(payload.phone)

    response = await twilio_verify_request(
        "Verifications",
        {
            "To": phone,
            "Channel": "sms",
        },
    )

    if response.status_code >= 400:
        logging.error(
            "Twilio send OTP failed: %s",
            response.text,
        )

        raise HTTPException(
            status_code=400,
            detail="Unable to send OTP. Please try again."
        )

    return {
        "success": True,
        "message": "OTP sent successfully.",
        "phone": phone,
    }


@api_router.post("/auth/verify-otp")
async def verify_otp(payload: VerifyOTPRequest, response: Response):
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        raise HTTPException(
            status_code=500,
            detail="OTP service is not configured."
        )

    if not TWILIO_VERIFY_SERVICE_SID:
        raise HTTPException(
            status_code=500,
            detail="OTP service ID is not configured."
        )

    phone = normalize_phone(payload.phone)

    twilio_response = await twilio_verify_request(
        "VerificationCheck",
        {
            "To": phone,
            "Code": payload.code.strip(),
        },
    )

    if twilio_response.status_code >= 400:
        logging.error(
            "Twilio verify OTP failed: %s",
            twilio_response.text,
        )

        raise HTTPException(
            status_code=400,
            detail="Invalid or expired OTP."
        )

    result = twilio_response.json()

    if result.get("status") != "approved":
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired OTP."
        )

    # ─────────────────────────────────────────────
    # Find or create Nalayak member
    # ─────────────────────────────────────────────

    headers = supabase_rest_headers()
    base_url = supabase_rest_url()

    async with _httpx.AsyncClient(timeout=30) as client_http:
        member_resp = await client_http.get(
            f"{base_url}/members",
            params={
                "select": "*",
                "phone": f"eq.{phone}",
                "limit": "1",
            },
            headers=headers,
        )

    if member_resp.status_code >= 400:
        logging.error(
            "Member lookup failed: %s %s",
            member_resp.status_code,
            member_resp.text,
        )
        raise HTTPException(
            status_code=502,
            detail="Failed to load member."
        )

    members = member_resp.json() or []

    if members:
        member = members[0]

        # Keep the latest supplied name if one exists.
        # Name is added below by Account.jsx.
    else:
        now = datetime.now(timezone.utc).isoformat()

        member_doc = {
            "phone": phone,
            "name": payload.name.strip() or "NALAYAK",
            "status": "active",
            "membership_type": "free",
            "is_founding_member": False,
            "joined_at": now,
            "created_at": now,
            "updated_at": now,
        }

        async with _httpx.AsyncClient(timeout=30) as client_http:
            create_resp = await client_http.post(
                f"{base_url}/members",
                headers={
                    **headers,
                    "Prefer": "return=representation",
                },
                json=member_doc,
            )

        if create_resp.status_code >= 400:
            logging.error(
                "Member creation failed: %s %s",
                create_resp.status_code,
                create_resp.text,
            )
            raise HTTPException(
                status_code=502,
                detail="Failed to create member."
            )

        created = create_resp.json() or []

        if not created:
            raise HTTPException(
                status_code=500,
                detail="Member creation returned no member."
            )

        member = created[0]

    # ─────────────────────────────────────────────
    # Create persistent session
    # ─────────────────────────────────────────────

    session_token = str(uuid.uuid4())

    from datetime import timedelta

    expires_at = (
        datetime.now(timezone.utc) + timedelta(days=30)
    ).isoformat()

    session_doc = {
        "member_id": member["id"],
        "token": session_token,
        "expires_at": expires_at,
    }

    async with _httpx.AsyncClient(timeout=30) as client_http:
        session_resp = await client_http.post(
            f"{base_url}/member_sessions",
            headers={
                **headers,
                "Prefer": "return=minimal",
            },
            json=session_doc,
        )

    if session_resp.status_code >= 400:
        logging.error(
            "Member session creation failed: %s %s",
            session_resp.status_code,
            session_resp.text,
        )
        raise HTTPException(
            status_code=502,
            detail="Failed to create member session."
        )

    response.set_cookie(
        key="nalayak_session",
        value=session_token,
        max_age=60 * 60 * 24 * 30,
        httponly=True,
        secure=False,
        samesite="lax",
        path="/",
    )

    return {
        "success": True,
        "verified": True,
        "phone": phone,
        "expires_at": expires_at,
        "member": member,
    }


@api_router.get("/auth/me")
async def get_current_member(
    nalayak_session: str = Cookie(None),
):
    if not nalayak_session:
        raise HTTPException(
            status_code=401,
            detail="not_authenticated",
        )

    headers = supabase_rest_headers()
    base_url = supabase_rest_url()

    # Find session
    async with _httpx.AsyncClient(timeout=30) as client_http:
        session_resp = await client_http.get(
            f"{base_url}/member_sessions",
            params={
                "select": "member_id,expires_at",
                "token": f"eq.{nalayak_session}",
                "limit": "1",
            },
            headers=headers,
        )

    if session_resp.status_code >= 400:
        logger.error(
            "Member session lookup failed: "
            f"{session_resp.status_code} {session_resp.text}"
        )

        raise HTTPException(
            status_code=502,
            detail="Failed to validate session.",
        )

    sessions = session_resp.json() or []

    if not sessions:
        raise HTTPException(
            status_code=401,
            detail="session_expired",
        )

    session = sessions[0]

    # Check expiry
    expires_at = datetime.fromisoformat(
        session["expires_at"].replace("Z", "+00:00")
    )

    if expires_at <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=401,
            detail="session_expired",
        )

    # Load member
    async with _httpx.AsyncClient(timeout=30) as client_http:
        member_resp = await client_http.get(
            f"{base_url}/members",
            params={
                "select": "*",
                "id": f"eq.{session['member_id']}",
                "limit": "1",
            },
            headers=headers,
        )

    if member_resp.status_code >= 400:
        logger.error(
            "Member lookup failed: "
            f"{member_resp.status_code} {member_resp.text}"
        )

        raise HTTPException(
            status_code=502,
            detail="Failed to load member.",
        )

    members = member_resp.json() or []

    if not members:
        raise HTTPException(
            status_code=401,
            detail="member_not_found",
        )

    return {
        "authenticated": True,
        "member": members[0],
    }


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie(
        key="nalayak_session",
        path="/",
    )

    return {
        "success": True,
    }


# Define Models


# ── Transactional email via Resend ──
import re as _re
import ipaddress as _ipaddress
import httpx as _httpx
from html import escape as _escape
from html.parser import HTMLParser as _HTMLParser
from urllib.parse import urlparse as _urlparse

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "").strip()
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "NALAYAK").strip()
EMAIL_FROM_ADDRESS = os.environ.get(
    "EMAIL_FROM_ADDRESS",
    "onboarding@resend.dev",
).strip()
SITE_URL = os.environ.get("SITE_URL", "").strip()

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

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "").strip()
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "NALAYAK").strip()
EMAIL_FROM_ADDRESS = os.environ.get(
    "EMAIL_FROM_ADDRESS",
    "onboarding@resend.dev",
).strip()


async def send_email(*, to: str, subject: str, html: str) -> str | None:

    _assert_safe_email(subject, html)

    if not RESEND_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="email_not_configured",
        )

    payload = {
        "from": f"{EMAIL_FROM_NAME} <{EMAIL_FROM_ADDRESS}>",
        "to": [to],
        "subject": subject,
        "html": html,
    }

    try:
        async with _httpx.AsyncClient(timeout=30) as client_http:
            resp = await client_http.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )

        if resp.status_code >= 400:
            logger.error(
                f"Resend email send failed: "
                f"{resp.status_code} {resp.text}"
            )
            raise HTTPException(
                status_code=502,
                detail="Failed to send email",
            )

        result = resp.json()

        logger.info(
            "Email sent successfully via Resend: %s",
            result.get("id"),
        )

        return result.get("id")

    except HTTPException:
        raise

    except Exception as e:
        logger.exception("Email send failed: %s", e)
        raise HTTPException(
            status_code=502,
            detail="Failed to send email",
        )

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
    if not _re.match(
        r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
        input.email or "",
    ):
        raise HTTPException(
            status_code=400,
            detail="invalid_email",
        )

    headers = {
        **supabase_rest_headers(),
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }

    base_url = supabase_rest_url()

    doc = {
        "email": input.email,
        "product_slug": input.slug,
        "notified": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    try:
        async with _httpx.AsyncClient(timeout=30) as client_http:
            resp = await client_http.post(
                f"{base_url}/drop_alerts",
                headers=headers,
                json=doc,
            )

        if resp.status_code >= 400:
            logger.error(
                "Supabase drop alert registration failed: "
                f"{resp.status_code} {resp.text}"
            )
            raise HTTPException(
                status_code=502,
                detail="Failed to register drop alert",
            )

        return {
            "status": "registered",
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.error(
            f"Supabase drop alert registration failed: {e}"
        )
        raise HTTPException(
            status_code=502,
            detail="Failed to register drop alert",
        )


class DropGoLiveInput(BaseModel):
    slug: str
    name: str
    image: str = ""


def resolve_drop_image(image: str) -> str:
    image = (image or "").strip()

    if not image:
        return ""

    # Already a full URL.
    if image.startswith("https://"):
        return image

    # Local/public image from the NALAYAK frontend.
    if image.startswith("/"):
        return f"{SITE_URL.rstrip('/')}{image}"

    # Product image IDs used in storeData.js.
    # Example:
    # photo-1507003211169-0a1dd7228f2d
    return (
        f"https://images.unsplash.com/{image}"
        "?auto=format&fit=crop&w=1200&q=85"
    )


@api_router.post("/drops/go-live")
async def drop_go_live(
    input: DropGoLiveInput,
    x_admin_key: str = Header(None),
):
    admin_guard(x_admin_key)

    if not RESEND_API_KEY:
        return {
            "status": "skipped",
            "reason": "email_not_configured",
        }

    headers = supabase_rest_headers()
    base_url = supabase_rest_url()

    try:
        async with _httpx.AsyncClient(timeout=30) as client_http:
            resp = await client_http.get(
                f"{base_url}/drop_alerts",
                params={
                    "select": "*",
                    "product_slug": f"eq.{input.slug}",
                    "notified": "neq.true",
                    "limit": "500",
                },
                headers=headers,
            )

        if resp.status_code >= 400:
            logger.error(
                "Supabase drop alert lookup failed: "
                f"{resp.status_code} {resp.text}"
            )
            raise HTTPException(
                status_code=502,
                detail="Failed to fetch drop alerts",
            )

        regs = resp.json() or []

    except HTTPException:
        raise

    except Exception as e:
        logger.error(
            f"Supabase drop alert lookup failed: {e}"
        )
        raise HTTPException(
            status_code=502,
            detail="Failed to fetch drop alerts",
        )

    name = _escape(input.name)
    href = f"{SITE_URL.rstrip('/')}/product/{input.slug}"
    subject = f"{name} is live."

    image_url = resolve_drop_image(input.image)
    safe_image_url = _escape(image_url)

    product_image_html = ""

    if safe_image_url:
        product_image_html = (
            f'<a href="{href}" style="display:block;text-decoration:none;margin:0 0 28px">'
            f'<img src="{safe_image_url}" '
            f'alt="{name}" '
            'width="600" '
            'style="display:block;width:100%;max-width:600px;height:auto;border:0;outline:none;text-decoration:none;">'
            '</a>'
        )

    html = (
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        'style="width:100%;background:#F7F7F5;">'

        '<tr>'
        '<td style="padding:32px 24px;font-family:Arial,sans-serif;background:#0A0A0A;">'
        '<p style="color:#F7F7F5;font-size:28px;font-weight:800;letter-spacing:-1px;margin:0;">'
        'NALAYAK'
        '</p>'
        '</td>'
        '</tr>'

        '<tr>'
        '<td style="padding:40px 24px;font-family:Arial,sans-serif;">'

        '<p style="font-size:11px;letter-spacing:3px;color:#8C8C8C;margin:0 0 12px;">'
        'DROP ALERT'
        '</p>'

        f'<h1 style="font-size:32px;font-weight:800;letter-spacing:-1px;'
        f'margin:0 0 16px;">{name} IS LIVE.</h1>'

        '<p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 28px;">'
        'You asked. It landed. Get there before the crowd does.'
        '</p>'

        f'{product_image_html}'

        f'<a href="{href}" '
        'style="display:inline-block;background:#0A0A0A;color:#F7F7F5;'
        'font-size:11px;letter-spacing:3px;text-decoration:none;padding:14px 28px;">'
        'SHOP THE PIECE'
        '</a>'

        f'<p style="font-size:11px;color:#8C8C8C;margin:32px 0 0;">'
        f'Sent by {EMAIL_FROM_NAME}. '
        'We never ask for your password or card details by email.'
        '</p>'

        '</td>'
        '</tr>'

        '</table>'
    )

    sent = 0

    for r in regs:
        email = r.get("email")

        if not email:
            continue

        try:
            await send_email(
                to=email,
                subject=subject,
                html=html,
            )

            async with _httpx.AsyncClient(timeout=30) as client_http:
                update_resp = await client_http.patch(
                    f"{base_url}/drop_alerts",
                    params={
                        "id": f"eq.{r['id']}",
                    },
                    headers={
                        **headers,
                        "Prefer": "return=minimal",
                    },
                    json={
                        "notified": True,
                    },
                )

            if update_resp.status_code >= 400:
                logger.error(
                    "Supabase drop alert notification update failed: "
                    f"{update_resp.status_code} {update_resp.text}"
                )
                continue

            sent += 1

        except Exception as e:
            logger.error(
                f"Failed to notify drop alert {r.get('id')}: {e}"
            )

    return {
        "status": "done",
        "sent": sent,
    }

class RequestStatusInput(BaseModel):
    status: str

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


def supabase_rest_headers():
    secret = os.environ.get("SUPABASE_FUNCTION_SECRET", "")
    if not secret:
        raise HTTPException(
            status_code=503,
            detail="supabase_function_not_configured",
        )

    return {
        "apikey": secret,
        "Authorization": f"Bearer {secret}",
        "Content-Type": "application/json",
    }


def supabase_rest_url():
    url = os.environ.get(
        "SUPABASE_URL",
        "https://yeosgnfvopvufroihyhs.supabase.co",
    ).rstrip("/")

    return url + "/rest/v1"


@api_router.post("/custom-requests")
async def create_custom_request(input: CustomRequestInput):
    if not _re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", input.email or ""):
        raise HTTPException(
            status_code=400,
            detail="invalid_email",
        )

    import random

    ref = f"NL-{random.randint(1000, 9999)}"

    headers = supabase_rest_headers()
    base_url = supabase_rest_url()

    # Make sure the generated reference is unique.
    for _ in range(20):
        async with _httpx.AsyncClient(timeout=30) as client_http:
            check = await client_http.get(
                f"{base_url}/custom_requests",
                params={
                    "select": "ref",
                    "ref": f"eq.{ref}",
                    "limit": "1",
                },
                headers=headers,
            )

        if check.status_code >= 400:
            logger.error(
                "Supabase custom request lookup failed: "
                f"{check.status_code} {check.text}"
            )
            raise HTTPException(
                status_code=502,
                detail="Failed to create custom request",
            )

        existing = check.json()

        if not existing:
            break

        ref = f"NL-{random.randint(1000, 9999)}"
    else:
        raise HTTPException(
            status_code=500,
            detail="Could not generate unique reference",
        )

    now = datetime.now(timezone.utc).isoformat()

    doc = {
        "ref": ref,
        "user_id": None,
        "email": input.email,
        "name": input.name,
        "phone": input.phone,
        "garment": input.garment,
        "size": input.size,
        "vibes": input.vibes,
        "colours": input.colours,
        "budget": input.budget,
        "description": input.description,
        "images": input.images,
        "status": "received",
        "created_at": now,
        "updated_at": now,
    }

    async with _httpx.AsyncClient(timeout=30) as client_http:
        resp = await client_http.post(
            f"{base_url}/custom_requests",
            headers={
                **headers,
                "Prefer": "return=representation",
            },
            json=doc,
        )

    if resp.status_code >= 400:
        logger.error(
            "Supabase custom request insert failed: "
            f"{resp.status_code} {resp.text}"
        )
        raise HTTPException(
            status_code=502,
            detail="Failed to create custom request",
        )

    emailed = False

    if RESEND_API_KEY:
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
        await send_email(
            to=input.email,
            subject=subject,
            html=html,
        )

        emailed = True

    return {
        "ref": ref,
        "emailed": emailed,
    }


@api_router.get("/admin/custom-requests")
async def admin_custom_requests(
    x_admin_key: str = Header(None),
):
    admin_guard(x_admin_key)

    headers = supabase_rest_headers()
    base_url = supabase_rest_url()

    async with _httpx.AsyncClient(timeout=30) as client_http:
        resp = await client_http.get(
            f"{base_url}/custom_requests",
            params={
                "select": "*",
                "order": "created_at.desc",
                "limit": "100",
            },
            headers=headers,
        )

    if resp.status_code >= 400:
        logger.error(
            "Supabase custom request list failed: "
            f"{resp.status_code} {resp.text}"
        )
        raise HTTPException(
            status_code=502,
            detail="Failed to fetch custom requests",
        )

    return {
        "requests": resp.json() or []
    }


@api_router.post("/custom-requests/{ref}/status")
async def update_custom_request_status(
    ref: str,
    input: RequestStatusInput,
    x_admin_key: str = Header(None),
):
    admin_guard(x_admin_key)

    allowed = [
        "received",
        "in-progress",
        "completed",
    ]

    if input.status not in allowed:
        raise HTTPException(
            status_code=400,
            detail="invalid_status",
        )

    headers = supabase_rest_headers()
    base_url = supabase_rest_url()

    async with _httpx.AsyncClient(timeout=30) as client_http:
        existing_resp = await client_http.get(
            f"{base_url}/custom_requests",
            params={
                "select": "*",
                "ref": f"eq.{ref}",
                "limit": "1",
            },
            headers=headers,
        )

    if existing_resp.status_code >= 400:
        logger.error(
            "Supabase custom request lookup failed: "
            f"{existing_resp.status_code} {existing_resp.text}"
        )
        raise HTTPException(
            status_code=502,
            detail="Failed to fetch custom request",
        )

    existing = existing_resp.json()

    if not existing:
        raise HTTPException(
            status_code=404,
            detail="not_found",
        )

    req = existing[0]

    async with _httpx.AsyncClient(timeout=30) as client_http:
        update_resp = await client_http.patch(
            f"{base_url}/custom_requests",
            params={
                "ref": f"eq.{ref}",
            },
            headers={
                **headers,
                "Prefer": "return=representation",
            },
            json={
                "status": input.status,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
        )

    if update_resp.status_code >= 400:
        logger.error(
            "Supabase custom request update failed: "
            f"{update_resp.status_code} {update_resp.text}"
        )
        raise HTTPException(
            status_code=502,
            detail="Failed to update custom request",
        )

    emailed = False

    if RESEND_API_KEY and req.get("email"):
        label = input.status.replace("-", " ").upper()
        name = _escape(
            (req.get("name") or "").split()[0] or "there"
        )

        subject = (
            f"Request {ref} — "
            f"{input.status.replace('-', ' ')}."
        )

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

        await send_email(
            to=req["email"],
            subject=subject,
            html=html,
        )

        emailed = True

    return {
        "ref": ref,
        "status": input.status,
        "emailed": emailed,
    }

# ── Orders (mock checkout, real receipts) ──
class OrderInput(BaseModel):
    email: str
    name: str = ""
    phone: str = ""
    shipping_address: str = ""
    items: list = []
    subtotal: int = 0
    shipping: int = 0
    total: int = 0

@api_router.post("/orders")
async def create_order(
    input: OrderInput,
    nalayak_session: str = Cookie(None),
):
    if not nalayak_session:
        raise HTTPException(
            status_code=401,
            detail="not_authenticated",
        )

    headers = supabase_rest_headers()
    base_url = supabase_rest_url()

    # Resolve the logged-in member from the session.
    async with _httpx.AsyncClient(timeout=30) as client_http:
        session_resp = await client_http.get(
            f"{base_url}/member_sessions",
            params={
                "select": "member_id,expires_at",
                "token": f"eq.{nalayak_session}",
                "limit": "1",
            },
            headers=headers,
        )

    if session_resp.status_code >= 400:
        logger.error(
            "Member session lookup failed: "
            f"{session_resp.status_code} {session_resp.text}"
        )
        raise HTTPException(
            status_code=502,
            detail="Failed to validate session.",
        )

    sessions = session_resp.json() or []

    if not sessions:
        raise HTTPException(
            status_code=401,
            detail="session_expired",
        )

    session = sessions[0]

    expires_at = datetime.fromisoformat(
        session["expires_at"].replace("Z", "+00:00")
    )

    if expires_at <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=401,
            detail="session_expired",
        )

    member_id = session["member_id"]

    if not _re.match(
        r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
        input.email or "",
    ):
        raise HTTPException(
            status_code=400,
            detail="invalid_email",
        )

    if not input.items:
        raise HTTPException(
            status_code=400,
            detail="empty_order",
        )

    headers = {
        **headers,
        "Prefer": "return=representation",
    }

    # Generate a unique Nalayak order number.
    import random

    order_id = None

    for _ in range(20):
        candidate = f"NLO-{random.randint(1000, 9999)}"

        async with _httpx.AsyncClient(timeout=30) as client_http:
            check = await client_http.get(
                f"{base_url}/orders",
                params={
                    "select": "order_id",
                    "order_id": f"eq.{candidate}",
                    "limit": "1",
                },
                headers=headers,
            )

        if check.status_code >= 400:
            logger.error(
                "Supabase order lookup failed: "
                f"{check.status_code} {check.text}"
            )
            raise HTTPException(
                status_code=502,
                detail="Failed to create order",
            )

        if not check.json():
            order_id = candidate
            break

    if not order_id:
        raise HTTPException(
            status_code=500,
            detail="Could not generate unique order ID",
        )

    now = datetime.now(timezone.utc).isoformat()

    doc = {
        "order_id": order_id,
        "user_id": member_id,
        "email": input.email,
        "name": input.name,
        "phone": input.phone,
        "shipping_address": input.shipping_address,
        "items": input.items,
        "subtotal": input.subtotal,
        "shipping": input.shipping,
        "total": input.total,
        "status": "placed",
        "created_at": now,
    }

    async with _httpx.AsyncClient(timeout=30) as client_http:
        resp = await client_http.post(
            f"{base_url}/orders",
            headers=headers,
            json=doc,
        )

    if resp.status_code >= 400:
        logger.error(
            "Supabase order insert failed: "
            f"{resp.status_code} {resp.text}"
        )
        raise HTTPException(
            status_code=502,
            detail="Failed to create order",
        )

    emailed = False

    if RESEND_API_KEY:
        rows = "".join(
            f'<tr>'
            f'<td style="padding:8px 0;font-size:13px;color:#333">'
            f'{_escape(str(i.get("name", "")))} '
            f'<span style="color:#8C8C8C">'
            f'· {_escape(str(i.get("size", "")))} × '
            f'{int(i.get("qty", 1))}'
            f'</span>'
            f'</td>'
            f'<td style="padding:8px 0;font-size:13px;color:#333;text-align:right">'
            f'₹{int(i.get("price", 0)) * int(i.get("qty", 1)):,}'
            f'</td>'
            f'</tr>'
            for i in input.items
        )

        subject = f"Order {order_id} — confirmed."

        html = (
            '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">'
            '<tr><td style="padding:32px 24px;font-family:Arial,sans-serif;background:#0A0A0A">'
            '<p style="color:#F7F7F5;font-size:28px;font-weight:800;letter-spacing:-1px;margin:0">'
            'NALAYAK'
            '</p>'
            '</td></tr>'

            '<tr><td style="padding:40px 24px;font-family:Arial,sans-serif">'

            '<p style="font-size:11px;letter-spacing:3px;color:#8C8C8C;margin:0 0 12px">'
            'ORDER CONFIRMED'
            '</p>'

            f'<h1 style="font-size:32px;font-weight:800;letter-spacing:-1px;margin:0 0 16px">'
            f'GOOD CHOICE, {_escape((input.name or "").split()[0] or "NALAYAK").upper()}.'
            '</h1>'

            f'<p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 24px">'
            f'Order <strong>{order_id}</strong> is in. '
            'It ships from Kolkata within 48 hours.'
            '</p>'

            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
            f'style="border-top:1px solid #E5E5E5">'
            f'{rows}'

            f'<tr>'
            f'<td style="padding:12px 0;font-size:13px;color:#8C8C8C;border-top:1px solid #E5E5E5">'
            'Shipping'
            '</td>'

            f'<td style="padding:12px 0;font-size:13px;text-align:right;border-top:1px solid #E5E5E5">'
            f'{"FREE" if input.shipping == 0 else f"₹{input.shipping:,}"}'
            '</td>'
            '</tr>'

            f'<tr>'
            f'<td style="padding:4px 0 12px;font-size:15px;font-weight:700">'
            'Total'
            '</td>'

            f'<td style="padding:4px 0 12px;font-size:15px;font-weight:700;text-align:right">'
            f'₹{input.total:,}'
            '</td>'
            '</tr>'

            '</table>'

            f'<a href="{SITE_URL.rstrip("/")}/track/{order_id}" '
            'style="display:inline-block;background:#0A0A0A;color:#F7F7F5;'
            'font-size:11px;letter-spacing:3px;text-decoration:none;'
            'padding:14px 28px;margin-top:8px">'
            'TRACK YOUR ORDER'
            '</a>'

            f'<p style="font-size:11px;color:#8C8C8C;margin:32px 0 0">'
            f'Sent by {EMAIL_FROM_NAME}. '
            'We never ask for your password or card details by email.'
            '</p>'

            '</td></tr></table>'
        )

        try:
            await send_email(
                to=input.email,
                subject=subject,
                html=html,
            )

            emailed = True

        except HTTPException as e:
            logger.error(
                "Order confirmation email failed for %s: %s",
                order_id,
                e.detail,
            )

            emailed = False

        except Exception as e:
            logger.exception(
                "Order confirmation email failed for %s: %s",
                order_id,
                e,
            )

            emailed = False

    return {
        "orderId": order_id,
        "emailed": emailed,
    }


@api_router.get("/orders")
async def list_orders(
    nalayak_session: str = Cookie(None),
):
    if not nalayak_session:
        raise HTTPException(
            status_code=401,
            detail="not_authenticated",
        )

    headers = supabase_rest_headers()
    base_url = supabase_rest_url()

    try:
        # Resolve the logged-in member from the session.
        async with _httpx.AsyncClient(timeout=30) as client_http:
            session_resp = await client_http.get(
                f"{base_url}/member_sessions",
                params={
                    "select": "member_id,expires_at",
                    "token": f"eq.{nalayak_session}",
                    "limit": "1",
                },
                headers=headers,
            )

        if session_resp.status_code >= 400:
            logger.error(
                "Member session lookup failed: "
                f"{session_resp.status_code} {session_resp.text}"
            )
            raise HTTPException(
                status_code=502,
                detail="Failed to validate session.",
            )

        sessions = session_resp.json() or []

        if not sessions:
            raise HTTPException(
                status_code=401,
                detail="session_expired",
            )

        session = sessions[0]

        expires_at = datetime.fromisoformat(
            session["expires_at"].replace("Z", "+00:00")
        )

        if expires_at <= datetime.now(timezone.utc):
            raise HTTPException(
                status_code=401,
                detail="session_expired",
            )

        member_id = session["member_id"]

        # Fetch ONLY this member's orders.
        async with _httpx.AsyncClient(timeout=30) as client_http:
            resp = await client_http.get(
                f"{base_url}/orders",
                params={
                    "select": "*",
                    "user_id": f"eq.{member_id}",
                    "order": "created_at.desc",
                    "limit": "50",
                },
                headers=headers,
            )

        if resp.status_code >= 400:
            logger.error(
                "Supabase customer orders lookup failed: "
                f"{resp.status_code} {resp.text}"
            )

            raise HTTPException(
                status_code=502,
                detail="Failed to fetch orders",
            )

        return {
            "orders": resp.json() or []
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.exception(
            "Supabase customer orders request failed: %s",
            e,
        )

        raise HTTPException(
            status_code=502,
            detail="Failed to fetch orders",
        )


# ── Order tracking + shipping status ──
@api_router.get("/orders/{order_id}")
async def get_order(order_id: str):
    headers = supabase_rest_headers()
    base_url = supabase_rest_url()

    try:
        async with _httpx.AsyncClient(timeout=30) as client_http:
            resp = await client_http.get(
                f"{base_url}/orders",
                params={
                    "select": "*",
                    "order_id": f"eq.{order_id}",
                    "limit": "1",
                },
                headers=headers,
            )

        if resp.status_code >= 400:
            logger.error(
                "Supabase order lookup failed: "
                f"{resp.status_code} {resp.text}"
            )

            raise HTTPException(
                status_code=502,
                detail="Failed to fetch order",
            )

        orders = resp.json() or []

        if not orders:
            raise HTTPException(
                status_code=404,
                detail="not_found",
            )

        return orders[0]

    except HTTPException:
        raise

    except Exception as e:
        logger.exception(
            "Supabase order lookup failed: %s",
            e,
        )

        raise HTTPException(
            status_code=502,
            detail="Failed to fetch order",
        )

class OrderStatusInput(BaseModel):
    status: str

@api_router.post("/orders/{order_id}/status")
async def update_order_status(
    order_id: str,
    input: OrderStatusInput,
    x_admin_key: str = Header(None),
):
    admin_guard(x_admin_key)

    allowed = [
        "placed",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
    ]

    status = (input.status or "").strip().lower()

    if status not in allowed:
        raise HTTPException(
            status_code=400,
            detail="invalid_status",
        )

    supabase_url = os.environ.get(
        "SUPABASE_URL",
        "",
    ).rstrip("/")

    supabase_secret = os.environ.get(
        "SUPABASE_FUNCTION_SECRET",
        "",
    )

    if not supabase_url:
        raise HTTPException(
            status_code=500,
            detail="SUPABASE_URL is not configured",
        )

    if not supabase_secret:
        raise HTTPException(
            status_code=500,
            detail="SUPABASE_FUNCTION_SECRET is not configured",
        )

    try:
        async with _httpx.AsyncClient(timeout=30) as client_http:
            resp = await client_http.post(
                f"{supabase_url}/functions/v1/update-order-status",
                headers={
                    "Content-Type": "application/json",
                    "apikey": supabase_secret,
                    "Authorization": f"Bearer {supabase_secret}",
                },
                json={
                    "order_id": order_id,
                    "status": status,
                },
            )

        try:
            result = resp.json()
        except Exception:
            result = {
                "detail": resp.text,
            }

        if resp.status_code >= 400:
            logger.error(
                "Supabase order status update failed: "
                f"{resp.status_code} {result}"
            )

            raise HTTPException(
                status_code=502,
                detail=result.get(
                    "detail",
                    "Failed to update order",
                ),
            )

        updated_order = result.get("order") or {}

        return {
            "order_id": order_id,
            "status": updated_order.get(
                "status",
                status,
            ),
            "emailed": result.get(
                "emailed",
                False,
            ),
            "order": updated_order,
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.exception(
            "Supabase order status request failed: %s",
            e,
        )

        raise HTTPException(
            status_code=502,
            detail="Failed to update order",
        )

# ── Admin orders list — Supabase ──
@api_router.get("/admin/orders")
async def admin_orders(
    x_admin_key: str = Header(None),
):
    admin_guard(x_admin_key)

    headers = supabase_rest_headers()
    base_url = supabase_rest_url()

    try:
        async with _httpx.AsyncClient(timeout=30) as client_http:
            resp = await client_http.get(
                f"{base_url}/orders",
                headers=headers,
                params={
                    "select": "*",
                    "order": "created_at.desc",
                    "limit": "100",
                },
            )

        try:
            result = resp.json()
        except Exception:
            result = {
                "detail": resp.text,
            }

        if resp.status_code >= 400:
            logger.error(
                "Supabase admin orders lookup failed: "
                f"{resp.status_code} {result}"
            )

            raise HTTPException(
                status_code=502,
                detail="Failed to fetch orders",
            )

        return {
            "orders": result if isinstance(result, list) else [],
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.exception(
            "Supabase admin orders request failed: %s",
            e,
        )

        raise HTTPException(
            status_code=502,
            detail="Failed to fetch orders",
        )

# ── Object storage (Emergent) + IRL uploads + admin ──
import uuid as _uuid
import asyncio as _asyncio
import requests as _requests

# ── Supabase Storage ──
# IRL images are stored in the private Supabase "irl" bucket.
# The backend uses the server-side secret key, so the browser never
# gets direct unrestricted access to the bucket.

SUPABASE_URL = (
    os.environ.get(
        "SUPABASE_URL",
        "https://yeosgnfvopvufroihyhs.supabase.co",
    )
    .strip()
    .rstrip("/")
)

SUPABASE_STORAGE_BUCKET = "irl"

# Server-side secret key. NEVER expose this to the frontend.
SUPABASE_STORAGE_KEY = (
    os.environ.get("SUPABASE_FUNCTION_SECRET") or ""
).strip()

APP_NAME = "nalayak"
ADMIN_KEY = os.environ.get("ADMIN_KEY")


def init_storage(force: bool = False):
    """
    Kept as a compatibility helper because the existing application
    startup code may call init_storage().

    Supabase Storage does not require a separate storage initialization
    request like the old Emergent object storage did.
    """
    if not SUPABASE_STORAGE_KEY:
        raise RuntimeError("SUPABASE_FUNCTION_SECRET is not configured")

    return SUPABASE_STORAGE_KEY


def put_object(path: str, data: bytes, content_type: str) -> dict:
    """
    Upload an object to the private Supabase Storage bucket.
    """
    key = init_storage()

    url = (
        f"{SUPABASE_URL}/storage/v1/object/"
        f"{SUPABASE_STORAGE_BUCKET}/{path}"
    )

    resp = _requests.post(
        url,
        headers={
            "Authorization": f"Bearer {key}",
            "apikey": key,
            "Content-Type": content_type,
            "x-upsert": "false",
        },
        data=data,
        timeout=120,
    )

    resp.raise_for_status()

    return {
        "path": path,
        "response": resp.json() if resp.content else {},
    }


def get_object(path: str):
    """
    Download an object from the private Supabase Storage bucket.
    """
    key = init_storage()

    url = (
        f"{SUPABASE_URL}/storage/v1/object/"
        f"{SUPABASE_STORAGE_BUCKET}/{path}"
    )

    resp = _requests.get(
        url,
        headers={
            "Authorization": f"Bearer {key}",
            "apikey": key,
        },
        timeout=60,
    )

    resp.raise_for_status()

    return (
        resp.content,
        resp.headers.get(
            "Content-Type",
            "application/octet-stream",
        ),
    )

def admin_guard(x_admin_key: str = Header(None)):
    if ADMIN_KEY and x_admin_key != ADMIN_KEY:
        raise HTTPException(status_code=401, detail="unauthorized")

# ── IRL / Real Life uploads — Supabase Storage + Supabase Postgres ──

def supabase_storage_headers(content_type: str | None = None):
    secret = os.environ.get("SUPABASE_FUNCTION_SECRET", "")
    if not secret:
        raise HTTPException(
            status_code=503,
            detail="supabase_function_not_configured",
        )

    headers = {
        "apikey": secret,
        "Authorization": f"Bearer {secret}",
    }

    if content_type:
        headers["Content-Type"] = content_type

    return headers


def supabase_storage_url(path: str = ""):
    base = os.environ.get(
        "SUPABASE_URL",
        "https://yeosgnfvopvufroihyhs.supabase.co",
    ).rstrip("/")

    url = f"{base}/storage/v1"

    if path:
        url += "/" + path.lstrip("/")

    return url

# ─────────────────────────────────────────────
# Support Tickets
# ─────────────────────────────────────────────

class SupportTicketInput(BaseModel):
    order_id: str
    issue_type: str
    product_name: str = ""
    description: str
    images: list = []


class SupportTicketStatusInput(BaseModel):
    status: str
    admin_note: str = ""


SUPPORT_ISSUE_TYPES = [
    "wrong_item",
    "damaged",
    "missing_item",
    "size_issue",
    "delivery_issue",
    "return_refund",
    "other",
]


SUPPORT_STATUSES = [
    "open",
    "in-review",
    "waiting-customer",
    "resolved",
    "closed",
]


async def get_authenticated_member_id(nalayak_session: str | None):
    """
    Resolve the logged-in NALAYAK member from the session cookie.
    """

    if not nalayak_session:
        raise HTTPException(
            status_code=401,
            detail="not_authenticated",
        )

    headers = supabase_rest_headers()
    base_url = supabase_rest_url()

    async with _httpx.AsyncClient(timeout=30) as client_http:
        session_resp = await client_http.get(
            f"{base_url}/member_sessions",
            params={
                "select": "member_id,expires_at",
                "token": f"eq.{nalayak_session}",
                "limit": "1",
            },
            headers=headers,
        )

    if session_resp.status_code >= 400:
        logger.error(
            "Support session lookup failed: "
            f"{session_resp.status_code} {session_resp.text}"
        )

        raise HTTPException(
            status_code=502,
            detail="Failed to validate session.",
        )

    sessions = session_resp.json() or []

    if not sessions:
        raise HTTPException(
            status_code=401,
            detail="session_expired",
        )

    session = sessions[0]

    expires_at = datetime.fromisoformat(
        session["expires_at"].replace("Z", "+00:00")
    )

    if expires_at <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=401,
            detail="session_expired",
        )

    return session["member_id"]


def generate_support_ticket_number():
    import random

    return f"NL-T-{random.randint(1000, 9999)}"


@api_router.post("/support/tickets")
async def create_support_ticket(
    input: SupportTicketInput,
    nalayak_session: str = Cookie(None),
):
    """
    Customer creates a support ticket for their own delivered order.
    """

    member_id = await get_authenticated_member_id(
        nalayak_session
    )

    issue_type = (input.issue_type or "").strip()

    if issue_type not in SUPPORT_ISSUE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="invalid_issue_type",
        )

    description = (input.description or "").strip()

    if len(description) < 10:
        raise HTTPException(
            status_code=400,
            detail="description_too_short",
        )

    order_id = (input.order_id or "").strip()

    if not order_id:
        raise HTTPException(
            status_code=400,
            detail="order_id_required",
        )

    headers = supabase_rest_headers()
    base_url = supabase_rest_url()

    # ─────────────────────────────────────────
    # Verify that this order belongs to member
    # ─────────────────────────────────────────

    async with _httpx.AsyncClient(timeout=30) as client_http:
        order_resp = await client_http.get(
            f"{base_url}/orders",
            params={
                "select": "*",
                "order_id": f"eq.{order_id}",
                "user_id": f"eq.{member_id}",
                "limit": "1",
            },
            headers=headers,
        )

    if order_resp.status_code >= 400:
        logger.error(
            "Support order lookup failed: "
            f"{order_resp.status_code} {order_resp.text}"
        )

        raise HTTPException(
            status_code=502,
            detail="Failed to verify order.",
        )

    orders = order_resp.json() or []

    if not orders:
        raise HTTPException(
            status_code=404,
            detail="order_not_found",
        )

    order = orders[0]

    # ─────────────────────────────────────────
    # Only delivered orders can raise a ticket
    # ─────────────────────────────────────────

    if (order.get("status") or "").lower() != "delivered":
        raise HTTPException(
            status_code=400,
            detail="support_available_after_delivery",
        )

    # ─────────────────────────────────────────
    # Prevent accidental duplicate open tickets
    # ─────────────────────────────────────────

    async with _httpx.AsyncClient(timeout=30) as client_http:
        existing_resp = await client_http.get(
            f"{base_url}/support_tickets",
            params={
                "select": "ticket_number,status",
                "user_id": f"eq.{member_id}",
                "order_id": f"eq.{order_id}",
                "status": "not.in.(resolved,closed)",
                "limit": "1",
            },
            headers=headers,
        )

    if existing_resp.status_code >= 400:
        logger.error(
            "Support ticket duplicate check failed: "
            f"{existing_resp.status_code} {existing_resp.text}"
        )

        raise HTTPException(
            status_code=502,
            detail="Failed to check existing tickets.",
        )

    existing = existing_resp.json() or []

    if existing:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "ticket_already_exists",
                "ticket_number": existing[0].get("ticket_number"),
            },
        )

    # ─────────────────────────────────────────
    # Generate ticket number
    # ─────────────────────────────────────────

    ticket_number = None

    for _ in range(20):
        candidate = generate_support_ticket_number()

        async with _httpx.AsyncClient(timeout=30) as client_http:
            check_resp = await client_http.get(
                f"{base_url}/support_tickets",
                params={
                    "select": "id",
                    "ticket_number": f"eq.{candidate}",
                    "limit": "1",
                },
                headers=headers,
            )

        if check_resp.status_code >= 400:
            raise HTTPException(
                status_code=502,
                detail="Failed to generate support ticket.",
            )

        if not check_resp.json():
            ticket_number = candidate
            break

    if not ticket_number:
        raise HTTPException(
            status_code=500,
            detail="Could not generate ticket number.",
        )

    now = datetime.now(timezone.utc).isoformat()

    doc = {
        "ticket_number": ticket_number,
        "user_id": member_id,
        "order_id": order_id,
        "issue_type": issue_type,
        "product_name": input.product_name.strip(),
        "description": description,
        "images": input.images or [],
        "status": "open",
        "admin_note": "",
        "created_at": now,
        "updated_at": now,
    }

    async with _httpx.AsyncClient(timeout=30) as client_http:
        insert_resp = await client_http.post(
            f"{base_url}/support_tickets",
            headers={
                **headers,
                "Prefer": "return=representation",
            },
            json=doc,
        )

    if insert_resp.status_code >= 400:
        logger.error(
            "Support ticket insert failed: "
            f"{insert_resp.status_code} {insert_resp.text}"
        )

        raise HTTPException(
            status_code=502,
            detail="Failed to create support ticket.",
        )

    created = insert_resp.json() or []

    ticket = created[0] if created else doc

    return {
        "success": True,
        "ticket": ticket,
    }


@api_router.get("/support/tickets")
async def list_my_support_tickets(
    nalayak_session: str = Cookie(None),
):
    """
    Return only the logged-in member's tickets.
    """

    member_id = await get_authenticated_member_id(
        nalayak_session
    )

    headers = supabase_rest_headers()
    base_url = supabase_rest_url()

    async with _httpx.AsyncClient(timeout=30) as client_http:
        resp = await client_http.get(
            f"{base_url}/support_tickets",
            params={
                "select": "*",
                "user_id": f"eq.{member_id}",
                "order": "created_at.desc",
                "limit": "50",
            },
            headers=headers,
        )

    if resp.status_code >= 400:
        logger.error(
            "Customer support tickets lookup failed: "
            f"{resp.status_code} {resp.text}"
        )

        raise HTTPException(
            status_code=502,
            detail="Failed to fetch support tickets.",
        )

    return {
        "tickets": resp.json() or []
    }


@api_router.get("/support/tickets/{ticket_number}")
async def get_my_support_ticket(
    ticket_number: str,
    nalayak_session: str = Cookie(None),
):
    """
    Customer can only view their own ticket.
    """

    member_id = await get_authenticated_member_id(
        nalayak_session
    )

    headers = supabase_rest_headers()
    base_url = supabase_rest_url()

    async with _httpx.AsyncClient(timeout=30) as client_http:
        resp = await client_http.get(
            f"{base_url}/support_tickets",
            params={
                "select": "*",
                "ticket_number": f"eq.{ticket_number}",
                "user_id": f"eq.{member_id}",
                "limit": "1",
            },
            headers=headers,
        )

    if resp.status_code >= 400:
        raise HTTPException(
            status_code=502,
            detail="Failed to fetch support ticket.",
        )

    tickets = resp.json() or []

    if not tickets:
        raise HTTPException(
            status_code=404,
            detail="ticket_not_found",
        )

    return {
        "ticket": tickets[0]
    }


# ─────────────────────────────────────────────
# Admin Support Tickets
# ─────────────────────────────────────────────

@api_router.get("/admin/support/tickets")
async def admin_support_tickets(
    x_admin_key: str = Header(None),
):
    admin_guard(x_admin_key)

    headers = supabase_rest_headers()
    base_url = supabase_rest_url()

    async with _httpx.AsyncClient(timeout=30) as client_http:
        resp = await client_http.get(
            f"{base_url}/support_tickets",
            params={
                "select": "*",
                "order": "created_at.desc",
                "limit": "200",
            },
            headers=headers,
        )

    if resp.status_code >= 400:
        logger.error(
            "Admin support tickets lookup failed: "
            f"{resp.status_code} {resp.text}"
        )

        raise HTTPException(
            status_code=502,
            detail="Failed to fetch support tickets.",
        )

    return {
        "tickets": resp.json() or []
    }


@api_router.post("/admin/support/tickets/{ticket_number}/status")
async def admin_update_support_ticket(
    ticket_number: str,
    input: SupportTicketStatusInput,
    x_admin_key: str = Header(None),
):
    admin_guard(x_admin_key)

    status = (input.status or "").strip().lower()

    if status not in SUPPORT_STATUSES:
        raise HTTPException(
            status_code=400,
            detail="invalid_status",
        )

    headers = {
        **supabase_rest_headers(),
        "Prefer": "return=representation",
    }

    base_url = supabase_rest_url()

    async with _httpx.AsyncClient(timeout=30) as client_http:
        existing_resp = await client_http.get(
            f"{base_url}/support_tickets",
            params={
                "select": "*",
                "ticket_number": f"eq.{ticket_number}",
                "limit": "1",
            },
            headers=headers,
        )

    if existing_resp.status_code >= 400:
        raise HTTPException(
            status_code=502,
            detail="Failed to fetch support ticket.",
        )

    existing = existing_resp.json() or []

    if not existing:
        raise HTTPException(
            status_code=404,
            detail="ticket_not_found",
        )

    now = datetime.now(timezone.utc).isoformat()

    update_doc = {
        "status": status,
        "admin_note": input.admin_note or "",
        "updated_at": now,
    }

    async with _httpx.AsyncClient(timeout=30) as client_http:
        update_resp = await client_http.patch(
            f"{base_url}/support_tickets",
            params={
                "ticket_number": f"eq.{ticket_number}",
            },
            headers=headers,
            json=update_doc,
        )

    if update_resp.status_code >= 400:
        logger.error(
            "Support ticket update failed: "
            f"{update_resp.status_code} {update_resp.text}"
        )

        raise HTTPException(
            status_code=502,
            detail="Failed to update support ticket.",
        )

    updated = update_resp.json() or []

    return {
        "success": True,
        "ticket": updated[0] if updated else {
            **existing[0],
            **update_doc,
        },
    }
@api_router.post("/irl/upload")
async def irl_upload(
    file: UploadFile = File(...),
    order_id: str = "",
    name: str = "",
):
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="images_only",
        )

    data = await file.read()

    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="file_too_large",
        )

    ext = (file.filename or "jpg").split(".")[-1].lower()

    if ext not in (
        "jpg",
        "jpeg",
        "png",
        "webp",
        "gif",
        "heic",
    ):
        ext = "jpg"

    storage_path = f"nalayak/{_uuid.uuid4()}.{ext}"

    storage_url = supabase_storage_url(
        f"object/irl/{storage_path}"
    )

    content_type = file.content_type or "image/jpeg"

    try:
        async with _httpx.AsyncClient(timeout=120) as client_http:
            upload_resp = await client_http.post(
                storage_url,
                headers=supabase_storage_headers(content_type),
                content=data,
            )

        if upload_resp.status_code >= 400:
            logger.error(
                "Supabase IRL storage upload failed: "
                f"{upload_resp.status_code} {upload_resp.text}"
            )
            raise HTTPException(
                status_code=502,
                detail="Failed to upload IRL image",
            )

    except HTTPException:
        raise

    except Exception as e:
        logger.error(
            f"Supabase IRL storage upload failed: {e}"
        )
        raise HTTPException(
            status_code=502,
            detail="Failed to upload IRL image",
        )

    file_id = str(_uuid.uuid4())

    doc = {
        "id": file_id,
        "user_id": None,
        "order_id": order_id or None,
        "storage_path": storage_path,
        "original_filename": file.filename,
        "content_type": content_type,
        "status": "pending",
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    headers = {
        **supabase_rest_headers(),
        "Prefer": "return=representation",
    }

    base_url = supabase_rest_url()

    try:
        async with _httpx.AsyncClient(timeout=30) as client_http:
            resp = await client_http.post(
                f"{base_url}/irl_uploads",
                headers=headers,
                json=doc,
            )

        if resp.status_code >= 400:
            logger.error(
                "Supabase IRL database insert failed: "
                f"{resp.status_code} {resp.text}"
            )

            # Clean up the uploaded object if database insert fails.
            try:
                async with _httpx.AsyncClient(timeout=30) as client_http:
                    await client_http.delete(
                        storage_url,
                        headers=supabase_storage_headers(),
                    )
            except Exception:
                pass

            raise HTTPException(
                status_code=502,
                detail="Failed to save IRL upload",
            )

    except HTTPException:
        raise

    except Exception as e:
        logger.error(
            f"Supabase IRL database insert failed: {e}"
        )
        raise HTTPException(
            status_code=502,
            detail="Failed to save IRL upload",
        )

    return {
        "id": file_id,
        "status": "pending",
    }


@api_router.get("/irl/approved")
async def irl_approved():
    headers = supabase_rest_headers()
    base_url = supabase_rest_url()

    try:
        async with _httpx.AsyncClient(timeout=30) as client_http:
            resp = await client_http.get(
                f"{base_url}/irl_uploads",
                params={
                    "select": "id,order_id,created_at",
                    "status": "eq.approved",
                    "is_deleted": "eq.false",
                    "order": "created_at.desc",
                    "limit": "12",
                },
                headers=headers,
            )

        if resp.status_code >= 400:
            logger.error(
                "Supabase approved IRL lookup failed: "
                f"{resp.status_code} {resp.text}"
            )
            raise HTTPException(
                status_code=502,
                detail="Failed to fetch approved IRL uploads",
            )

        return {
            "items": resp.json()
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.error(
            f"Supabase approved IRL request failed: {e}"
        )
        raise HTTPException(
            status_code=502,
            detail="Failed to fetch approved IRL uploads",
        )


@api_router.get("/irl/mine")
async def irl_mine(email: str = ""):
    if not _re.match(
        r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
        email or "",
    ):
        return {"items": []}

    headers = supabase_rest_headers()
    base_url = supabase_rest_url()

    try:
        async with _httpx.AsyncClient(timeout=30) as client_http:
            orders_resp = await client_http.get(
                f"{base_url}/orders",
                params={
                    "select": "order_id",
                    "email": f"eq.{email}",
                    "limit": "100",
                },
                headers=headers,
            )

        if orders_resp.status_code >= 400:
            logger.error(
                "Supabase customer orders lookup failed: "
                f"{orders_resp.status_code} {orders_resp.text}"
            )
            raise HTTPException(
                status_code=502,
                detail="Failed to fetch customer orders",
            )

        orders = orders_resp.json()
        ids = [
            o.get("order_id")
            for o in orders
            if o.get("order_id")
        ]

        if not ids:
            return {"items": []}

        # PostgREST `in` filter.
        order_filter = "(" + ",".join(
            str(i).replace(",", "") for i in ids
        ) + ")"

        async with _httpx.AsyncClient(timeout=30) as client_http:
            resp = await client_http.get(
                f"{base_url}/irl_uploads",
                params={
                    "select": "id,order_id,created_at",
                    "order_id": f"in.{order_filter}",
                    "status": "eq.approved",
                    "is_deleted": "eq.false",
                    "order": "created_at.desc",
                    "limit": "50",
                },
                headers=headers,
            )

        if resp.status_code >= 400:
            logger.error(
                "Supabase customer IRL lookup failed: "
                f"{resp.status_code} {resp.text}"
            )
            raise HTTPException(
                status_code=502,
                detail="Failed to fetch customer IRL uploads",
            )

        return {
            "items": resp.json()
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.error(
            f"Supabase customer IRL request failed: {e}"
        )
        raise HTTPException(
            status_code=502,
            detail="Failed to fetch customer IRL uploads",
        )


@api_router.get("/irl/file/{file_id}")
async def irl_file(file_id: str):
    headers = supabase_rest_headers()
    base_url = supabase_rest_url()

    try:
        async with _httpx.AsyncClient(timeout=30) as client_http:
            resp = await client_http.get(
                f"{base_url}/irl_uploads",
                params={
                    "select": "id,storage_path,content_type",
                    "id": f"eq.{file_id}",
                    "status": "eq.approved",
                    "is_deleted": "eq.false",
                    "limit": "1",
                },
                headers=headers,
            )

        if resp.status_code >= 400:
            raise HTTPException(
                status_code=502,
                detail="Failed to fetch IRL upload",
            )

        records = resp.json()

        if not records:
            raise HTTPException(
                status_code=404,
                detail="not_found",
            )

        record = records[0]

        storage_path = record.get("storage_path")

        if not storage_path:
            raise HTTPException(
                status_code=404,
                detail="not_found",
            )

        async with _httpx.AsyncClient(timeout=60) as client_http:
            image_resp = await client_http.get(
                supabase_storage_url(
                    f"object/irl/{storage_path}"
                ),
                headers=supabase_storage_headers(),
            )

        if image_resp.status_code >= 400:
            logger.error(
                "Supabase IRL image fetch failed: "
                f"{image_resp.status_code} {image_resp.text}"
            )
            raise HTTPException(
                status_code=404,
                detail="not_found",
            )

        return Response(
            content=image_resp.content,
            media_type=record.get(
                "content_type",
                image_resp.headers.get(
                    "Content-Type",
                    "application/octet-stream",
                ),
            ),
        )

    except HTTPException:
        raise

    except Exception as e:
        logger.error(
            f"Supabase IRL file request failed: {e}"
        )
        raise HTTPException(
            status_code=502,
            detail="Failed to fetch IRL file",
        )


@api_router.get("/admin/irl")
async def admin_irl(
    x_admin_key: str = Header(None),
):
    admin_guard(x_admin_key)

    headers = supabase_rest_headers()
    base_url = supabase_rest_url()

    try:
        async with _httpx.AsyncClient(timeout=30) as client_http:
            resp = await client_http.get(
                f"{base_url}/irl_uploads",
                params={
                    "select": "*",
                    "is_deleted": "eq.false",
                    "order": "created_at.desc",
                    "limit": "100",
                },
                headers=headers,
            )

        if resp.status_code >= 400:
            logger.error(
                "Supabase admin IRL lookup failed: "
                f"{resp.status_code} {resp.text}"
            )
            raise HTTPException(
                status_code=502,
                detail="Failed to fetch IRL uploads",
            )

        return {
            "items": resp.json()
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.error(
            f"Supabase admin IRL request failed: {e}"
        )
        raise HTTPException(
            status_code=502,
            detail="Failed to fetch IRL uploads",
        )


@api_router.post("/admin/irl/{file_id}/status")
async def admin_irl_status(
    file_id: str,
    input: OrderStatusInput,
    x_admin_key: str = Header(None),
):
    admin_guard(x_admin_key)

    if input.status not in (
        "approved",
        "rejected",
        "pending",
    ):
        raise HTTPException(
            status_code=400,
            detail="invalid_status",
        )

    headers = {
        **supabase_rest_headers(),
        "Prefer": "return=representation",
    }

    base_url = supabase_rest_url()

    try:
        async with _httpx.AsyncClient(timeout=30) as client_http:
            resp = await client_http.patch(
                f"{base_url}/irl_uploads",
                params={
                    "id": f"eq.{file_id}",
                },
                headers=headers,
                json={
                    "status": input.status,
                },
            )

        if resp.status_code >= 400:
            logger.error(
                "Supabase IRL status update failed: "
                f"{resp.status_code} {resp.text}"
            )
            raise HTTPException(
                status_code=502,
                detail="Failed to update IRL status",
            )

        updated = resp.json()

        if not updated:
            raise HTTPException(
                status_code=404,
                detail="not_found",
            )

        return {
            "id": file_id,
            "status": input.status,
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.error(
            f"Supabase IRL status request failed: {e}"
        )
        raise HTTPException(
            status_code=502,
            detail="Failed to update IRL status",
        )


@api_router.get("/admin/irl-file/{file_id}")
async def admin_irl_file(
    file_id: str,
    x_admin_key: str = Header(None),
    auth: str = Query(None),
):
    admin_guard(x_admin_key or auth)

    headers = supabase_rest_headers()
    base_url = supabase_rest_url()

    try:
        async with _httpx.AsyncClient(timeout=30) as client_http:
            resp = await client_http.get(
                f"{base_url}/irl_uploads",
                params={
                    "select": "id,storage_path,content_type",
                    "id": f"eq.{file_id}",
                    "is_deleted": "eq.false",
                    "limit": "1",
                },
                headers=headers,
            )

        if resp.status_code >= 400:
            raise HTTPException(
                status_code=502,
                detail="Failed to fetch IRL upload",
            )

        records = resp.json()

        if not records:
            raise HTTPException(
                status_code=404,
                detail="not_found",
            )

        record = records[0]

        storage_path = record.get("storage_path")

        if not storage_path:
            raise HTTPException(
                status_code=404,
                detail="not_found",
            )

        async with _httpx.AsyncClient(timeout=60) as client_http:
            image_resp = await client_http.get(
                supabase_storage_url(
                    f"object/irl/{storage_path}"
                ),
                headers=supabase_storage_headers(),
            )

        if image_resp.status_code >= 400:
            raise HTTPException(
                status_code=404,
                detail="not_found",
            )

        return Response(
            content=image_resp.content,
            media_type=record.get(
                "content_type",
                image_resp.headers.get(
                    "Content-Type",
                    "application/octet-stream",
                ),
            ),
        )

    except HTTPException:
        raise

    except Exception as e:
        logger.error(
            f"Supabase admin IRL file request failed: {e}"
        )
        raise HTTPException(
            status_code=502,
            detail="Failed to fetch IRL file",
        )

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