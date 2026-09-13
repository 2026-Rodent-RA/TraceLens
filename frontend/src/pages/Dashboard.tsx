// frontend/src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CaseSummary } from "../types/analysis";
import { getCases } from "../services/api";
import { useApp } from "../i18n/context";

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

// ─── Case Card ──────────────────────────────────────────────────────────────

interface CaseCardProps {
  caseItem: CaseSummary;
  index: number;
}

function CaseCard({ caseItem, index }: CaseCardProps) {
  const navigate = useNavigate();
  const { t } = useApp();
  const scorePercent = Math.round(caseItem.prediction_score * 100);
  const caseNumber = String(index + 1).padStart(3, "0");

  const statusLabel = caseItem.status === "REVIEWED" ? t("dashboard.status.reviewed") : t("dashboard.status.pending");
  const statusBadgeClass = caseItem.status === "REVIEWED" ? "status-reviewed" : "status-pending";

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
        <span className={`case-status-badge ${statusBadgeClass}`}>
          {statusLabel}
        </span>
      </div>

      <div className="case-target">
        <div className="case-target-label">{t("dashboard.card.target")}</div>
        <div className="case-target-value">{caseItem.target_transaction.toUpperCase()}</div>
      </div>

      <div className="case-metrics">
        <div className="metric">
          <span className="metric-label">{t("dashboard.card.score")}</span>
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
          <span className="metric-label">{t("dashboard.card.risk")}</span>
          <span className={`metric-value ${riskClass(caseItem.prediction_level)}`}>
            {caseItem.prediction_level}
          </span>
        </div>

        <div className="metric">
          <span className="metric-label">{t("dashboard.card.model")}</span>
          <span className="metric-value" style={{ color: "var(--color-text-secondary)" }}>
            {caseItem.model_name}
          </span>
        </div>
      </div>

      <div className="case-card-footer">
        <button className="btn-open" id={`btn-open-${caseItem.analysis_id}`}>
          {t("dashboard.card.open")}
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
  const { t } = useApp();
  const total   = cases.length;
  const high    = cases.filter((c) => c.prediction_level === "HIGH").length;
  const pending = cases.filter((c) => c.status === "PENDING_REVIEW").length;

  return (
    <div className="stats-bar" role="region" aria-label="Case statistics">
      <div className="stat-item">
        <span className="stat-label">{t("dashboard.stats.total")}</span>
        <span className="stat-value">{total}</span>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <span className="stat-label">{t("dashboard.stats.high")}</span>
        <span className="stat-value" style={{ color: "var(--color-risk-high)" }}>{high}</span>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <span className="stat-label">{t("dashboard.stats.pending")}</span>
        <span className="stat-value" style={{ color: "var(--color-warning)" }}>{pending}</span>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <span className="stat-label">{t("dashboard.stats.source")}</span>
        <span className="stat-value" style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
          Bybit-BC
        </span>
      </div>
    </div>
  );
}

// ─── Dashboard Page ──────────────────────────────────────────────────────────

export default function Dashboard() {
  const { t } = useApp();
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
        <span>{t("dashboard.loading")}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container" role="alert">
        <h3>Failed to load cases</h3>
        <p>{error}</p>
        <p style={{ marginTop: "var(--space-2)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
          서버에 연결할 수 없습니다. 서비스 점검 중이거나 네트워크 오류일 수 있습니다.
        </p>
      </div>
    );
  }

  return (
    <main className="main-content" id="dashboard-main">
      <div className="page-header">
        <h1 className="page-title">{t("dashboard.title")}</h1>
        <p className="page-subtitle">
          {t("dashboard.subtitle")}
        </p>
      </div>

      <StatsBar cases={cases} />

      {cases.length === 0 ? (
        <div className="error-container">
          <h3>{t("dashboard.no_cases")}</h3>
          <p>{t("dashboard.no_cases_desc")}</p>
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
