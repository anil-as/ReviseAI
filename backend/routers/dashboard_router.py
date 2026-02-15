from fastapi import APIRouter, Depends
from dependencies import require_role

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