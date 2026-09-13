import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { generateReport, getCaseById } from "../services/api";
import type { AnalysisResult, RecommendedEdge } from "../types/analysis";
import type { Review } from "../types/review";
import GraphView from "../components/GraphView";
import { useApp } from "../i18n/context";

function shortHash(value: string) {
  return value.length > 26 ? `${value.slice(0, 14)}…${value.slice(-10)}` : value;
}

function scorePercent(score: number) {
  return Math.round((score <= 1 ? score * 100 : score) * 10) / 10;
}

function EdgeRoute({ edge }: { edge: Pick<RecommendedEdge, "source" | "target"> }) {
  return <span className="edge-route"><code title={edge.source}>{shortHash(edge.source)}</code><span>→</span><code title={edge.target}>{shortHash(edge.target)}</code></span>;
}

export default function Investigation() {
  const { t, theme } = useApp();
  const { analysisId } = useParams<{ analysisId: string }>();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState<AnalysisResult | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<{ source: string; target: string }>();
  const [reviewStatus, setReviewStatus] = useState<Review["status"] | "">("");
  const [memo, setMemo] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!analysisId) return;
    const stored = localStorage.getItem(`tracelens_reviews_${analysisId}`);
    if (stored) try { setReviews(JSON.parse(stored)); } catch { console.warn("Invalid locally stored reviews"); }
    getCaseById(analysisId).then(setCaseData).catch((err: Error) => setError(err.message)).finally(() => setLoading(false));
  }, [analysisId]);

  useEffect(() => {
    if (!selectedEdge) return;
    const existing = reviews.find((review) => review.edge_source === selectedEdge.source && review.edge_target === selectedEdge.target);
    setReviewStatus(existing?.status ?? "");
    setMemo(existing?.memo ?? "");
    setSaved(false);
  }, [selectedEdge, reviews]);

  const saveReview = () => {
    if (!selectedEdge || !analysisId || !reviewStatus) return;
    const value: Review = { analysis_id: analysisId, edge_source: selectedEdge.source, edge_target: selectedEdge.target, status: reviewStatus, memo };
    const next = [...reviews];
    const index = next.findIndex((review) => review.edge_source === selectedEdge.source && review.edge_target === selectedEdge.target);
    if (index >= 0) next[index] = value; else next.push(value);
    setReviews(next);
    localStorage.setItem(`tracelens_reviews_${analysisId}`, JSON.stringify(next));
    setSaved(true);
  };

  const createReport = async () => {
    if (!analysisId) return;
    try {
      const report = await generateReport(analysisId, reviews);
      navigate("/report", { state: { report } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report.");
    }
  };

  if (loading) return <div className="loading-container"><div className="spinner" /><span>Loading investigation…</span></div>;
  if (error || !caseData) return <div className="error-container"><h3>Case unavailable</h3><p>{error ?? "Case not found"}</p></div>;

  const prediction = scorePercent(caseData.prediction.score);
  const reviewed = caseData.status === "REVIEWED";

  return (
    <main className="investigation-layout">
      <div className="breadcrumb"><button type="button" onClick={() => navigate("/")}>{t("investigation.back")}</button><span>/</span><strong>{caseData.analysis_id}</strong></div>

      <section className="investigation-hero">
        <div className="investigation-heading">
          <div className="title-row"><h1>{t("investigation.title")}</h1><span className={`case-status-badge ${reviewed ? "status-reviewed" : "status-pending"}`}><i />{reviewed ? t("dashboard.status.reviewed") : t("dashboard.status.pending")}</span></div>
          <code className="transaction-hash" title={caseData.target_transaction}>{caseData.target_transaction}</code>
        </div>
        <button className="btn-primary report-action" type="button" onClick={createReport}>
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 2.5h7l3 3v12H5z" /><path d="M12 2.5v3h3M8 10h4M8 13h4" /></svg>
          {t("investigation.generate_report")}
        </button>
      </section>

      <section className="analysis-strip">
        <div className="analysis-score"><span>{t("investigation.risk_score")}</span><strong>{prediction}<small>%</small></strong></div>
        <div><span>{t("investigation.model")}</span><strong>{caseData.model.name}<small>v{caseData.model.version}</small></strong></div>
        <div><span>{t("report.dataset")}</span><strong>{caseData.dataset}</strong></div>
        <div><span>{t("investigation.review_progress")}</span><strong>{reviews.length}<small>/ {caseData.recommended_edges.length}</small></strong></div>
      </section>

      <div className="investigation-content">
        <section className="graph-panel">
          <header className="panel-header"><div><span className="eyebrow">GRAPH EXPLORER</span><h2>{t("investigation.graph")}</h2></div><span className="graph-count">{caseData.graph.nodes.length} nodes · {caseData.graph.edges.length} edges</span></header>
          <GraphView graph={caseData.graph} recommendedEdges={caseData.recommended_edges} selectedEdge={selectedEdge} onEdgeClick={(source, target) => setSelectedEdge({ source, target })} theme={theme} />
        </section>

        <aside className="side-panel">
          <section className="panel-section recommendation-panel">
            <header className="panel-header"><div><span className="eyebrow">AI LOCATOR</span><h2>{t("investigation.recommended")}</h2></div><span className="count-badge">{caseData.recommended_edges.length}</span></header>
            <p className="panel-intro">{t("investigation.note")}</p>
            <ol className="edge-list">
              {caseData.recommended_edges.map((edge) => {
                const active = selectedEdge?.source === edge.source && selectedEdge?.target === edge.target;
                const isReviewed = reviews.some((review) => review.edge_source === edge.source && review.edge_target === edge.target);
                return (
                  <li key={`${edge.source}-${edge.target}`}>
                    <button type="button" className={`edge-item ${active ? "selected" : ""}`} onClick={() => setSelectedEdge({ source: edge.source, target: edge.target })}>
                      <span className="edge-rank">#{edge.rank}</span>
                      <span className="edge-body"><EdgeRoute edge={edge} /><span className="edge-impact"><span>{t("investigation.drop")}</span><strong>{edge.score_drop}</strong></span></span>
                      {isReviewed && <span className="reviewed-check" title={t("dashboard.status.reviewed")}>✓</span>}
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className={`panel-section review-section ${selectedEdge ? "active" : "empty"}`}>
            <header className="panel-header"><div><span className="eyebrow">HUMAN REVIEW</span><h2>{t("investigation.review_title")}</h2></div></header>
            {!selectedEdge ? (
              <div className="review-placeholder"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v4H7zM5 5H3v16h18V5h-2M8 12h8M8 16h5" /></svg><p>{t("investigation.select_edge")}</p></div>
            ) : (
              <>
                <div className="selected-edge-card"><span>{t("dashboard.card.target")}</span><EdgeRoute edge={selectedEdge} /></div>
                <div className="form-group"><label htmlFor="review-status">{t("investigation.status")}</label><select id="review-status" value={reviewStatus} onChange={(event) => { setReviewStatus(event.target.value as Review["status"]); setSaved(false); }}><option value="">{t("investigation.status_select")}</option><option value="추가 조사 필요">{t("investigation.status_needs_investigation")}</option><option value="특이사항 없음">{t("investigation.status_clear")}</option><option value="보류">{t("investigation.status_hold")}</option></select></div>
                <div className="form-group"><label htmlFor="review-memo">{t("investigation.memo")}</label><textarea id="review-memo" value={memo} onChange={(event) => { setMemo(event.target.value); setSaved(false); }} placeholder={t("investigation.memo_placeholder")} rows={4} /></div>
                <button className="btn-primary save-review" type="button" disabled={!reviewStatus} onClick={saveReview}>{saved ? `✓ ${t("investigation.saved")}` : t("investigation.save_review")}</button>
              </>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
