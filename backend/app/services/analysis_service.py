"""backend/app/services/analysis_service.py
AI 분석 데이터를 로드하고 제공하는 서비스.

Data source: config.settings.analysis_data_dir
"""
import json
from pathlib import Path
from functools import lru_cache

from app.config import settings
from app.models.analysis import AnalysisResult, CaseSummary


def _load_all_analyses() -> list[AnalysisResult]:
    """data_dir 안의 모든 JSON 파일을 로드합니다."""
    data_dir: Path = settings.analysis_data_dir
    results: list[AnalysisResult] = []

    if not data_dir.exists():
        raise FileNotFoundError(
            f"Analysis data directory not found: {data_dir}\n"
            f"현재 ANALYSIS_DATA_DIR={data_dir}\n"
            f"ML 사건 JSON을 먼저 생성했는지 확인하세요."
        )

    for json_file in sorted(data_dir.glob("analysis-*.json")):
        with open(json_file, encoding="utf-8") as f:
            raw = json.load(f)
            # _comment 같은 비표준 필드는 무시
            raw.pop("_comment", None)
            results.append(AnalysisResult(**raw))

    return results


def get_all_cases() -> list[CaseSummary]:
    """Case 목록(Dashboard Card용 요약)을 반환합니다."""
    analyses = _load_all_analyses()
    return [
        CaseSummary(
            analysis_id=a.analysis_id,
            target_transaction=a.target_transaction,
            prediction_score=a.prediction.score,
            prediction_level=a.prediction.level,
            model_name=a.model.name,
            status=a.status,
        )
        for a in analyses
    ]


def get_case_by_id(analysis_id: str) -> AnalysisResult | None:
    """특정 analysis_id의 전체 분석 데이터를 반환합니다."""
    analyses = _load_all_analyses()
    for analysis in analyses:
        if analysis.analysis_id == analysis_id:
            return analysis
    return None
