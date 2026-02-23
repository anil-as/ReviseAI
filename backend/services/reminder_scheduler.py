from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
from sqlalchemy.orm import Session
import models
from database import SessionLocal

scheduler = BackgroundScheduler()

def check_overdue_topics():

    db: Session = SessionLocal()

    today = datetime.utcnow()

    overdue = db.query(models.StudentTopicProgress).filter(
        models.StudentTopicProgress.next_revision_date < today
    ).all()

    for progress in overdue:
        print(f"Reminder: Student {progress.student_id} has overdue topic {progress.topic_id}")

    db.close()

def start_scheduler():
    scheduler.add_job(check_overdue_topics, 'interval', hours=24)
    scheduler.start()