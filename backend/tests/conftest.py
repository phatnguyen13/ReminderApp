"""
Shared pytest fixtures for the backend test suite.

Uses an in-memory SQLite database so tests are isolated and fast.
A valid JWT is minted directly via the security module — no auth endpoint
needs to be live for reminder tests to run.
"""
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from backend.core.security import create_access_token
from backend.models.database import Base, get_db
from backend.main import app

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"
TEST_USER_ID = "test-user-uuid-1234"


@pytest_asyncio.fixture(scope="function")
async def db_session():
    """Yield a fresh in-memory database session for each test."""
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession):
    """
    Return an AsyncClient wired to the FastAPI app with the real DB
    dependency replaced by the in-memory test session.
    """

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)  # type: ignore[arg-type]
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture()
def auth_headers() -> dict:
    """Return Authorization headers for TEST_USER_ID."""
    token = create_access_token(TEST_USER_ID)
    return {"Authorization": f"Bearer {token}"}
