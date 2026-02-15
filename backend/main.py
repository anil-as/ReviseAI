from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine
import models

from routers.auth_router import router as auth_router
from routers.dashboard_router import router as dashboard_router
from routers.user_router import router as user_router
from routers.subject_router import router as subject_router

# create database tables
models.Base.metadata.create_all(bind=engine)

# create app
app = FastAPI(title="ReviseAI API")

# allow frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# include routers
app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(user_router)
app.include_router(subject_router)


@app.get("/")
def root():
    return {"message": "Backend Running"}