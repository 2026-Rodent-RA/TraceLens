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

/** Report 생성 */
export async function generateReport(analysisId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ analysis_id: analysisId }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error [${res.status}] POST /api/reports: ${text}`);
  }
  return res.json();
}

/** Report 조회 */
export function getReport(reportId: string): Promise<any> {
  return fetchJSON<any>(`/api/reports/${reportId}`);
}

/** Blockchain Attestation 조회 */
export function getAttestation(reportId: string): Promise<any> {
  return fetchJSON<any>(`/api/reports/${reportId}/attestation`);
}

/** Report Blockchain에 발급 */
export async function issueReport(reportId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/reports/${reportId}/issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error [${res.status}] POST /api/reports/${reportId}/issue: ${text}`);
  }
  return res.json();
}

/** Report 검증 */
export async function verifyReport(reportId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/reports/${reportId}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error [${res.status}] POST /api/reports/${reportId}/verify: ${text}`);
  }
  return res.json();
}

/** Report 취소 (Revoke) */
export async function revokeReport(reportId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/reports/${reportId}/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error [${res.status}] POST /api/reports/${reportId}/revoke: ${text}`);
  }
  return res.json();
}

/** 외부 JSON Report 파일 검증 */
export async function verifyExternalReport(reportData: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/reports/verify/external`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reportData),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error [${res.status}] POST /api/reports/verify/external: ${text}`);
  }
  return res.json();
}
