from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import SessionLocal
import models
from schemas import UserLogin
from auth import verify_password, create_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(
        models.User.email == user.email
    ).first()

    if not db_user:
        return {"error": "Invalid credentials"}

    if not verify_password(user.password, db_user.password):
        return {"error": "Invalid credentials"}

    token = create_token({
        "user_id": db_user.id,
        "role": db_user.role,
        "profile_completed": db_user.profile_completed
    })

    return {
        "token": token,
        "name": db_user.name,
        "role": db_user.role,
        "profile_completed": db_user.profile_completed
    }
