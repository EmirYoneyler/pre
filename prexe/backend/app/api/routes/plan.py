import json

from fastapi import APIRouter, Depends
from openai import AsyncOpenAI

from app.api.deps import get_current_user
from app.core.config import settings
from app.models.user import User
from app.schemas.chat import PlanRequest, PlanResponse

router = APIRouter(prefix="/plan", tags=["plan"])
client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


@router.post("", response_model=PlanResponse)
async def generate_plan(
    body: PlanRequest,
    current_user: User = Depends(get_current_user),
):
    prompt = f"""You are a certified nutritionist and personal trainer.

User profile:
- Weight: {body.weight_kg} kg
- Height: {body.height_cm} cm
- Goal: {body.goal} weight
- Activity level: {body.activity_level}

Return ONLY valid JSON:
{{
  "calories": <int>,
  "protein_g": <int>,
  "carbs_g": <int>,
  "fat_g": <int>,
  "workout_plan": "<2-3 sentence weekly workout plan>",
  "lifestyle_tips": "<2-3 sentence lifestyle recommendations>"
}}"""

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
    )
    data = json.loads(response.choices[0].message.content)
    return PlanResponse(**data)
