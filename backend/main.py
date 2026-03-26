from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.core.config import settings
from backend.models.database import init_db
from backend.routers import reminders


@asynccontextmanager
async def lifespan(app: FastAPI):  # type: ignore[type-arg]
    """Run startup/shutdown tasks."""
    await init_db()
    yield


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
API_PREFIX = "/api/v1"

app.include_router(reminders.router, prefix=API_PREFIX)


@app.get("/health", tags=["health"])
async def health_check() -> dict:
    """Simple liveness probe."""
    return {"status": "ok"}
