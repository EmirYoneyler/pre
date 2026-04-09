from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    goal: Optional[str] = None
    activity_level: Optional[str] = None


class UserOut(BaseModel):
    id: UUID
    email: str
    display_name: Optional[str]
    weight_kg: Optional[float]
    height_cm: Optional[float]
    goal: Optional[str]
    activity_level: Optional[str]
    is_verified: bool

    model_config = {"from_attributes": True}
