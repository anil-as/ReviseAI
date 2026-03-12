from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from PyPDF2 import PdfReader
import os
import shutil
import re

import models
from schemas import TopicResponse
from dependencies import get_db, get_current_user

router = APIRouter(
    prefix="/topics",
    tags=["Topics"]
)

# ----------------------------
# CREATE TOPIC (PDF Upload)
# ----------------------------
@router.post("/{subject_id}", response_model=TopicResponse)
def create_topic(
    subject_id: int,
    title: str = Form(...),
    topic_type: str = Form("theory"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    subject = db.query(models.Subject).filter(
        models.Subject.id == subject_id,
        models.Subject.is_deleted == False
    ).first()

    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    if subject.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Save file locally with a safe filename
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    safe_filename = re.sub(r'[^\w\-_\. ]', '_', file.filename or "upload.pdf")
    file_location = os.path.join(upload_dir, safe_filename)

    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Extract text from PDF (best-effort, don't crash if PDF is unreadable)
    extracted_text = ""
    try:
        reader = PdfReader(file_location)
        for page in reader.pages:
            extracted_text += page.extract_text() or ""
    except Exception:
        extracted_text = ""

    new_topic = models.Topic(
        title=title,
        topic_type=topic_type,
        subject_id=subject_id,
        file_path=file_location,
        extracted_text=extracted_text
    )

    db.add(new_topic)
    db.commit()
    db.refresh(new_topic)

    # Create progress
    if current_user.role == "student":
        progress = models.StudentTopicProgress(
            student_id=current_user.id,
            topic_id=new_topic.id,
            memory_strength=0.5,
            current_interval=1,
            last_revision_date=datetime.utcnow(),
            next_revision_date=datetime.utcnow() + timedelta(days=1),
        )
        db.add(progress)
        db.commit()

    if current_user.role == "instructor":
        enrollments = db.query(models.Enrollment).filter(
            models.Enrollment.subject_id == subject_id,
            models.Enrollment.status == "approved"
        ).all()

        for enrollment in enrollments:
            progress = models.StudentTopicProgress(
                student_id=enrollment.student_id,
                topic_id=new_topic.id,
                memory_strength=0.5,
                current_interval=1,
                last_revision_date=datetime.utcnow(),
                next_revision_date=datetime.utcnow() + timedelta(days=1),
            )
            db.add(progress)

        db.commit()

    return new_topic


# ----------------------------
# GET TOPICS BY SUBJECT
# ----------------------------
@router.get("/{subject_id}", response_model=list[TopicResponse])
def get_topics(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    subject = db.query(models.Subject).filter(
        models.Subject.id == subject_id,
        models.Subject.is_deleted == False
    ).first()

    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    # Access check
    if subject.created_by != current_user.id:
        enrollment = db.query(models.Enrollment).filter(
            models.Enrollment.subject_id == subject_id,
            models.Enrollment.student_id == current_user.id,
            models.Enrollment.status == "approved"
        ).first()

        if not enrollment:
            raise HTTPException(status_code=403, detail="Not authorized")

    topics = db.query(models.Topic).filter(
        models.Topic.subject_id == subject_id,
        models.Topic.is_deleted == False
    ).all()

    return topics


# ----------------------------
# UPDATE TOPIC
# ----------------------------
@router.put("/{topic_id}", response_model=TopicResponse)
def update_topic(
    topic_id: int,
    title: str,
    difficulty_level: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    topic = db.query(models.Topic).filter(
        models.Topic.id == topic_id,
        models.Topic.is_deleted == False
    ).first()

    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    subject = db.query(models.Subject).filter(
        models.Subject.id == topic.subject_id
    ).first()

    if subject.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    topic.title = title
    topic.difficulty_level = difficulty_level

    db.commit()
    db.refresh(topic)

    return topic


# ----------------------------
# DELETE TOPIC (Soft Delete)
# ----------------------------
@router.delete("/{topic_id}")
def delete_topic(
    topic_id: int,
    clear_data: bool = False,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    topic = db.query(models.Topic).filter(
        models.Topic.id == topic_id,
        models.Topic.is_deleted == False
    ).first()

    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    subject = db.query(models.Subject).filter(
        models.Subject.id == topic.subject_id
    ).first()

    if subject.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    topic.is_deleted = True

    if clear_data:
        db.query(models.StudentTopicProgress).filter(models.StudentTopicProgress.topic_id == topic_id).delete()
        db.query(models.AssessmentAttempt).filter(models.AssessmentAttempt.topic_id == topic_id).delete()
        db.query(models.GeneratedQuestion).filter(models.GeneratedQuestion.topic_id == topic_id).delete()

    db.commit()

    return {"message": "Topic deleted successfully", "cleared_data": clear_data}