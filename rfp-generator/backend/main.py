import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import rfp, history, auth
from database.mongodb import connect_to_mongo, close_mongo_connection


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()


app = FastAPI(title="RFP Generator API", lifespan=lifespan)

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

@app.get("/")
def root():
    return {"message": "RFP Generator API is running ✅"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
