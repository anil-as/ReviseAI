from datetime import datetime
from typing import Optional
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
# USER PROFILE SCHEMAS
# ----------------------------

class UserProfileResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    institution: Optional[str] = None
    admission_number: Optional[str] = None
    profile_completed: bool

    class Config:
        from_attributes = True


class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    institution: Optional[str] = None
    admission_number: Optional[str] = None



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
        from_attributes = True


# ----------------------------
# ENROLLMENT SCHEMAS
# ----------------------------

class EnrollmentResponse(BaseModel):
    id: int
    student_id: int
    subject_id: int
    student_name: Optional[str] = None
    institution: Optional[str] = None
    admission_number: Optional[str] = None
    status: str
    requested_at: datetime

    class Config:
        from_attributes = True

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
    file_path: Optional[str] = None
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
    question_type: str = "mcq"
    correct_answer: str
    selected_answer: str
    is_correct: bool
    response_time: float
    confidence_level: str


class AssessmentResponse(BaseModel):
    id: int
    topic_id: int
    question_text: str
    question_type: Optional[str] = None
    correct_answer: Optional[str] = None
    selected_answer: Optional[str] = None
    is_correct: bool
    response_time: float
    confidence_level: str
    attempted_at: datetime

    class Config:
        from_attributes = True

class AnswerEvaluationRequest(BaseModel):
    question: str
    correct_answer: str
    student_answer: str

class AnswerEvaluationResponse(BaseModel):
    is_correct: bool
    feedback: str
