import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { DEMO_MODE, getAttestation, issueReport, revokeReport, verifyReport } from "../services/api";
import type { ReportResponse } from "../types/report";
import { useApp } from "../i18n/context";

function shortHash(value: string) {
  return value.length > 28 ? `${value.slice(0, 14)}…${value.slice(-10)}` : value;
}

export default function Report() {
  const { t } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const report = location.state?.report as ReportResponse | null;
  const [attestation, setAttestation] = useState<any>(null);
  const [verification, setVerification] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!report) {
      setError("No report data found. Please generate the report from the investigation page again.");
      setLoading(false);
      return;
    }
    getAttestation(report.report_hash).catch(() => null).then(setAttestation).finally(() => setLoading(false));
  }, [report]);

  const refreshAttestation = async () => {
    if (report) setAttestation(await getAttestation(report.report_hash));
  };

  const handleIssue = async () => {
    if (!report) return;
    setActionLoading(true);
    try { await issueReport(report.report_id, report.report_hash); await refreshAttestation(); setVerification(null); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to issue report"); }
    finally { setActionLoading(false); }
  };

  const handleVerify = async () => {
    if (!report) return;
    setActionLoading(true);
    try { setVerification(await verifyReport(report)); await refreshAttestation(); }
    catch (err) { setError(err instanceof Error ? err.message : "Verification failed"); }
    finally { setActionLoading(false); }
  };

  const handleRevoke = async () => {
    if (!report || !window.confirm("Are you sure you want to revoke this report on the blockchain? This action cannot be undone.")) return;
    setActionLoading(true);
    try { await revokeReport(report.report_id, report.report_hash); await refreshAttestation(); setVerification(null); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to revoke report"); }
    finally { setActionLoading(false); }
  };

  const handleDownload = () => {
    if (!report) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `tracelens-report-${report.report_id}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="loading-container"><div className="spinner" /><span>Loading report…</span></div>;
  if (error && !report) return <div className="error-container"><h3>Report unavailable</h3><p>{error}</p></div>;
  if (!report) return null;

  const content = report.content;
  const isIssued = Boolean(attestation?.is_issued);
  const isRevoked = Boolean(attestation?.revoked);
  const proofStatus = isRevoked ? "revoked" : isIssued ? "active" : "not-issued";
  const proofLabel = isRevoked ? "REVOKED" : isIssued ? "ACTIVE" : "NOT ISSUED";
  const verificationTone = verification?.status === "VERIFIED" ? "success" : verification?.status === "REVOKED" ? "warning" : verification ? "danger" : "";

  const translatedStatus = (status: string) => status === "추가 조사 필요" ? t("investigation.status_needs_investigation") : status === "특이사항 없음" ? t("investigation.status_clear") : status === "보류" ? t("investigation.status_hold") : status || "N/A";

  return (
    <main className="main-content report-page">
      <div className="breadcrumb"><button type="button" onClick={() => navigate(-1)}>{t("report.back")}</button><span>/</span><strong>{report.report_id}</strong></div>
      <section className="report-hero">
        <div><span className="eyebrow"><i /> INVESTIGATION OUTPUT</span><h1 className="page-title">{t("report.title")}</h1><p className="page-subtitle">{t("report.generated")} {new Date(report.generated_at).toLocaleString()}</p></div>
        <button className="btn-secondary" type="button" onClick={handleDownload}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.5v10M6 9l4 4 4-4M3 16.5h14" /></svg>{t("report.export")}</button>
      </section>

      {error && <div className="inline-alert danger">{error}<button type="button" onClick={() => setError(null)}>×</button></div>}

      <section className="proof-card">
        <div className="proof-main">
          <div className="proof-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 8 4.5v11L12 22l-8-4.5v-11L12 2Z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></svg></div>
          <div className="proof-copy"><span className="eyebrow">{t("report.attestation")}</span><div><span className={`badge-status ${proofStatus}`}><i />{proofLabel}</span>{attestation?.issuer && <span className="issuer">{t("report.issuer")} <code>{shortHash(attestation.issuer)}</code></span>}</div><p>{DEMO_MODE ? t("report.demo_note") : t("report.proof_desc")}</p></div>
          <div className="proof-actions">
            {!DEMO_MODE && !isIssued && <button className="btn-primary" type="button" onClick={handleIssue} disabled={actionLoading}>{t("report.issue_btn")}</button>}
            {!DEMO_MODE && isIssued && !isRevoked && <button className="btn-danger-outline" type="button" onClick={handleRevoke} disabled={actionLoading}>{t("report.revoke_btn")}</button>}
            <button className="btn-secondary" type="button" onClick={handleVerify} disabled={actionLoading}>{actionLoading ? t("report.processing") : DEMO_MODE ? t("report.verify_local_btn") : t("report.verify_btn")}</button>
          </div>
        </div>
        {verification && <div className={`verification-banner ${verificationTone}`}><span className="result-icon">{verificationTone === "success" ? "✓" : verificationTone === "warning" ? "!" : "×"}</span><div><strong>{t("report.verify_result")} {verification.status}</strong><p>{verification.message}</p>{verification.status === "TAMPERED" && <code>{t("report.hash_computed")} {verification.current_hash}</code>}</div></div>}
        <div className="hash-row"><span>{t("report.hash_title")}</span><code>{report.report_hash}</code></div>
      </section>

      <div className="report-content-grid">
        <section className="panel-section summary-panel">
          <header className="panel-header"><div><span className="eyebrow">CASE METADATA</span><h2>{t("report.summary")}</h2></div><span className={`risk-pill risk-${content.prediction_level.toLowerCase()}`}>{content.prediction_level} RISK</span></header>
          <dl className="summary-list">
            <div><dt>{t("report.analysis_id")}</dt><dd>{content.analysis_id}</dd></div>
            <div><dt>{t("report.target_tx")}</dt><dd><code title={content.target_transaction}>{shortHash(content.target_transaction)}</code></dd></div>
            <div><dt>{t("report.dataset")}</dt><dd>{content.dataset}</dd></div>
            <div><dt>{t("report.model")}</dt><dd>{content.model_name} <span>v{content.model_version}</span></dd></div>
            <div className="score-summary"><dt>{t("report.ai_score")}</dt><dd>{Math.round(content.prediction_score * 1000) / 10}<small>%</small></dd></div>
          </dl>
        </section>

        <section className="panel-section report-edges">
          <header className="panel-header"><div><span className="eyebrow">AI LOCATOR</span><h2>{t("report.recommended")}</h2></div><span className="count-badge">{content.recommended_edges.length}</span></header>
          {content.recommended_edges.length === 0 ? <p className="muted-copy">{t("report.no_edges")}</p> : <ol className="edge-list">{content.recommended_edges.map((edge) => <li key={`${edge.source}-${edge.target}`}><div className="edge-item static"><span className="edge-rank">#{edge.rank}</span><span className="edge-body"><span className="edge-route"><code>{shortHash(edge.source)}</code><span>→</span><code>{shortHash(edge.target)}</code></span><span className="edge-impact"><span>{t("investigation.drop")}</span><strong>{edge.score_drop}</strong></span></span></div></li>)}</ol>}
        </section>

        <section className="panel-section reviews-panel">
          <header className="panel-header"><div><span className="eyebrow">HUMAN DECISION LOG</span><h2>{t("report.reviews")}</h2></div><span className="count-badge">{content.reviews.length}</span></header>
          {content.reviews.length === 0 ? <div className="review-empty"><p>{t("report.no_reviews")}</p></div> : <div className="review-log">{content.reviews.map((review, index) => <article className="review-record" key={`${review.edge_source}-${review.edge_target}-${index}`}><span className="review-index">{String(index + 1).padStart(2, "0")}</span><div><div className="edge-route"><code>{shortHash(review.edge_source)}</code><span>→</span><code>{shortHash(review.edge_target)}</code></div><div className="review-detail"><span><small>{t("investigation.status")}</small><strong>{translatedStatus(review.status)}</strong></span><span><small>{t("investigation.memo")}</small><p>{review.memo || "—"}</p></span></div></div></article>)}</div>}
        </section>
      </div>
    </main>
  );
}
