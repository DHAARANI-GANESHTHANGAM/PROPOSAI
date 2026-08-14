"""
MongoDB Atlas connection for ProposAI.

Uses motor (async driver) so it plays nicely with FastAPI's event loop.
Supabase Auth is untouched — this only replaces the data layer.
"""

import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING
from pymongo.errors import PyMongoError

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "proposai")

HISTORY_COLLECTION = "rfp_history"
USERS_COLLECTION = "users"

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def connect_to_mongo() -> None:
    """Open the connection pool and make sure indexes exist. Called on startup."""
    global _client, _db

    if not MONGODB_URI:
        print("[WARN] MONGODB_URI is not set - history endpoints will return 503.")
        return

    _client = AsyncIOMotorClient(MONGODB_URI, serverSelectionTimeoutMS=10000)
    _db = _client[MONGODB_DB_NAME]

    try:
        await _client.admin.command("ping")
        print(f"[OK] Connected to MongoDB Atlas (db: {MONGODB_DB_NAME})")
        await _ensure_indexes()
    except PyMongoError as e:
        print(f"[ERROR] MongoDB connection failed: {e}")
        _client = None
        _db = None


async def close_mongo_connection() -> None:
    """Close the connection pool. Called on shutdown."""
    global _client, _db
    if _client is not None:
        _client.close()
        _client = None
        _db = None
        print("[OK] MongoDB connection closed")


async def _ensure_indexes() -> None:
    """Newest-first lookups per user, and one account per email address."""
    await _db[HISTORY_COLLECTION].create_index(
        [("user_id", ASCENDING), ("created_at", DESCENDING)]
    )
    # Unique index is what actually prevents duplicate signups under a race.
    await _db[USERS_COLLECTION].create_index("email", unique=True)


def get_database() -> AsyncIOMotorDatabase:
    """Returns the active database, or None if the connection never came up."""
    return _db


def get_history_collection():
    """Returns the rfp_history collection, or None if MongoDB is unavailable."""
    if _db is None:
        return None
    return _db[HISTORY_COLLECTION]


def get_users_collection():
    """Returns the users collection, or None if MongoDB is unavailable."""
    if _db is None:
        return None
    return _db[USERS_COLLECTION]
