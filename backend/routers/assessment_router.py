from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

import models
from schemas import AssessmentCreate, AssessmentResponse, AnswerEvaluationRequest, AnswerEvaluationResponse
from dependencies import get_db, get_current_user
from services.nlp_evaluator import evaluate_student_answer

router = APIRouter(
    prefix="/assessments",
    tags=["Assessments"]
)

# -------------------------------------------------------------------
# EVALUATE OPEN-ENDED ANSWER (NLP)
# -------------------------------------------------------------------
@router.post("/evaluate-answer", response_model=AnswerEvaluationResponse)
def evaluate_answer(
    data: AnswerEvaluationRequest,
    current_user=Depends(get_current_user),
):
    result = evaluate_student_answer(
        question=data.question,
        correct_answer=data.correct_answer,
        student_answer=data.student_answer
    )
    return result

# -------------------------------------------------------------------
# CREATE / RECORD A SINGLE ATTEMPT
# -------------------------------------------------------------------
@router.post("/", response_model=AssessmentResponse)
def create_assessment(
    data: AssessmentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    topic = db.query(models.Topic).filter(
        models.Topic.id == data.topic_id,
        models.Topic.is_deleted == False
    ).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    attempt = models.AssessmentAttempt(
        student_id=current_user.id,
        topic_id=data.topic_id,
        session_id=data.session_id,
        question_text=data.question_text,
        question_type=data.question_type,
        correct_answer=data.correct_answer,
        selected_answer=data.selected_answer,
        is_correct=data.is_correct,
        response_time=data.response_time,
        confidence_level=data.confidence_level,
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return attempt


# -------------------------------------------------------------------
# FINALIZE SESSION — score + update spaced-repetition schedule
# -------------------------------------------------------------------
@router.post("/finalize/{topic_id}/{session_id}")
def finalize_assessment(
    topic_id: int,
    session_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    attempts = db.query(models.AssessmentAttempt).filter(
        models.AssessmentAttempt.topic_id == topic_id,
        models.AssessmentAttempt.student_id == current_user.id,
        models.AssessmentAttempt.session_id == session_id,
    ).all()

    if not attempts:
        raise HTTPException(status_code=400, detail="No attempts found")

    total = len(attempts)
    correct_count = sum(1 for a in attempts if a.is_correct)
    accuracy = correct_count / total

    # Confidence scoring
    confidence_map = {"confident": 1.0, "unsure": 0.5, "guessing": 0.2}
    avg_confidence = sum(
        confidence_map.get(a.confidence_level, 0.5) for a in attempts
    ) / total

    # Speed scoring (expected 20s per question, capped at 1.0)
    avg_time = sum(a.response_time for a in attempts) / total
    expected_time = 20
    speed_score = min(1.0, expected_time / avg_time) if avg_time > 0 else 1.0

    # 🔥 Memory strength formula
    memory_strength = (
        0.5 * accuracy +
        0.3 * avg_confidence +
        0.2 * speed_score
    )

    # Spaced-repetition interval multiplier
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

    # Update student-topic progress
    progress = db.query(models.StudentTopicProgress).filter(
        models.StudentTopicProgress.topic_id == topic_id,
        models.StudentTopicProgress.student_id == current_user.id,
    ).first()
    if not progress:
        raise HTTPException(status_code=404, detail="Progress not found")

    previous_interval = progress.current_interval
    new_interval = max(1, min(int(previous_interval * factor), 60))

    next_revision = datetime.utcnow() + timedelta(days=new_interval)

    progress.memory_strength = memory_strength
    progress.current_interval = new_interval
    progress.last_revision_date = datetime.utcnow()
    progress.next_revision_date = next_revision
    progress.postpone_count = 0
    db.commit()

    # ----------------------------------------------------------------
    # Build per-question review for the results screen
    # ----------------------------------------------------------------
    question_review = [
        {
            "question": a.question_text,
            "question_type": a.question_type,
            "correct_answer": a.correct_answer,
            "selected_answer": a.selected_answer,
            "is_correct": a.is_correct,
            "response_time": round(a.response_time, 1),
            "confidence_level": a.confidence_level,
        }
        for a in attempts
    ]

    return {
        # Summary stats
        "accuracy": accuracy,
        "avg_confidence": avg_confidence,
        "speed_score": speed_score,
        "memory_strength": memory_strength,
        # Scheduling
        "new_interval_days": new_interval,
        "next_revision_date": next_revision.strftime("%B %d, %Y"),   # e.g. "March 05, 2026"
        "next_revision_iso": next_revision.date().isoformat(),        # "2026-03-05"
        # Per-question breakdown
        "question_review": question_review,
    }
