from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
from services.question_generator import generate_questions_from_text
from dependencies import get_db, get_current_user

router = APIRouter(
    prefix="/questions",
    tags=["Question Engine"]
)

@router.get("/generate/{topic_id}")
def generate_questions(
    topic_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    topic = db.query(models.Topic).filter(
        models.Topic.id == topic_id,
        models.Topic.is_deleted == False
    ).first()

    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    if not topic.extracted_text:
        raise HTTPException(status_code=400, detail="No extracted content")

    questions = generate_questions_from_text(topic.extracted_text)

    return questions