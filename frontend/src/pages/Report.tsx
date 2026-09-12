// frontend/src/pages/Report.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getReport, getAttestation, issueReport, verifyReport, revokeReport } from "../services/api";
import type { ReportResponse } from "../types/report";

export default function Report() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<ReportResponse | null>(null);
  
  // Blockchain State
  const [attestation, setAttestation] = useState<any>(null);
  const [verification, setVerification] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId) return;
    
    // Load Report & Attestation in parallel
    Promise.all([
      getReport(reportId),
      getAttestation(reportId).catch(err => {
        console.warn("Attestation not found or error:", err);
        return null;
      })
    ])
      .then(([reportData, attData]) => {
        setReport(reportData);
        setAttestation(attData);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [reportId]);

  const handleIssue = async () => {
    if (!reportId) return;
    setActionLoading(true);
    try {
      await issueReport(reportId);
      // Reload attestation
      const newAtt = await getAttestation(reportId);
      setAttestation(newAtt);
      setVerification(null);
    } catch (err: any) {
      alert("Failed to issue report:\n" + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!reportId) return;
    setActionLoading(true);
    try {
      const res = await verifyReport(reportId);
      setVerification(res);
      // Update attestation as well
      const newAtt = await getAttestation(reportId);
      setAttestation(newAtt);
    } catch (err: any) {
      alert("Verification failed:\n" + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!reportId) return;
    if (!window.confirm("Are you sure you want to revoke this report on the blockchain? This action cannot be undone.")) return;
    
    setActionLoading(true);
    try {
      await revokeReport(reportId);
      const newAtt = await getAttestation(reportId);
      setAttestation(newAtt);
      setVerification(null);
    } catch (err: any) {
      alert("Failed to revoke report:\n" + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="loading-container">Loading Report...</div>;
  if (error || !report) return <div className="error-container">Failed to load report: {error}</div>;

  const content = report.content;
  const isIssued = attestation?.is_issued;
  const isRevoked = attestation?.revoked;

  return (
    <main className="main-content">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <button className="btn-back" onClick={() => navigate(-1)} style={{ marginBottom: "var(--space-4)" }}>&larr; Back</button>
          <h1 className="page-title">Investigation Report</h1>
          <p className="page-subtitle">ID: {report.report_id} | Generated: {new Date(report.generated_at).toLocaleString()}</p>
        </div>
      </div>

      {/* Blockchain Proof Section */}
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
              Blockchain Attestation
            </div>
            <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
              {isIssued ? (
                isRevoked ? (
                  <span className="badge" style={{ background: "var(--color-risk-high)", color: "white" }}>REVOKED</span>
                ) : (
                  <span className="badge" style={{ background: "var(--color-risk-low)", color: "var(--color-bg-base)" }}>ACTIVE</span>
                )
              ) : (
                <span className="badge" style={{ background: "var(--color-bg-surface)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }}>NOT ISSUED</span>
              )}
              
              {attestation?.issuer && (
                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                  Issuer: <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-text-primary)" }}>{attestation.issuer}</span>
                </span>
              )}
            </div>
          </div>
          
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            {!isIssued && (
              <button className="btn-primary" onClick={handleIssue} disabled={actionLoading}>
                {actionLoading ? "Processing..." : "Issue on Blockchain"}
              </button>
            )}
            {isIssued && !isRevoked && (
              <button className="btn-secondary" onClick={handleRevoke} disabled={actionLoading} style={{ color: "var(--color-risk-high)", borderColor: "var(--color-risk-high)" }}>
                Revoke Report
              </button>
            )}
            <button className="btn-secondary" onClick={handleVerify} disabled={actionLoading}>
              Verify Integrity
            </button>
          </div>
        </div>
        
        {/* Verification Result Panel */}
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
              Verification Result: {verification.status}
            </div>
            <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-primary)" }}>
              {verification.message}
            </div>
            {verification.status === "TAMPERED" && (
              <div style={{ marginTop: "var(--space-2)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                Expected Hash: {report.report_hash}<br/>
                Computed Hash: {verification.current_hash}
              </div>
            )}
          </div>
        )}

        {/* Hash Details */}
        <div style={{ borderTop: "1px solid var(--color-border-subtle)", paddingTop: "var(--space-3)", marginTop: "var(--space-2)" }}>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", textTransform: "uppercase", marginBottom: "var(--space-1)" }}>
            Report Hash (SHA-256)
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--color-accent-blue)", wordBreak: "break-all" }}>
            {report.report_hash}
          </div>
        </div>
      </div>

      <div className="report-content-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-6)" }}>
        
        {/* Left Column: Core Analysis */}
        <div className="panel-section">
          <h3>Analysis Summary</h3>
          <table className="report-table" style={{ width: "100%", textAlign: "left", fontSize: "var(--text-sm)" }}>
            <tbody>
              <tr><th style={{ padding: "var(--space-2) 0", color: "var(--color-text-secondary)" }}>Analysis ID</th><td>{content.analysis_id}</td></tr>
              <tr><th style={{ padding: "var(--space-2) 0", color: "var(--color-text-secondary)" }}>Target TX</th><td>{content.target_transaction}</td></tr>
              <tr><th style={{ padding: "var(--space-2) 0", color: "var(--color-text-secondary)" }}>Dataset</th><td>{content.dataset}</td></tr>
              <tr><th style={{ padding: "var(--space-2) 0", color: "var(--color-text-secondary)" }}>Model</th><td>{content.model_name} ({content.model_version})</td></tr>
              <tr><th style={{ padding: "var(--space-2) 0", color: "var(--color-text-secondary)" }}>AI Score</th><td><strong style={{ color: "var(--color-risk-high)" }}>{content.prediction_score} ({content.prediction_level})</strong></td></tr>
            </tbody>
          </table>
        </div>

        {/* Right Column: Recommended Edges */}
        <div className="panel-section">
          <h3>Recommended Edges</h3>
          {content.recommended_edges.length === 0 ? (
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>No edges recommended.</p>
          ) : (
            <ul className="edge-list">
              {content.recommended_edges.map(e => (
                <li key={`${e.source}-${e.target}`} className="edge-item" style={{ cursor: "default" }}>
                  <strong>Rank {e.rank}</strong>: {e.source} &rarr; {e.target}
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>Score Drop: {e.score_drop}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Full Width: Reviews */}
        <div className="panel-section" style={{ gridColumn: "1 / -1" }}>
          <h3>Investigator Reviews</h3>
          {content.reviews.length === 0 ? (
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>No reviews provided for this case.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              {content.reviews.map((r, i) => (
                <div key={i} style={{ background: "var(--color-bg-surface)", padding: "var(--space-4)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border-subtle)" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", marginBottom: "var(--space-2)" }}>
                    {r.edge_source} &rarr; {r.edge_target}
                  </div>
                  <div style={{ display: "flex", gap: "var(--space-4)", fontSize: "var(--text-sm)" }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ color: "var(--color-text-secondary)", display: "block", fontSize: "var(--text-xs)" }}>Status</span>
                      <strong style={{ color: "var(--color-text-primary)" }}>{r.status || "N/A"}</strong>
                    </div>
                    <div style={{ flex: 3 }}>
                      <span style={{ color: "var(--color-text-secondary)", display: "block", fontSize: "var(--text-xs)" }}>Memo</span>
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
