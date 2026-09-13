"""backend/app/api/cases.py
Case 조회 API Router.
"""
from fastapi import APIRouter, HTTPException

from app.models.analysis import AnalysisResult, CaseSummary
from app.services.analysis_service import get_all_cases, get_case_by_id

router = APIRouter(prefix="/api/cases", tags=["cases"])


@router.get("", response_model=list[CaseSummary])
def list_cases():
    """
    AI 분석 케이스 목록을 반환합니다.
    Dashboard Case Card 표시용.
    """
    return get_all_cases()


@router.get("/{analysis_id}", response_model=AnalysisResult)
def get_case(analysis_id: str):
    """
    특정 analysis_id의 전체 분석 결과를 반환합니다.
    Investigation Detail 화면용.
    """
    case = get_case_by_id(analysis_id)
    if case is None:
        raise HTTPException(status_code=404, detail=f"Case '{analysis_id}' not found")
    return case
