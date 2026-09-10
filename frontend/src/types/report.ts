// frontend/src/types/report.ts

export interface ReportEdge {
  source: string;
  target: string;
  rank: number;
  score_drop: number;
}

export interface ReportReview {
  edge_source: string;
  edge_target: string;
  status: string;
  memo: string;
}

export interface ReportContent {
  analysis_id: string;
  dataset: string;
  target_transaction: string;
  model_name: string;
  model_version: string;
  prediction_score: number;
  prediction_level: string;
  recommended_edges: ReportEdge[];
  reviews: ReportReview[];
}

export interface ReportResponse {
  report_id: string;
  content: ReportContent;
  generated_at: string;
  report_hash: string;
}
