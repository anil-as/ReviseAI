from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, Float

import models
from dependencies import get_db, require_role

router = APIRouter(
    prefix="/analytics",
    tags=["Instructor Analytics"]
)


# ----------------------------
# OVERALL SUBJECT ANALYTICS
# ----------------------------
@router.get("/subject/{subject_id}")
def subject_analytics(
    subject_id: int,
    db: Session = Depends(get_db),
    instructor = Depends(require_role("instructor"))
):
    subject = db.query(models.Subject).filter(
        models.Subject.id == subject_id,
        models.Subject.created_by == instructor.id
    ).first()

    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    # Total enrolled students
    total_students = db.query(models.Enrollment).filter(
        models.Enrollment.subject_id == subject_id,
        models.Enrollment.status == "approved"
    ).count()

    # Average memory strength per topic (across all students)
    topic_stats = db.query(
        models.Topic.title,
        models.Topic.id,
        func.avg(models.StudentTopicProgress.memory_strength),
        func.count(models.StudentTopicProgress.student_id)
    ).join(
        models.StudentTopicProgress,
        models.StudentTopicProgress.topic_id == models.Topic.id
    ).filter(
        models.Topic.subject_id == subject_id,
        models.Topic.is_deleted == False
    ).group_by(models.Topic.id, models.Topic.title).all()

    # Get accuracy per topic
    acc_stats = db.query(
        models.AssessmentAttempt.topic_id,
        func.avg(func.cast(models.AssessmentAttempt.is_correct, Float))
    ).join(
        models.Topic, models.Topic.id == models.AssessmentAttempt.topic_id
    ).filter(
        models.Topic.subject_id == subject_id
    ).group_by(models.AssessmentAttempt.topic_id).all()
    
    acc_map = {tid: val for tid, val in acc_stats}

    return {
        "subject": subject.title,
        "total_students": total_students,
        "topic_memory_average": [
            {
                "topic": title,
                "topic_id": tid,
                "avg_memory_strength": round(avg or 0, 2),
                "accuracy": round(acc_map.get(tid) or 0, 2),
                "student_count": count
            }
            for title, tid, avg, count in topic_stats
        ]
    }


# ----------------------------
# LIST ENROLLED STUDENTS
# ----------------------------
@router.get("/subject/{subject_id}/students")
def get_enrolled_students(
    subject_id: int,
    db: Session = Depends(get_db),
    instructor = Depends(require_role("instructor"))
):
    """
    Returns list of approved-enrolled students for a subject.
    Used to populate the student filter dropdown on the analytics page.
    """
    subject = db.query(models.Subject).filter(
        models.Subject.id == subject_id,
        models.Subject.created_by == instructor.id
    ).first()

    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    enrollments = db.query(models.Enrollment).filter(
        models.Enrollment.subject_id == subject_id,
        models.Enrollment.status == "approved"
    ).all()

    student_ids = [e.student_id for e in enrollments]
    if not student_ids:
        return []

    # 1. Memory stats per student per topic
    mem_stats = db.query(
        models.StudentTopicProgress.student_id,
        models.StudentTopicProgress.topic_id,
        models.Topic.title,
        models.StudentTopicProgress.memory_strength
    ).join(
        models.Topic, models.Topic.id == models.StudentTopicProgress.topic_id
    ).filter(
        models.Topic.subject_id == subject_id,
        models.StudentTopicProgress.student_id.in_(student_ids) if student_ids else False
    ).all()
    
    # 2. Accuracy stats per student per topic
    acc_stats_student = db.query(
        models.AssessmentAttempt.student_id,
        models.AssessmentAttempt.topic_id,
        func.avg(func.cast(models.AssessmentAttempt.is_correct, Float))
    ).join(
        models.Topic, models.Topic.id == models.AssessmentAttempt.topic_id
    ).filter(
        models.Topic.subject_id == subject_id,
        models.AssessmentAttempt.student_id.in_(student_ids) if student_ids else False
    ).group_by(models.AssessmentAttempt.student_id, models.AssessmentAttempt.topic_id).all()
    
    student_data_map = {sid: {"mem_sum": 0, "mem_count": 0, "topics": {}} for sid in student_ids}
    
    for sid, tid, title, mem in mem_stats:
        student_data_map[sid]["mem_sum"] += mem
        student_data_map[sid]["mem_count"] += 1
        if tid not in student_data_map[sid]["topics"]:
            student_data_map[sid]["topics"][tid] = {"title": title, "mem": mem, "acc": 0}
        else:
            student_data_map[sid]["topics"][tid]["mem"] = mem
            student_data_map[sid]["topics"][tid]["title"] = title
            
    # Set accuracy
    student_acc_totals = {sid: {"acc_sum": 0, "acc_count": 0} for sid in student_ids}
    for sid, tid, acc in acc_stats_student:
        student_acc_totals[sid]["acc_sum"] += acc
        student_acc_totals[sid]["acc_count"] += 1
        if sid in student_data_map and tid in student_data_map[sid]["topics"]:
            student_data_map[sid]["topics"][tid]["acc"] = acc
            
    results = []
    for e in enrollments:
        sid = e.student_id
        d = student_data_map[sid]
        avg_mem = d["mem_sum"] / d["mem_count"] if d["mem_count"] > 0 else 0
        
        at = student_acc_totals[sid]
        avg_acc = at["acc_sum"] / at["acc_count"] if at["acc_count"] > 0 else 0
        
        # weakest topic based on combined mem + acc avg
        weakest_topic = "None"
        weakest_score = 999
        for tid, tdata in d["topics"].items():
            score = (tdata["mem"] + tdata["acc"]) / 2
            if score < weakest_score:
                weakest_score = score
                weakest_topic = tdata["title"]

        results.append({
            "student_id": sid,
            "student_name": e.student_name or (e.student.name if e.student else "Unknown"),
            "institution": e.institution,
            "admission_number": e.admission_number,
            "memory": round(avg_mem, 2),
            "accuracy": round(avg_acc, 2),
            "weakest_topic": weakest_topic
        })
        
    return results


# ----------------------------
# PER-STUDENT ANALYTICS
# ----------------------------
@router.get("/subject/{subject_id}/student/{student_id}")
def student_analytics(
    subject_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    instructor = Depends(require_role("instructor"))
):
    """
    Returns per-topic memory strength for a specific student in a subject.
    """
    subject = db.query(models.Subject).filter(
        models.Subject.id == subject_id,
        models.Subject.created_by == instructor.id
    ).first()

    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    # Verify the student is enrolled
    enrollment = db.query(models.Enrollment).filter(
        models.Enrollment.subject_id == subject_id,
        models.Enrollment.student_id == student_id,
        models.Enrollment.status == "approved"
    ).first()

    if not enrollment:
        raise HTTPException(status_code=404, detail="Student not enrolled in this subject")

    # Per-topic progress for this student
    topic_stats = db.query(
        models.Topic.title,
        models.Topic.id,
        models.StudentTopicProgress.memory_strength,
        models.StudentTopicProgress.last_revision_date,
        models.StudentTopicProgress.next_revision_date,
    ).join(
        models.StudentTopicProgress,
        (models.StudentTopicProgress.topic_id == models.Topic.id) &
        (models.StudentTopicProgress.student_id == student_id)
    ).filter(
        models.Topic.subject_id == subject_id,
        models.Topic.is_deleted == False
    ).all()

    # Get accuracy per topic for student
    acc_stats = db.query(
        models.AssessmentAttempt.topic_id,
        func.avg(func.cast(models.AssessmentAttempt.is_correct, Float))
    ).join(
        models.Topic, models.Topic.id == models.AssessmentAttempt.topic_id
    ).filter(
        models.Topic.subject_id == subject_id,
        models.AssessmentAttempt.student_id == student_id
    ).group_by(models.AssessmentAttempt.topic_id).all()
    
    acc_map = {tid: val for tid, val in acc_stats}

    return {
        "subject": subject.title,
        "student_name": enrollment.student_name or "Unknown",
        "topic_memory_average": [
            {
                "topic": title,
                "topic_id": tid,
                "avg_memory_strength": round(mem or 0, 2),
                "accuracy": round(acc_map.get(tid, 0), 2),
                "student_count": 1,
                "last_revision": last.isoformat() if last else None,
                "next_revision": nxt.isoformat() if nxt else None,
            }
            for title, tid, mem, last, nxt in topic_stats
        ]
    }