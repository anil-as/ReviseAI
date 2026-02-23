from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

import models
from dependencies import get_db, require_role

router = APIRouter(
    prefix="/analytics",
    tags=["Instructor Analytics"]
)
@router.get("/subject/{subject_id}")
def subject_analytics(
    subject_id: int,
    db: Session = Depends(get_db),
    instructor = Depends(require_role("instructor"))
):

    subject = db.query(models.Subject).filter(
        models.Subject.id == subject_id,
        models.Subject.created_by == instructor.id
    ).first()

    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    # Total enrolled students
    total_students = db.query(models.Enrollment).filter(
        models.Enrollment.subject_id == subject_id,
        models.Enrollment.status == "approved"
    ).count()

    # Average memory strength per topic
    topic_stats = db.query(
        models.Topic.title,
        func.avg(models.StudentTopicProgress.memory_strength)
    ).join(
        models.StudentTopicProgress,
        models.StudentTopicProgress.topic_id == models.Topic.id
    ).filter(
        models.Topic.subject_id == subject_id,
        models.Topic.is_deleted == False
    ).group_by(models.Topic.title).all()

    return {
        "subject": subject.title,
        "total_students": total_students,
        "topic_memory_average": [
            {
                "topic": title,
                "avg_memory_strength": round(avg or 0, 2)
            }
            for title, avg in topic_stats
        ]
    }
@router.get("/subject/{subject_id}")
def subject_analytics(
    subject_id: int,
    db: Session = Depends(get_db),
    instructor = Depends(require_role("instructor"))
):

    subject = db.query(models.Subject).filter(
        models.Subject.id == subject_id,
        models.Subject.created_by == instructor.id
    ).first()

    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    # Total enrolled students
    total_students = db.query(models.Enrollment).filter(
        models.Enrollment.subject_id == subject_id,
        models.Enrollment.status == "approved"
    ).count()

    # Average memory strength per topic
    topic_stats = db.query(
        models.Topic.title,
        func.avg(models.StudentTopicProgress.memory_strength)
    ).join(
        models.StudentTopicProgress,
        models.StudentTopicProgress.topic_id == models.Topic.id
    ).filter(
        models.Topic.subject_id == subject_id,
        models.Topic.is_deleted == False
    ).group_by(models.Topic.title).all()

    return {
        "subject": subject.title,
        "total_students": total_students,
        "topic_memory_average": [
            {
                "topic": title,
                "avg_memory_strength": round(avg or 0, 2)
            }
            for title, avg in topic_stats
        ]
    }