import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from openai import AsyncOpenAI

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.models.workout import Exercise, Workout
from app.schemas.workout import (
    AnalyzeRequest,
    AnalyzeResponse,
    ExerciseCreate,
    ExerciseOut,
    WorkoutCreate,
    WorkoutOut,
)

router = APIRouter(prefix="/workouts", tags=["workouts"])
client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


@router.post("", response_model=WorkoutOut, status_code=201)
async def save_workout(
    body: WorkoutCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workout = Workout(user_id=current_user.id, **body.model_dump())
    db.add(workout)
    await db.commit()
    await db.refresh(workout)
    return workout


@router.get("", response_model=list[WorkoutOut])
async def list_workouts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Workout)
        .where(Workout.user_id == current_user.id)
        .order_by(Workout.created_at.desc())
        .limit(100)
    )
    return result.scalars().all()


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_form(
    body: AnalyzeRequest,
    current_user: User = Depends(get_current_user),
):
    # Sample angle_data to at most 200 frames to stay within token limits
    data = body.angle_data
    if len(data) > 200:
        step = len(data) / 200
        data = [data[int(i * step)] for i in range(200)]

    prompt = f"""You are a professional fitness coach analyzing workout form data.

Exercise: {body.exercise_name}
Motion data (frame index, joint angle, stage):
{json.dumps(data)}

Return ONLY valid JSON with these exact keys:
{{
  "form_score": <float 0-10>,
  "observations": [<string>, ...],
  "corrections": [<string>, ...],
  "progression_tips": [<string>, ...]
}}"""

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
    )
    data = json.loads(response.choices[0].message.content)
    return AnalyzeResponse(**data)


# --- Custom exercise creator ---

@router.get("/exercises", response_model=list[ExerciseOut])
async def list_exercises(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Exercise).where(
            (Exercise.user_id == None) | (Exercise.user_id == current_user.id)
        )
    )
    return result.scalars().all()


@router.post("/exercises", response_model=ExerciseOut, status_code=201)
async def create_exercise(
    body: ExerciseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    exercise = Exercise(user_id=current_user.id, **body.model_dump())
    db.add(exercise)
    await db.commit()
    await db.refresh(exercise)
    return exercise


@router.post("/exercises/generate", response_model=ExerciseOut)
async def generate_exercise(
    name: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ask GPT-4o-mini to define landmarks + thresholds for any exercise name."""
    prompt = f"""You are a computer vision expert for fitness apps using MediaPipe Pose (33 landmarks).

Generate tracking config for: "{name}"

Return ONLY valid JSON:
{{
  "landmarks": ["LANDMARK_A", "LANDMARK_B", "LANDMARK_C"],
  "thresholds": {{"down": <angle>, "up": <angle>}},
  "mode": "max_min" or "min_max"
}}

Rules:
- landmarks: exactly 3 MediaPipe landmark names forming the joint angle to track
- thresholds: the joint angle at bottom (down) and top (up) of the movement
- mode: max_min if angle is large at start, min_max if angle is small at start"""

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
    )
    data = json.loads(response.choices[0].message.content)
    exercise = Exercise(user_id=current_user.id, name=name, **data)
    db.add(exercise)
    await db.commit()
    await db.refresh(exercise)
    return exercise
