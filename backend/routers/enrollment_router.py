from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel

import models
from schemas import EnrollmentResponse
from dependencies import get_db, get_current_user

router = APIRouter(
    prefix="/enrollments",
    tags=["Enrollments"]
)


class EnrollmentRequest(BaseModel):
    student_name: str
    institution: str
    admission_number: str


# ----------------------------
# STUDENT: Request Enrollment
# ----------------------------
@router.post("/request/{subject_id}", response_model=EnrollmentResponse)
def request_enrollment(
    subject_id: int,
    body: EnrollmentRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
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
        student_name=body.student_name.strip(),
        institution=body.institution.strip(),
        admission_number=body.admission_number.strip(),
        status="pending"
    )

    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)

    return enrollment


# ----------------------------
# INSTRUCTOR: View Enrollments for a Subject
# ----------------------------
@router.get("/subject/{subject_id}", response_model=list[EnrollmentResponse])
def get_enrollments_for_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Returns all enrollment records for a given subject.
    Only the subject owner (instructor) can call this.
    Frontend filters by status=pending client-side.
    """
    subject = db.query(models.Subject).filter(
        models.Subject.id == subject_id,
        models.Subject.is_deleted == False
    ).first()

    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    if subject.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    enrollments = db.query(models.Enrollment).filter(
        models.Enrollment.subject_id == subject_id
    ).all()

    return enrollments


# ----------------------------
# INSTRUCTOR: Approve Enrollment
# ----------------------------
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

    if subject.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    enrollment.status = "approved"
    enrollment.approved_at = datetime.utcnow()
    db.commit()

    # Create topic progress records for the newly enrolled student
    topics = db.query(models.Topic).filter(
        models.Topic.subject_id == subject.id,
        models.Topic.is_deleted == False
    ).all()

    for topic in topics:
        # Avoid duplicate progress entries
        existing_progress = db.query(models.StudentTopicProgress).filter(
            models.StudentTopicProgress.student_id == enrollment.student_id,
            models.StudentTopicProgress.topic_id == topic.id
        ).first()

        if not existing_progress:
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


# ----------------------------
# STUDENT: Get My Enrollments
# ----------------------------
@router.get("/my")
def get_my_enrollments(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Returns all enrollment records for the currently logged-in student.
    Used by the EnrollPage to pre-populate the enrolled Set.
    """
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can view their enrollments")

    enrollments = db.query(models.Enrollment).filter(
        models.Enrollment.student_id == current_user.id
    ).all()

    return [
        {
            "id": e.id,
            "subject_id": e.subject_id,
            "status": e.status,
            "requested_at": e.requested_at.isoformat() if e.requested_at else None,
        }
        for e in enrollments
    ]


# ----------------------------
# INSTRUCTOR: Reject Enrollment
# ----------------------------
@router.post("/reject/{enrollment_id}")
def reject_enrollment(
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

    if subject.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    enrollment.status = "rejected"
    db.commit()

    return {"message": "Enrollment rejected"}


# ----------------------------
# STUDENT: Unenroll from Subject
# ----------------------------
@router.delete("/unenroll/{subject_id}")
def unenroll_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Allows a student to unenroll from a subject.
    Removes the enrollment and associated progress for that subject.
    """
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can unenroll")

    # Find the enrollment
    enrollment = db.query(models.Enrollment).filter(
        models.Enrollment.student_id == current_user.id,
        models.Enrollment.subject_id == subject_id
    ).first()

    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")

    # Delete related topic progress for this subject
    topics = db.query(models.Topic).filter(models.Topic.subject_id == subject_id).all()
    topic_ids = [t.id for t in topics]

    if topic_ids:
        db.query(models.StudentTopicProgress).filter(
            models.StudentTopicProgress.student_id == current_user.id,
            models.StudentTopicProgress.topic_id.in_(topic_ids)
        ).delete(synchronize_session=False)

    db.delete(enrollment)
    db.commit()

    return {"message": "Successfully unenrolled from the subject"}