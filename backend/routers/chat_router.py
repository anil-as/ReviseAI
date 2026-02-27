from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

import models
from dependencies import get_db, get_current_user

router = APIRouter(
    prefix="/chat",
    tags=["Chat"]
)


class MessageCreate(BaseModel):
    content: str


def _check_subject_access(subject_id: int, current_user, db: Session):
    """Verify user can access the chat for this subject (owner or enrolled student)."""
    subject = db.query(models.Subject).filter(
        models.Subject.id == subject_id,
        models.Subject.is_deleted == False
    ).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    if subject.created_by == current_user.id:
        return subject  # instructor / owner

    # Check enrollment
    enrollment = db.query(models.Enrollment).filter(
        models.Enrollment.subject_id == subject_id,
        models.Enrollment.student_id == current_user.id,
        models.Enrollment.status == "approved"
    ).first()
    if not enrollment:
        raise HTTPException(status_code=403, detail="Not authorized to access this chat")
    return subject


# ----------------------------
# GET MESSAGES (last 100)
# ----------------------------
@router.get("/{subject_id}")
def get_messages(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    _check_subject_access(subject_id, current_user, db)

    messages = db.query(models.ChatMessage).filter(
        models.ChatMessage.subject_id == subject_id,
        models.ChatMessage.is_deleted == False
    ).order_by(models.ChatMessage.created_at.asc()).limit(200).all()

    return [
        {
            "id": m.id,
            "content": m.content,
            "sender_id": m.sender_id,
            "sender_name": m.sender.name if m.sender else "Unknown",
            "sender_role": m.sender.role if m.sender else "student",
            "created_at": m.created_at.isoformat(),
            "is_own": m.sender_id == current_user.id,
        }
        for m in messages
    ]


# ----------------------------
# SEND MESSAGE
# ----------------------------
@router.post("/{subject_id}")
def send_message(
    subject_id: int,
    body: MessageCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    _check_subject_access(subject_id, current_user, db)

    if not body.content.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    msg = models.ChatMessage(
        subject_id=subject_id,
        sender_id=current_user.id,
        content=body.content.strip()
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    return {
        "id": msg.id,
        "content": msg.content,
        "sender_id": msg.sender_id,
        "sender_name": current_user.name,
        "sender_role": current_user.role,
        "created_at": msg.created_at.isoformat(),
        "is_own": True,
    }


# ----------------------------
# DELETE OWN MESSAGE
# ----------------------------
@router.delete("/message/{msg_id}")
def delete_message(
    msg_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    msg = db.query(models.ChatMessage).filter(
        models.ChatMessage.id == msg_id,
        models.ChatMessage.is_deleted == False
    ).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    if msg.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot delete another user's message")

    msg.is_deleted = True
    db.commit()
    return {"message": "Deleted"}


# ----------------------------
# LIST SUBJECTS FOR CHAT (sidebar)
# ----------------------------
@router.get("/subjects/list")
def get_chat_subjects(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Returns subjects the user has chat access to (owned or enrolled)."""
    if current_user.role == "instructor":
        subjects = db.query(models.Subject).filter(
            models.Subject.created_by == current_user.id,
            models.Subject.is_deleted == False
        ).all()
    else:
        enrollments = db.query(models.Enrollment).filter(
            models.Enrollment.student_id == current_user.id,
            models.Enrollment.status == "approved"
        ).all()
        subject_ids = [e.subject_id for e in enrollments]
        subjects = db.query(models.Subject).filter(
            models.Subject.id.in_(subject_ids),
            models.Subject.is_deleted == False
        ).all()

    return [
        {"id": s.id, "title": s.title, "is_public": s.is_public}
        for s in subjects
    ]
