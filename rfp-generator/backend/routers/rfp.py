import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile

from agents.rfp_agent import run_rfp_agent
from utils.pdf_reader import extract_text
from utils.rate_limit import CHAT_LIMIT, GENERATE_LIMIT, limiter
from utils.security import get_current_user

router = APIRouter()

# The free instance has 512 MB. Read in chunks and stop at the ceiling rather
# than pulling the whole upload into memory and measuring it afterwards.
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_TEXT_CHARS = 200_000
CHUNK = 64 * 1024


async def _read_capped(file: UploadFile) -> bytes:
    chunks = []
    total = 0

    while True:
        chunk = await file.read(CHUNK)
        if not chunk:
            break
        total += len(chunk)
        if total > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"That file is larger than {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.",
            )
        chunks.append(chunk)

    return b"".join(chunks)


@router.post("/generate")
@limiter.limit(GENERATE_LIMIT)
async def generate_rfp_response(
    request: Request,
    file: UploadFile = File(...),
    profile: str = Form("{}"),
    current_user: dict = Depends(get_current_user),
):
    """
    Accepts an RFP document, extracts text,
    runs the AI agent, and returns a drafted response.
    """
    allowed = [".pdf", ".docx", ".doc", ".txt"]
    if not any(file.filename.lower().endswith(ext) for ext in allowed):
        raise HTTPException(status_code=400, detail="Only PDF, DOCX, DOC, and TXT files are accepted.")

    contents = await _read_capped(file)
    rfp_text = extract_text(contents, file.filename)

    if not rfp_text:
        raise HTTPException(status_code=400, detail="Could not extract text from that file.")

    try:
        profile_data = json.loads(profile) if profile else {}
    except json.JSONDecodeError:
        # A malformed profile shouldn't cost the user their upload.
        profile_data = {}

    result = await run_rfp_agent(rfp_text[:MAX_TEXT_CHARS], profile_data)

    return {
        "filename": file.filename,
        "rfp_summary": result["summary"],
        "drafted_response": result["response"],
        "sections": result["sections"],
        "win_score": result.get("win_score", {})
    }


@router.post("/generate-text")
@limiter.limit(GENERATE_LIMIT)
async def generate_from_text(
    request: Request,
    data: dict,
    current_user: dict = Depends(get_current_user),
):
    """
    Accepts raw RFP text (pasted by user) and returns AI response.
    """
    rfp_text = data.get("text", "")

    if not rfp_text or len(rfp_text) < 50:
        raise HTTPException(status_code=400, detail="RFP text is too short.")

    result = await run_rfp_agent(rfp_text[:MAX_TEXT_CHARS], data.get("profile", {}))

    return {
        "rfp_summary": result["summary"],
        "drafted_response": result["response"],
        "sections": result["sections"],
        "win_score": result.get("win_score", {})
    }


@router.post("/chat")
@limiter.limit(CHAT_LIMIT)
async def chat_with_rfp(
    request: Request,
    data: dict,
    current_user: dict = Depends(get_current_user),
):
    """
    Accepts a question and RFP text,
    returns an AI answer based on the RFP content.
    """
    question = data.get("question", "")
    rfp_text = data.get("rfp_text", "")

    if not question:
        raise HTTPException(status_code=400, detail="Question is required.")
    if not rfp_text:
        raise HTTPException(status_code=400, detail="RFP text is required.")

    from agents.chat_agent import answer_question
    answer = await answer_question(rfp_text[:MAX_TEXT_CHARS], question)

    return { "answer": answer }
