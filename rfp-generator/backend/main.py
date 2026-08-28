import os
from contextlib import asynccontextmanager
import traceback
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from routers import rfp, history, auth, profile
from database.mongodb import connect_to_mongo, close_mongo_connection


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()


app = FastAPI(title="RFP Generator API", lifespan=lifespan)

# Turn unhandled exceptions into a JSON 500 *inside* the CORS middleware.
# Starlette's default 500 is produced outside it, so it carries no
# Access-Control-Allow-Origin header and the browser reports a phantom CORS
# error instead of the real server-side failure. Registered before
# CORSMiddleware so that CORSMiddleware ends up wrapping it.
@app.middleware("http")
async def json_errors_with_cors_headers(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as exc:
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"detail": f"{type(exc).__name__}: {exc}"},
        )


# Allow React frontend to talk to this backend.
# Deployed origins come from FRONTEND_ORIGINS (comma-separated).
FRONTEND_ORIGINS = [
    o.strip() for o in os.getenv("FRONTEND_ORIGINS", "").split(",") if o.strip()
] or ["https://your-app.vercel.app"]

# Any localhost port, so Vite falling back to 5174 (or browsing via 127.0.0.1)
# doesn't turn into an opaque "Failed to fetch" in the browser.
DEV_ORIGIN_REGEX = r"http://(localhost|127\.0\.0\.1|\[::1\]):\d+"

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_origin_regex=None if os.getenv("DISABLE_LOCAL_CORS") else DEV_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(rfp.router, prefix="/api")
app.include_router(history.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(profile.router, prefix="/api")

@app.get("/")
def root():
    return {"message": "RFP Generator API is running ✅"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
