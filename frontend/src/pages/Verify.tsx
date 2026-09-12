// frontend/src/pages/Verify.tsx
import { useState, useRef } from "react";
import { verifyExternalReport } from "../services/api";

export default function Verify() {
  const [fileData, setFileData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [verification, setVerification] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.report_id || !json.content) {
          throw new Error("Invalid TraceLens Report JSON format.");
        }
        setFileData(json);
        setVerification(null);
        setError(null);
      } catch (err: any) {
        setError(err.message || "Failed to parse JSON file.");
        setFileData(null);
      }
    };
    reader.readAsText(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleVerify = async () => {
    if (!fileData) return;
    setLoading(true);
    setError(null);
    try {
      const res = await verifyExternalReport(fileData);
      setVerification(res);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getVerificationColor = (status: string) => {
    if (status === "VERIFIED") return "var(--color-risk-low)";
    if (status === "REVOKED") return "orange";
    return "var(--color-risk-high)";
  };

  return (
    <main className="main-content">
      <div className="page-header" style={{ marginBottom: "var(--space-6)" }}>
        <h1 className="page-title">External Report Verification</h1>
        <p className="page-subtitle">Verify an Investigation Report JSON file provided by another institution.</p>
      </div>

      <div style={{ 
        display: "flex", 
        flexDirection: "column", 
        gap: "var(--space-6)",
        maxWidth: "800px",
        margin: "0 auto"
      }}>
        {/* File Upload Section */}
        <div style={{
          border: "2px dashed var(--color-border)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-8)",
          textAlign: "center",
          background: "var(--color-bg-elevated)",
          cursor: "pointer",
          transition: "all 0.2s"
        }} onClick={() => fileInputRef.current?.click()}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "var(--space-4)" }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <h3 style={{ marginBottom: "var(--space-2)" }}>Upload Report JSON</h3>
          <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>Click to browse or drag and drop a TraceLens Report file</p>
          <input 
            type="file" 
            accept=".json" 
            ref={fileInputRef} 
            onChange={handleFileUpload}
            style={{ display: "none" }}
          />
        </div>

        {error && (
          <div className="error-container">
            {error}
          </div>
        )}

        {/* File Preview Section */}
        {fileData && (
          <div className="panel-section" style={{ background: "var(--color-bg-elevated)" }}>
            <h3 style={{ borderBottom: "1px solid var(--color-border)", paddingBottom: "var(--space-2)", marginBottom: "var(--space-4)" }}>
              Report Preview
            </h3>
            <table className="report-table" style={{ width: "100%", textAlign: "left", fontSize: "var(--text-sm)", marginBottom: "var(--space-6)" }}>
              <tbody>
                <tr><th style={{ padding: "var(--space-2) 0", color: "var(--color-text-secondary)" }}>Report ID</th><td>{fileData.report_id}</td></tr>
                <tr><th style={{ padding: "var(--space-2) 0", color: "var(--color-text-secondary)" }}>Target Transaction</th><td>{fileData.content?.target_transaction}</td></tr>
                <tr><th style={{ padding: "var(--space-2) 0", color: "var(--color-text-secondary)" }}>Risk Level</th><td>{fileData.content?.prediction_level}</td></tr>
                <tr><th style={{ padding: "var(--space-2) 0", color: "var(--color-text-secondary)" }}>Expected Hash</th><td style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>{fileData.report_hash}</td></tr>
              </tbody>
            </table>

            <div style={{ display: "flex", justifyContent: "center" }}>
              <button 
                className="btn-primary" 
                style={{ padding: "var(--space-3) var(--space-8)", fontSize: "var(--text-base)" }}
                onClick={handleVerify}
                disabled={loading}
              >
                {loading ? "Verifying..." : "Verify via Blockchain"}
              </button>
            </div>
          </div>
        )}

        {/* Verification Result Section */}
        {verification && (
          <div style={{
            background: `color-mix(in srgb, ${getVerificationColor(verification.status)} 10%, transparent)`,
            border: `1px solid ${getVerificationColor(verification.status)}`,
            padding: "var(--space-6)",
            borderRadius: "var(--radius-lg)"
          }}>
            <h2 style={{ 
              color: getVerificationColor(verification.status), 
              marginBottom: "var(--space-2)",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)"
            }}>
              {verification.status === "VERIFIED" && "✅ "}
              {verification.status === "REVOKED" && "⚠️ "}
              {(verification.status === "TAMPERED" || verification.status === "HASH_MISMATCH" || verification.status === "NOT_VERIFIED") && "❌ "}
              Result: {verification.status}
            </h2>
            <p style={{ color: "var(--color-text-primary)", fontSize: "var(--text-base)", marginBottom: "var(--space-4)" }}>
              {verification.message}
            </p>
            
            <div style={{ background: "var(--color-bg-base)", padding: "var(--space-4)", borderRadius: "var(--radius-md)", fontSize: "var(--text-sm)", fontFamily: "var(--font-mono)" }}>
              <div style={{ marginBottom: "var(--space-2)" }}>
                <strong style={{ color: "var(--color-text-secondary)" }}>Expected Hash (from file):</strong><br/>
                {fileData.report_hash}
              </div>
              <div style={{ marginBottom: "var(--space-2)" }}>
                <strong style={{ color: "var(--color-text-secondary)" }}>Computed Hash (from content):</strong><br/>
                <span style={{ color: verification.current_hash === fileData.report_hash ? "var(--color-text-primary)" : "var(--color-risk-high)" }}>
                  {verification.current_hash}
                </span>
              </div>
              
              {verification.on_chain_issuer && (
                <div style={{ marginTop: "var(--space-4)" }}>
                  <strong style={{ color: "var(--color-text-secondary)" }}>On-Chain Issuer:</strong><br/>
                  {verification.on_chain_issuer}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
