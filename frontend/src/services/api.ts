// frontend/src/services/api.ts
// Backend REST API 호출 함수 모음.

import type { CaseSummary, AnalysisResult } from "../types/analysis";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error [${res.status}] ${path}: ${text}`);
  }
  return res.json() as Promise<T>;
}

/** Dashboard용 Case 목록 */
export function getCases(): Promise<CaseSummary[]> {
  return fetchJSON<CaseSummary[]>("/api/cases");
}

/** Investigation Detail용 케이스 전체 데이터 */
export function getCaseById(analysisId: string): Promise<AnalysisResult> {
  return fetchJSON<AnalysisResult>(`/api/cases/${analysisId}`);
}

/** Review 목록 조회 */
export function getReviews(analysisId: string): Promise<any[]> {
  return fetchJSON<any[]>(`/api/reviews/${analysisId}`);
}

/** Review 저장 */
export async function saveReview(review: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(review),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error [${res.status}] POST /api/reviews: ${text}`);
  }
  return res.json();
}
