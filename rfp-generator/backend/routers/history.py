"""
RFP history endpoints backed by MongoDB Atlas.

Every route derives user_id from the verified JWT, so a client cannot read
or delete another user's history by passing a different id.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from database.mongodb import get_history_collection
from utils.security import get_current_user

router = APIRouter()


# A long Q&A thread shouldn't be able to grow a single document without
# bound — Mongo's own ceiling is 16 MB per document.
MAX_CHAT_MESSAGES = 200
MAX_MESSAGE_CHARS = 10_000


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=MAX_MESSAGE_CHARS)


class RFPHistoryCreate(BaseModel):
    rfp_summary: str = ""
    drafted_response: str = ""
    sections: Dict[str, Any] = Field(default_factory=dict)
    win_score: Dict[str, Any] = Field(default_factory=dict)
    filename: Optional[str] = None
    edited: Optional[str] = None
    rfp_text: Optional[str] = None
    chat_messages: List[ChatMessage] = Field(
        default_factory=list, max_length=MAX_CHAT_MESSAGES
    )


class RFPHistoryUpdate(BaseModel):
    """
    Partial update. Only the fields actually sent are written, so patching the
    chat thread can't blank out an edited draft by omitting it.
    """
    # A name the user chose. Falls back to the filename in the UI when unset —
    # pasted RFPs have no filename at all and were listed as "RFP Response #4".
    title: Optional[str] = Field(default=None, max_length=200)
    edited: Optional[str] = None
    chat_messages: Optional[List[ChatMessage]] = Field(
        default=None, max_length=MAX_CHAT_MESSAGES
    )


def _collection():
    collection = get_history_collection()
    if collection is None:
        raise HTTPException(
            status_code=503,
            # Deliberately vague: the visitor can't act on the real cause, and
            # naming our environment variables tells them about our internals.
            # The specific reason is in the server log at startup.
            detail="Service temporarily unavailable. Please try again in a moment.",
        )
    return collection


def _to_dict(doc: dict) -> dict:
    """Mongo's ObjectId and datetime aren't JSON serializable — flatten them."""
    doc["id"] = str(doc.pop("_id"))
    created = doc.get("created_at")
    if isinstance(created, datetime):
        doc["created_at"] = created.isoformat()
    return doc


def _object_id(history_id: str) -> ObjectId:
    try:
        return ObjectId(history_id)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail="Invalid history id.")


@router.post("/history")
async def save_history(
    item: RFPHistoryCreate,
    current_user: dict = Depends(get_current_user),
):
    """Saves one generated RFP response for the signed-in user."""
    collection = _collection()

    document = item.model_dump()
    document["user_id"] = current_user["id"]
    document["created_at"] = datetime.now(timezone.utc)

    result = await collection.insert_one(document)

    return {"id": str(result.inserted_id), "saved": True}


@router.patch("/history/{history_id}")
async def update_history_item(
    history_id: str,
    changes: RFPHistoryUpdate,
    current_user: dict = Depends(get_current_user),
):
    """
    Updates one saved response in place.

    Used to keep the chat thread with the proposal it belongs to: questions
    asked after the initial save used to live only in React state and were
    lost on reload.
    """
    # model_dump already flattens the nested ChatMessage models to plain dicts.
    updates = {
        key: value
        for key, value in changes.model_dump(exclude_unset=True).items()
        if value is not None
    }

    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update.")

    updates["updated_at"] = datetime.now(timezone.utc)

    result = await _collection().update_one(
        {"_id": _object_id(history_id), "user_id": current_user["id"]},
        {"$set": updates},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="History item not found.")

    return {"updated": True}


@router.get("/history")
async def get_history(
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_user),
):
    """Returns the signed-in user's saved responses, newest first."""
    collection = _collection()

    cursor = (
        collection.find({"user_id": current_user["id"]})
        .sort("created_at", -1)
        .limit(limit)
    )
    items = [_to_dict(doc) async for doc in cursor]

    return {"count": len(items), "history": items}


@router.get("/history/{history_id}")
async def get_history_item(
    history_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Returns a single saved response."""
    collection = _collection()

    doc = await collection.find_one(
        {"_id": _object_id(history_id), "user_id": current_user["id"]}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="History item not found.")

    return _to_dict(doc)


@router.delete("/history/{history_id}")
async def delete_history_item(
    history_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Deletes one saved response."""
    collection = _collection()

    result = await collection.delete_one(
        {"_id": _object_id(history_id), "user_id": current_user["id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="History item not found.")

    return {"deleted": True}


@router.delete("/history")
async def clear_history(current_user: dict = Depends(get_current_user)):
    """Clears every saved response for the signed-in user."""
    collection = _collection()

    result = await collection.delete_many({"user_id": current_user["id"]})

    return {"deleted": result.deleted_count}
