from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Header, Response, Query, Cookie
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware

import os
import logging
import hashlib
import hmac
import secrets
import re
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any

import uuid
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Environment
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# MongoDB connection
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

mongo_url = os.environ.get("MONGO_URL", "").strip()
db_name = os.environ.get("DB_NAME", "").strip()

class _LazyDatabase:
    def __init__(self, url: str, name: str):
        self._url = url
        self._name = name
        self._client = None
        self._db = None

    def _get_db(self):
        if self._db is None:
            if not self._url or not self._name:
                raise RuntimeError("MONGO_URL or DB_NAME is missing from backend/.env")
            try:
                self._client = AsyncIOMotorClient(self._url, serverSelectionTimeoutMS=2000)
                self._db = self._client[self._name]
            except Exception as e:
                logger.warning("MongoDB connection could not be established: %s", e)
                raise
        return self._db

    def __getattr__(self, name):
        return getattr(self._get_db(), name)

    def __getitem__(self, name):
        return self._get_db()[name]

db = _LazyDatabase(mongo_url, db_name)
client = getattr(db, "_client", None)



# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# NALAYAK Admin Studio & Storefront Catalog Router
from admin_catalog_routes import router as catalog_router
api_router.include_router(catalog_router)

# =========================================================
# SHIPROCKET CONFIG
# =========================================================

SHIPROCKET_EMAIL = os.getenv("SHIPROCKET_EMAIL", "")
SHIPROCKET_PASSWORD = os.getenv("SHIPROCKET_PASSWORD", "")

SHIPROCKET_CONFIGURED = bool(
    SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD
)

# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Twilio Verify OTP
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    phone: str = Field(..., min_length=1, max_length=64)


class VerifyOTPRequest(BaseModel):
    phone: str = Field(..., min_length=1, max_length=64)
    code: str = Field(..., min_length=1, max_length=10)
    name: str = Field(default="NALAYAK", max_length=100)


class SendEmailOTPRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=254)
    name: str = Field(default="", max_length=100)


class VerifyEmailOTPRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=254)
    code: str = Field(..., min_length=1, max_length=10)
    name: str = Field(default="", max_length=100)


def normalize_phone(phone: str) -> str:
    value = str(phone or "").strip()
    if not value or not _re.fullmatch(r"[+0-9().\s-]+", value):
        raise ValueError("invalid_phone")
    if value.count("+") > 1 or ("+" in value and not value.startswith("+")):
        raise ValueError("invalid_phone")

    digits = _re.sub(r"\D", "", value)
    if value.startswith("+"):
        if len(digits) != 12 or not digits.startswith("91"):
            raise ValueError("invalid_phone")
        national_number = digits[2:]
    elif len(digits) == 10:
        national_number = digits
    elif len(digits) == 12 and digits.startswith("91"):
        national_number = digits[2:]
    else:
        raise ValueError("invalid_phone")

    if not national_number.startswith(tuple("6789")):
        raise ValueError("invalid_phone")

    return f"+91{national_number}"


def otp_error_response(status_code: int, code: str, message: str):
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "error": {"code": code, "message": message},
            "detail": message,
        },
    )


def twilio_error_code(response) -> int | None:
    try:
        value = response.json().get("code")
    except (ValueError, AttributeError):
        return None

    if isinstance(value, int):
        return value
    if isinstance(value, str) and value.isdigit() and len(value) <= 6:
        return int(value)
    return None


def twilio_otp_error(response, operation: str):
    provider_code = twilio_error_code(response)
    logging.getLogger(__name__).warning(
        "Twilio Verify %s rejected status=%s code=%s",
        operation,
        response.status_code,
        provider_code if provider_code is not None else "unknown",
    )

    if provider_code == 21608:
        return otp_error_response(
            403,
            "recipient_not_verified",
            "This number is not approved to receive verification messages. Contact support or try an approved number.",
        )

    if response.status_code == 429 or provider_code in {
        20429,
        60202,
        60203,
        60212,
    }:
        return otp_error_response(
            429,
            "rate_limited",
            "Too many OTP attempts. Wait a few minutes before trying again.",
        )

    if provider_code == 60200:
        if operation == "send":
            return otp_error_response(
                400,
                "invalid_phone",
                "Enter a valid 10-digit Indian mobile number.",
            )
        return otp_error_response(
            400,
            "invalid_code",
            "Enter the verification code you received.",
        )

    if operation == "verify" and response.status_code == 404:
        return otp_error_response(
            401,
            "invalid_code",
            "That OTP is invalid or has expired. Request a new code and try again.",
        )

    if (
        provider_code in {20003, 20404}
        or response.status_code in {401, 403, 404}
    ):
        return otp_error_response(
            503,
            "service_configuration",
            "OTP login is temporarily unavailable. Please contact support.",
        )

    return otp_error_response(
        502,
        "provider_error",
        "We could not complete OTP login. Please try again later.",
    )


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


async def call_twilio_verify(endpoint: str, data: dict, operation: str):
    try:
        return await twilio_verify_request(endpoint, data)
    except _httpx.TimeoutException as error:
        logging.getLogger(__name__).warning(
            "Twilio Verify %s timed out (%s)",
            operation,
            type(error).__name__,
        )
    except _httpx.RequestError as error:
        logging.getLogger(__name__).error(
            "Twilio Verify %s transport failure (%s)",
            operation,
            type(error).__name__,
        )
    except Exception as error:
        logging.getLogger(__name__).error(
            "Twilio Verify %s unexpected failure (%s)",
            operation,
            type(error).__name__,
        )

    return otp_error_response(
        503,
        "provider_unavailable",
        "OTP login is temporarily unavailable. Please wait a moment and try again.",
    )


@api_router.post("/auth/send-otp")
async def send_otp(payload: SendOTPRequest):
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        logging.getLogger(__name__).error(
            "OTP configuration missing variable names=%s",
            ",".join(
                name
                for name, value in (
                    ("TWILIO_ACCOUNT_SID", TWILIO_ACCOUNT_SID),
                    ("TWILIO_AUTH_TOKEN", TWILIO_AUTH_TOKEN),
                )
                if not value
            ),
        )
        return otp_error_response(
            503,
            "service_configuration",
            "OTP login is temporarily unavailable. Please contact support.",
        )

    if not TWILIO_VERIFY_SERVICE_SID:
        logging.getLogger(__name__).error(
            "OTP configuration missing variable name=TWILIO_VERIFY_SERVICE_SID"
        )
        return otp_error_response(
            503,
            "service_configuration",
            "OTP login is temporarily unavailable. Please contact support.",
        )

    try:
        phone = normalize_phone(payload.phone)
    except ValueError:
        return otp_error_response(
            400,
            "invalid_phone",
            "Enter a valid 10-digit Indian mobile number.",
        )

    response = await call_twilio_verify(
        "Verifications",
        {
            "To": phone,
            "Channel": "sms",
        },
        "send",
    )

    if isinstance(response, JSONResponse):
        return response

    if response.status_code >= 400:
        return twilio_otp_error(response, "send")

    return {
        "success": True,
        "message": "OTP sent successfully.",
        "phone": phone,
    }


@api_router.post("/auth/verify-otp")
async def verify_otp(payload: VerifyOTPRequest, response: Response):
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        logging.getLogger(__name__).error(
            "OTP configuration missing variable names=%s",
            ",".join(
                name
                for name, value in (
                    ("TWILIO_ACCOUNT_SID", TWILIO_ACCOUNT_SID),
                    ("TWILIO_AUTH_TOKEN", TWILIO_AUTH_TOKEN),
                )
                if not value
            ),
        )
        return otp_error_response(
            503,
            "service_configuration",
            "OTP login is temporarily unavailable. Please contact support.",
        )

    if not TWILIO_VERIFY_SERVICE_SID:
        logging.getLogger(__name__).error(
            "OTP configuration missing variable name=TWILIO_VERIFY_SERVICE_SID"
        )
        return otp_error_response(
            503,
            "service_configuration",
            "OTP login is temporarily unavailable. Please contact support.",
        )

    try:
        phone = normalize_phone(payload.phone)
    except ValueError:
        return otp_error_response(
            400,
            "invalid_phone",
            "Enter a valid 10-digit Indian mobile number.",
        )

    code = payload.code.strip()
    if not code.isdigit() or not 4 <= len(code) <= 10:
        return otp_error_response(
            400,
            "invalid_code",
            "Enter a valid verification code.",
        )

    twilio_response = await call_twilio_verify(
        "VerificationCheck",
        {
            "To": phone,
            "Code": code,
        },
        "verify",
    )

    if isinstance(twilio_response, JSONResponse):
        return twilio_response

    if twilio_response.status_code >= 400:
        return twilio_otp_error(twilio_response, "verify")

    try:
        result = twilio_response.json()
    except ValueError:
        logging.getLogger(__name__).warning(
            "Twilio Verify check returned non-JSON response status=%s",
            twilio_response.status_code,
        )
        return otp_error_response(
            502,
            "provider_error",
            "We could not complete OTP login. Please try again later.",
        )

    if not isinstance(result, dict):
        return otp_error_response(
            502,
            "provider_error",
            "We could not complete OTP login. Please try again later.",
        )

    if result.get("status") != "approved":
        return otp_error_response(
            401,
            "invalid_code",
            "That OTP is invalid or has expired. Request a new code and try again.",
        )

    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    # Find or create Nalayak member
    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    # Create persistent session
    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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


def normalize_login_email(value: str) -> str:
    email = str(value or "").strip().lower()
    if len(email) > 254 or not _re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise ValueError("invalid_email")
    return email


def email_otp_digest(email: str, code: str) -> str:
    pepper = os.environ.get("SUPABASE_FUNCTION_SECRET", "").strip()
    if not pepper:
        raise RuntimeError("OTP signing secret is not configured")
    message = f"nalayak-email-otp-v1:{email}:{code}".encode("utf-8")
    return hmac.new(pepper.encode("utf-8"), message, hashlib.sha256).hexdigest()


def postgrest_error_code(response) -> str | None:
    try:
        value = response.json().get("code")
    except (ValueError, AttributeError):
        return None
    return value if isinstance(value, str) else None


@api_router.post("/auth/send-email-otp")
async def send_email_otp(payload: SendEmailOTPRequest):
    try:
        email = normalize_login_email(payload.email)
    except ValueError:
        return otp_error_response(400, "invalid_email", "Enter a valid email address.")

    sender = os.environ.get("EMAIL_FROM_ADDRESS", "").strip()
    missing_settings = []
    if not RESEND_API_KEY:
        missing_settings.append("RESEND_API_KEY")
    if not sender:
        missing_settings.append("EMAIL_FROM_ADDRESS")
    elif sender.lower().endswith("@resend.dev"):
        missing_settings.append("verified EMAIL_FROM_ADDRESS")

    if missing_settings:
        logging.getLogger(__name__).error(
            "Email OTP configuration is incomplete settings=%s",
            ",".join(missing_settings),
        )
        return otp_error_response(
            503,
            "email_sender_not_configured",
            "Email sign-in is temporarily unavailable. Please contact support.",
        )

    try:
        digest = email_otp_digest(email, "configuration-check")
        collection = db["email_login_otps"]
        await collection.create_index("expires_at", expireAfterSeconds=0)
        now = datetime.now(timezone.utc)
        existing = await collection.find_one(
            {"_id": email},
            {"created_at": 1},
        )
        created_at = existing.get("created_at") if existing else None
        if created_at:
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            if now - created_at < timedelta(seconds=30):
                return otp_error_response(
                    429,
                    "rate_limited",
                    "Wait a few seconds before requesting another code.",
                )

        code = f"{secrets.randbelow(1_000_000):06d}"
        digest = email_otp_digest(email, code)
        await collection.replace_one(
            {"_id": email},
            {
                "_id": email,
                "code_hash": digest,
                "attempts": 0,
                "created_at": now,
                "expires_at": now + timedelta(minutes=10),
            },
            upsert=True,
        )
    except Exception as error:
        logging.getLogger(__name__).error(
            "Email OTP storage unavailable (%s)",
            type(error).__name__,
        )
        return otp_error_response(
            503,
            "otp_unavailable",
            "Email sign-in is temporarily unavailable. Please try again later.",
        )

    email_html = (
        '<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;'
        'padding:32px;color:#171717">'
        '<p style="font-size:12px;letter-spacing:3px">NALAYAK SIGN-IN</p>'
        '<p>Your one-time sign-in code is:</p>'
        f'<p style="font-size:32px;font-weight:700;letter-spacing:8px">{code}</p>'
        '<p>This code expires in 10 minutes. Do not share it with anyone.</p>'
        "</div>"
    )

    try:
        await send_email(
            to=email,
            subject="Your NALAYAK sign-in code",
            html=email_html,
            safe_error_logging=True,
        )
    except HTTPException as error:
        try:
            await collection.delete_one({"_id": email, "code_hash": digest})
        except Exception:
            logging.getLogger(__name__).error("Unable to remove unsent email OTP")
        logging.getLogger(__name__).error(
            "Email OTP delivery failed status=%s",
            error.status_code,
        )
        return otp_error_response(
            502,
            "email_delivery_failed",
            "We could not send your sign-in code. Please try again later.",
        )
    except Exception as error:
        try:
            await collection.delete_one({"_id": email, "code_hash": digest})
        except Exception:
            logging.getLogger(__name__).error("Unable to remove unsent email OTP")
        logging.getLogger(__name__).error(
            "Email OTP delivery failed (%s)",
            type(error).__name__,
        )
        return otp_error_response(
            502,
            "email_delivery_failed",
            "We could not send your sign-in code. Please try again later.",
        )

    return {
        "success": True,
        "message": "If this address can receive sign-in mail, a code is on its way.",
        "email": email,
        "expires_in_seconds": 600,
    }


@api_router.post("/auth/verify-email-otp")
async def verify_email_otp(payload: VerifyEmailOTPRequest, response: Response):
    try:
        email = normalize_login_email(payload.email)
    except ValueError:
        return otp_error_response(400, "invalid_email", "Enter a valid email address.")

    code = payload.code.strip()
    if not _re.fullmatch(r"\d{6}", code):
        return otp_error_response(400, "invalid_code", "Enter the 6-digit code from your email.")


    try:
        digest = email_otp_digest(email, code)
        collection = db["email_login_otps"]
        now = datetime.now(timezone.utc)
        consumed = await collection.find_one_and_delete(
            {
                "_id": email,
                "code_hash": digest,
                "expires_at": {"$gt": now},
                "attempts": {"$lt": 5},
            }
        )
        if not consumed:
            pending = await collection.find_one(
                {"_id": email, "expires_at": {"$gt": now}},
                {"attempts": 1},
            )
            if pending and pending.get("attempts", 0) >= 5:
                await collection.delete_one({"_id": email})
                return otp_error_response(
                    429,
                    "rate_limited",
                    "Too many incorrect codes. Request a new code to continue.",
                )
            if pending:
                await collection.update_one(
                    {
                        "_id": email,
                        "expires_at": {"$gt": now},
                        "attempts": {"$lt": 5},
                    },
                    {"$inc": {"attempts": 1}},
                )
            return otp_error_response(
                401,
                "invalid_code",
                "That code is invalid or expired. Request a new code and try again.",
            )
    except RuntimeError:
        logging.getLogger(__name__).error("Email OTP signing secret is not configured")
        return otp_error_response(
            503,
            "otp_unavailable",
            "Email sign-in is temporarily unavailable. Please contact support.",
        )
    except Exception as error:
        logging.getLogger(__name__).error(
            "Email OTP verification storage failed (%s)",
            type(error).__name__,
        )
        return otp_error_response(
            503,
            "otp_unavailable",
            "Email sign-in is temporarily unavailable. Please try again later.",
        )

    headers = supabase_rest_headers()
    base_url = supabase_rest_url()
    async with _httpx.AsyncClient(timeout=30) as client_http:
        member_resp = await client_http.get(
            f"{base_url}/members",
            params={"select": "*", "email": f"eq.{email}", "limit": "1"},
            headers=headers,
        )

    if member_resp.status_code >= 400:
        error_code = postgrest_error_code(member_resp)
        if error_code in {"42703", "PGRST204"}:
            logging.getLogger(__name__).error(
                "Email login schema migration is not applied code=%s",
                error_code,
            )
            return otp_error_response(
                503,
                "member_schema_not_ready",
                "Email sign-in is being set up. Please try again later.",
            )
        logging.getLogger(__name__).error(
            "Email member lookup failed status=%s code=%s",
            member_resp.status_code,
            error_code or "unknown",
        )
        return otp_error_response(
            502,
            "account_lookup_failed",
            "We could not load your account. Please try again later.",
        )

    members = member_resp.json() or []
    member = members[0] if members else None

    if not member:
        async with _httpx.AsyncClient(timeout=30) as client_http:
            orders_resp = await client_http.get(
                f"{base_url}/orders",
                params={
                    "select": "user_id",
                    "email": f"eq.{email}",
                    "user_id": "not.is.null",
                    "limit": "1000",
                },
                headers=headers,
            )

        if orders_resp.status_code >= 400:
            logging.getLogger(__name__).error(
                "Email order-link lookup failed status=%s code=%s",
                orders_resp.status_code,
                postgrest_error_code(orders_resp) or "unknown",
            )
            return otp_error_response(
                502,
                "account_lookup_failed",
                "We could not load your account. Please try again later.",
            )

        linked_member_ids = {
            str(order["user_id"])
            for order in (orders_resp.json() or [])
            if order.get("user_id")
        }
        if len(linked_member_ids) > 1:
            return otp_error_response(
                409,
                "email_account_conflict",
                "This email is linked to multiple accounts. Contact support to protect your order history.",
            )

        if linked_member_ids:
            linked_member_id = next(iter(linked_member_ids))
            async with _httpx.AsyncClient(timeout=30) as client_http:
                linked_resp = await client_http.get(
                    f"{base_url}/members",
                    params={"select": "*", "id": f"eq.{linked_member_id}", "limit": "1"},
                    headers=headers,
                )

            if linked_resp.status_code >= 400 or not linked_resp.json():
                logging.getLogger(__name__).error(
                    "Email order link points to unavailable member status=%s",
                    linked_resp.status_code,
                )
                return otp_error_response(
                    409,
                    "email_account_conflict",
                    "We could not safely match this email to an account. Contact support.",
                )

            member = linked_resp.json()[0]
            async with _httpx.AsyncClient(timeout=30) as client_http:
                update_resp = await client_http.patch(
                    f"{base_url}/members",
                    params={"id": f"eq.{linked_member_id}"},
                    headers={**headers, "Prefer": "return=representation"},
                    json={"email": email},
                )

            if update_resp.status_code >= 400:
                logging.getLogger(__name__).error(
                    "Email member-link update failed status=%s code=%s",
                    update_resp.status_code,
                    postgrest_error_code(update_resp) or "unknown",
                )
                return otp_error_response(
                    409,
                    "email_account_conflict",
                    "We could not safely link this email to your account. Contact support.",
                )
            updated_members = update_resp.json() or []
            if updated_members:
                member = updated_members[0]

        else:
            now_iso = datetime.now(timezone.utc).isoformat()
            member_doc = {
                "email": email,
                "phone": None,
                "name": payload.name.strip() or email.split("@", 1)[0],
                "status": "active",
                "membership_type": "free",
                "is_founding_member": False,
                "joined_at": now_iso,
                "created_at": now_iso,
                "updated_at": now_iso,
            }
            async with _httpx.AsyncClient(timeout=30) as client_http:
                create_resp = await client_http.post(
                    f"{base_url}/members",
                    headers={**headers, "Prefer": "return=representation"},
                    json=member_doc,
                )

            if create_resp.status_code >= 400:
                logging.getLogger(__name__).error(
                    "Email member creation failed status=%s code=%s",
                    create_resp.status_code,
                    postgrest_error_code(create_resp) or "unknown",
                )
                return otp_error_response(
                    502,
                    "account_create_failed",
                    "We could not create your account. Please try again later.",
                )
            created_members = create_resp.json() or []
            if not created_members:
                return otp_error_response(
                    502,
                    "account_create_failed",
                    "We could not create your account. Please try again later.",
                )
            member = created_members[0]

    session_token = str(uuid.uuid4())
    expires_at = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    session_doc = {
        "member_id": member["id"],
        "token": session_token,
        "expires_at": expires_at,
    }

    async with _httpx.AsyncClient(timeout=30) as client_http:
        session_resp = await client_http.post(
            f"{base_url}/member_sessions",
            headers={**headers, "Prefer": "return=minimal"},
            json=session_doc,
        )

    if session_resp.status_code >= 400:
        logging.getLogger(__name__).error(
            "Email member session creation failed status=%s code=%s",
            session_resp.status_code,
            postgrest_error_code(session_resp) or "unknown",
        )
        return otp_error_response(
            502,
            "session_create_failed",
            "We could not complete sign-in. Please try again later.",
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
        "email": email,
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


# â”€â”€ Transactional email via Resend â”€â”€
import re as _re
import ipaddress as _ipaddress
import httpx as _httpx
from html import escape as _escape
from html.parser import HTMLParser as _HTMLParser
from urllib.parse import urlparse as _urlparse

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "").strip()
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "NALAYAK").strip()
EMAIL_FROM_ADDRESS = os.environ.get("EMAIL_FROM_ADDRESS", "").strip()
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
EMAIL_FROM_ADDRESS = os.environ.get("EMAIL_FROM_ADDRESS", "").strip()
CONTACT_NOTIFICATION_EMAIL = os.environ.get("CONTACT_NOTIFICATION_EMAIL", "khanshakib0000@gmail.com").strip()
GOOGLE_PLACES_API_KEY = os.environ.get("GOOGLE_PLACES_API_KEY", "").strip()
GOOGLE_PLACE_ID = os.environ.get("GOOGLE_PLACE_ID", "").strip()
REVIEWS_CACHE_TTL_SECONDS = int(os.environ.get("REVIEWS_CACHE_TTL_SECONDS", "86400") or "86400")
REVIEWS_DEFAULT_SOURCE = os.environ.get("REVIEWS_DEFAULT_SOURCE", "auto").strip().lower()



async def send_email(
    *,
    to: str,
    subject: str,
    html: str,
    safe_error_logging: bool = False,
    reply_to: str | None = None,
) -> str | None:

    _assert_safe_email(subject, html)

    if not RESEND_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="email_not_configured",
        )

    if not EMAIL_FROM_ADDRESS or EMAIL_FROM_ADDRESS.lower().endswith("@resend.dev"):
        raise HTTPException(
            status_code=503,
            detail="email_sender_not_configured",
        )

    payload = {
        "from": f"{EMAIL_FROM_NAME} <{EMAIL_FROM_ADDRESS}>",
        "to": [to],
        "subject": subject,
        "html": html,
    }
    if reply_to:
        payload["reply_to"] = reply_to


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
            if safe_error_logging:
                try:
                    provider_error = resp.json()
                    provider_code = provider_error.get("name") or provider_error.get("statusCode")
                    provider_message = provider_error.get("message", "")
                    if not isinstance(provider_message, str):
                        provider_message = ""
                    provider_message = provider_message[:200]
                except (ValueError, AttributeError):
                    provider_code = None
                    provider_message = ""
                logger.error(
                    "Resend email send failed status=%s code=%s message=%s",
                    resp.status_code,
                    provider_code or "unknown",
                    provider_message,
                )
            else:
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
        if safe_error_logging:
            logger.error("Resend email send failed (%s)", type(e).__name__)
        else:
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
    name = _escape(((input.name or "").strip().split() or ["there"])[0])
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
        body = ("Membership is free. The good stuff comes with it â€” first looks, "
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

# â”€â”€ Drop alerts + custom design requests â”€â”€

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
    secret = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip() or os.environ.get("SUPABASE_FUNCTION_SECRET", "").strip()
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
        garment = _escape(input.garment or "â€”")
        size = _escape(input.size or "â€”")
        subject = f"Request {ref} â€” received."

        html = (
            '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">'
            '<tr><td style="padding:32px 24px;font-family:Arial,sans-serif;background:#0A0A0A">'
            '<p style="color:#F7F7F5;font-size:28px;font-weight:800;letter-spacing:-1px;margin:0">NALAYAK</p>'
            '</td></tr><tr><td style="padding:40px 24px;font-family:Arial,sans-serif">'
            '<p style="font-size:11px;letter-spacing:3px;color:#8C8C8C;margin:0 0 12px">CUSTOM DESIGN</p>'
            '<h1 style="font-size:32px;font-weight:800;letter-spacing:-1px;margin:0 0 16px">REQUEST RECEIVED.</h1>'
            f'<p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 8px">Hi {_escape((input.name or "").split()[0] or "there")}. '
            'Your idea is now with the Nalayak team. We&#39;ll review it and get back to you with the next step.</p>'
            f'<p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 28px">Reference <strong>{ref}</strong> Â· '
            f'{garment} Â· Size {size}</p>'
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
            f"Request {ref} â€” "
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

# â”€â”€ Orders (mock checkout, real receipts) â”€â”€
class OrderInput(BaseModel):
    email: str
    name: str = ""
    phone: str = ""
    shipping_address: str = ""
    items: list = []
    subtotal: int = 0
    shipping: int = 0
    total: int = 0
    discount_code: Optional[str] = None

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

    # ── Authoritative Server-Side Price & Inventory Recalculation ──
    from catalog_db import catalog_store

    auth_subtotal = 0
    verified_items = []
    for raw_item in input.items:
        slug = raw_item.get("slug")
        item_qty = max(1, int(raw_item.get("qty", 1)))
        prod = catalog_store.get_product(slug) if slug else None

        if prod:
            unit_price = int(prod.get("price") or 0)
            item_name = prod.get("name", raw_item.get("name", "Piece"))
        else:
            unit_price = max(0, int(raw_item.get("price") or 0))
            item_name = raw_item.get("name", "Piece")

        line_total = unit_price * item_qty
        auth_subtotal += line_total

        verified_item = dict(raw_item)
        verified_item["price"] = unit_price
        verified_item["name"] = item_name
        verified_item["line_total"] = line_total
        verified_items.append(verified_item)

    auth_discount = 0
    applied_coupon = None
    if input.discount_code and input.discount_code.strip():
        is_val, d_amt, _ = catalog_store.validate_discount(input.discount_code.strip(), auth_subtotal)
        if is_val:
            auth_discount = d_amt
            applied_coupon = input.discount_code.strip().upper()

    qualifying_subtotal = max(0, auth_subtotal - auth_discount)
    auth_shipping = 0 if qualifying_subtotal >= 999 else 199
    auth_total = qualifying_subtotal + auth_shipping

    # Atomically decrement inventory stock
    try:
        catalog_store.decrement_inventory_for_order(verified_items)
    except Exception as e:
        logger.warning("Inventory decrement error: %s", e)

    tracking_token = secrets.token_urlsafe(32)
    tracking_token_hash = hashlib.sha256(
        tracking_token.encode("utf-8")
    ).hexdigest()

    doc = {
        "order_id": order_id,
        "tracking_token_hash": tracking_token_hash,
        "user_id": member_id,

        "email": input.email,
        "name": input.name,
        "phone": input.phone,
        "shipping_address": input.shipping_address,
        "items": verified_items,
        "subtotal": auth_subtotal,
        "discount_code": applied_coupon,
        "discount_amount": auth_discount,
        "shipping": auth_shipping,
        "total": auth_total,
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
            f'Â· {_escape(str(i.get("size", "")))} Ã— '
            f'{int(i.get("qty", 1))}'
            f'</span>'
            f'</td>'
            f'<td style="padding:8px 0;font-size:13px;color:#333;text-align:right">'
            f'â‚¹{int(i.get("price", 0)) * int(i.get("qty", 1)):,}'
            f'</td>'
            f'</tr>'
            for i in input.items
        )

        subject = f"Order {order_id} â€” confirmed."

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
            f'{"FREE" if input.shipping == 0 else f"â‚¹{input.shipping:,}"}'
            '</td>'
            '</tr>'

            f'<tr>'
            f'<td style="padding:4px 0 12px;font-size:15px;font-weight:700">'
            'Total'
            '</td>'

            f'<td style="padding:4px 0 12px;font-size:15px;font-weight:700;text-align:right">'
            f'â‚¹{input.total:,}'
            '</td>'
            '</tr>'

            '</table>'

            f'<a href="{SITE_URL.rstrip("/")}/track/{order_id}?token={tracking_token}" '
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
        "trackingToken": tracking_token,
        "emailed": emailed,
        "subtotal": auth_subtotal,
        "discount": auth_discount,
        "shipping": auth_shipping,
        "total": auth_total,
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


# â”€â”€ Order tracking + shipping status â”€â”€
@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, token: str = None):
    # First check catalog_store authoritative / local store
    local_order = catalog_store.get_order(order_id)
    if local_order:
        return {
            "order_id": local_order.get("order_id"),
            "name": local_order.get("name"),
            "status": local_order.get("status"),
            "tracking_partner": local_order.get("tracking_partner") or "Delhivery Express",
            "tracking_awb": local_order.get("tracking_awb"),
            "tracking_url": local_order.get("tracking_url"),
            "created_at": local_order.get("created_at"),
            "shipped_at": local_order.get("shipped_at"),
            "delivered_at": local_order.get("delivered_at"),
            "items": local_order.get("items", []),
            "shipping": local_order.get("shipping", 0),
            "total": local_order.get("total", 0),
            "payment_method": local_order.get("payment_method"),
            "payment_status": local_order.get("payment_status"),
            "address": local_order.get("address", {}),
        }

    if not token or len(token) > 256:
        raise HTTPException(status_code=404, detail="not_found")
    token_hash = hashlib.sha256(
        token.encode("utf-8")
    ).hexdigest()

    headers = supabase_rest_headers()
    base_url = supabase_rest_url()

    try:
        async with _httpx.AsyncClient(timeout=30) as client_http:
            resp = await client_http.get(
                f"{base_url}/orders",
                params={
                    "select": (
                        "order_id,name,items,shipping,total,status,"
                        "created_at,shipped_at,delivered_at"
                    ),
                    "order_id": f"eq.{order_id}",
                    "tracking_token_hash": f"eq.{token_hash}",
                    "limit": "1",
                },
                headers=headers,
            )

        if resp.status_code >= 400:
            logger.error(
                "Supabase secure tracking lookup failed: %s",
                resp.status_code,
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

    except Exception:
        logger.exception("Secure order tracking lookup failed")
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

# â”€â”€ Admin orders list â€” Supabase â”€â”€
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
            logger.warning(
                "Supabase admin orders lookup returned status %s, using catalog_store",
                resp.status_code,
            )
            return {"orders": catalog_store.list_orders()}

        orders_list = result if isinstance(result, list) else []
        if not orders_list:
            orders_list = catalog_store.list_orders()
        return {
            "orders": orders_list,
        }

    except HTTPException:
        return {"orders": catalog_store.list_orders()}

    except Exception as e:
        logger.exception(
            "Supabase admin orders request failed, falling back to catalog_store: %s",
            e,
        )
        return {"orders": catalog_store.list_orders()}

        raise HTTPException(
            status_code=502,
            detail="Failed to fetch orders",
        )

# â”€â”€ Object storage (Emergent) + IRL uploads + admin â”€â”€
import uuid as _uuid
import asyncio as _asyncio
import requests as _requests

# â”€â”€ Supabase Storage â”€â”€
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


def admin_guard(
    x_admin_key: str = Header(None, alias="X-Admin-Key"),
    x_admin_session: str = Header(None, alias="X-Admin-Session"),
    authorization: str = Header(None, alias="Authorization"),
):
    from catalog_db import catalog_store

    # 1. Validate session token if provided
    token = None
    if x_admin_session and x_admin_session.strip():
        token = x_admin_session.strip()
    elif authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()

    if token:
        sess = catalog_store.validate_admin_session(token)
        if sess:
            return {"admin_identity": sess["admin_identity"], "token": token}

    # 2. Validate master admin key
    if not ADMIN_KEY or not ADMIN_KEY.strip():
        logger.error("ADMIN_KEY is not configured; admin access is disabled")
        raise HTTPException(status_code=503, detail="admin_not_configured")

    if not x_admin_key or not hmac.compare_digest(x_admin_key.strip(), ADMIN_KEY.strip()):
        raise HTTPException(status_code=401, detail="unauthorized")

    return {"admin_identity": "superadmin", "token": None}


# â”€â”€ IRL / Real Life uploads â€” Supabase Storage + Supabase Postgres â”€â”€

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

# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Support Tickets
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    # Verify that this order belongs to member
    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    # Only delivered orders can raise a ticket
    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    if (order.get("status") or "").lower() != "delivered":
        raise HTTPException(
            status_code=400,
            detail="support_available_after_delivery",
        )

    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    # Prevent accidental duplicate open tickets
    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    # Generate ticket number
    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Admin Support Tickets
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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


# ---------------------------------------------------------
# Contact Dispatch Messages
# ---------------------------------------------------------

class ContactMessageInput(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., min_length=3, max_length=254)
    topic: str = Field(..., min_length=1, max_length=50)
    message: str = Field(..., min_length=5, max_length=3000)

    # Topic: orders
    order_number: str = Field(default="", max_length=50)

    # Topic: custom
    custom_garment: str = Field(default="", max_length=200)
    quantity: str = Field(default="", max_length=50)
    budget: str = Field(default="", max_length=50)

    # Topic: general
    sub_inquiry_type: str = Field(default="", max_length=50)
    instagram_url: str = Field(default="", max_length=200)


def build_contact_notification_email(doc: dict) -> tuple[str, str, str | None]:
    """
    Construct a branded, sanitized HTML email notification for the studio desk.
    Treats all submitted form content as untrusted text using _escape to prevent HTML injection.
    """
    topic = (doc.get("topic") or "general").strip().lower()
    topic_titles = {
        "orders": "Orders & Shipping",
        "custom": "Custom / Bespoke",
        "general": "General / Editorial",
    }
    topic_title = topic_titles.get(topic, "General / Editorial")
    ref = doc.get("ref", "NLC-0000")

    # Clear subject line, e.g.: [NALAYAK Contact] Custom / Bespoke Inquiry — NLC-1234
    subject = f"[NALAYAK Contact] {topic_title} Inquiry — {ref}"
    subject = re.sub(r"[\r\n]+", " ", subject).strip()

    name = _escape(str(doc.get("name", "")).strip())
    email = _escape(str(doc.get("email", "")).strip())
    message = _escape(str(doc.get("message", "")).strip())

    # Build topic-specific rows
    rows = []
    if topic == "orders" and doc.get("order_number"):
        rows.append(
            f'<tr><td style="padding:10px 0;font-size:13px;color:#8C8C8C;width:160px;vertical-align:top;">Order Number</td>'
            f'<td style="padding:10px 0;font-size:13px;font-weight:700;color:#111111;">{_escape(str(doc["order_number"]))}</td></tr>'
        )
    elif topic == "custom":
        if doc.get("custom_garment"):
            rows.append(
                f'<tr><td style="padding:10px 0;font-size:13px;color:#8C8C8C;width:160px;vertical-align:top;">Garment Idea</td>'
                f'<td style="padding:10px 0;font-size:13px;font-weight:700;color:#111111;">{_escape(str(doc["custom_garment"]))}</td></tr>'
            )
        if doc.get("quantity"):
            rows.append(
                f'<tr><td style="padding:10px 0;font-size:13px;color:#8C8C8C;width:160px;vertical-align:top;">Quantity</td>'
                f'<td style="padding:10px 0;font-size:13px;color:#111111;">{_escape(str(doc["quantity"]))}</td></tr>'
            )
        if doc.get("budget"):
            rows.append(
                f'<tr><td style="padding:10px 0;font-size:13px;color:#8C8C8C;width:160px;vertical-align:top;">Budget Range</td>'
                f'<td style="padding:10px 0;font-size:13px;color:#111111;">{_escape(str(doc["budget"]))}</td></tr>'
            )
    elif topic == "general":
        if doc.get("sub_inquiry_type"):
            rows.append(
                f'<tr><td style="padding:10px 0;font-size:13px;color:#8C8C8C;width:160px;vertical-align:top;">Inquiry Type</td>'
                f'<td style="padding:10px 0;font-size:13px;font-weight:700;color:#111111;">{_escape(str(doc["sub_inquiry_type"]))}</td></tr>'
            )
        if doc.get("instagram_url"):
            rows.append(
                f'<tr><td style="padding:10px 0;font-size:13px;color:#8C8C8C;width:160px;vertical-align:top;">Social / Portfolio</td>'
                f'<td style="padding:10px 0;font-size:13px;color:#111111;">{_escape(str(doc["instagram_url"]))}</td></tr>'
            )

    extra_rows_html = "".join(rows)

    html = (
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F5;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;padding:32px 16px;">'
        '<tr><td align="center">'
        '<table role="presentation" width="100%" style="max-width:620px;background:#FFFFFF;border:1px solid #111111;">'
        '<tr><td style="padding:28px 24px;background:#0A0A0A;">'
        '<p style="color:#F7F7F5;font-size:24px;font-weight:900;letter-spacing:-0.5px;margin:0;text-transform:uppercase;">NALAYAK</p>'
        '<p style="color:#8C8C8C;font-size:10px;letter-spacing:3px;margin:6px 0 0;text-transform:uppercase;">DIRECT DESK DISPATCH // INCOMING INQUIRY</p>'
        '</td></tr>'
        '<tr><td style="padding:32px 24px;">'
        f'<p style="font-size:11px;letter-spacing:3px;color:#8C8C8C;margin:0 0 10px;text-transform:uppercase;">REFERENCE: {ref}</p>'
        f'<h1 style="font-size:24px;font-weight:900;letter-spacing:-0.5px;color:#0A0A0A;margin:0 0 24px;text-transform:uppercase;">{topic_title} INQUIRY</h1>'
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #E5E5E5;border-bottom:1px solid #E5E5E5;margin-bottom:24px;">'
        '<tr><td style="padding:10px 0;font-size:13px;color:#8C8C8C;width:160px;vertical-align:top;">From</td>'
        f'<td style="padding:10px 0;font-size:13px;font-weight:700;color:#111111;">{name}</td></tr>'
        '<tr><td style="padding:10px 0;font-size:13px;color:#8C8C8C;width:160px;vertical-align:top;">Sender Email</td>'
        f'<td style="padding:10px 0;font-size:13px;color:#111111;"><a href="mailto:{email}" style="color:#0A0A0A;text-decoration:underline;">{email}</a></td></tr>'
        '<tr><td style="padding:10px 0;font-size:13px;color:#8C8C8C;width:160px;vertical-align:top;">Topic</td>'
        f'<td style="padding:10px 0;font-size:13px;font-weight:700;color:#111111;text-transform:uppercase;">{topic_title}</td></tr>'
        f'{extra_rows_html}'
        '</table>'
        '<p style="font-size:11px;letter-spacing:2px;color:#8C8C8C;margin:0 0 8px;text-transform:uppercase;">MESSAGE CONTENT</p>'
        f'<div style="background:#F9F9F8;border:1px solid #E5E5E5;padding:16px 20px;font-size:14px;color:#111111;line-height:1.6;white-space:pre-wrap;word-break:break-word;">{message}</div>'
        '<p style="font-size:11px;color:#8C8C8C;margin:28px 0 0;line-height:1.6;">'
        f'Logged at the NALAYAK studio desk in Kolkata. Reply directly to this email to respond to {email}.'
        '</p>'
        '</td></tr></table>'
        '</td></tr></table>'
    )

    raw_email = str(doc.get("email", "")).strip()
    reply_to = raw_email if re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", raw_email.lower()) else None
    return subject, html, reply_to


async def dispatch_contact_email_notification(doc_id, doc: dict) -> bool:
    """
    Dispatch email notification for a saved contact message to the studio desk.
    Updates the MongoDB document with delivery results.
    Never raises an exception, ensuring customer submission remains successful.
    """
    recipient = CONTACT_NOTIFICATION_EMAIL or "khanshakib0000@gmail.com"
    if not recipient:
        logger.warning("No notification recipient configured for contact %s", doc.get("ref"))
        return False

    # Avoid duplicate notification if already sent
    if doc.get("notification_status") == "sent":
        logger.info("Notification for %s already sent; skipping duplicate", doc.get("ref"))
        return True

    try:
        subject, html, reply_to = build_contact_notification_email(doc)
        email_id = await send_email(
            to=recipient,
            subject=subject,
            html=html,
            reply_to=reply_to,
            safe_error_logging=True,
        )

        now_str = datetime.now(timezone.utc).isoformat()
        await db.contact_messages.update_one(
            {"_id": doc_id},
            {
                "$set": {
                    "notification_status": "sent",
                    "notification_recipient": recipient,
                    "notification_email_id": email_id,
                    "notification_sent_at": now_str,
                    "notification_error": None,
                    "updated_at": now_str,
                }
            },
        )
        logger.info(
            "Contact dispatch email sent to %s for ref %s (id: %s)",
            recipient,
            doc.get("ref"),
            email_id,
        )
        return True

    except Exception as exc:
        err_text = f"{type(exc).__name__}: {str(exc)}"[:300]
        logger.error("Failed to send contact notification for %s: %s", doc.get("ref"), err_text)
        try:
            now_str = datetime.now(timezone.utc).isoformat()
            await db.contact_messages.update_one(
                {"_id": doc_id},
                {
                    "$set": {
                        "notification_status": "failed",
                        "notification_recipient": recipient,
                        "notification_error": err_text,
                        "notification_failed_at": now_str,
                        "updated_at": now_str,
                    }
                },
            )
        except Exception as db_exc:
            logger.error("Failed to update notification status in DB: %s", db_exc)
        return False


@api_router.post("/contact")
async def create_contact_message(input: ContactMessageInput):
    email = input.email.strip().lower()
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        raise HTTPException(
            status_code=400,
            detail="invalid_email",
        )

    name = input.name.strip()
    if not name:
        raise HTTPException(
            status_code=400,
            detail="invalid_name",
        )

    message = input.message.strip()
    if len(message) < 5:
        raise HTTPException(
            status_code=400,
            detail="message_too_short",
        )
    if len(message) > 3000:
        raise HTTPException(
            status_code=400,
            detail="message_too_long",
        )

    topic = input.topic.strip().lower()
    if topic not in ("orders", "custom", "general"):
        raise HTTPException(
            status_code=400,
            detail="invalid_topic",
        )

    # Topic-specific validation
    order_number = input.order_number.strip().upper()[:50]
    custom_garment = input.custom_garment.strip()[:200]
    quantity = input.quantity.strip()[:50]
    budget = input.budget.strip()[:50]
    sub_inquiry_type = input.sub_inquiry_type.strip()[:50]
    instagram_url = input.instagram_url.strip()[:200]

    if topic == "custom":
        if not custom_garment:
            raise HTTPException(
                status_code=400,
                detail="custom_garment_required",
            )
        if len(custom_garment) < 2:
            raise HTTPException(
                status_code=400,
                detail="custom_garment_too_short",
            )

    if topic == "general" and instagram_url:
        if not re.match(
            r"^(https?://[^\s]+|(?:www\.)?instagram\.com/[a-zA-Z0-9._]+/?|@[a-zA-Z0-9._]+|[a-zA-Z0-9._]+)$",
            instagram_url,
            re.IGNORECASE,
        ):
            raise HTTPException(
                status_code=400,
                detail="invalid_social_url",
            )

    # Anti-spam rate limiting: max 5 messages per 10 minutes per email
    ten_mins_ago = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
    recent_submissions = await db.contact_messages.count_documents({
        "email": email,
        "created_at": {"$gte": ten_mins_ago}
    })
    if recent_submissions >= 5:
        raise HTTPException(
            status_code=429,
            detail="too_many_requests",
        )

    # Generate unique reference identifier
    import random
    ref = f"NLC-{random.randint(1000, 9999)}"
    for _ in range(10):
        existing = await db.contact_messages.find_one({"ref": ref}, {"_id": 1})
        if not existing:
            break
        ref = f"NLC-{random.randint(1000, 9999)}"

    now = datetime.now(timezone.utc).isoformat()
    recipient_email = CONTACT_NOTIFICATION_EMAIL or "khanshakib0000@gmail.com"
    doc = {
        "ref": ref,
        "name": name,
        "email": email,
        "topic": topic,
        "message": message,
        "status": "unread",
        "notification_status": "pending",
        "notification_recipient": recipient_email,
        "notification_email_id": None,
        "notification_error": None,
        "created_at": now,
        "updated_at": now,
    }

    if topic == "orders":
        doc["order_number"] = order_number or None
    elif topic == "custom":
        doc["custom_garment"] = custom_garment
        doc["quantity"] = quantity or None
        doc["budget"] = budget or None
    elif topic == "general":
        doc["sub_inquiry_type"] = sub_inquiry_type or None
        doc["instagram_url"] = instagram_url or None

    try:
        insert_result = await db.contact_messages.insert_one(doc)
    except Exception as exc:
        logging.getLogger(__name__).error(f"Failed to insert contact message: {exc}")
        raise HTTPException(
            status_code=500,
            detail="database_error",
        )

    if not insert_result.inserted_id:
        raise HTTPException(
            status_code=500,
            detail="failed_to_save_message",
        )

    # Dispatch email notification to studio desk
    # If notification fails, the customer submission is NOT failed and ref is preserved
    await dispatch_contact_email_notification(insert_result.inserted_id, doc)

    return {
        "success": True,
        "ref": ref,
        "topic": topic,
        "message": "Message received by the studio.",
        "created_at": now,
    }


@api_router.post("/contact/retry-notifications")
async def retry_contact_notifications(admin_key: str = Header(None, alias="X-Admin-Key")):
    """
    Retry any pending or failed contact email notifications.
    Deduplicates automatically so sent notifications are never duplicated.
    """
    admin_guard(x_admin_key=admin_key)

    cursor = db.contact_messages.find({"notification_status": {"$in": ["pending", "failed"]}})
    retried = 0
    succeeded = 0
    async for item in cursor:
        retried += 1
        ok = await dispatch_contact_email_notification(item["_id"], item)
        if ok:
            succeeded += 1

    return {"retried": retried, "succeeded": succeeded}


# =========================================================
# CUSTOMER REVIEWS (GOOGLE PLACES API & COMMUNITY ARCHIVE)
# =========================================================

import time as _time

_reviews_cache = {
    "data": None,
    "timestamp": 0.0,
}

COMMUNITY_REVIEWS_ARCHIVE = [
    {
        "id": "rev-01",
        "source": "community",
        "author": "Rohan D.",
        "initials": "RD",
        "avatar_url": None,
        "location": "Kolkata, WB",
        "piece": "NALAYAK Standard Tee",
        "variant": "Jet Black / Size L",
        "category": "fabric",
        "category_label": "FABRIC & WEIGHT",
        "highlight": "240 GSM THAT HOLDS ITS SHAPE",
        "quote": "The 240 GSM weight is no joke. Most Indian streetwear brands claim boxy and send you a limp regular tee. This holds its silhouette even after three hard washes in Kolkata humidity.",
        "specs": [
            {"label": "WEIGHT", "value": "240 GSM"},
            {"label": "CUT", "value": "Drop Shoulder"},
            {"label": "DURABILITY", "value": "Zero Shrinkage"},
        ],
        "date": "OCT 2026",
        "batch": "BATCH 001 · ARCHIVE",
        "rating": None,
        "attribution_url": None,
    },
    {
        "id": "rev-02",
        "source": "community",
        "author": "Ananya M.",
        "initials": "AM",
        "avatar_url": None,
        "location": "Mumbai, MH",
        "piece": "No Approval Oversized Tee",
        "variant": "Chalk White / Size M",
        "category": "identity",
        "category_label": "BRAND IDENTITY",
        "highlight": "FAMILY UNCLE APPROVED? DEFINITELY NOT",
        "quote": "Wore the No Approval tee to a family Diwali function. My uncle stared at the back graphic for two straight minutes without speaking. 10/10, brand promise fulfilled.",
        "specs": [
            {"label": "GRAPHIC", "value": "High-Density Screen"},
            {"label": "REACTION", "value": "Pure Disapproval"},
            {"label": "SILHOUETTE", "value": "True Oversized"},
        ],
        "date": "SEP 2026",
        "batch": "DROP 02 · VERBATIM",
        "rating": None,
        "attribution_url": None,
    },
    {
        "id": "rev-03",
        "source": "community",
        "author": "Kabir S.",
        "initials": "KS",
        "avatar_url": None,
        "location": "Delhi NCR",
        "piece": "Chaos Club Tee",
        "variant": "Ash Grey / Size XL",
        "category": "fit",
        "category_label": "FIT & SILHOUETTE",
        "highlight": "TRUE DROP SHOULDER WITHOUT EXCESS BAGGAGE",
        "quote": 'True drop shoulder that actually drapes down the tricep rather than just looking two sizes too big. Collar ribbing is tight 1.25" and doesn’t bacon after line drying.',
        "specs": [
            {"label": "COLLAR", "value": '1.25" Heavy Rib'},
            {"label": "DRAPE", "value": "Structured Boxy"},
            {"label": "ROTATION", "value": "Daily Essential"},
        ],
        "date": "AUG 2026",
        "batch": "DROP 01 · CORE",
        "rating": None,
        "attribution_url": None,
    },
    {
        "id": "rev-04",
        "source": "community",
        "author": "Tanya K.",
        "initials": "TK",
        "avatar_url": None,
        "location": "Bengaluru, KA",
        "piece": "Basically Famous Tee",
        "variant": "Jet Black / Size S",
        "category": "print",
        "category_label": "PRINT QUALITY",
        "highlight": "SCREENPRINT IN THE FIBERS, NOT PLASTIC",
        "quote": "The screenprint feels embedded into the cotton fibers instead of a thick rubbery sticker slapped on top. Breathable even when riding in 32° heat.",
        "specs": [
            {"label": "PRINT TYPE", "value": "Discharge Inks"},
            {"label": "FEEL", "value": "Soft Breathable"},
            {"label": "FABRIC", "value": "100% Combed"},
        ],
        "date": "OCT 2026",
        "batch": "BATCH 003 · EDITORIAL",
        "rating": None,
        "attribution_url": None,
    },
    {
        "id": "rev-05",
        "source": "community",
        "author": "Varun P.",
        "initials": "VP",
        "avatar_url": None,
        "location": "Pune, MH",
        "piece": "Acid Wash Oversized Hoodie",
        "variant": "Vintage Charcoal / Size L",
        "category": "fabric",
        "category_label": "WINTER WEIGHT",
        "highlight": "DOUBLE-LAYER HOOD THAT ACTUALLY STANDS UP",
        "quote": "Heaviest hoodie in my rotation. The double-layered hood actually stays upright and doesn’t collapse flat against your neck. Ribbed cuffs don’t stretch out.",
        "specs": [
            {"label": "WEIGHT", "value": "420 GSM Fleece"},
            {"label": "HOOD", "value": "Double-Layered"},
            {"label": "CUFFS", "value": "Form-Retaining"},
        ],
        "date": "SEP 2026",
        "batch": "WINTER 26 · HEAVY",
        "rating": None,
        "attribution_url": None,
    },
    {
        "id": "rev-06",
        "source": "community",
        "author": "Meera V.",
        "initials": "MV",
        "avatar_url": None,
        "location": "Hyderabad, TS",
        "piece": "Her Chaos Crop Tee",
        "variant": "Paper White / Size M",
        "category": "fit",
        "category_label": "PROPORTIONS & CUT",
        "highlight": "SHARP BOXY CROP WITHOUT BEING FLIMSY",
        "quote": "Most women’s streetwear crops are either paper-thin or cut like an awkward square box. This has proper structured shoulders and sits right at the high waistband.",
        "specs": [
            {"label": "WEIGHT", "value": "220 GSM"},
            {"label": "CROP", "value": "High Waist Cut"},
            {"label": "HEM", "value": "Reinforced Twin"},
        ],
        "date": "AUG 2026",
        "batch": "DROP 02 · WOMENS",
        "rating": None,
        "attribution_url": None,
    },
]


async def fetch_google_places_reviews(place_id: str, api_key: str) -> dict | None:
    """
    Fetch Place Details using the official Google Places API (New).
    Endpoint: https://places.googleapis.com/v1/places/{placeId}
    FieldMask: id,displayName,rating,userRatingCount,reviews,googleMapsUri
    Guarantees API keys are never exposed in logs or exceptions.
    """
    if not place_id or not api_key:
        return None

    url = f"https://places.googleapis.com/v1/places/{place_id}"
    headers = {
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "id,displayName,rating,userRatingCount,reviews,googleMapsUri",
        "Accept": "application/json",
    }

    try:
        async with _httpx.AsyncClient(timeout=10.0) as client_http:
            resp = await client_http.get(url, headers=headers)

        if resp.status_code != 200:
            logger.warning(
                "Google Places API request failed status=%s for place_id=%s",
                resp.status_code,
                place_id,
            )
            return None

        return resp.json()

    except Exception as exc:
        logger.error("Google Places API connection error: %s", type(exc).__name__)
        return None


def normalize_google_places_response(data: dict) -> list[dict]:
    """
    Safely transform raw Google Places API (New) review objects into
    the normalized NALAYAK review schema.
    """
    raw_reviews = data.get("reviews") or []
    normalized = []

    for idx, r in enumerate(raw_reviews):
        author_attr = r.get("authorAttribution") or {}
        author_name = (author_attr.get("displayName") or "Google Verified Reviewer").strip()
        photo_uri = author_attr.get("photoUri") or None

        name_parts = author_name.split()
        if len(name_parts) >= 2:
            initials = f"{name_parts[0][0]}{name_parts[-1][0]}".upper()
        elif name_parts:
            initials = name_parts[0][:2].upper()
        else:
            initials = "GV"

        try:
            rating = int(r.get("rating", 5))
        except (ValueError, TypeError):
            rating = 5

        text_obj = r.get("text") or r.get("originalText") or {}
        if isinstance(text_obj, dict):
            quote_text = text_obj.get("text", "").strip()
        elif isinstance(text_obj, str):
            quote_text = text_obj.strip()
        else:
            quote_text = ""

        if not quote_text:
            continue

        first_line = quote_text.split("\n")[0]
        first_sentence = first_line.split(". ")[0].strip()
        if len(first_sentence) > 65:
            highlight = first_sentence[:62].rstrip() + "…"
        else:
            highlight = first_sentence

        date_str = r.get("relativePublishTimeDescription") or "Recently"
        publish_time = r.get("publishTime")
        attribution_url = r.get("googleMapsUri") or data.get("googleMapsUri")

        normalized.append({
            "id": r.get("name") or f"google-{idx + 1}",
            "source": "google",
            "author": author_name,
            "initials": initials,
            "avatar_url": photo_uri,
            "rating": rating,
            "highlight": highlight.upper(),
            "quote": quote_text,
            "date": date_str.upper(),
            "publish_time": publish_time,
            "attribution_url": attribution_url,
            "category": "google",
            "category_label": "GOOGLE VERIFIED",
            "specs": [
                {"label": "SOURCE", "value": "Google Reviews"},
                {"label": "RATING", "value": f"{rating}.0 / 5.0"},
                {"label": "VERIFICATION", "value": "Google Maps"},
            ],
        })

    return normalized


@api_router.get("/reviews")
async def get_reviews(
    source: str = Query("auto", description="Provider mode: auto, google, or community"),
    refresh: bool = Query(False, description="Bypass cache"),
):
    """
    Returns customer reviews for NALAYAK STUDIOS.
    Abstraction layer supporting:
      1. Live Google Places API (New) verified reviews (when configured).
      2. NALAYAK Community / Pre-Launch Dispatch Archive (fallback or explicit mode).
    Cached with configurable TTL to respect Google API quota and terms.
    Never exposes API keys or real customer contact details.
    """
    global _reviews_cache
    now = _time.time()
    effective_source = source.strip().lower() if source else "auto"
    if effective_source not in ("auto", "google", "community"):
        effective_source = "auto"

    ttl = max(60, REVIEWS_CACHE_TTL_SECONDS)

    if (
        not refresh
        and effective_source in ("auto", "google")
        and _reviews_cache["data"] is not None
        and (now - _reviews_cache["timestamp"]) < ttl
    ):
        cached_payload = dict(_reviews_cache["data"])
        cached_payload["cached"] = True
        return cached_payload

    if effective_source == "community":
        return {
            "source_mode": "community",
            "is_live_google": False,
            "google_configured": bool(GOOGLE_PLACES_API_KEY and GOOGLE_PLACE_ID),
            "attribution": "NALAYAK Community Dispatch Archive",
            "disclaimer": "DEMO REVIEWS · PRE-LAUNCH FEEDBACK ARCHIVE",
            "rating": None,
            "user_ratings_total": None,
            "reviews": COMMUNITY_REVIEWS_ARCHIVE,
            "cached": False,
        }

    is_configured = bool(GOOGLE_PLACES_API_KEY and GOOGLE_PLACE_ID)
    if is_configured:
        places_data = await fetch_google_places_reviews(GOOGLE_PLACE_ID, GOOGLE_PLACES_API_KEY)
        if places_data:
            normalized_reviews = normalize_google_places_response(places_data)
            if normalized_reviews:
                place_name = (places_data.get("displayName") or {}).get("text") or "NALAYAK STUDIOS"
                google_rating = places_data.get("rating")
                total_ratings = places_data.get("userRatingCount")
                google_maps_url = places_data.get("googleMapsUri") or f"https://www.google.com/maps/place/?q=place_id:{GOOGLE_PLACE_ID}"

                payload = {
                    "source_mode": "google",
                    "is_live_google": True,
                    "google_configured": True,
                    "place_id": GOOGLE_PLACE_ID,
                    "place_name": place_name,
                    "google_maps_url": google_maps_url,
                    "rating": float(google_rating) if google_rating is not None else None,
                    "user_ratings_total": int(total_ratings) if total_ratings is not None else None,
                    "attribution": "Powered by Google",
                    "disclaimer": "GOOGLE VERIFIED CUSTOMER REVIEWS",
                    "reviews": normalized_reviews,
                    "cached": False,
                }
                _reviews_cache["data"] = payload
                _reviews_cache["timestamp"] = now
                return payload

    return {
        "source_mode": "community",
        "is_live_google": False,
        "google_configured": is_configured,
        "attribution": "NALAYAK Community Dispatch Archive",
        "disclaimer": "DEMO REVIEWS · PRE-LAUNCH FEEDBACK ARCHIVE",
        "rating": None,
        "user_ratings_total": None,
        "reviews": COMMUNITY_REVIEWS_ARCHIVE,
        "cached": False,
    }


@api_router.post("/reviews/purge-cache")
async def purge_reviews_cache(admin_key: str = Header(None, alias="X-Admin-Key")):
    """
    Purge cached Google reviews for immediate refresh.
    Protected by ADMIN_KEY.
    """
    admin_guard(x_admin_key=admin_key)
    global _reviews_cache
    _reviews_cache["data"] = None
    _reviews_cache["timestamp"] = 0.0
    return {"purged": True}


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

):
    admin_guard(x_admin_key)

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

# â”€â”€ Razorpay membership checkout â”€â”€
# One-time membership purchase. Recurring Club subscriptions come later via

# NALAYAK CLUB — one-time lifetime membership.
# No renewals or expiry. Founding 500 remains disabled until its
# atomic database cap is configured.

CLUB_PLANS = {
    "club-yearly": {
        "amount": 99900,
        "description": "NALAYAK CLUB — Lifetime Membership",
    },
    # Deliberately disabled until a database-level atomic 500-member
    # limit is implemented and verified.
}


def razorpay_client():
    key_id = os.environ.get("RAZORPAY_KEY_ID")
    key_secret = os.environ.get("RAZORPAY_KEY_SECRET")
    if not key_id or not key_secret:
        return None, key_id

    import razorpay
    return razorpay.Client(auth=(key_id, key_secret)), key_id


async def _club_get_member(member_id: str):
    headers = supabase_rest_headers()
    base_url = supabase_rest_url()

    async with _httpx.AsyncClient(timeout=30) as client_http:
        response = await client_http.get(
            f"{base_url}/members",
            params={
                "select": "id,membership_type,is_founding_member,joined_at,club_payment_order_id",
                "id": f"eq.{member_id}",
                "limit": "1",
            },
            headers=headers,
        )

    if response.status_code >= 400:
        logger.error(
            "Club member lookup failed: %s %s",
            response.status_code,
            response.text,
        )
        raise HTTPException(status_code=502, detail="member_lookup_failed")

    members = response.json() or []
    if not members:
        raise HTTPException(status_code=401, detail="member_not_found")

    return members[0]


class CreateOrderInput(BaseModel):
    plan: str


@api_router.post("/razorpay/create-order")
async def create_razorpay_order(
    input: CreateOrderInput,
    nalayak_session: str = Cookie(None),
):
    member_id = str(await get_authenticated_member_id(nalayak_session))

    # Only the normal lifetime Club plan is enabled for now.
    plan = CLUB_PLANS.get(input.plan)
    if not plan:
        raise HTTPException(status_code=409, detail="plan_unavailable")

    member = await _club_get_member(member_id)
    if member.get("membership_type") not in (None, "", "free"):
        raise HTTPException(status_code=409, detail="membership_already_active")

    rzp, key_id = razorpay_client()
    if not rzp:
        raise HTTPException(status_code=503, detail="razorpay_not_configured")

    try:
        order = await _asyncio.to_thread(
            rzp.order.create,
            {
                "amount": plan["amount"],
                "currency": "INR",
                "payment_capture": 1,
                "notes": {
                    "plan": input.plan,
                    "member_id": member_id,
                },
            },
        )
    except Exception:
        logger.exception("Razorpay order creation failed")
        raise HTTPException(status_code=502, detail="order_creation_failed")

    try:
        await db.membership_orders.insert_one({
            "order_id": order["id"],
            "member_id": member_id,
            "plan": input.plan,
            "amount": plan["amount"],
            "currency": "INR",
            "status": "created",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    except Exception:
        logger.exception("Could not persist Club payment order")
        # Do not expose an order that the backend cannot verify later.
        raise HTTPException(status_code=502, detail="order_record_creation_failed")

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
async def verify_razorpay_payment(
    input: VerifyPaymentInput,
    nalayak_session: str = Cookie(None),
):
    member_id = str(await get_authenticated_member_id(nalayak_session))

    plan = CLUB_PLANS.get(input.plan)
    if not plan:
        raise HTTPException(status_code=409, detail="plan_unavailable")

    order_record = await db.membership_orders.find_one({
        "order_id": input.razorpay_order_id,
        "member_id": member_id,
        "plan": input.plan,
    })

    if not order_record:
        raise HTTPException(status_code=404, detail="order_not_found")

    if (
        order_record.get("amount") != plan["amount"]
        or order_record.get("currency") != "INR"
    ):
        raise HTTPException(status_code=400, detail="order_amount_mismatch")

    if order_record.get("status") == "paid":
        if order_record.get("payment_id") == input.razorpay_payment_id:
            return {"verified": True, "plan": input.plan}
        raise HTTPException(status_code=409, detail="order_already_paid")

    if order_record.get("status") not in (
        "created", "activation_failed", "processing"
    ):
        raise HTTPException(status_code=409, detail="order_not_payable")

    rzp, _ = razorpay_client()
    if not rzp:
        raise HTTPException(status_code=503, detail="razorpay_not_configured")

    # Verify Razorpay's signature and independently retrieve the payment.
    try:
        await _asyncio.to_thread(
            rzp.utility.verify_payment_signature,
            {
                "razorpay_order_id": input.razorpay_order_id,
                "razorpay_payment_id": input.razorpay_payment_id,
                "razorpay_signature": input.razorpay_signature,
            },
        )

        payment = await _asyncio.to_thread(
            rzp.payment.fetch,
            input.razorpay_payment_id,
        )

        if payment.get("order_id") != input.razorpay_order_id:
            raise ValueError("Payment order mismatch")
        if payment.get("amount") != plan["amount"]:
            raise ValueError("Payment amount mismatch")
        if payment.get("currency") != "INR":
            raise ValueError("Payment currency mismatch")
        if payment.get("status") != "captured":
            raise ValueError("Payment is not captured")

    except Exception:
        logger.exception("Razorpay payment verification failed")
        raise HTTPException(
            status_code=400,
            detail="payment_verification_failed",
        )

    now = datetime.now(timezone.utc).isoformat()

    # Claim the order so concurrent requests cannot activate it twice.
    # A processing order is not claimed again automatically: a crashed
    # request must be reconciled safely rather than raced by another one.
    claim = await db.membership_orders.update_one(
        {
            "order_id": input.razorpay_order_id,
            "member_id": member_id,
            "status": {"$in": ["created", "activation_failed"]},
        },
        {
            "$set": {
                "status": "processing",
                "payment_id": input.razorpay_payment_id,
                "verified_at": now,
            }
        },
    )

    if claim.modified_count != 1:
        latest_order = await db.membership_orders.find_one({
            "order_id": input.razorpay_order_id,
            "member_id": member_id,
        })

        if (
            latest_order
            and latest_order.get("status") == "paid"
            and latest_order.get("payment_id") == input.razorpay_payment_id
        ):
            return {"verified": True, "plan": input.plan}

        raise HTTPException(
            status_code=409,
            detail="order_processing_or_reconciliation_required",
        )

    try:
        member = await _club_get_member(member_id)
        current_type = member.get("membership_type")

        # Recover only when Supabase links membership to this exact order.
        if current_type == "club":
            if (
                member.get("club_payment_order_id") == input.razorpay_order_id
                and not member.get("is_founding_member")
            ):
                final_update = await db.membership_orders.update_one(
                    {
                        "order_id": input.razorpay_order_id,
                        "member_id": member_id,
                        "status": "processing",
                        "payment_id": input.razorpay_payment_id,
                    },
                    {
                        "$set": {
                            "status": "paid",
                            "activated_at": datetime.now(timezone.utc).isoformat(),
                        }
                    },
                )
                latest_order = await db.membership_orders.find_one({
                    "order_id": input.razorpay_order_id,
                    "member_id": member_id,
                })
                if (
                    final_update.modified_count == 1
                    or (
                        latest_order
                        and latest_order.get("status") == "paid"
                        and latest_order.get("payment_id") == input.razorpay_payment_id
                    )
                ):
                    return {"verified": True, "plan": input.plan}
                raise RuntimeError("payment_record_reconciliation_failed")

            raise HTTPException(
                status_code=409,
                detail="membership_already_active_order_not_linked",
            )

        if current_type not in (None, "", "free"):
            raise HTTPException(
                status_code=409,
                detail="membership_already_active",
            )

        membership_update = {
            "membership_type": "club",
            "is_founding_member": False,
            "updated_at": now,
        }
        if not member.get("joined_at"):
            membership_update["joined_at"] = now

        headers = {
            **supabase_rest_headers(),
            "Prefer": "return=representation",
        }

        # Activate atomically and bind membership to this exact order.
        async with _httpx.AsyncClient(timeout=30) as client_http:
            activation_response = await client_http.post(
                f"{supabase_rest_url()}/rpc/activate_lifetime_club_membership",
                headers=supabase_rest_headers(),
                json={
                    "p_member_id": member_id,
                    "p_order_id": input.razorpay_order_id,
                },
            )

        if activation_response.status_code >= 400:
            logger.error(
                "Club activation RPC failed: %s",
                activation_response.status_code,
            )
            raise RuntimeError("membership_activation_failed")

        try:
            activation_result = activation_response.json()
        except Exception as exc:
            raise RuntimeError("invalid_activation_rpc_response") from exc

        if not isinstance(activation_result, dict) or activation_result.get("activated") is not True:
            logger.warning("Club activation RPC returned a non-activated result")
            raise HTTPException(
                status_code=409,
                detail="membership_activation_conflict",
            )

        final_update = await db.membership_orders.update_one(
            {
                "order_id": input.razorpay_order_id,
                "member_id": member_id,
                "status": "processing",
                "payment_id": input.razorpay_payment_id,
            },
            {
                "$set": {
                    "status": "paid",
                    "activated_at": datetime.now(timezone.utc).isoformat(),
                }
            },
        )

        if final_update.modified_count != 1:
            raise RuntimeError("payment_record_finalization_failed")

    except HTTPException:
        await db.membership_orders.update_one(
            {
                "order_id": input.razorpay_order_id,
                "member_id": member_id,
                "status": "processing",
                "payment_id": input.razorpay_payment_id,
            },
            {
                "$set": {
                    "status": "activation_failed",
                    "last_activation_error_at": datetime.now(timezone.utc).isoformat(),
                }
            },
        )
        raise

    except Exception:
        logger.exception("Club activation failed after payment")
        await db.membership_orders.update_one(
            {
                "order_id": input.razorpay_order_id,
                "member_id": member_id,
                "status": "processing",
                "payment_id": input.razorpay_payment_id,
            },
            {
                "$set": {
                    "status": "activation_failed",
                    "last_activation_error_at": datetime.now(timezone.utc).isoformat(),
                }
            },
        )
        raise HTTPException(
            status_code=502,
            detail="payment_verified_activation_pending",
        )

    return {"verified": True, "plan": input.plan}


# Include the router in the main app

# Include the router in the main app
app.include_router(api_router)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3008",
        "https://nlyk.vercel.app",
        "https://nalayak.store",
        "https://www.nalayak.store",
    ],
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
