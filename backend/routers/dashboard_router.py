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

        dashboard_data.append({
            "topic_id": topic.id,
            "topic_title": topic.title,
            "topic_file_path": topic.file_path,
            "memory_strength": progress.memory_strength,
            "last_revision_date": progress.last_revision_date,
            "next_revision_date": progress.next_revision_date,
            "postpone_count": progress.postpone_count,
            "status": status,
            "priority": priority
        })

    dashboard_data.sort(key=lambda x: (x["priority"], x["next_revision_date"]))

    return dashboard_data

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
    return {"message": "Deleted"}
