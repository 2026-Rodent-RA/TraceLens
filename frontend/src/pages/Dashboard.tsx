import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CaseSummary } from "../types/analysis";
import { getCases } from "../services/api";
import { useApp } from "../i18n/context";

function riskClass(level: string) {
  return level === "HIGH" ? "risk-high" : level === "MEDIUM" ? "risk-medium" : "risk-low";
}

function shortHash(value: string) {
  return value.length > 22 ? `${value.slice(0, 12)}…${value.slice(-10)}` : value;
}

function CaseCard({ caseItem, index }: { caseItem: CaseSummary; index: number }) {
  const navigate = useNavigate();
  const { t } = useApp();
  const score = Math.round(caseItem.prediction_score * 100);
  const reviewed = caseItem.status === "REVIEWED";

  return (
    <button type="button" className="case-card" id={`case-card-${caseItem.analysis_id}`} onClick={() => navigate(`/investigation/${caseItem.analysis_id}`)}>
      <span className="case-card-topline">
        <span className="case-id">CASE {String(index + 1).padStart(3, "0")}</span>
        <span className={`case-status-badge ${reviewed ? "status-reviewed" : "status-pending"}`}>
          <i />{reviewed ? t("dashboard.status.reviewed") : t("dashboard.status.pending")}
        </span>
      </span>

      <span className="case-primary">
        <span className={`score-orb ${riskClass(caseItem.prediction_level)}`}><strong>{score}</strong><small>%</small></span>
        <span className="case-primary-copy">
          <span className="case-target-label">{t("dashboard.card.target")}</span>
          <span className="case-target-value" title={caseItem.target_transaction}>{shortHash(caseItem.target_transaction)}</span>
          <span className={`risk-pill ${riskClass(caseItem.prediction_level)}`}>{caseItem.prediction_level} RISK</span>
        </span>
      </span>

      <span className="score-track" aria-label={`${t("dashboard.card.score")} ${score}%`}>
        <span className={riskClass(caseItem.prediction_level)} style={{ width: `${score}%` }} />
      </span>

      <span className="case-card-footer">
        <span className="model-chip">
          <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M9 2.2 15 5.5v7L9 15.8l-6-3.3v-7L9 2.2Z" /><circle cx="9" cy="9" r="2" /></svg>
          {caseItem.model_name}
        </span>
        <span className="open-case">{t("dashboard.card.open")}<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" /></svg></span>
      </span>
    </button>
  );
}

function StatsBar({ cases }: { cases: CaseSummary[] }) {
  const { t } = useApp();
  const total = cases.length;
  const high = cases.filter((item) => item.prediction_level === "HIGH").length;
  const pending = cases.filter((item) => item.status === "PENDING_REVIEW").length;
  const reviewed = total - pending;
  const stats = [
    { label: t("dashboard.stats.total"), value: total, tone: "neutral" },
    { label: t("dashboard.stats.high"), value: high, tone: "danger" },
    { label: t("dashboard.stats.pending"), value: pending, tone: "warning" },
    { label: t("dashboard.stats.reviewed"), value: reviewed, tone: "success" },
  ];

  return (
    <section className="stats-grid" aria-label="Case statistics">
      {stats.map((stat) => (
        <div className={`stat-card ${stat.tone}`} key={stat.label}>
          <span className="stat-icon"><i /></span>
          <span><span className="stat-label">{stat.label}</span><strong className="stat-value">{stat.value}</strong></span>
        </div>
      ))}
    </section>
  );
}

export default function Dashboard() {
  const { t } = useApp();
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | "PENDING_REVIEW" | "REVIEWED">("ALL");

  useEffect(() => {
    getCases().then(setCases).catch((err: Error) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => cases.filter((item) => {
    const matchesQuery = `${item.analysis_id} ${item.target_transaction}`.toLowerCase().includes(query.trim().toLowerCase());
    return matchesQuery && (status === "ALL" || item.status === status);
  }), [cases, query, status]);

  if (loading) return <div className="loading-container" role="status"><div className="spinner" /><span>{t("dashboard.loading")}</span></div>;
  if (error) return <div className="error-container" role="alert"><h3>{t("dashboard.load_error")}</h3><p>{error}</p></div>;

  return (
    <main className="main-content" id="dashboard-main">
      <section className="dashboard-hero">
        <div>
          <span className="eyebrow"><i /> {t("dashboard.eyebrow")}</span>
          <h1 className="page-title">{t("dashboard.title")}</h1>
          <p className="page-subtitle">{t("dashboard.subtitle")}</p>
        </div>
        <div className="dataset-chip"><span>{t("dashboard.stats.source")}</span><strong>Bybit-BC</strong></div>
      </section>

      <StatsBar cases={cases} />

      <section className="case-section">
        <div className="section-heading">
          <div><h2>{t("dashboard.queue_title")}</h2><p>{t("dashboard.queue_desc")}</p></div>
          <div className="case-toolbar">
            <label className="search-field">
              <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.8" cy="8.8" r="5.3" /><path d="m12.7 12.7 4 4" /></svg>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("dashboard.search")} />
            </label>
            <div className="filter-tabs" role="group" aria-label="Status filter">
              {(["ALL", "PENDING_REVIEW", "REVIEWED"] as const).map((value) => (
                <button type="button" key={value} className={status === value ? "active" : ""} onClick={() => setStatus(value)}>
                  {value === "ALL" ? t("dashboard.filter.all") : value === "PENDING_REVIEW" ? t("dashboard.filter.pending") : t("dashboard.filter.reviewed")}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state"><span>⌕</span><h3>{t("dashboard.no_cases")}</h3><p>{t("dashboard.no_cases_desc")}</p></div>
        ) : (
          <div className="cases-grid" id="cases-grid">{filtered.map((item, index) => <CaseCard key={item.analysis_id} caseItem={item} index={index} />)}</div>
        )}
      </section>
    </main>
  );
}
