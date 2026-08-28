"""
Shared rate limiter.

Generation is the expensive path: five sequential LLM calls plus embeddings
for every request. Left uncapped, one person holding the button drains the
free Groq and Gemini quotas for everybody.

Buckets are per signed-in user where possible, falling back to IP. Keying on
IP alone would lump everyone behind a shared network (an office, a campus)
into one bucket.
"""

import os

import jwt
from slowapi import Limiter
from slowapi.util import get_remote_address

from utils.security import ALGORITHM, JWT_SECRET

# Overridable without a redeploy if the limits turn out to be wrong in practice.
GENERATE_LIMIT = os.getenv("GENERATE_RATE_LIMIT", "10/hour")
CHAT_LIMIT = os.getenv("CHAT_RATE_LIMIT", "40/hour")


def identify_caller(request) -> str:
    """
    The rate-limit bucket for this request.

    The token is fully verified here rather than merely decoded: an
    unverified `sub` would let anyone mint fresh buckets at will and walk
    straight past the limit.
    """
    header = request.headers.get("authorization", "")
    if header.lower().startswith("bearer "):
        try:
            payload = jwt.decode(
                header.split(" ", 1)[1], JWT_SECRET, algorithms=[ALGORITHM]
            )
            subject = payload.get("sub")
            if subject:
                return f"user:{subject}"
        except jwt.InvalidTokenError:
            pass

    return f"ip:{get_remote_address(request)}"


limiter = Limiter(key_func=identify_caller)
