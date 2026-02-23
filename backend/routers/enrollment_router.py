from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

import models
from schemas import EnrollmentResponse
from dependencies import get_db, get_current_user

router = APIRouter(
    prefix="/enrollments",
    tags=["Enrollments"]
)

@router.post("/request/{subject_id}", response_model=EnrollmentResponse)
def request_enrollment(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Only students can request
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can enroll")

    subject = db.query(models.Subject).filter(
        models.Subject.id == subject_id,
        models.Subject.is_public == True,
        models.Subject.is_deleted == False
    ).first()

    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    existing = db.query(models.Enrollment).filter(
        models.Enrollment.student_id == current_user.id,
        models.Enrollment.subject_id == subject_id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Already requested")

    enrollment = models.Enrollment(
        student_id=current_user.id,
        subject_id=subject_id,
        status="pending"
    )

    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)

    return enrollment

@router.post("/approve/{enrollment_id}")
def approve_enrollment(
    enrollment_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    enrollment = db.query(models.Enrollment).filter(
        models.Enrollment.id == enrollment_id
    ).first()

    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")

    subject = db.query(models.Subject).filter(
        models.Subject.id == enrollment.subject_id
    ).first()

    # Only subject owner (instructor) can approve
    if subject.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    enrollment.status = "approved"
    enrollment.approved_at = datetime.utcnow()

    db.commit()

    # 🔥 CREATE PROGRESS FOR ALL SUBJECT TOPICS
    topics = db.query(models.Topic).filter(
        models.Topic.subject_id == subject.id,
        models.Topic.is_deleted == False
    ).all()

    for topic in topics:
        progress = models.StudentTopicProgress(
            student_id=enrollment.student_id,
            topic_id=topic.id,
            memory_strength=0.5,
            current_interval=1,
            last_revision_date=datetime.utcnow(),
            next_revision_date=datetime.utcnow() + timedelta(days=1),
        )
        db.add(progress)

    db.commit()

    return {"message": "Enrollment approved"}

@router.post("/approve/{enrollment_id}")
def approve_enrollment(
    enrollment_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    enrollment = db.query(models.Enrollment).filter(
        models.Enrollment.id == enrollment_id
    ).first()

    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")

    subject = db.query(models.Subject).filter(
        models.Subject.id == enrollment.subject_id
    ).first()

    # Only subject owner (instructor) can approve
    if subject.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    enrollment.status = "approved"
    enrollment.approved_at = datetime.utcnow()

    db.commit()

    # 🔥 CREATE PROGRESS FOR ALL SUBJECT TOPICS
    topics = db.query(models.Topic).filter(
        models.Topic.subject_id == subject.id,
        models.Topic.is_deleted == False
    ).all()

    for topic in topics:
        progress = models.StudentTopicProgress(
            student_id=enrollment.student_id,
            topic_id=topic.id,
            memory_strength=0.5,
            current_interval=1,
            last_revision_date=datetime.utcnow(),
            next_revision_date=datetime.utcnow() + timedelta(days=1),
        )
        db.add(progress)

    db.commit()

    return {"message": "Enrollment approved"}