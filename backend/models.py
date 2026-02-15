# Column → used to define table columns
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime

# Base → imported from database.py
from database import Base
from sqlalchemy.orm import relationship
from datetime import datetime


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