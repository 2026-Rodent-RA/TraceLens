"""backend/app/models/analysis.py
Pydantic models for AI analysis data.
ML 출력과 프론트엔드가 공유하는 MVP Schema입니다.
"""
from typing import Literal
from pydantic import BaseModel


class Prediction(BaseModel):
    score: float
    level: Literal["LOW", "MEDIUM", "HIGH"]


class ModelInfo(BaseModel):
    name: str
    version: str


class GraphNode(BaseModel):
    id: str


class GraphEdge(BaseModel):
    source: str
    target: str


class Graph(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]


class RecommendedEdge(BaseModel):
    source: str
    target: str
    rank: int
    score_drop: float


class Validation(BaseModel):
    original_score: float
    recommended_removed_score: float
    random_removed_score: float


class AnalysisResult(BaseModel):
    """
    단일 분석 케이스의 전체 데이터.
    단일 온체인 조사 사건의 예측, 그래프, 추천 연결을 담습니다.
    """
    analysis_id: str
    dataset: str
    target_transaction: str
    prediction: Prediction
    model: ModelInfo
    graph: Graph
    recommended_edges: list[RecommendedEdge]
    validation: Validation
    status: str = "PENDING_REVIEW"


class CaseSummary(BaseModel):
    """
    Dashboard Case Card에 필요한 요약 정보.
    """
    analysis_id: str
    target_transaction: str
    prediction_score: float
    prediction_level: str
    model_name: str
    status: str

    model_config = {"protected_namespaces": ()}
