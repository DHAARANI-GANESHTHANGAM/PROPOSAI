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

from database.mongodb import get_password_resets_collection, get_users_collection
from utils.mailer import send_password_reset_email
from utils.security import (
    MAX_PASSWORD_BYTES,
    create_access_token,
    get_current_user,
    hash_password,
    hash_reset_token,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])

# How long a reset link stays usable. Short enough that a forwarded or
# logged link goes stale quickly, long enough to survive a slow inbox.
RESET_TOKEN_TTL_MINUTES = int(os.getenv("RESET_TOKEN_TTL_MINUTES", "30"))


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


@router.post("/signup")
async def signup(creds: Credentials):
    """Creates an account and signs the user straight in."""
    collection = _collection()
    _check_password_length(creds.password)

    email = creds.email.lower().strip()

    try:
        result = await collection.insert_one({
            "email": email,
            "password_hash": hash_password(creds.password),
            "created_at": datetime.now(timezone.utc),
        })
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    return _session(str(result.inserted_id), email)


@router.post("/login")
async def login(creds: Credentials):
    """Verifies credentials and returns a JWT."""
    collection = _collection()

    email = creds.email.lower().strip()
    user = await collection.find_one({"email": email})

    # Same message either way so the response can't be used to enumerate accounts.
    if not user or not verify_password(creds.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    return _session(str(user["_id"]), user["email"])


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
