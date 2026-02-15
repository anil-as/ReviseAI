from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from schemas import UserLogin
from dependencies import get_db
import models
from auth import verify_password, create_access_token

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):

    db_user = db.query(models.User).filter(
        models.User.email == user.email
    ).first()

    if not db_user:
        raise HTTPException(401, "Invalid credentials")

    if not verify_password(user.password, db_user.password):
        raise HTTPException(401, "Invalid credentials")

    token = create_access_token({
        "user_id": db_user.id,
        "role": db_user.role
    })

    return {"access_token": token}