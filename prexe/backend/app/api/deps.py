from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import Depends

from app.db.session import get_db, AsyncSessionLocal
from app.models.user import User
from app.core.security import hash_password

DEFAULT_EMAIL = "default@coachai.local"
DEFAULT_USER_ID = None  # populated at startup


async def ensure_default_user() -> None:
    """Create the default user if it doesn't exist. Called at app startup."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == DEFAULT_EMAIL))
        user = result.scalar_one_or_none()
        if not user:
            user = User(
                email=DEFAULT_EMAIL,
                password_hash=hash_password("unused"),
                display_name="User",
            )
            db.add(user)
            await db.commit()


async def get_current_user(db: AsyncSession = Depends(get_db)) -> User:
    result = await db.execute(select(User).where(User.email == DEFAULT_EMAIL))
    return result.scalar_one()
