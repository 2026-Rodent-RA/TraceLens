import type { AnalysisResult, CaseSummary } from "../types/analysis";
import type {
  ReportContent,
  ReportResponse,
  ReportReview,
} from "../types/report";

const configuredApiUrl = import.meta.env.VITE_API_BASE_URL as
  | string
  | undefined;

export const DEMO_MODE = !configuredApiUrl;

const API_BASE_URL = configuredApiUrl?.replace(/\/$/, "");
const DEMO_BASE_URL = `${import.meta.env.BASE_URL}demo`;


async function fetchJSON<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `API Error [${response.status}] ${url}: ${message}`,
    );
  }

  return response.json() as Promise<T>;
}


function apiUrl(path: string): string {
  if (!API_BASE_URL) {
    throw new Error("Backend API is unavailable in static demo mode.");
  }

  return `${API_BASE_URL}${path}`;
}


function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.keys(record)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = canonicalize(record[key]);
        return result;
      }, {});
  }

  return value;
}


async function hashContent(content: ReportContent): Promise<string> {
  const serialized = JSON.stringify(canonicalize(content));
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(serialized),
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}


export function getCases(): Promise<CaseSummary[]> {
  if (DEMO_MODE) {
    return fetchJSON<CaseSummary[]>(`${DEMO_BASE_URL}/cases.json`);
  }

  return fetchJSON<CaseSummary[]>(apiUrl("/api/cases"));
}


export function getCaseById(
  analysisId: string,
): Promise<AnalysisResult> {
  if (DEMO_MODE) {
    const safeId = encodeURIComponent(analysisId);
    return fetchJSON<AnalysisResult>(
      `${DEMO_BASE_URL}/cases/${safeId}.json`,
    );
  }

  return fetchJSON<AnalysisResult>(
    apiUrl(`/api/cases/${encodeURIComponent(analysisId)}`),
  );
}


export async function generateReport(
  analysisId: string,
  reviews: ReportReview[],
): Promise<ReportResponse> {
  if (!DEMO_MODE) {
    return fetchJSON<ReportResponse>(apiUrl("/api/reports"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysis_id: analysisId, reviews }),
    });
  }

  const analysis = await getCaseById(analysisId);
  const content: ReportContent = {
    analysis_id: analysis.analysis_id,
    dataset: analysis.dataset,
    target_transaction: analysis.target_transaction,
    model_name: analysis.model.name,
    model_version: analysis.model.version,
    prediction_score: analysis.prediction.score,
    prediction_level: analysis.prediction.level,
    recommended_edges: analysis.recommended_edges,
    reviews,
  };

  return {
    report_id: `report-${crypto.randomUUID().slice(0, 8)}`,
    content,
    generated_at: new Date().toISOString(),
    report_hash: await hashContent(content),
  };
}


export function getAttestation(reportHash: string): Promise<any> {
  if (DEMO_MODE) {
    return Promise.resolve({
      report_hash: reportHash,
      issuer: "",
      issued_at: 0,
      revoked: false,
      is_issued: false,
    });
  }

  return fetchJSON<any>(
    apiUrl(`/api/reports/attestation/${reportHash}`),
  );
}


export async function issueReport(
  reportId: string,
  reportHash: string,
): Promise<any> {
  return fetchJSON<any>(apiUrl("/api/reports/issue"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ report_id: reportId, report_hash: reportHash }),
  });
}


export async function verifyReport(
  reportData: ReportResponse,
): Promise<any> {
  if (DEMO_MODE) {
    const currentHash = await hashContent(reportData.content);
    const intact = currentHash === reportData.report_hash;

    return {
      report_id: reportData.report_id,
      status: intact ? "NOT_VERIFIED" : "HASH_MISMATCH",
      current_hash: currentHash,
      message: intact
        ? "The report content is intact. On-chain verification requires the backend."
        : "The report content does not match its SHA-256 hash.",
    };
  }

  return fetchJSON<any>(apiUrl("/api/reports/verify"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reportData),
  });
}


export async function revokeReport(
  reportId: string,
  reportHash: string,
): Promise<any> {
  return fetchJSON<any>(apiUrl("/api/reports/revoke"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ report_id: reportId, report_hash: reportHash }),
  });
}
