# COACHAI

AI-powered fitness coach. MediaPipe runs in the browser (zero webcam lag), FastAPI handles AI calls, PostgreSQL stores everything.

---

## Project structure

```
coachai/
├── backend/          FastAPI + SQLAlchemy + OpenAI
└── frontend/         React + Vite + MediaPipe JS + Tailwind
```

---

## 1. Database setup

```bash
psql -U postgres
CREATE DATABASE coachai;
\q
```

---

## 2. Backend setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL password and OPENAI_API_KEY

# Run migrations
alembic init alembic            # only first time if alembic/ folder missing
alembic revision --autogenerate -m "initial"
alembic upgrade head

# Start the API server
uvicorn app.main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

---

## 3. Frontend setup

```bash
cd frontend

npm install
npm run dev
```

App available at: http://localhost:5173

---

## 4. Environment variables

### backend/.env

| Variable | Description |
|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://postgres:PASSWORD@localhost:5432/coachai` |
| `SECRET_KEY` | Any long random string (use `openssl rand -hex 32`) |
| `OPENAI_API_KEY` | Your OpenAI API key |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Default: 30 |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Default: 30 |

---

## API endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, get tokens |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Invalidate refresh token |
| GET  | `/api/users/me` | Get current user profile |
| PATCH | `/api/users/me` | Update profile |
| POST | `/api/workouts` | Save a completed set |
| GET  | `/api/workouts` | List workout history |
| POST | `/api/workouts/analyze` | Analyze form with GPT-4o-mini |
| GET  | `/api/workouts/exercises` | List all exercises |
| POST | `/api/workouts/exercises` | Create custom exercise |
| POST | `/api/workouts/exercises/generate?name=X` | AI-generate exercise config |
| POST | `/api/chat` | Send message to coach |
| GET  | `/api/chat/history` | Load chat history |
| DELETE | `/api/chat/history` | Clear chat history |
| POST | `/api/plan` | Generate nutrition + workout plan |

---

## How the webcam works (zero lag)

MediaPipe Pose runs as WebAssembly **inside the browser** via `@mediapipe/tasks-vision`. No video frames are ever sent to the server. The backend only receives small JSON payloads (joint angles + rep counts) after a set is complete.

This is why the original Streamlit prototype had lag — every frame was sent to Python. This architecture eliminates that entirely.

---

## Deployment

**Frontend** → Vercel  
```bash
cd frontend && npm run build
# Deploy dist/ to Vercel
```

**Backend + DB** → Railway or Render  
- Add `Procfile`: `web: uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Set env vars in the dashboard
- Update `allow_origins` in `main.py` to your Vercel domain
