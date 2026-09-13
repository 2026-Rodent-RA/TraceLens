// frontend/src/pages/Report.tsx
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  DEMO_MODE,
  getAttestation,
  issueReport,
  verifyReport,
  revokeReport,
} from "../services/api";
import type { ReportResponse } from "../types/report";
import { useApp } from "../i18n/context";

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
    
    getAttestation(report.report_hash).catch(err => {
      console.warn("Attestation not found or error:", err);
      return null;
    })
    .then(attData => {
      setAttestation(attData);
    })
    .finally(() => setLoading(false));
  }, [report]);

  const handleIssue = async () => {
    if (!report) return;
    setActionLoading(true);
    try {
      await issueReport(report.report_id, report.report_hash);
      const newAtt = await getAttestation(report.report_hash);
      setAttestation(newAtt);
      setVerification(null);
    } catch (err: any) {
      alert("Failed to issue report:\n" + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!report) return;
    setActionLoading(true);
    try {
      const res = await verifyReport(report);
      setVerification(res);
      const newAtt = await getAttestation(report.report_hash);
      setAttestation(newAtt);
    } catch (err: any) {
      alert("Verification failed:\n" + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!report) return;
    if (!window.confirm("Are you sure you want to revoke this report on the blockchain? This action cannot be undone.")) return;
    
    setActionLoading(true);
    try {
      await revokeReport(report.report_id, report.report_hash);
      const newAtt = await getAttestation(report.report_hash);
      setAttestation(newAtt);
      setVerification(null);
    } catch (err: any) {
      alert("Failed to revoke report:\n" + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownload = () => {
    if (!report) return;
    const jsonStr = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `tracelens-report-${report.report_id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="loading-container">Loading Report...</div>;
  if (error || !report) return <div className="error-container">{error || "Failed to load report"}</div>;

  const content = report.content;
  const isIssued = attestation?.is_issued;
  const isRevoked = attestation?.revoked;

  return (
    <main className="main-content">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "var(--space-4)" }}>
        <div>
          <button className="btn-back" onClick={() => navigate(-1)} style={{ marginBottom: "var(--space-4)" }}>&larr; {t("report.back")}</button>
          <h1 className="page-title">{t("report.title")}</h1>
          <p className="page-subtitle">ID: {report.report_id} | {t("report.generated")} {new Date(report.generated_at).toLocaleString()}</p>
        </div>
        <button 
          className="btn-secondary" 
          onClick={handleDownload}
          style={{ gap: "var(--space-2)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          {t("report.export")}
        </button>
      </div>

      <div className="blockchain-proof-banner" style={{ 
        background: "var(--color-bg-elevated)", 
        border: "1px solid var(--color-border)", 
        padding: "var(--space-4)", 
        borderRadius: "var(--radius-lg)", 
        marginBottom: "var(--space-6)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", textTransform: "uppercase", marginBottom: "var(--space-1)" }}>
              {t("report.attestation")}
            </div>
            <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
              {isIssued ? (
                isRevoked ? (
                  <span className="badge-status revoked">REVOKED</span>
                ) : (
                  <span className="badge-status active">ACTIVE</span>
                )
              ) : (
                <span className="badge-status not-issued">NOT ISSUED</span>
              )}
              
              {attestation?.issuer && (
                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                  {t("report.issuer")} <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-text-primary)" }}>{attestation.issuer}</span>
                </span>
              )}
            </div>
          </div>
          
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            {!DEMO_MODE && !isIssued && (
              <button className="btn-primary" onClick={handleIssue} disabled={actionLoading}>
                {actionLoading ? "Processing..." : t("report.issue_btn")}
              </button>
            )}
            {!DEMO_MODE && isIssued && !isRevoked && (
              <button className="btn-secondary" onClick={handleRevoke} disabled={actionLoading} style={{ color: "var(--color-risk-high)", borderColor: "var(--color-risk-high)" }}>
                {t("report.revoke_btn")}
              </button>
            )}
            <button className="btn-secondary" onClick={handleVerify} disabled={actionLoading}>
              {DEMO_MODE ? t("report.verify_local_btn") : t("report.verify_btn")}
            </button>
          </div>
        </div>

        {DEMO_MODE && (
          <div style={{
            fontSize: "var(--text-sm)",
            color: "var(--color-text-secondary)",
            background: "var(--color-bg-surface)",
            padding: "var(--space-3)",
            borderRadius: "var(--radius-md)",
          }}>
            {t("report.demo_note")}
          </div>
        )}
        
        {verification && (
          <div style={{
            background: verification.status === "VERIFIED" ? "rgba(0, 255, 128, 0.1)" 
                       : verification.status === "REVOKED" ? "rgba(255, 165, 0, 0.1)"
                       : "rgba(255, 0, 0, 0.1)",
            border: `1px solid ${verification.status === "VERIFIED" ? "var(--color-risk-low)" 
                               : verification.status === "REVOKED" ? "orange"
                               : "var(--color-risk-high)"}`,
            padding: "var(--space-3)",
            borderRadius: "var(--radius-md)"
          }}>
            <div style={{ fontWeight: 600, marginBottom: "var(--space-1)", color: verification.status === "VERIFIED" ? "var(--color-risk-low)" : "var(--color-risk-high)" }}>
              {t("report.verify_result")} {verification.status}
            </div>
            <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-primary)" }}>
              {verification.message}
            </div>
            {verification.status === "TAMPERED" && (
              <div style={{ marginTop: "var(--space-2)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                {t("report.hash_expected")} {report.report_hash}<br/>
                {t("report.hash_computed")} {verification.current_hash}
              </div>
            )}
          </div>
        )}

        <div style={{ borderTop: "1px solid var(--color-border-subtle)", paddingTop: "var(--space-3)", marginTop: "var(--space-2)" }}>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", textTransform: "uppercase", marginBottom: "var(--space-1)" }}>
            {t("report.hash_title")}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--color-accent-blue)", wordBreak: "break-all" }}>
            {report.report_hash}
          </div>
        </div>
      </div>

      <div className="report-content-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-6)" }}>
        
        <div className="panel-section">
          <h3>{t("report.summary")}</h3>
          <table className="report-table" style={{ width: "100%", textAlign: "left", fontSize: "var(--text-sm)" }}>
            <tbody>
              <tr><th style={{ padding: "var(--space-2) 0", color: "var(--color-text-secondary)" }}>{t("report.analysis_id")}</th><td>{content.analysis_id}</td></tr>
              <tr><th style={{ padding: "var(--space-2) 0", color: "var(--color-text-secondary)" }}>{t("report.target_tx")}</th><td>{content.target_transaction}</td></tr>
              <tr><th style={{ padding: "var(--space-2) 0", color: "var(--color-text-secondary)" }}>{t("report.dataset")}</th><td>{content.dataset}</td></tr>
              <tr><th style={{ padding: "var(--space-2) 0", color: "var(--color-text-secondary)" }}>{t("report.model")}</th><td>{content.model_name} ({content.model_version})</td></tr>
              <tr><th style={{ padding: "var(--space-2) 0", color: "var(--color-text-secondary)" }}>{t("report.ai_score")}</th><td><strong style={{ color: "var(--color-risk-high)" }}>{content.prediction_score} ({content.prediction_level})</strong></td></tr>
            </tbody>
          </table>
        </div>

        <div className="panel-section">
          <h3>{t("report.recommended")}</h3>
          {content.recommended_edges.length === 0 ? (
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>{t("report.no_edges")}</p>
          ) : (
            <ul className="edge-list">
              {content.recommended_edges.map(e => (
                <li key={`${e.source}-${e.target}`} className="edge-item" style={{ cursor: "default" }}>
                  <strong>{t("investigation.rank")} {e.rank}</strong>: {e.source} &rarr; {e.target}
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>{t("investigation.drop")}: {e.score_drop}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel-section" style={{ gridColumn: "1 / -1" }}>
          <h3>{t("report.reviews")}</h3>
          {content.reviews.length === 0 ? (
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>{t("report.no_reviews")}</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              {content.reviews.map((r, i) => (
                <div key={i} style={{ background: "var(--color-bg-surface)", padding: "var(--space-4)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border-subtle)" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", marginBottom: "var(--space-2)" }}>
                    {r.edge_source} &rarr; {r.edge_target}
                  </div>
                  <div style={{ display: "flex", gap: "var(--space-4)", fontSize: "var(--text-sm)" }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ color: "var(--color-text-secondary)", display: "block", fontSize: "var(--text-xs)" }}>{t("investigation.status")}</span>
                      <strong style={{ color: "var(--color-text-primary)" }}>
                        {r.status === "추가 조사 필요" ? t("investigation.status_needs_investigation") :
                         r.status === "특이사항 없음" ? t("investigation.status_clear") :
                         r.status === "보류" ? t("investigation.status_hold") : r.status || "N/A"}
                      </strong>
                    </div>
                    <div style={{ flex: 3 }}>
                      <span style={{ color: "var(--color-text-secondary)", display: "block", fontSize: "var(--text-xs)" }}>{t("investigation.memo")}</span>
                      <span style={{ color: "var(--color-text-primary)", whiteSpace: "pre-wrap" }}>{r.memo || "No memo"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
