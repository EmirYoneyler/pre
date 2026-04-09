from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from openai import AsyncOpenAI

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.chat import ChatMessage
from app.models.user import User
from app.schemas.chat import ChatMessageIn, ChatMessageOut, ChatResponse

router = APIRouter(prefix="/chat", tags=["chat"])
client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

SYSTEM_PROMPT = """You are FitAI, an expert personal fitness coach and nutritionist.
You are encouraging, knowledgeable, and specific. You remember the user's goals and progress.
Keep responses concise (2-4 sentences) unless the user asks for detail.
Never give medical advice — always recommend consulting a doctor for injuries."""


@router.post("", response_model=ChatResponse)
async def send_message(
    body: ChatMessageIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Load last 20 messages for context
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.user_id == current_user.id)
        .order_by(ChatMessage.created_at.desc())
        .limit(20)
    )
    history = list(reversed(result.scalars().all()))

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if current_user.display_name:
        messages[0]["content"] += f"\nThe user's name is {current_user.display_name}."
    if current_user.goal:
        messages[0]["content"] += f" Their goal is to {current_user.goal} weight."

    for msg in history:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": body.content})

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
    )
    reply = response.choices[0].message.content

    # Persist both messages
    user_msg = ChatMessage(user_id=current_user.id, role="user", content=body.content)
    ai_msg = ChatMessage(user_id=current_user.id, role="assistant", content=reply)
    db.add_all([user_msg, ai_msg])
    await db.commit()
    await db.refresh(ai_msg)

    return ChatResponse(reply=reply, message=ChatMessageOut.model_validate(ai_msg))


@router.get("/history", response_model=list[ChatMessageOut])
async def get_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.user_id == current_user.id)
        .order_by(ChatMessage.created_at.asc())
        .limit(100)
    )
    return result.scalars().all()


@router.delete("/history", status_code=204)
async def clear_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ChatMessage).where(ChatMessage.user_id == current_user.id)
    )
    for msg in result.scalars().all():
        await db.delete(msg)
    await db.commit()
