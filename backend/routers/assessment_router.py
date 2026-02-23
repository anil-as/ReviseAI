from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

import models
from schemas import AssessmentCreate, AssessmentResponse
from dependencies import get_db, get_current_user

router = APIRouter(
    prefix="/assessments",
    tags=["Assessments"]
)
@router.post("/", response_model=AssessmentResponse)
def create_assessment(
    data: AssessmentCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    # Verify topic access
    topic = db.query(models.Topic).filter(
        models.Topic.id == data.topic_id,
        models.Topic.is_deleted == False
    ).first()

    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    attempt = models.AssessmentAttempt(
        student_id=current_user.id,
        topic_id=data.topic_id,
        question_text=data.question_text,
        is_correct=data.is_correct,
        response_time=data.response_time,
        confidence_level=data.confidence_level,
        attempted_at=datetime.utcnow()
    )

    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    return attempt

@router.post("/finalize/{topic_id}")
def finalize_assessment(
    topic_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    # Get all attempts for this topic by student
    attempts = db.query(models.AssessmentAttempt).filter(
        models.AssessmentAttempt.topic_id == topic_id,
        models.AssessmentAttempt.student_id == current_user.id
    ).all()

    if not attempts:
        raise HTTPException(status_code=400, detail="No attempts found")

    total_questions = len(attempts)
    correct_answers = sum(1 for a in attempts if a.is_correct)

    accuracy = correct_answers / total_questions

    # Confidence scoring
    confidence_map = {
        "confident": 1.0,
        "unsure": 0.5,
        "guessing": 0.2
    }

    avg_confidence = sum(
        confidence_map.get(a.confidence_level, 0.5)
        for a in attempts
    ) / total_questions

    # Speed scoring (simple normalization)
    avg_time = sum(a.response_time for a in attempts) / total_questions

    expected_time = 20  # default expected seconds
    speed_score = min(1.0, expected_time / avg_time)

    # 🔥 MEMORY STRENGTH FORMULA
    memory_strength = (
        0.5 * accuracy +
        0.3 * avg_confidence +
        0.2 * speed_score
    )

    # Get student topic progress
    progress = db.query(models.StudentTopicProgress).filter(
        models.StudentTopicProgress.topic_id == topic_id,
        models.StudentTopicProgress.student_id == current_user.id
    ).first()

    if not progress:
        raise HTTPException(status_code=404, detail="Progress not found")

    previous_interval = progress.current_interval

    # 🔥 MULTIPLICATIVE INTERVAL LOGIC
    if memory_strength >= 0.8:
        factor = 1.8
    elif memory_strength >= 0.6:
        factor = 1.4
    elif memory_strength >= 0.4:
        factor = 1.1
    elif memory_strength >= 0.2:
        factor = 0.7
    else:
        factor = 0.5

    new_interval = int(previous_interval * factor)

    # Clamp interval
    new_interval = max(1, min(new_interval, 60))

    # Update progress
    progress.memory_strength = memory_strength
    progress.current_interval = new_interval
    progress.last_revision_date = datetime.utcnow()
    progress.next_revision_date = datetime.utcnow() + timedelta(days=new_interval)
    progress.postpone_count = 0  # reset postponement

    db.commit()

    return {
        "accuracy": accuracy,
        "avg_confidence": avg_confidence,
        "speed_score": speed_score,
        "memory_strength": memory_strength,
        "new_interval_days": new_interval
    }

