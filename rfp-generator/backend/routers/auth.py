"""
Email + password auth backed by the MongoDB `users` collection.

Replaces Supabase Auth. Passwords are bcrypt-hashed and never returned;
sessions are stateless JWTs.
"""

import os
import secrets
from datetime import datetime, timedelta, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from pymongo.errors import DuplicateKeyError

from typing import Literal

from database.mongodb import (
    get_otp_challenges_collection,
    get_password_resets_collection,
    get_users_collection,
)
from utils.mailer import is_configured as email_is_configured
from utils.mailer import send_otp_email, send_password_reset_email
from utils.security import (
    MAX_PASSWORD_BYTES,
    OTP_MAX_ATTEMPTS,
    create_access_token,
    generate_otp,
    get_current_user,
    hash_otp,
    hash_password,
    hash_reset_token,
    verify_otp,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])

# How long a reset link stays usable. Short enough that a forwarded or
# logged link goes stale quickly, long enough to survive a slow inbox.
RESET_TOKEN_TTL_MINUTES = int(os.getenv("RESET_TOKEN_TTL_MINUTES", "30"))

# Codes are short-lived: long enough to fetch an email, short enough that a
# code read over someone's shoulder is worthless by the time it's used.
OTP_TTL_MINUTES = int(os.getenv("OTP_TTL_MINUTES", "10"))

# Stops someone hammering "resend" to flood an inbox (and our Brevo quota).
OTP_RESEND_COOLDOWN_SECONDS = int(os.getenv("OTP_RESEND_COOLDOWN_SECONDS", "30"))


def _frontend_url() -> str:
    """
    Where the reset link points. Falls back to the first configured CORS
    origin, so a correct deployment usually needs no extra variable.
    """
    explicit = os.getenv("FRONTEND_URL", "").strip().rstrip("/")
    if explicit:
        return explicit

    origins = [o.strip().rstrip("/") for o in os.getenv("FRONTEND_ORIGINS", "").split(",")]
    return next((o for o in origins if o), "http://localhost:5173")


class Credentials(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class OtpVerifyRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=1, max_length=12)


class OtpResendRequest(BaseModel):
    email: EmailStr
    purpose: Literal["signup", "login"]


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetTokenRequest(BaseModel):
    token: str = Field(min_length=1)


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=1)
    password: str = Field(min_length=8)


def _collection():
    collection = get_users_collection()
    if collection is None:
        raise HTTPException(
            status_code=503,
            # Deliberately vague: the visitor can't act on the real cause, and
            # naming our environment variables tells them about our internals.
            # The specific reason is in the server log at startup.
            detail="Service temporarily unavailable. Please try again in a moment.",
        )
    return collection


def _resets_collection():
    collection = get_password_resets_collection()
    if collection is None:
        raise HTTPException(
            status_code=503,
            # Deliberately vague: the visitor can't act on the real cause, and
            # naming our environment variables tells them about our internals.
            # The specific reason is in the server log at startup.
            detail="Service temporarily unavailable. Please try again in a moment.",
        )
    return collection


def _otp_collection():
    collection = get_otp_challenges_collection()
    if collection is None:
        raise HTTPException(
            status_code=503,
            detail="Service temporarily unavailable. Please try again in a moment.",
        )
    return collection


def _check_password_length(password: str) -> None:
    if len(password.encode("utf-8")) > MAX_PASSWORD_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"Password must be at most {MAX_PASSWORD_BYTES} bytes.",
        )


def _session(user_id: str, email: str) -> dict:
    return {
        "access_token": create_access_token(user_id, email),
        "token_type": "bearer",
        "user": {"id": user_id, "email": email},
    }


def _expired(record: dict) -> bool:
    expires_at = record.get("expires_at")
    if expires_at is None:
        return False
    if expires_at.tzinfo is None:  # Mongo returns naive UTC
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at < datetime.now(timezone.utc)


async def _issue_challenge(email: str, purpose: str, password_hash: str = None) -> None:
    """
    Creates (or replaces) the one live code for this email+purpose and emails it.

    Replacing rather than appending means requesting a new code silently kills
    the previous one, so an old email can't be used later.
    """
    code = generate_otp()
    now = datetime.now(timezone.utc)

    document = {
        "email": email,
        "purpose": purpose,
        "code_hash": hash_otp(code),
        "attempts": 0,
        "created_at": now,
        "expires_at": now + timedelta(minutes=OTP_TTL_MINUTES),
    }
    if password_hash is not None:
        # Held here, not in `users`, so an unverified signup leaves no account.
        document["password_hash"] = password_hash

    await _otp_collection().replace_one(
        {"email": email, "purpose": purpose}, document, upsert=True
    )

    delivered = await send_otp_email(email, code, purpose, OTP_TTL_MINUTES)

    # In dev there's no Brevo key and the code goes to the log, which is fine.
    # In production a failed send means the user simply cannot get in, so say so.
    if not delivered and email_is_configured():
        raise HTTPException(
            status_code=502,
            detail="We couldn't send your code just now. Please try again in a moment.",
        )


async def _consume_challenge(email: str, purpose: str, code: str) -> dict:
    """
    Validates a submitted code and burns it. Raises with a usable message on
    any failure; returns the stored challenge on success.
    """
    otps = _otp_collection()
    record = await otps.find_one({"email": email, "purpose": purpose})

    if record is None or _expired(record):
        if record is not None:
            await otps.delete_one({"_id": record["_id"]})
        raise HTTPException(
            status_code=400,
            detail="That code has expired. Request a new one.",
        )

    attempts = record.get("attempts", 0)
    if attempts >= OTP_MAX_ATTEMPTS:
        await otps.delete_one({"_id": record["_id"]})
        raise HTTPException(
            status_code=429,
            detail="Too many incorrect attempts. Request a new code.",
        )

    if not verify_otp(code, record.get("code_hash", "")):
        remaining = OTP_MAX_ATTEMPTS - (attempts + 1)
        if remaining <= 0:
            await otps.delete_one({"_id": record["_id"]})
            raise HTTPException(
                status_code=429,
                detail="Too many incorrect attempts. Request a new code.",
            )
        await otps.update_one({"_id": record["_id"]}, {"$inc": {"attempts": 1}})
        raise HTTPException(
            status_code=400,
            detail=f"That code isn't right. {remaining} attempts left.",
        )

    # Single use: correct or not, this code is now spent.
    await otps.delete_one({"_id": record["_id"]})
    return record


@router.post("/signup")
async def signup(creds: Credentials):
    """
    Step 1 of sign-up: emails a code. No account is created here.

    The password is hashed and parked on the challenge, so an abandoned or
    unverified sign-up leaves nothing behind in `users`.
    """
    collection = _collection()
    _check_password_length(creds.password)

    email = creds.email.lower().strip()

    if await collection.find_one({"email": email}) is not None:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    await _issue_challenge(email, "signup", password_hash=hash_password(creds.password))

    return {
        "otp_required": True,
        "purpose": "signup",
        "email": email,
        "message": f"Enter the 6-digit code we sent to {email}. It expires in {OTP_TTL_MINUTES} minutes.",
    }


@router.post("/signup/verify")
async def verify_signup(payload: OtpVerifyRequest):
    """Step 2 of sign-up: the account is created only now, then signed in."""
    email = payload.email.lower().strip()
    record = await _consume_challenge(email, "signup", payload.code)

    now = datetime.now(timezone.utc)
    try:
        result = await _collection().insert_one({
            "email": email,
            "password_hash": record["password_hash"],
            "created_at": now,
            "email_verified_at": now,
        })
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    return _session(str(result.inserted_id), email)


@router.post("/login")
async def login(creds: Credentials):
    """
    Step 1 of sign-in: checks the password, then emails a code.

    Deliberately returns no token — the password alone is never enough.
    """
    collection = _collection()

    email = creds.email.lower().strip()
    user = await collection.find_one({"email": email})

    # Same message either way so the response can't be used to enumerate accounts.
    if not user or not verify_password(creds.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    await _issue_challenge(email, "login")

    return {
        "otp_required": True,
        "purpose": "login",
        "email": email,
        "message": f"Enter the 6-digit code we sent to {email}. It expires in {OTP_TTL_MINUTES} minutes.",
    }


@router.post("/login/verify")
async def verify_login(payload: OtpVerifyRequest):
    """Step 2 of sign-in: the JWT is issued only after the code checks out."""
    email = payload.email.lower().strip()
    await _consume_challenge(email, "login", payload.code)

    user = await _collection().find_one({"email": email})
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    return _session(str(user["_id"]), user["email"])


@router.post("/otp/resend")
async def resend_otp(payload: OtpResendRequest):
    """Reissues the code for a challenge already in progress."""
    email = payload.email.lower().strip()
    record = await _otp_collection().find_one({"email": email, "purpose": payload.purpose})

    if record is None:
        raise HTTPException(
            status_code=400,
            detail="There's nothing to resend. Please start again.",
        )

    created_at = record.get("created_at")
    if created_at is not None:
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        age = (datetime.now(timezone.utc) - created_at).total_seconds()
        if age < OTP_RESEND_COOLDOWN_SECONDS:
            raise HTTPException(
                status_code=429,
                detail=f"Please wait {int(OTP_RESEND_COOLDOWN_SECONDS - age) + 1}s before asking for another code.",
            )

    # Carry the parked password hash across so a signup can still complete.
    await _issue_challenge(email, payload.purpose, password_hash=record.get("password_hash"))

    return {"message": f"A new code is on its way to {email}."}


async def _live_reset(token: str):
    """The reset record for this token, or None if it's unknown, spent or stale."""
    record = await _resets_collection().find_one({
        "token_hash": hash_reset_token(token),
        "used_at": None,
    })
    if record is None:
        return None

    expires_at = record.get("expires_at")
    if expires_at is not None:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            return None

    return record


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest):
    """
    Emails a one-time reset link to a registered address.

    Answers identically whether or not the address has an account — otherwise
    this endpoint becomes a way to find out who is registered.
    """
    collection = _collection()
    resets = _resets_collection()

    email = payload.email.lower().strip()
    user = await collection.find_one({"email": email})

    if user is not None:
        now = datetime.now(timezone.utc)

        # One live link per account: asking again retires the previous one.
        await resets.update_many(
            {"user_id": str(user["_id"]), "used_at": None},
            {"$set": {"used_at": now}},
        )

        raw_token = secrets.token_urlsafe(32)
        await resets.insert_one({
            "user_id": str(user["_id"]),
            "email": email,
            "token_hash": hash_reset_token(raw_token),
            "created_at": now,
            "expires_at": now + timedelta(minutes=RESET_TOKEN_TTL_MINUTES),
            "used_at": None,
        })

        link = f"{_frontend_url()}/reset-password?token={raw_token}"
        await send_password_reset_email(email, link, RESET_TOKEN_TTL_MINUTES)

    return {
        "message": (
            "If an account exists for that address, a reset link is on its way. "
            f"It expires in {RESET_TOKEN_TTL_MINUTES} minutes."
        )
    }


@router.post("/reset-password/check")
async def check_reset_token(payload: ResetTokenRequest):
    """Lets the reset page say the link is dead before asking for a new password."""
    return {"valid": await _live_reset(payload.token) is not None}


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest):
    """Consumes the token, sets the new password and kills every old session."""
    _check_password_length(payload.password)

    record = await _live_reset(payload.token)
    if record is None:
        raise HTTPException(
            status_code=400,
            detail="This reset link is invalid or has expired. Request a new one.",
        )

    now = datetime.now(timezone.utc)

    # password_changed_at is what invalidates tokens issued before the reset.
    await _collection().update_one(
        {"_id": ObjectId(record["user_id"])},
        {"$set": {
            "password_hash": hash_password(payload.password),
            "password_changed_at": now,
        }},
    )
    await _resets_collection().update_one(
        {"_id": record["_id"]}, {"$set": {"used_at": now}}
    )

    return {"message": "Password updated. Sign in with your new password."}


@router.get("/me")
async def me(current_user: dict = Depends(get_current_user)):
    """Returns the signed-in user. Used by the frontend to restore a session."""
    return {"user": current_user}
