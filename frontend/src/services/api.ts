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

/** Report 생성 (프론트엔드 상태의 reviews를 모두 모아서 보냄) */
export async function generateReport(analysisId: string, reviews: any[]): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ analysis_id: analysisId, reviews }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error [${res.status}] POST /api/reports: ${text}`);
  }
  return res.json();
}

/** Blockchain Attestation 조회 */
export function getAttestation(reportHash: string): Promise<any> {
  return fetchJSON<any>(`/api/reports/attestation/${reportHash}`);
}

/** Report Blockchain에 발급 */
export async function issueReport(reportId: string, reportHash: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/reports/issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ report_id: reportId, report_hash: reportHash }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error [${res.status}] POST /api/reports/issue: ${text}`);
  }
  return res.json();
}

/** Report 검증 (Full JSON 파일 업로드 시 사용) */
export async function verifyReport(reportData: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/reports/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reportData),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error [${res.status}] POST /api/reports/verify: ${text}`);
  }
  return res.json();
}

/** Report 취소 (Revoke) */
export async function revokeReport(reportId: string, reportHash: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/reports/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ report_id: reportId, report_hash: reportHash }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error [${res.status}] POST /api/reports/revoke: ${text}`);
  }
  return res.json();
}
