import { useRef, useState } from "react";
import { verifyReport } from "../services/api";
import { useApp } from "../i18n/context";

export default function Verify() {
  const { t } = useApp();
  const [fileData, setFileData] = useState<any>(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [verification, setVerification] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const readFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.report_id || !json.content) throw new Error("Invalid TraceLens Report JSON format.");
        setFileData(json); setFileName(file.name); setVerification(null); setError(null);
      } catch (err) { setError(err instanceof Error ? err.message : "Failed to parse JSON file."); setFileData(null); setFileName(""); }
    };
    reader.readAsText(file);
  };

  const handleVerify = async () => {
    if (!fileData) return;
    setLoading(true); setError(null);
    try { setVerification(await verifyReport(fileData)); }
    catch (err) { setError(err instanceof Error ? err.message : "Verification failed"); }
    finally { setLoading(false); }
  };

  const tone = verification?.status === "VERIFIED" ? "success" : verification?.status === "REVOKED" ? "warning" : "danger";
  const shortHash = (value?: string) => value && value.length > 30 ? `${value.slice(0, 16)}…${value.slice(-12)}` : value;

  return (
    <main className="main-content verify-page">
      <section className="verify-hero"><span className="hero-icon"><svg viewBox="0 0 28 28" aria-hidden="true"><path d="M14 3 23 7v6.2c0 6-3.8 10.3-9 12.7-5.2-2.4-9-6.7-9-12.7V7l9-4Z" /><path d="m10 14 2.6 2.6 5.6-6" /></svg></span><span className="eyebrow">REPORT INTEGRITY</span><h1 className="page-title">{t("verify.title")}</h1><p className="page-subtitle">{t("verify.subtitle")}</p></section>

      <div className="verify-workspace">
        <section
          className={`upload-zone ${dragging ? "dragging" : ""} ${fileData ? "has-file" : ""}`}
          role="button" tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click(); }}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => { event.preventDefault(); setDragging(false); readFile(event.dataTransfer.files[0]); }}
        >
          <span className="upload-icon"><svg viewBox="0 0 28 28" aria-hidden="true"><path d="M5 18v5h18v-5M14 20V5M8.5 10.5 14 5l5.5 5.5" /></svg></span>
          <h2>{fileData ? fileName : t("verify.upload")}</h2>
          <p>{fileData ? t("verify.replace_desc") : t("verify.upload_desc")}</p>
          <span className="file-type">JSON · MAX 5 MB</span>
          <input type="file" accept=".json,application/json" ref={fileInputRef} onChange={(event) => { readFile(event.target.files?.[0]); event.target.value = ""; }} />
        </section>

        {error && <div className="inline-alert danger">{error}<button type="button" onClick={() => setError(null)}>×</button></div>}

        {fileData && <section className="panel-section file-preview"><header className="panel-header"><div><span className="eyebrow">FILE CONTENT</span><h2>{t("verify.preview")}</h2></div><span className="ready-badge"><i />Ready</span></header><dl className="summary-list"><div><dt>{t("report.analysis_id")}</dt><dd>{fileData.report_id}</dd></div><div><dt>{t("report.target_tx")}</dt><dd><code title={fileData.content?.target_transaction}>{shortHash(fileData.content?.target_transaction)}</code></dd></div><div><dt>{t("dashboard.card.risk")}</dt><dd><span className={`risk-pill risk-${String(fileData.content?.prediction_level ?? "low").toLowerCase()}`}>{fileData.content?.prediction_level}</span></dd></div><div><dt>{t("report.hash_expected")}</dt><dd><code title={fileData.report_hash}>{shortHash(fileData.report_hash)}</code></dd></div></dl><button className="btn-primary verify-action" type="button" onClick={handleVerify} disabled={loading}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.4 16 5v4.1c0 4-2.5 6.9-6 8.5-3.5-1.6-6-4.5-6-8.5V5l6-2.6Z" /><path d="m7.2 9.8 1.8 1.8 3.8-4" /></svg>{loading ? t("report.processing") : t("verify.verify_btn")}</button></section>}

        {verification && <section className={`verification-result ${tone}`}><span className="verification-result-icon">{tone === "success" ? "✓" : tone === "warning" ? "!" : "×"}</span><div className="verification-result-copy"><span className="eyebrow">{t("verify.result")}</span><h2>{verification.status}</h2><p>{verification.message}</p><div className="hash-compare"><div><span>{t("verify.hash_file")}</span><code>{fileData.report_hash}</code></div><div><span>{t("verify.hash_content")}</span><code>{verification.current_hash}</code></div>{verification.on_chain_issuer && <div><span>{t("verify.on_chain_issuer")}</span><code>{verification.on_chain_issuer}</code></div>}</div></div></section>}
      </div>
    </main>
  );
}
