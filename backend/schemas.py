from datetime import datetime
from pydantic import BaseModel, EmailStr


# Used when user registers
class UserRegister(BaseModel):
    name: str
    email: EmailStr  # ensures valid email
    password: str
    role: str


# Used when user logs in
class UserLogin(BaseModel):
    email: EmailStr
    password: str


# Response format for token
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

# ----------------------------
# SUBJECT SCHEMAS
# ----------------------------

class SubjectCreate(BaseModel):
    title: str


class SubjectResponse(BaseModel):
    id: int
    title: str
    is_public: bool
    created_at: datetime

    class Config:
        orm_mode = True