"""
Password hashing and JWT sessions for ProposAI.

Replaces Supabase Auth — identity now lives in the MongoDB `users` collection.
"""

import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from bson import ObjectId
from bson.errors import InvalidId
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from database.mongodb import get_users_collection

load_dotenv()

ALGORITHM = "HS256"
TOKEN_TTL_HOURS = int(os.getenv("JWT_TTL_HOURS", "168"))  # 7 days

# bcrypt silently truncates anything past 72 bytes, so we reject it instead.
MAX_PASSWORD_BYTES = 72

JWT_SECRET = os.getenv("JWT_SECRET", "")
if not JWT_SECRET:
    JWT_SECRET = secrets.token_urlsafe(32)
    print(
        "[WARN] JWT_SECRET is not set - generated a temporary one. "
        "All users will be logged out on restart. Set JWT_SECRET in .env."
    )

bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def hash_reset_token(token: str) -> str:
    """
    Reset tokens are stored as a SHA-256 digest, never in the clear, so a
    leaked database dump can't be used to take over accounts. They're already
    128 bits of `secrets` output, so there's nothing for a slow hash to defend
    against here.
    """
    return hashlib.sha256((token or "").encode("utf-8")).hexdigest()


# A six-digit code is only 20 bits, so the defence is not the code's size but
# the short expiry and the attempt cap enforced in routers/auth.py.
OTP_LENGTH = 6
OTP_MAX_ATTEMPTS = 5


def generate_otp() -> str:
    """A cryptographically random six-digit code, zero-padded."""
    return f"{secrets.randbelow(10 ** OTP_LENGTH):0{OTP_LENGTH}d}"


def hash_otp(code: str) -> str:
    """Codes are stored hashed, never in the clear."""
    return hashlib.sha256((code or "").strip().encode("utf-8")).hexdigest()


def verify_otp(code: str, code_hash: str) -> bool:
    """Constant-time compare, so timing can't leak digits."""
    return hmac.compare_digest(hash_otp(code), code_hash or "")


def _as_utc(value):
    """Mongo hands back naive datetimes; they're UTC."""
    if value is not None and value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


async def _issued_after_last_password_change(user_id: str, issued_at) -> bool:
    """
    A reset stamps `password_changed_at` on the user, which kills every token
    minted before that moment — the whole point of resetting a password you
    think someone else has. Costs one indexed _id lookup per authenticated
    request.

    If the database is unreachable we fall back to trusting the signature
    alone, rather than signing every user out during an outage.
    """
    collection = get_users_collection()
    if collection is None or issued_at is None:
        return True

    try:
        user = await collection.find_one(
            {"_id": ObjectId(user_id)}, {"password_changed_at": 1}
        )
    except (InvalidId, TypeError):
        return False

    if user is None:
        return False

    changed_at = _as_utc(user.get("password_changed_at"))
    if changed_at is None:
        return True  # never reset, so nothing to invalidate

    # `iat` is whole seconds while Mongo keeps milliseconds, so both sides are
    # compared at one-second resolution. That leaves a one-second window in
    # which a token minted in the same second as the reset survives — the
    # alternative rejects a legitimate sign-in that lands in that same second,
    # which is far likelier than an attacker minting a token inside it.
    return issued_at >= int(changed_at.timestamp())


def create_access_token(user_id: str, email: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "iat": now,
        "exp": now + timedelta(hours=TOKEN_TTL_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """
    FastAPI dependency. Resolves the Bearer token into {"id", "email"}.

    The user id comes from the signed token, never from the request body —
    that is what stops one user from reading another's history.
    """
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated.")

    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired. Please sign in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token.")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token.")

    if not await _issued_after_last_password_change(user_id, payload.get("iat")):
        raise HTTPException(
            status_code=401,
            detail="Your password was changed. Please sign in again.",
        )

    return {"id": user_id, "email": payload.get("email", "")}
