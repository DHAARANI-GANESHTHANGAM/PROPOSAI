"""
Email + password auth backed by the MongoDB `users` collection.

Replaces Supabase Auth. Passwords are bcrypt-hashed and never returned;
sessions are stateless JWTs.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from pymongo.errors import DuplicateKeyError

from database.mongodb import get_users_collection
from utils.security import (
    MAX_PASSWORD_BYTES,
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


class Credentials(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


def _collection():
    collection = get_users_collection()
    if collection is None:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable. Check MONGODB_URI.",
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


@router.get("/me")
async def me(current_user: dict = Depends(get_current_user)):
    """Returns the signed-in user. Used by the frontend to restore a session."""
    return {"user": current_user}
