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
            "memory_strength": progress.memory_strength,
            "next_revision_date": progress.next_revision_date,
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