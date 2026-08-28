"""Download endpoints for a finished proposal."""

import re

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from pydantic import BaseModel, Field

from utils.docx_export import build_proposal_docx
from utils.security import get_current_user

router = APIRouter(prefix="/export", tags=["export"])

DOCX_MEDIA_TYPE = (
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
)

# Caps the body at roughly a 100-page proposal. Without a ceiling one request
# could pin the free instance's 512 MB building a document nobody asked for.
MAX_BODY_CHARS = 400_000


class ExportRequest(BaseModel):
    body: str = Field(min_length=1, max_length=MAX_BODY_CHARS)
    company_name: str = Field(default="", max_length=200)
    source_filename: str = Field(default="", max_length=300)


def _safe_filename(company_name: str) -> str:
    """
    Builds a download name that can't break the Content-Disposition header.

    Anything outside a small safe set is dropped rather than escaped — a
    quote or newline smuggled in here would let a caller inject header fields.
    """
    stem = re.sub(r"[^A-Za-z0-9 _-]", "", company_name).strip().replace(" ", "-")
    return f"{stem.lower()}-proposal.docx" if stem else "proposal.docx"


@router.post("/docx")
async def export_docx(
    payload: ExportRequest,
    current_user: dict = Depends(get_current_user),
):
    """Renders the (possibly edited) proposal as a Word document."""
    content = build_proposal_docx(
        body=payload.body,
        company_name=payload.company_name,
        source_filename=payload.source_filename,
    )

    return Response(
        content=content,
        media_type=DOCX_MEDIA_TYPE,
        headers={
            "Content-Disposition": f'attachment; filename="{_safe_filename(payload.company_name)}"'
        },
    )
