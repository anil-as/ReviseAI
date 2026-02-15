from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from dependencies import get_db, get_current_user
import models
from schemas import SubjectCreate, SubjectResponse

router = APIRouter(
    prefix="/subjects",
    tags=["Subjects"]
)


# ----------------------------
# CREATE SUBJECT
# ----------------------------
@router.post("/", response_model=SubjectResponse)
def create_subject(
    subject: SubjectCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Create a subject.

    - If student creates → private
    - If instructor creates → public
    """

    new_subject = models.Subject(
        title=subject.title,
        created_by=current_user.id,
        is_public=True if current_user.role == "instructor" else False
    )

    db.add(new_subject)
    db.commit()
    db.refresh(new_subject)

    return new_subject


# ----------------------------
# GET MY SUBJECTS
# ----------------------------
@router.get("/my", response_model=list[SubjectResponse])
def get_my_subjects(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Returns subjects created by current user.
    """

    subjects = db.query(models.Subject).filter(
        models.Subject.created_by == current_user.id,
        models.Subject.is_deleted == False
    ).all()

    return subjects


# ----------------------------
# GET PUBLIC SUBJECTS
# ----------------------------
@router.get("/public", response_model=list[SubjectResponse])
def get_public_subjects(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Returns instructor-created public subjects.
    """

    subjects = db.query(models.Subject).filter(
        models.Subject.is_public == True,
        models.Subject.is_deleted == False
    ).all()

    return subjects

# ----------------------------
# UPDATE SUBJECT
# ----------------------------
@router.put("/{subject_id}", response_model=SubjectResponse)
def update_subject(
    subject_id: int,
    subject_data: SubjectCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Only owner can update subject.
    """

    subject = db.query(models.Subject).filter(
        models.Subject.id == subject_id,
        models.Subject.is_deleted == False
    ).first()

    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    if subject.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    subject.title = subject_data.title

    db.commit()
    db.refresh(subject)

    return subject

# ----------------------------
# DELETE SUBJECT (Soft Delete)
# ----------------------------
@router.delete("/{subject_id}")
def delete_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Soft delete subject.
    """

    subject = db.query(models.Subject).filter(
        models.Subject.id == subject_id,
        models.Subject.is_deleted == False
    ).first()

    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    if subject.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    subject.is_deleted = True

    db.commit()

    return {"message": "Subject deleted successfully"}