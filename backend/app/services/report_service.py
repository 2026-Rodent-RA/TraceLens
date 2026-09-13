"""backend/app/services/report_service.py
Service for generating and retrieving reports.
"""
import uuid
import json
from datetime import datetime
from fastapi import HTTPException
from app.services.analysis_service import get_case_by_id
from app.services.hashing_service import generate_report_hash
from app.models.report import ReportContent, ReportResponse, ReportEdge, ReportReview
from typing import List

def create_report(analysis_id: str, reviews: List[ReportReview]) -> ReportResponse:
    # 1. Fetch AI Analysis
    analysis = get_case_by_id(analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    # 2. Build Report Content (Excluding Hash)
    content_obj = ReportContent(
        analysis_id=analysis.analysis_id,
        dataset=analysis.dataset,
        target_transaction=analysis.target_transaction,
        model_name=analysis.model.name,
        model_version=analysis.model.version,
        prediction_score=analysis.prediction.score,
        prediction_level=analysis.prediction.level,
        recommended_edges=[
            ReportEdge(source=e.source, target=e.target, rank=e.rank, score_drop=e.score_drop)
            for e in analysis.recommended_edges
        ],
        reviews=reviews
    )
    
    # 3. Generate Deterministic Hash
    content_dict = content_obj.model_dump()
    report_hash = generate_report_hash(content_dict)
    
    report_id = f"report-{uuid.uuid4().hex[:8]}"
    generated_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    
    return ReportResponse(
        report_id=report_id,
        content=content_obj,
        generated_at=generated_at,
        report_hash=report_hash
    )
