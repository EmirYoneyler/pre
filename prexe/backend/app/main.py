import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, users, workouts, chat, plan
from app.api.deps import ensure_default_user


@asynccontextmanager
async def lifespan(app: FastAPI):
    await ensure_default_user()
    yield


app = FastAPI(title="COACHAI API", version="1.0.0", lifespan=lifespan)

# Allow localhost for dev and any Vercel deployment for production
allowed_origins = [
    "http://localhost:5173",
    os.getenv("FRONTEND_URL", ""),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in allowed_origins if o],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,     prefix="/api")
app.include_router(users.router,    prefix="/api")
app.include_router(workouts.router, prefix="/api")
app.include_router(chat.router,     prefix="/api")
app.include_router(plan.router,     prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}
