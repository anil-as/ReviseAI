from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from collections import Counter

import models
from schemas import AssessmentCreate, AssessmentResponse, AnswerEvaluationRequest, AnswerEvaluationResponse
from dependencies import get_db, get_current_user
from services.nlp_evaluator import evaluate_student_answer

router = APIRouter(
    prefix="/assessments",
    tags=["Assessments"]
)

# -------------------------------------------------------------------
# SCHEDULING CONSTANTS
# -------------------------------------------------------------------
REVISION_DAILY_CAP     = 3   # max revision events allowed on a single day
ASSESSMENT_GAP         = 1   # days between revision and assessment
MAX_SHIFT_HIGH_PRI     = 3   # max forward-shift (days) for weak topics  (memory < 0.4)
MAX_SHIFT_MED_PRI      = 6   # max forward-shift for medium topics       (0.4 ≤ mem < 0.6)
MAX_SHIFT_LOW_PRI      = 10  # max forward-shift for strong topics       (mem ≥ 0.6)

# -------------------------------------------------------------------
# SMART SCHEDULING HELPER
# -------------------------------------------------------------------
def _smart_schedule(
    db: Session,
    user_id: int,
    base_date,          # datetime.date — ideal revision date from SR interval
    memory_strength: float,
    topic_id: int,
    topic_title: str,
    base_datetime: datetime,  # full datetime for time-of-day preservation
) -> tuple:
    """
    Find the best available revision date for a topic, respecting:
    - Daily revision cap (REVISION_DAILY_CAP topics per day max)
    - Priority: high-priority / weak topics shift ≤ MAX_SHIFT_HIGH_PRI days so
      they are reviewed promptly; easy topics can shift further.
    - Separate assessment date = revision_date + ASSESSMENT_GAP days.

    Returns (revision_datetime, assessment_datetime).
    """
    # Determine max shift for this topic based on memory strength
    if memory_strength < 0.4:
        max_shift = MAX_SHIFT_HIGH_PRI
    elif memory_strength < 0.6:
        max_shift = MAX_SHIFT_MED_PRI
    else:
        max_shift = MAX_SHIFT_LOW_PRI

    candidate = base_date

    for _ in range(max_shift + 1):
        # Count ONLY revision events (identified by emoji prefix) on candidate day
        revision_count = db.query(models.CalendarEvent).filter(
            models.CalendarEvent.user_id == user_id,
            models.CalendarEvent.date == candidate.isoformat(),
            models.CalendarEvent.title.like("📅 Revise:%"),
        ).count()

        if revision_count < REVISION_DAILY_CAP:
            break  # found a slot

        candidate = candidate + timedelta(days=1)
    # If all slots within max_shift are full, candidate stays at base_date + max_shift
    # (graceful degradation – we place it anyway)

    # Build full datetimes (keep the original time-of-day)
    revision_dt = datetime(
        candidate.year, candidate.month, candidate.day,
        base_datetime.hour, base_datetime.minute, base_datetime.second
    )
    assessment_date = candidate + timedelta(days=ASSESSMENT_GAP)
    assessment_dt = datetime(
        assessment_date.year, assessment_date.month, assessment_date.day,
        base_datetime.hour, base_datetime.minute, base_datetime.second
    )

    # ---- Calendar events ------------------------------------------------
    # Remove old revision + assessment events for this specific topic
    db.query(models.CalendarEvent).filter(
        models.CalendarEvent.user_id == user_id,
        models.CalendarEvent.title.in_([
            f"📅 Revise: {topic_title}",
            f"📝 Assess: {topic_title}",
        ])
    ).delete(synchronize_session=False)

    # Revision event
    db.add(models.CalendarEvent(
        user_id=user_id,
        date=candidate.isoformat(),
        title=f"📅 Revise: {topic_title}",
        color="#6366f1",
    ))

    # Assessment event (separate day)
    db.add(models.CalendarEvent(
        user_id=user_id,
        date=assessment_date.isoformat(),
        title=f"📝 Assess: {topic_title}",
        color="#f59e0b",
    ))

    db.commit()
    return revision_dt, assessment_dt


# -------------------------------------------------------------------
# ASSESSMENT INFO — question types & estimated time (for instruction screen)
# -------------------------------------------------------------------
_TYPE_TIMES = {
    "mcq": 45, "true_false": 20, "fill_blank": 60, "short_answer": 90,
    "long_answer": 180, "diagram_question": 120, "figure_explain": 120,
    "code_question": 180, "application": 90, "cunning": 60,
}

@router.get("/info/{topic_id}")
def get_assessment_info(
    topic_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Returns info about the generated questions for the instruction screen.
    Uses cached generated questions if available, otherwise estimates from text length.
    """
    questions = db.query(models.GeneratedQuestion).filter(
        models.GeneratedQuestion.topic_id == topic_id
    ).all()

    if questions:
        type_counts = Counter(q.question_type for q in questions)
        total = len(questions)
        estimated_seconds = sum(_TYPE_TIMES.get(t, 60) * c for t, c in type_counts.items())
    else:
        # Fallback: estimate from text length
        topic = db.query(models.Topic).filter(
            models.Topic.id == topic_id,
            models.Topic.is_deleted == False
        ).first()
        if not topic:
            raise HTTPException(status_code=404, detail="Topic not found")
        text_len = len(topic.extracted_text or "")
        total = max(5, min(20, text_len // 500))
        type_counts = {"mcq": max(2, total // 2), "short_answer": max(1, total // 4), "true_false": max(1, total // 4)}
        estimated_seconds = total * 60

    minutes = max(1, round(estimated_seconds / 60))
    type_labels = {
        "mcq": "Multiple Choice", "true_false": "True / False",
        "fill_blank": "Fill in the Blank", "short_answer": "Short Answer",
        "long_answer": "Long Answer", "diagram_question": "Diagram / Flowchart",
        "figure_explain": "Figure Explanation", "code_question": "Code Challenge",
        "application": "Apply the Concept", "cunning": "Think Carefully!",
    }
    question_types = [
        {"type": t, "label": type_labels.get(t, t.replace("_", " ").title()), "count": c}
        for t, c in type_counts.items() if c > 0
    ]

    # Check scheduling — use next_assessment_date if available, else fall back to next_revision_date
    today = datetime.utcnow().date()
    progress = db.query(models.StudentTopicProgress).filter(
        models.StudentTopicProgress.topic_id == topic_id,
        models.StudentTopicProgress.student_id == current_user.id,
    ).first()

    can_take_today = True  # default: always allow if no schedule set
    next_assessment_date = None
    days_until = None

    if progress:
        # Prefer the dedicated assessment date; fall back to revision date
        sched_date = (progress.next_assessment_date or progress.next_revision_date)
        if sched_date:
            assessment_date = sched_date.date()
            days_until = (assessment_date - today).days
            can_take_today = days_until <= 1
            next_assessment_date = assessment_date.isoformat()

    return {
        "total_questions": total,
        "estimated_minutes": minutes,
        "question_types": question_types,
        "can_take_today": can_take_today,
        "next_assessment_date": next_assessment_date,
        "days_until": days_until,
    }

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

    now = datetime.utcnow()
    raw_next_revision = now + timedelta(days=new_interval)

    progress.memory_strength = memory_strength
    progress.current_interval = new_interval
    progress.last_revision_date = now
    progress.postpone_count = 0
    db.commit()

    # ----------------------------------------------------------------
    # Smart calendar scheduling (load-balanced + priority-aware)
    # ----------------------------------------------------------------
    topic_obj = db.query(models.Topic).filter(models.Topic.id == topic_id).first()
    topic_title_str = topic_obj.title if topic_obj else f"Topic {topic_id}"

    try:
        revision_dt, assessment_dt = _smart_schedule(
            db=db,
            user_id=current_user.id,
            base_date=raw_next_revision.date(),
            memory_strength=memory_strength,
            topic_id=topic_id,
            topic_title=topic_title_str,
            base_datetime=raw_next_revision,
        )

        progress.next_revision_date = revision_dt
        progress.next_assessment_date = assessment_dt
        db.commit()

    except Exception:
        # Scheduling is best-effort — fall back to raw dates
        progress.next_revision_date = raw_next_revision
        progress.next_assessment_date = raw_next_revision + timedelta(days=ASSESSMENT_GAP)
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

    next_revision = progress.next_revision_date
    next_assessment = progress.next_assessment_date

    return {
        # Summary stats
        "accuracy": accuracy,
        "avg_confidence": avg_confidence,
        "speed_score": speed_score,
        "memory_strength": memory_strength,
        # Scheduling
        "new_interval_days": new_interval,
        "next_revision_date": next_revision.strftime("%B %d, %Y"),
        "next_revision_iso": next_revision.date().isoformat(),
        "next_assessment_date": next_assessment.strftime("%B %d, %Y"),
        "next_assessment_iso": next_assessment.date().isoformat(),
        # Per-question breakdown
        "question_review": question_review,
    }
