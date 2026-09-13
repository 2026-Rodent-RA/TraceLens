// frontend/src/types/analysis.ts
// ML 출력, 백엔드 API와 공유하는 MVP 분석 데이터 타입.

export interface Prediction {
  score: number;
  level: "LOW" | "MEDIUM" | "HIGH";
}

export interface ModelInfo {
  name: string;
  version: string;
}

export interface GraphNode {
  id: string;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface RecommendedEdge {
  source: string;
  target: string;
  rank: number;
  score_drop: number;
}

export interface Validation {
  original_score: number;
  recommended_removed_score: number;
  random_removed_score: number;
}

export interface AnalysisResult {
  analysis_id: string;
  dataset: string;
  target_transaction: string;
  prediction: Prediction;
  model: ModelInfo;
  graph: Graph;
  recommended_edges: RecommendedEdge[];
  validation: Validation;
  status: string;
}

export interface CaseSummary {
  analysis_id: string;
  target_transaction: string;
  prediction_score: number;
  prediction_level: "LOW" | "MEDIUM" | "HIGH";
  model_name: string;
  status: string;
}
