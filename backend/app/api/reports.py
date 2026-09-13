"""backend/app/api/reports.py
Reports API Router.
"""
from fastapi import APIRouter
from app.models.report import ReportCreateRequest, ReportResponse
from app.services.report_service import create_report

router = APIRouter(prefix="/api/reports", tags=["reports"])

@router.post("", response_model=ReportResponse)
def generate_report(req: ReportCreateRequest):
    return create_report(req.analysis_id, req.reviews)
