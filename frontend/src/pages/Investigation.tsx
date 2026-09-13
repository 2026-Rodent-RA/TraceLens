// frontend/src/pages/Investigation.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCaseById, generateReport } from "../services/api";
import type { AnalysisResult } from "../types/analysis";
import type { Review } from "../types/review";
import GraphView from "../components/GraphView";
import { useApp } from "../i18n/context";

export default function Investigation() {
  const { t } = useApp();
  const { analysisId } = useParams<{ analysisId: string }>();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState<AnalysisResult | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEdge, setSelectedEdge] = useState<{ source: string; target: string } | undefined>();
  const [reviewStatus, setReviewStatus] = useState<Review["status"] | "">("");
  const [memo, setMemo] = useState("");

  useEffect(() => {
    if (!analysisId) return;
    const localReviewsStr = localStorage.getItem(`tracelens_reviews_${analysisId}`);
    if (localReviewsStr) {
      try {
        setReviews(JSON.parse(localReviewsStr));
      } catch (e) {
        console.error("Failed to parse local reviews");
      }
    }

    getCaseById(analysisId)
      .then(res => setCaseData(res))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [analysisId]);

  useEffect(() => {
    if (selectedEdge) {
      const existing = reviews.find(r => r.edge_source === selectedEdge.source && r.edge_target === selectedEdge.target);
      if (existing) {
        setReviewStatus(existing.status);
        setMemo(existing.memo);
      } else {
        setReviewStatus("");
        setMemo("");
      }
    }
  }, [selectedEdge, reviews]);

  const handleSaveReview = () => {
    if (!selectedEdge || !analysisId) return;
    const reviewData: Review = {
      analysis_id: analysisId,
      edge_source: selectedEdge.source,
      edge_target: selectedEdge.target,
      status: reviewStatus as any,
      memo: memo,
    };
    
    let newReviews = [...reviews];
    const idx = newReviews.findIndex(r => r.edge_source === selectedEdge.source && r.edge_target === selectedEdge.target);
    if (idx >= 0) {
      newReviews[idx] = reviewData;
    } else {
      newReviews.push(reviewData);
    }
    
    setReviews(newReviews);
    localStorage.setItem(`tracelens_reviews_${analysisId}`, JSON.stringify(newReviews));
    alert(t("investigation.save_review") + " - OK");
  };

  if (loading) return <div className="loading-container">Loading...</div>;
  if (!caseData) return <div className="error-container">Case not found</div>;

  return (
    <main className="investigation-layout">
      <div className="investigation-header" style={{ justifyContent: "space-between", alignItems: "flex-end", paddingBottom: "var(--space-2)" }}>
        <div>
          <button className="btn-back" onClick={() => navigate("/")} style={{ marginBottom: "var(--space-2)" }}>&larr; {t("investigation.back")}</button>
          <h2 style={{ fontSize: "var(--text-2xl)", color: "var(--color-text-primary)", margin: "0 0 var(--space-2) 0" }}>
            {t("investigation.title")} {caseData.target_transaction}
          </h2>
          <span className={`case-status-badge ${caseData.status === "REVIEWED" ? "status-reviewed" : "status-pending"}`}>
            {caseData.status}
          </span>
        </div>
        <button 
          className="btn-open" 
          style={{ padding: "var(--space-3) var(--space-6)" }}
          onClick={async () => {
            try {
              const res = await generateReport(analysisId!, reviews);
              navigate(`/report`, { state: { report: res } });
            } catch (err) {
              alert("Failed to generate report.");
              console.error(err);
            }
          }}
        >
          {t("investigation.generate_report")}
        </button>
      </div>

      <div className="investigation-content">
        <div className="graph-panel">
          <h3>{t("investigation.graph")}</h3>
          <GraphView 
            graph={caseData.graph} 
            recommendedEdges={caseData.recommended_edges} 
            onEdgeClick={(source, target) => setSelectedEdge({ source, target })}
            selectedEdge={selectedEdge}
          />
        </div>

        <div className="side-panel">
          <div className="panel-section">
            <h3>{t("investigation.ai_analysis")}</h3>
            <div className="metrics-grid">
              <div>
                <div className="metric-label">{t("investigation.risk_score")}</div>
                <div className="metric-value">{caseData.prediction.score} ({caseData.prediction.level})</div>
              </div>
              <div>
                <div className="metric-label">{t("investigation.model")}</div>
                <div className="metric-value">{caseData.model.name}</div>
              </div>
            </div>
          </div>

          <div className="panel-section">
            <h3>{t("investigation.recommended")}</h3>
            <ul className="edge-list">
              {caseData.recommended_edges.map(e => (
                <li key={`${e.source}-${e.target}`} 
                    className={`edge-item ${selectedEdge?.source === e.source && selectedEdge?.target === e.target ? 'selected' : ''}`}
                    onClick={() => setSelectedEdge({ source: e.source, target: e.target })}>
                  <strong>{t("investigation.rank")} {e.rank}</strong>: {e.source} &rarr; {e.target} ({t("investigation.drop")}: {e.score_drop})
                </li>
              ))}
            </ul>
            <p className="ai-note">{t("investigation.note")}</p>
          </div>

          {selectedEdge && (
            <div className="panel-section review-section">
              <h3>{t("investigation.review_title")}</h3>
              <p className="selected-edge-info">{selectedEdge.source} &rarr; {selectedEdge.target}</p>
              
              <div className="form-group">
                <label>{t("investigation.status")}</label>
                <select value={reviewStatus} onChange={e => setReviewStatus(e.target.value as any)}>
                  <option value="">{t("investigation.status_select")}</option>
                  <option value="추가 조사 필요">{t("investigation.status_needs_investigation")}</option>
                  <option value="특이사항 없음">{t("investigation.status_clear")}</option>
                  <option value="보류">{t("investigation.status_hold")}</option>
                </select>
              </div>

              <div className="form-group">
                <label>{t("investigation.memo")}</label>
                <textarea 
                  value={memo} 
                  onChange={e => setMemo(e.target.value)} 
                  placeholder={t("investigation.memo_placeholder")}
                  rows={4}
                />
              </div>

              <button className="btn-save" onClick={handleSaveReview}>{t("investigation.save_review")}</button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
