import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.reminder import Reminder
from backend.schemas.reminder import ReminderCreate


async def create_reminder(
    db: AsyncSession,
    user_id: str,
    payload: ReminderCreate,
) -> Reminder:
    """
    Persist a new reminder for *user_id* and return the ORM instance.

    The caller is responsible for committing (or rolling back) the session
    if needed; this service does both add and flush so the instance is
    usable immediately after the call.
    """
    reminder = Reminder(
        id=str(uuid.uuid4()),
        user_id=user_id,
        title=payload.title,
        description=payload.description,
        due_date=payload.due_date,
        priority=payload.priority.value,
        completed=False,
        created_at=datetime.now(timezone.utc),
    )
    db.add(reminder)
    await db.commit()
    await db.refresh(reminder)
    return reminder
