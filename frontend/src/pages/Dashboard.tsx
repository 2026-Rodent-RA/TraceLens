// frontend/src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CaseSummary } from "../types/analysis";
import { getCases } from "../services/api";

// ─── Risk Level helpers ─────────────────────────────────────────────────────

function riskClass(level: string): string {
  if (level === "HIGH")   return "risk-high";
  if (level === "MEDIUM") return "risk-medium";
  return "risk-low";
}

function barClass(level: string): string {
  if (level === "HIGH")   return "high";
  if (level === "MEDIUM") return "medium";
  return "low";
}

function statusBadgeClass(status: string): string {
  if (status === "REVIEWED") return "status-reviewed";
  return "status-pending";
}

function statusLabel(status: string): string {
  if (status === "REVIEWED")       return "Reviewed";
  if (status === "PENDING_REVIEW") return "Pending Review";
  return status;
}

// ─── Case Card ──────────────────────────────────────────────────────────────

interface CaseCardProps {
  caseItem: CaseSummary;
  index: number;
}

function CaseCard({ caseItem, index }: CaseCardProps) {
  const navigate = useNavigate();
  const scorePercent = Math.round(caseItem.prediction_score * 100);
  const caseNumber = String(index + 1).padStart(3, "0");

  return (
    <article
      className="case-card"
      id={`case-card-${caseItem.analysis_id}`}
      onClick={() => navigate(`/investigation/${caseItem.analysis_id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          navigate(`/investigation/${caseItem.analysis_id}`);
        }
      }}
    >
      <div className="case-card-header">
        <span className="case-id">Case #{caseNumber}</span>
        <span className={`case-status-badge ${statusBadgeClass(caseItem.status)}`}>
          {statusLabel(caseItem.status)}
        </span>
      </div>

      <div className="case-target">
        <div className="case-target-label">Target Transaction</div>
        <div className="case-target-value">{caseItem.target_transaction.toUpperCase()}</div>
      </div>

      <div className="case-metrics">
        <div className="metric">
          <span className="metric-label">AI Score</span>
          <span className={`metric-value ${riskClass(caseItem.prediction_level)}`}>
            {scorePercent}%
          </span>
          <div className="score-bar-container">
            <div
              className={`score-bar ${barClass(caseItem.prediction_level)}`}
              style={{ width: `${scorePercent}%` }}
            />
          </div>
        </div>

        <div className="metric">
          <span className="metric-label">Risk Level</span>
          <span className={`metric-value ${riskClass(caseItem.prediction_level)}`}>
            {caseItem.prediction_level}
          </span>
        </div>

        <div className="metric">
          <span className="metric-label">Model</span>
          <span className="metric-value" style={{ color: "var(--color-text-secondary)" }}>
            {caseItem.model_name}
          </span>
        </div>
      </div>

      <div className="case-card-footer">
        <button className="btn-open" id={`btn-open-${caseItem.analysis_id}`}>
          Open Investigation
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>
        </button>
      </div>
    </article>
  );
}

// ─── Stats Bar ───────────────────────────────────────────────────────────────

interface StatsBarProps {
  cases: CaseSummary[];
}

function StatsBar({ cases }: StatsBarProps) {
  const total   = cases.length;
  const high    = cases.filter((c) => c.prediction_level === "HIGH").length;
  const pending = cases.filter((c) => c.status === "PENDING_REVIEW").length;

  return (
    <div className="stats-bar" role="region" aria-label="Case statistics">
      <div className="stat-item">
        <span className="stat-label">Total Cases</span>
        <span className="stat-value">{total}</span>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <span className="stat-label">High Risk</span>
        <span className="stat-value" style={{ color: "var(--color-risk-high)" }}>{high}</span>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <span className="stat-label">Pending Review</span>
        <span className="stat-value" style={{ color: "var(--color-warning)" }}>{pending}</span>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <span className="stat-label">Data Source</span>
        <span className="stat-value" style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
          Elliptic (Mock)
        </span>
      </div>
    </div>
  );
}

// ─── Dashboard Page ──────────────────────────────────────────────────────────

export default function Dashboard() {
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCases()
      .then(setCases)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="loading-container" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true" />
        <span>Loading investigations...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container" role="alert">
        <h3>Failed to load cases</h3>
        <p>{error}</p>
        <p style={{ marginTop: "var(--space-2)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
          Backend가 실행 중인지 확인하세요: http://localhost:8000/health
        </p>
      </div>
    );
  }

  return (
    <main className="main-content" id="dashboard-main">
      <div className="page-header">
        <h1 className="page-title">Investigation Cases</h1>
        <p className="page-subtitle">
          AI-recommended on-chain investigation targets · Elliptic Dataset (Mock)
        </p>
      </div>

      <StatsBar cases={cases} />

      {cases.length === 0 ? (
        <div className="error-container">
          <h3>No cases found</h3>
          <p>mock/ 디렉토리에 analysis-*.json 파일이 있는지 확인하세요.</p>
        </div>
      ) : (
        <div className="cases-grid" id="cases-grid">
          {cases.map((c, i) => (
            <CaseCard key={c.analysis_id} caseItem={c} index={i} />
          ))}
        </div>
      )}
    </main>
  );
}
