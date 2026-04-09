from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ChatMessageIn(BaseModel):
    content: str


class ChatMessageOut(BaseModel):
    id: UUID
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatResponse(BaseModel):
    reply: str
    message: ChatMessageOut


class PlanRequest(BaseModel):
    weight_kg: float
    height_cm: float
    goal: str           # lose | gain | maintain
    activity_level: str # sedentary | light | active | very_active


class PlanResponse(BaseModel):
    calories: int
    protein_g: int
    carbs_g: int
    fat_g: int
    workout_plan: str
    lifestyle_tips: str
