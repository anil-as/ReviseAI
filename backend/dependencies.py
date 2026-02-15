from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import SessionLocal
from auth import decode_token
import models


# Used to extract token from header
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/auth/login"
)


# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Get currently logged in user
def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):

    payload = decode_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

    user = db.query(models.User).filter(
        models.User.id == payload.get("user_id")
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return user


# Role checker
def require_role(role: str):

    def role_checker(user=Depends(get_current_user)):
        if user.role != role:
            raise HTTPException(
                status_code=403,
                detail="Access denied"
            )
        return user

    return role_checker