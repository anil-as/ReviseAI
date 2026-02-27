from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

import models
from dependencies import get_db, require_role

router = APIRouter(
    prefix="/analytics",
    tags=["Instructor Analytics"]
)


# ----------------------------
# OVERALL SUBJECT ANALYTICS
# ----------------------------
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

    # Average memory strength per topic (across all students)
    topic_stats = db.query(
        models.Topic.title,
        models.Topic.id,
        func.avg(models.StudentTopicProgress.memory_strength),
        func.count(models.StudentTopicProgress.student_id)
    ).join(
        models.StudentTopicProgress,
        models.StudentTopicProgress.topic_id == models.Topic.id
    ).filter(
        models.Topic.subject_id == subject_id,
        models.Topic.is_deleted == False
    ).group_by(models.Topic.id, models.Topic.title).all()

    return {
        "subject": subject.title,
        "total_students": total_students,
        "topic_memory_average": [
            {
                "topic": title,
                "topic_id": tid,
                "avg_memory_strength": round(avg or 0, 2),
                "student_count": count
            }
            for title, tid, avg, count in topic_stats
        ]
    }


# ----------------------------
# LIST ENROLLED STUDENTS
# ----------------------------
@router.get("/subject/{subject_id}/students")
def get_enrolled_students(
    subject_id: int,
    db: Session = Depends(get_db),
    instructor = Depends(require_role("instructor"))
):
    """
    Returns list of approved-enrolled students for a subject.
    Used to populate the student filter dropdown on the analytics page.
    """
    subject = db.query(models.Subject).filter(
        models.Subject.id == subject_id,
        models.Subject.created_by == instructor.id
    ).first()

    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    enrollments = db.query(models.Enrollment).filter(
        models.Enrollment.subject_id == subject_id,
        models.Enrollment.status == "approved"
    ).all()

    return [
        {
            "student_id": e.student_id,
            "student_name": e.student_name or (e.student.name if e.student else "Unknown"),
            "institution": e.institution,
            "admission_number": e.admission_number,
        }
        for e in enrollments
    ]


# ----------------------------
# PER-STUDENT ANALYTICS
# ----------------------------
@router.get("/subject/{subject_id}/student/{student_id}")
def student_analytics(
    subject_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    instructor = Depends(require_role("instructor"))
):
    """
    Returns per-topic memory strength for a specific student in a subject.
    """
    subject = db.query(models.Subject).filter(
        models.Subject.id == subject_id,
        models.Subject.created_by == instructor.id
    ).first()

    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    # Verify the student is enrolled
    enrollment = db.query(models.Enrollment).filter(
        models.Enrollment.subject_id == subject_id,
        models.Enrollment.student_id == student_id,
        models.Enrollment.status == "approved"
    ).first()

    if not enrollment:
        raise HTTPException(status_code=404, detail="Student not enrolled in this subject")

    # Per-topic progress for this student
    topic_stats = db.query(
        models.Topic.title,
        models.Topic.id,
        models.StudentTopicProgress.memory_strength,
        models.StudentTopicProgress.last_revision_date,
        models.StudentTopicProgress.next_revision_date,
    ).join(
        models.StudentTopicProgress,
        (models.StudentTopicProgress.topic_id == models.Topic.id) &
        (models.StudentTopicProgress.student_id == student_id)
    ).filter(
        models.Topic.subject_id == subject_id,
        models.Topic.is_deleted == False
    ).all()

    return {
        "subject": subject.title,
        "student_name": enrollment.student_name or "Unknown",
        "topic_memory_average": [
            {
                "topic": title,
                "topic_id": tid,
                "avg_memory_strength": round(mem or 0, 2),
                "student_count": 1,
                "last_revision": last.isoformat() if last else None,
                "next_revision": nxt.isoformat() if nxt else None,
            }
            for title, tid, mem, last, nxt in topic_stats
        ]
    }