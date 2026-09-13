"""backend/app/models/report.py
Pydantic models for Investigation Reports.
"""
from typing import List, Any
from pydantic import BaseModel
from datetime import datetime

class ReportCreateRequest(BaseModel):
    analysis_id: str
    reviews: List['ReportReview']

class ReportEdge(BaseModel):
    source: str
    target: str
    rank: int
    score_drop: float

class ReportReview(BaseModel):
    edge_source: str
    edge_target: str
    status: str
    memo: str

class ReportContent(BaseModel):
    analysis_id: str
    dataset: str
    target_transaction: str
    model_name: str
    model_version: str
    prediction_score: float
    prediction_level: str
    recommended_edges: List[ReportEdge]
    reviews: List[ReportReview]

    model_config = {"protected_namespaces": ()}

class ReportResponse(BaseModel):
    report_id: str
    content: ReportContent
    generated_at: str
    report_hash: str
