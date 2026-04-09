from typing import Any, Optional
from uuid import UUID
from datetime import datetime

from pydantic import BaseModel


class WorkoutCreate(BaseModel):
    exercise_name: str
    reps: int
    form_score: Optional[float] = None
    ai_feedback: Optional[str] = None
    angle_data: Optional[list[dict]] = None


class WorkoutOut(BaseModel):
    id: UUID
    exercise_name: str
    reps: int
    form_score: Optional[float]
    ai_feedback: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class AnalyzeRequest(BaseModel):
    exercise_name: str
    angle_data: list[dict]   # [{"i": frame, "a": angle, "s": "UP"/"DOWN"}]


class AnalyzeResponse(BaseModel):
    form_score: float
    observations: list[str]
    corrections: list[str]
    progression_tips: list[str]


class ExerciseCreate(BaseModel):
    name: str
    landmarks: list[str]
    thresholds: dict[str, float]
    mode: str


class ExerciseOut(BaseModel):
    id: UUID
    name: str
    landmarks: list[str]
    thresholds: dict[str, Any]
    mode: str

    model_config = {"from_attributes": True}
