from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.deps import get_current_user_id
from backend.models.database import get_db
from backend.schemas.reminder import ReminderCreate, ReminderData, ReminderResponse
from backend.services.reminder_service import create_reminder

router = APIRouter(prefix="/reminders", tags=["reminders"])


@router.post(
    "",
    response_model=ReminderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a reminder",
    description=(
        "Create a new reminder for the authenticated user. "
        "The `due_date` field accepts any ISO 8601 datetime string. "
        "`priority` must be one of `low`, `medium`, or `high` (defaults to `medium`)."
    ),
)
async def create_reminder_endpoint(
    body: ReminderCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> ReminderResponse:
    """
    **POST /api/v1/reminders**

    Requires `Authorization: Bearer <access_token>` header.

    Returns the newly created reminder wrapped in the standard envelope.
    """
    reminder = await create_reminder(db, user_id, body)
    return ReminderResponse(
        status="ok",
        message="Reminder created",
        data=ReminderData.model_validate(reminder),
    )
