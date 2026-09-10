"""backend/app/models/review.py
Pydantic models for Investigator Reviews.
"""
from typing import Literal
from pydantic import BaseModel

class ReviewBase(BaseModel):
    analysis_id: str
    edge_source: str
    edge_target: str
    status: Literal["추가 조사 필요", "특이사항 없음", "보류", ""]
    memo: str

class ReviewCreate(ReviewBase):
    pass

class ReviewResponse(ReviewBase):
    id: int
    created_at: str
