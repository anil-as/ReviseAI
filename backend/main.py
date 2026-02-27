from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from database import engine
import models
import nltk

# Download required NLTK data packages (idempotent — skips if already present)
for _pkg in ["punkt", "punkt_tab", "averaged_perceptron_tagger",
             "averaged_perceptron_tagger_eng", "maxent_ne_chunker",
             "maxent_ne_chunker_tab", "words"]:
    nltk.download(_pkg, quiet=True)

from routers.auth_router import router as auth_router
from routers.dashboard_router import router as dashboard_router
from routers.user_router import router as user_router
from routers.subject_router import router as subject_router
from routers.enrollment_router import router as enrollment_router
from routers.topic_router import router as topic_router
from routers.assessment_router import router as assessment_router
from routers.instructor_analytics_router import router as analytics_router
from routers.question_router import router as question_router
from routers.chat_router import router as chat_router
from services.reminder_scheduler import start_scheduler

# create database tables
models.Base.metadata.create_all(bind=engine)

# create app
app = FastAPI(title="ReviseAI API")


# ─────────────────────────────────────────────────────────────
#  Custom CORS middleware that ALWAYS injects CORS headers,
#  even on unhandled 500 errors (Starlette's built-in one misses
#  those when exceptions bubble up past it).
# ─────────────────────────────────────────────────────────────
class AlwaysCORSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
        except Exception as exc:
            response = JSONResponse(
                status_code=500,
                content={"detail": str(exc)},
            )
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
        return response


app.add_middleware(AlwaysCORSMiddleware)

# keep the built-in one for preflight OPTIONS requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(user_router)
app.include_router(subject_router)
app.include_router(enrollment_router)
app.include_router(topic_router)
app.include_router(assessment_router)
app.include_router(analytics_router)
app.include_router(question_router)
app.include_router(chat_router)

import os
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
def root():
    return {"message": "Backend Running"}

start_scheduler()