from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class Priority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class ReminderCreate(BaseModel):
    """Validated body for POST /api/v1/reminders."""

    title: str = Field(..., min_length=1, max_length=200, description="Reminder title")
    description: str | None = Field(None, description="Optional longer description")
    due_date: datetime | None = Field(None, description="ISO 8601 datetime for the due date")
    priority: Priority = Field(Priority.medium, description="low | medium | high")


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class ReminderData(BaseModel):
    """The nested `data` object returned for a single reminder."""

    id: str
    title: str
    description: str | None
    due_date: datetime | None
    priority: Priority
    completed: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ReminderResponse(BaseModel):
    """Envelope returned by POST /api/v1/reminders on success."""

    status: str = "ok"
    message: str
    data: ReminderData


class ErrorResponse(BaseModel):
    """Standard error envelope."""

    status: str = "error"
    message: str
    data: Any = None
