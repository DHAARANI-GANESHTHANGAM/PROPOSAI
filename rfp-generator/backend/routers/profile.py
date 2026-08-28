"""
The signed-in user's company profile.

This used to live only in the browser's localStorage, which meant it was tied
to one device: signing in anywhere else produced proposals with no company
details at all, silently. It now travels with the account.

Stored on the user document rather than its own collection — it's exactly one
small object per user, always read together with the user.
"""

from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from database.mongodb import get_users_collection
from utils.security import get_current_user

router = APIRouter(prefix="/profile", tags=["profile"])

# Every field is optional — a half-filled profile is still useful to the agent.
# Lengths are capped so one user can't push a megabyte into every prompt.
FIELD_MAX_LENGTH = 500


class CompanyProfile(BaseModel):
    companyName: str = Field(default="", max_length=FIELD_MAX_LENGTH)
    services: str = Field(default="", max_length=FIELD_MAX_LENGTH)
    teamSize: str = Field(default="", max_length=FIELD_MAX_LENGTH)
    location: str = Field(default="", max_length=FIELD_MAX_LENGTH)
    experience: str = Field(default="", max_length=FIELD_MAX_LENGTH)
    speciality: str = Field(default="", max_length=FIELD_MAX_LENGTH)
    website: str = Field(default="", max_length=FIELD_MAX_LENGTH)


def _collection():
    collection = get_users_collection()
    if collection is None:
        raise HTTPException(
            status_code=503,
            detail="Service temporarily unavailable. Please try again in a moment.",
        )
    return collection


@router.get("")
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Returns the saved profile, or empty strings when nothing is saved yet."""
    user = await _collection().find_one(
        {"_id": ObjectId(current_user["id"])}, {"company_profile": 1}
    )
    stored = (user or {}).get("company_profile") or {}

    # Model defaults fill in any key the stored document is missing, so the
    # frontend always receives the full shape.
    return {"profile": CompanyProfile(**{
        key: value for key, value in stored.items()
        if key in CompanyProfile.model_fields
    }).model_dump()}


@router.put("")
async def save_profile(
    profile: CompanyProfile,
    current_user: dict = Depends(get_current_user),
):
    """Replaces the saved profile wholesale — the form always sends every field."""
    result = await _collection().update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {
            "company_profile": profile.model_dump(),
            "company_profile_updated_at": datetime.now(timezone.utc),
        }},
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Account not found.")

    return {"saved": True, "profile": profile.model_dump()}
