from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from schemas import UserRegister, UserProfileResponse, UserProfileUpdate
from dependencies import get_db, get_current_user
import models
from auth import hash_password

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)


# ----------------------------
# REGISTER
# ----------------------------
@router.post("/register")
def register(user: UserRegister, db: Session = Depends(get_db)):

    existing_user = db.query(models.User).filter(
        models.User.email == user.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    new_user = models.User(
        name=user.name,
        email=user.email,
        password=hash_password(user.password),
        role=user.role
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "User registered successfully"}


# ----------------------------
# GET MY PROFILE
# ----------------------------
@router.get("/me", response_model=UserProfileResponse)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ----------------------------
# UPDATE MY PROFILE
# ----------------------------
@router.patch("/me", response_model=UserProfileResponse)
def update_my_profile(
    body: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if body.name is not None and body.name.strip():
        user.name = body.name.strip()
    if body.institution is not None:
        user.institution = body.institution.strip() or None
    if body.admission_number is not None:
        user.admission_number = body.admission_number.strip() or None

    # Mark profile as completed if core fields are set
    if user.institution and user.admission_number:
        user.profile_completed = True

    db.commit()
    db.refresh(user)
    return user