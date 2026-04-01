from fastapi import APIRouter, Depends
from dependencies import require_role
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime,timedelta
import models
from dependencies import get_db, get_current_user
from sqlalchemy.orm import joinedload

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)



@router.get("/student")
def student_dashboard(
    user=Depends(require_role("student"))
):
    return {
        "message": f"Welcome Student {user.name}"
    }


@router.get("/instructor")
def instructor_dashboard(
    user=Depends(require_role("instructor"))
):
    return {
        "message": f"Welcome Instructor {user.name}"
    }

@router.get("/revisions")
def get_revision_dashboard(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    if current_user.role != "student":
        return {"message": "Dashboard only for students"}

    progress_list = db.query(models.StudentTopicProgress)\
        .options(joinedload(models.StudentTopicProgress.topic))\
        .filter(models.StudentTopicProgress.student_id == current_user.id)\
        .all()

    today = datetime.utcnow().date()

    dashboard_data = []

    for progress in progress_list:

        topic = progress.topic

        if not topic or topic.is_deleted:
            continue

        next_date = progress.next_revision_date.date()

        if next_date < today:
            status = "overdue"
            priority = 1
        elif next_date == today:
            status = "due_today"
            priority = 2
        else:
            status = "upcoming"
            priority = 3

        # ── Estimated revision time (based on text length) ──────────────
        text_len = len(topic.extracted_text or "")
        word_count = text_len // 5  # rough chars-to-words
        base_minutes = max(5, min(60, round(word_count / 200)))
        # Harder memory → more time needed
        mem = progress.memory_strength or 0.5
        estimated_minutes = max(5, round(base_minutes * (1 + (1 - mem) * 0.5)))

        # ── Focus areas: question types with < 60% accuracy in last session ──
        # Find last session_id for this student × topic
        last_attempt = db.query(models.AssessmentAttempt)\
            .filter(
                models.AssessmentAttempt.student_id == current_user.id,
                models.AssessmentAttempt.topic_id == topic.id,
            )\
            .order_by(models.AssessmentAttempt.attempted_at.desc())\
            .first()

        focus_areas = []
        if last_attempt:
            # Get all attempts in that last session
            last_session_attempts = db.query(models.AssessmentAttempt)\
                .filter(
                    models.AssessmentAttempt.student_id == current_user.id,
                    models.AssessmentAttempt.topic_id == topic.id,
                    models.AssessmentAttempt.session_id == last_attempt.session_id,
                ).all()
            # Group by type and calculate accuracy
            from collections import defaultdict
            type_stats = defaultdict(lambda: {"correct": 0, "total": 0})
            type_labels = {
                "mcq": "Multiple Choice", "true_false": "True / False",
                "fill_blank": "Fill in Blank", "short_answer": "Short Answer",
                "long_answer": "Long Answer", "diagram_question": "Diagrams",
                "figure_explain": "Figures", "code_question": "Coding",
                "application": "Application", "cunning": "Tricky Questions",
            }
            for a in last_session_attempts:
                t = a.question_type or "mcq"
                type_stats[t]["total"] += 1
                if a.is_correct:
                    type_stats[t]["correct"] += 1
            for qtype, stats in type_stats.items():
                acc = stats["correct"] / stats["total"] if stats["total"] > 0 else 0
                if acc < 0.6:
                    focus_areas.append(type_labels.get(qtype, qtype.replace("_", " ").title()))

        # Check enrollment for this topic's subject
        subject = db.query(models.Subject).filter(
            models.Subject.id == topic.subject_id,
            models.Subject.is_deleted == False
        ).first()
        is_enrolled = False
        if subject and subject.is_public:
            enrollment = db.query(models.Enrollment).filter(
                models.Enrollment.subject_id == topic.subject_id,
                models.Enrollment.student_id == current_user.id,
                models.Enrollment.status == "approved"
            ).first()
            is_enrolled = enrollment is not None

        dashboard_data.append({
            "topic_id": topic.id,
            "topic_title": topic.title,
            "topic_file_path": topic.file_path,
            "subject_id": topic.subject_id,
            "subject_title": subject.title if subject else f"Subject #{topic.subject_id}",
            "is_enrolled": is_enrolled,
            "memory_strength": progress.memory_strength,
            "last_revision_date": progress.last_revision_date,
            "next_revision_date": progress.next_revision_date,
            "next_assessment_date": progress.next_assessment_date,
            "postpone_count": progress.postpone_count,
            "status": status,
            "priority": priority,
            "estimated_revision_minutes": estimated_minutes,
            "focus_areas": focus_areas,
        })

    dashboard_data.sort(key=lambda x: (x["priority"], x["next_revision_date"]))

    return dashboard_data



# ----------------------------
# SCHEDULED ASSESSMENTS LIST
# ----------------------------
@router.get("/assessments")
def get_scheduled_assessments(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Returns all scheduled assessment items for the student.
    Each entry = a topic whose next_revision_date is the next assessment date.
    Also returns subject info + is_enrolled flag (instructor-public subjects).
    """
    if current_user.role != "student":
        return []

    progress_list = db.query(models.StudentTopicProgress)\
        .options(joinedload(models.StudentTopicProgress.topic))\
        .filter(models.StudentTopicProgress.student_id == current_user.id)\
        .all()

    today = datetime.utcnow().date()
    result = []

    for progress in progress_list:
        topic = progress.topic
        if not topic or topic.is_deleted:
            continue
        if not progress.next_revision_date:
            continue

        # Prefer the dedicated assessment date; fall back to revision date
        assess_sched = progress.next_assessment_date or progress.next_revision_date
        assessment_date = assess_sched.date()
        days_until = (assessment_date - today).days

        # Get subject
        subject = db.query(models.Subject).filter(
            models.Subject.id == topic.subject_id,
            models.Subject.is_deleted == False
        ).first()
        if not subject:
            continue

        subject_title = subject.title

        # Check enrollment (public instructor subject = enrolled with chat)
        is_enrolled = False
        if subject.is_public:
            enrollment = db.query(models.Enrollment).filter(
                models.Enrollment.subject_id == topic.subject_id,
                models.Enrollment.student_id == current_user.id,
                models.Enrollment.status == "approved"
            ).first()
            is_enrolled = enrollment is not None

        # Can take today: assessment date is today or was yesterday (grace)
        can_take_today = days_until <= 1 and days_until >= -1

        # Status
        if days_until < 0:
            date_status = "overdue"
        elif days_until == 0:
            date_status = "today"
        elif days_until <= 3:
            date_status = "soon"
        else:
            date_status = "upcoming"

        result.append({
            "topic_id": topic.id,
            "topic_title": topic.title,
            "subject_id": topic.subject_id,
            "subject_title": subject_title,
            "revision_date": progress.next_revision_date.date().isoformat() if progress.next_revision_date else None,
            "assessment_date": assessment_date.isoformat(),
            "days_until": days_until,
            "date_status": date_status,
            "can_take_today": can_take_today,
            "is_enrolled": is_enrolled,
            "memory_strength": progress.memory_strength,
        })

    result.sort(key=lambda x: x["assessment_date"])
    return result


@router.post("/postpone/{topic_id}")
def postpone_revision(
    topic_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can postpone")

    progress = db.query(models.StudentTopicProgress).filter(
        models.StudentTopicProgress.topic_id == topic_id,
        models.StudentTopicProgress.student_id == current_user.id
    ).first()

    if not progress:
        raise HTTPException(status_code=404, detail="Progress not found")

    # 🔥 FIX 4 GOES HERE
    if progress.next_revision_date < datetime.utcnow():
        raise HTTPException(
            status_code=400,
            detail="Cannot postpone overdue revision"
        )

    # 🔥 LIMIT CHECK
    if progress.postpone_count >= 2:
        raise HTTPException(
            status_code=400,
            detail="Postpone limit reached for this cycle"
        )

    # Add 1 day
    progress.next_revision_date += timedelta(days=1)

    # Increase postpone count
    progress.postpone_count += 1

    # Optional soft penalty
    progress.current_interval = max(1, int(progress.current_interval * 0.95))

    db.commit()

    return {
        "message": "Revision postponed by 1 day",
        "new_revision_date": progress.next_revision_date,
        "postpone_count": progress.postpone_count
    }


@router.delete("/revisions/{topic_id}")
def delete_revision(
    topic_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can delete revisions")

    progress = db.query(models.StudentTopicProgress).filter(
        models.StudentTopicProgress.topic_id == topic_id,
        models.StudentTopicProgress.student_id == current_user.id
    ).first()

    if not progress:
        raise HTTPException(status_code=404, detail="Revision progress not found")

    db.delete(progress)
    db.commit()

    return {"message": "Revision permanently removed from your schedule"}


# ----------------------------
# CALENDAR: Get revision dates
# ----------------------------
@router.get("/calendar")
def get_calendar_data(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Returns all upcoming revision dates for a student (for calendar view).
    For instructors returns empty revisions list (they use custom events only).
    """
    revisions = []
    if current_user.role == "student":
        from sqlalchemy.orm import joinedload
        progress_list = db.query(models.StudentTopicProgress)\
            .options(joinedload(models.StudentTopicProgress.topic))\
            .filter(models.StudentTopicProgress.student_id == current_user.id)\
            .all()

        today = datetime.utcnow().date()

        for progress in progress_list:
            topic = progress.topic
            if not topic or topic.is_deleted:
                continue
            next_date = progress.next_revision_date.date()
            if next_date < today:
                status = "overdue"
            elif next_date == today:
                status = "due_today"
            else:
                status = "upcoming"

            revisions.append({
                "date": next_date.isoformat(),
                "topic_id": topic.id,
                "topic_title": topic.title,
                "memory_strength": progress.memory_strength,
                "status": status,
            })

    # Custom events (all roles)
    events = db.query(models.CalendarEvent).filter(
        models.CalendarEvent.user_id == current_user.id
    ).all()

    custom_events = [
        {
            "id": e.id,
            "date": e.date,
            "title": e.title,
            "color": e.color,
        }
        for e in events
    ]

    return {"revisions": revisions, "events": custom_events}


# ----------------------------
# CALENDAR: Create custom event
# ----------------------------
from pydantic import BaseModel as PydanticBase

class CalendarEventCreate(PydanticBase):
    date: str
    title: str
    color: str = "#6366f1"


@router.post("/calendar/event")
def create_calendar_event(
    body: CalendarEventCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    event = models.CalendarEvent(
        user_id=current_user.id,
        date=body.date,
        title=body.title,
        color=body.color,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return {"id": event.id, "date": event.date, "title": event.title, "color": event.color}


# ----------------------------
# CALENDAR: Delete custom event
# ----------------------------
@router.delete("/calendar/event/{event_id}")
def delete_calendar_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    event = db.query(models.CalendarEvent).filter(
        models.CalendarEvent.id == event_id,
        models.CalendarEvent.user_id == current_user.id
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    db.delete(event)
    db.commit()
    return {"message": "Success"}

# ----------------------------
# STUDENT ANALYTICS (Subject Grouped)
# ----------------------------
@router.get("/analytics")
def get_student_analytics(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Returns analytics grouped by subject for the current student.
    Includes average memory strength, strongest/weakest topics, and focus areas.
    """
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can view these analytics")

    # Fetch all progress for this student
    progress_list = db.query(models.StudentTopicProgress)\
        .options(joinedload(models.StudentTopicProgress.topic))\
        .filter(models.StudentTopicProgress.student_id == current_user.id)\
        .all()

    # We need to map subject_id -> subject title + progress stats
    from collections import defaultdict
    subject_data = defaultdict(lambda: {"topics": [], "title": ""})

    # Cache subject titles to avoid querying repeatedly
    subject_cache = {}

    for p in progress_list:
        if not p.topic or p.topic.is_deleted:
            continue
            
        sub_id = p.topic.subject_id
        if sub_id not in subject_cache:
            sub = db.query(models.Subject).filter(models.Subject.id == sub_id).first()
            if sub:
                subject_cache[sub_id] = sub.title
            else:
                subject_cache[sub_id] = f"Subject #{sub_id}"
                
        subject_data[sub_id]["title"] = subject_cache[sub_id]
        subject_data[sub_id]["topics"].append({
            "topic_id": p.topic.id,
            "topic_title": p.topic.title,
            "memory_strength": p.memory_strength or 0.5,
        })

    analytics = []

    type_labels = {
        "mcq": "Multiple Choice", "true_false": "True / False",
        "fill_blank": "Fill in Blank", "short_answer": "Short Answer",
        "long_answer": "Long Answer", "diagram_question": "Diagrams",
        "figure_explain": "Figures", "code_question": "Coding",
        "application": "Application", "cunning": "Tricky Questions",
    }

    # Process each subject
    for sub_id, data in subject_data.items():
        topics = data["topics"]
        if not topics:
            continue
            
        avg_memory = sum(t["memory_strength"] for t in topics) / len(topics)
        
        # Sort topics by memory strength
        sorted_topics = sorted(topics, key=lambda x: x["memory_strength"])
        strongest = sorted_topics[-3:] if len(sorted_topics) >= 1 else sorted_topics
        weakest = sorted_topics[:3] if len(sorted_topics) >= 1 else []

        # Find focus areas (weak question types) for this subject
        # We query recent attempts exactly like the dashboard logic
        topic_ids = [t["topic_id"] for t in topics]
        
        recent_sessions = db.query(models.AssessmentAttempt.session_id)\
            .filter(
                models.AssessmentAttempt.student_id == current_user.id,
                models.AssessmentAttempt.topic_id.in_(topic_ids)
            )\
            .order_by(models.AssessmentAttempt.attempted_at.desc())\
            .limit(50)\
            .all()
            
        focus_areas = []
        if recent_sessions:
            session_ids = [s[0] for s in recent_sessions]
            recent_attempts = db.query(models.AssessmentAttempt)\
                .filter(
                    models.AssessmentAttempt.student_id == current_user.id,
                    models.AssessmentAttempt.session_id.in_(session_ids)
                ).all()
                
            type_stats = defaultdict(lambda: {"correct": 0, "total": 0})
            for a in recent_attempts:
                t = a.question_type or "mcq"
                type_stats[t]["total"] += 1
                if a.is_correct:
                    type_stats[t]["correct"] += 1
                    
            for qtype, stats in type_stats.items():
                acc = stats["correct"] / stats["total"] if stats["total"] > 0 else 0
                if acc < 0.6 and stats["total"] >= 3: # Need at least 3 attempts to constitute a trend
                    focus_areas.append(type_labels.get(qtype, qtype.replace("_", " ").title()))
        
        # Deduplicate and limit to 4 focus areas
        focus_areas = list(set(focus_areas))[:4]

        analytics.append({
            "subject_id": sub_id,
            "subject_title": data["title"],
            "avg_memory_strength": avg_memory,
            "strongest_topics": strongest,
            "weakest_topics": weakest,
            "focus_areas": focus_areas,
            "topic_count": len(topics)
        })

    # Sort subjects by lowest memory strength first
    analytics.sort(key=lambda x: x["avg_memory_strength"])
    return analytics
