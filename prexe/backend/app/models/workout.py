import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Workout(Base):
    __tablename__ = "workouts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    exercise_name: Mapped[str] = mapped_column(String(100), nullable=False)
    reps: Mapped[int] = mapped_column(Integer, nullable=False)
    form_score: Mapped[float | None] = mapped_column(Float)
    ai_feedback: Mapped[str | None] = mapped_column(Text)
    angle_data: Mapped[dict | None] = mapped_column(JSON)  # raw motion snapshots

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user = relationship("User", back_populates="workouts")


class Exercise(Base):
    __tablename__ = "exercises"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True
    )  # null = built-in, non-null = user custom

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    landmarks: Mapped[list] = mapped_column(JSON, nullable=False)   # e.g. ["LEFT_HIP","LEFT_KNEE","LEFT_ANKLE"]
    thresholds: Mapped[dict] = mapped_column(JSON, nullable=False)  # e.g. {"down": 90, "up": 160}
    mode: Mapped[str] = mapped_column(String(20), nullable=False)   # "max_min" | "min_max"

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
