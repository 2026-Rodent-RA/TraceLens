"""backend/app/api/reviews.py
Review API Router.
"""
from fastapi import APIRouter
from app.models.review import ReviewCreate, ReviewResponse
from app.services.review_service import save_review, get_reviews_by_analysis

router = APIRouter(prefix="/api/reviews", tags=["reviews"])

@router.post("", response_model=ReviewResponse)
def create_or_update_review(review: ReviewCreate):
    return save_review(review)

@router.get("/{analysis_id}", response_model=list[ReviewResponse])
def get_reviews(analysis_id: str):
    return get_reviews_by_analysis(analysis_id)
