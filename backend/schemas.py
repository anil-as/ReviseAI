from datetime import datetime
from pydantic import BaseModel, EmailStr

class Config:
    from_attributes = True
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


# ----------------------------
# ENROLLMENT SCHEMAS
# ----------------------------

class EnrollmentResponse(BaseModel):
    id: int
    student_id: int
    subject_id: int
    status: str
    requested_at: datetime

    class Config:
        orm_mode = True

# ----------------------------
# TOPIC SCHEMAS
# ----------------------------

class TopicCreate(BaseModel):
    title: str
    difficulty_level: int = 1


class TopicResponse(BaseModel):
    id: int
    title: str
    difficulty_level: int
    subject_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------------------
# ASSESSMENT SCHEMAS
# ----------------------------

class AssessmentCreate(BaseModel):
    topic_id: int
    session_id: str  
    question_text: str
    is_correct: bool
    response_time: float
    confidence_level: str


class AssessmentResponse(BaseModel):
    id: int
    topic_id: int
    is_correct: bool
    response_time: float
    confidence_level: str
    attempted_at: datetime

    class Config:
        from_attributes = True