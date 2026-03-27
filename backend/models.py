# Column → used to define table columns
from sqlalchemy import Column, Float, Integer, String, Boolean, ForeignKey, DateTime

# Base → imported from database.py
from database import Base
from sqlalchemy.orm import relationship
from datetime import datetime
from sqlalchemy import UniqueConstraint

# Create a class named User
# This represents a table in database
class User(Base):

    # __tablename__ → name of table in DB
    __tablename__ = "users"

    # id column
    id = Column(Integer, primary_key=True, index=True)
    # Integer → number
    # primary_key=True → unique identifier
    # index=True → faster search

    # name column
    name = Column(String, nullable=False)
    # String → text
    # nullable=False → cannot be empty

    # email column
    email = Column(String, unique=True, index=True, nullable=False)
    # unique=True → no duplicate emails allowed

    # password column
    password = Column(String, nullable=False)
    # stores hashed password

    # role column
    role = Column(String, nullable=False)
    # student or instructor

    # Extended profile fields (optional, set after registration)
    institution = Column(String, nullable=True)
    admission_number = Column(String, nullable=True)

    # profile_completed column
    profile_completed = Column(Boolean, default=False)
    # Boolean → True / False

# ----------------------------
# SUBJECT MODEL
# ----------------------------


class Subject(Base):
    """
    Represents a subject.

    Can be:
    - Private (created by student)
    - Public (created by instructor)
    """

    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String, nullable=False)

    # Foreign key linking subject to user
    created_by = Column(Integer, ForeignKey("users.id"))

    # If instructor created → public
    # If student created → private
    is_public = Column(Boolean, default=False)

    # Soft delete flag
    is_deleted = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship to access creator info
    owner = relationship("User")

# ----------------------------
# TOPIC MODEL
# ----------------------------

# ----------------------------
# ENROLLMENT MODEL
# ----------------------------

class Enrollment(Base):
    """
    Tracks student enrollment requests and approvals for public subjects.
    """
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True)

    student_id = Column(Integer, ForeignKey("users.id"))
    subject_id = Column(Integer, ForeignKey("subjects.id"))

    # Student details submitted at enrollment time
    student_name = Column(String, nullable=True)
    institution = Column(String, nullable=True)
    admission_number = Column(String, nullable=True)

    # pending | approved | rejected
    status = Column(String, default="pending")

    requested_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)

    student = relationship("User", foreign_keys=[student_id])
    subject = relationship("Subject")


class Topic(Base):

    __tablename__ = "topics"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String, nullable=False)

    subject_id = Column(Integer, ForeignKey("subjects.id"))

    topic_type = Column(String, default="theory")

    file_path = Column(String, nullable=True)
    extracted_text = Column(String, nullable=True)

    is_deleted = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    subject = relationship("Subject")

# ----------------------------
# STUDENT TOPIC PROGRESS MODEL
# ----------------------------

class StudentTopicProgress(Base):
    """
    Tracks memory state of a topic for each student.
    This is the cognitive brain of the system.
    """

    __tablename__ = "student_topic_progress"

    __table_args__ = (
        UniqueConstraint("student_id", "topic_id", name="unique_student_topic"),
    )

    id = Column(Integer, primary_key=True, index=True)

    student_id = Column(Integer, ForeignKey("users.id"))
    topic_id = Column(Integer, ForeignKey("topics.id"))

    memory_strength = Column(Float, default=0.5)

    current_interval = Column(Integer, default=1)  # in days

    last_revision_date = Column(DateTime, nullable=True)
    next_revision_date = Column(DateTime, nullable=True)
    next_assessment_date = Column(DateTime, nullable=True)  # revision first, then assess

    postpone_count = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    student = relationship("User")
    topic = relationship("Topic")

# ----------------------------
# ASSESSMENT ATTEMPT MODEL
# ----------------------------

class AssessmentAttempt(Base):

    __tablename__ = "assessment_attempts"

    id = Column(Integer, primary_key=True, index=True)

    student_id = Column(Integer, ForeignKey("users.id"))
    topic_id = Column(Integer, ForeignKey("topics.id"))

    session_id = Column(String, index=True)

    question_text = Column(String, nullable=False)
    question_type = Column(String, nullable=True)   # mcq | true_false | wh_mcq | statement_mcq
    correct_answer = Column(String, nullable=True)  # the right answer
    selected_answer = Column(String, nullable=True) # what the student chose
    is_correct = Column(Boolean, nullable=False)
    response_time = Column(Float)
    confidence_level = Column(String)

    attempted_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("User")
    topic = relationship("Topic")

class GeneratedQuestion(Base):

    __tablename__ = "generated_questions"

    id = Column(Integer, primary_key=True, index=True)

    topic_id = Column(Integer, ForeignKey("topics.id"))

    question_text = Column(String, nullable=False)

    question_type = Column(String)  
    # mcq / understanding / trap / application

    correct_answer = Column(String)

    created_at = Column(DateTime, default=datetime.utcnow)

    topic = relationship("Topic")


# ----------------------------
# CALENDAR EVENT MODEL
# ----------------------------
class CalendarEvent(Base):
    """User-created calendar markers/plans (personal, for any role)."""
    __tablename__ = "calendar_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(String, nullable=False)    # ISO date "2026-02-28"
    title = Column(String, nullable=False)
    color = Column(String, default="#6366f1")

    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User")


# ----------------------------
# CHAT MESSAGE MODEL
# ----------------------------
class ChatMessage(Base):
    """Per-subject chat messages between enrolled students and instructor."""
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(String, nullable=False)
    is_deleted = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    sender = relationship("User")
    subject = relationship("Subject")
