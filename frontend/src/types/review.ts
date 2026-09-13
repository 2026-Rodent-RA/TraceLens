// frontend/src/types/review.ts
export interface Review {
  analysis_id: string;
  edge_source: string;
  edge_target: string;
  status: "추가 조사 필요" | "특이사항 없음" | "보류" | "";
  memo: string;
}
