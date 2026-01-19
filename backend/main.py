from fastapi import FastAPI
from database import engine
import models

from routers.auth_router import router as auth_router
from routers.user_router import router as user_router

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="ReviseAI API")

app.include_router(auth_router)
app.include_router(user_router)

@app.get("/")
def root():
    return {"message": "ReviseAI backend running"}
