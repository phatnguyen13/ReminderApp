"""
Tests for POST /api/v1/reminders.

Covers:
  - happy path (201, full response shape)
  - missing title (422 Unprocessable Entity)
  - unauthenticated request (401 Unauthorized)
"""
import pytest
from httpx import AsyncClient


ENDPOINT = "/api/v1/reminders"


# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_reminder_success(client: AsyncClient, auth_headers: dict):
    """A valid request with all fields returns 201 and the correct envelope."""
    payload = {
        "title": "Buy groceries",
        "description": "Milk, eggs, bread",
        "due_date": "2026-04-01T09:00:00Z",
        "priority": "high",
    }

    response = await client.post(ENDPOINT, json=payload, headers=auth_headers)

    assert response.status_code == 201
    body = response.json()

    # Envelope shape
    assert body["status"] == "ok"
    assert body["message"] == "Reminder created"

    data = body["data"]
    assert data["title"] == "Buy groceries"
    assert data["description"] == "Milk, eggs, bread"
    assert data["priority"] == "high"
    assert data["completed"] is False
    assert "id" in data
    assert "created_at" in data
    # due_date should be echoed back
    assert data["due_date"] is not None


@pytest.mark.asyncio
async def test_create_reminder_minimal_fields(client: AsyncClient, auth_headers: dict):
    """Only required field (title) should be enough — optional fields default gracefully."""
    payload = {"title": "Minimal reminder"}

    response = await client.post(ENDPOINT, json=payload, headers=auth_headers)

    assert response.status_code == 201
    data = response.json()["data"]
    assert data["title"] == "Minimal reminder"
    assert data["description"] is None
    assert data["due_date"] is None
    assert data["priority"] == "medium"  # default
    assert data["completed"] is False


# ---------------------------------------------------------------------------
# Validation errors
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_reminder_missing_title(client: AsyncClient, auth_headers: dict):
    """Omitting the required `title` field must return 422."""
    payload = {"description": "No title here", "priority": "low"}

    response = await client.post(ENDPOINT, json=payload, headers=auth_headers)

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_reminder_title_too_long(client: AsyncClient, auth_headers: dict):
    """A title exceeding 200 characters must return 422."""
    payload = {"title": "x" * 201}

    response = await client.post(ENDPOINT, json=payload, headers=auth_headers)

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_reminder_invalid_priority(client: AsyncClient, auth_headers: dict):
    """An unknown priority value must return 422."""
    payload = {"title": "Bad priority", "priority": "urgent"}

    response = await client.post(ENDPOINT, json=payload, headers=auth_headers)

    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_reminder_no_token(client: AsyncClient):
    """A request without an Authorization header must return 401."""
    payload = {"title": "Unauthenticated reminder"}

    response = await client.post(ENDPOINT, json=payload)

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_reminder_invalid_token(client: AsyncClient):
    """A request with a malformed token must return 401."""
    headers = {"Authorization": "Bearer this.is.not.valid"}
    payload = {"title": "Bad token reminder"}

    response = await client.post(ENDPOINT, json=payload, headers=headers)

    assert response.status_code == 401
