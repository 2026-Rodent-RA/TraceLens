// frontend/src/pages/Investigation.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCaseById, getReviews, saveReview } from "../services/api";
import type { AnalysisResult } from "../types/analysis";
import type { Review } from "../types/review";
import GraphView from "../components/GraphView";

export default function Investigation() {
  const { analysisId } = useParams<{ analysisId: string }>();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState<AnalysisResult | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEdge, setSelectedEdge] = useState<{ source: string; target: string } | undefined>();
  const [reviewStatus, setReviewStatus] = useState<Review["status"]>("");
  const [memo, setMemo] = useState("");

  useEffect(() => {
    if (!analysisId) return;
    Promise.all([getCaseById(analysisId), getReviews(analysisId)])
      .then(([caseRes, reviewsRes]) => {
        setCaseData(caseRes);
        setReviews(reviewsRes);
      })
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

  const handleSaveReview = async () => {
    if (!selectedEdge || !analysisId) return;
    const reviewData: Review = {
      analysis_id: analysisId,
      edge_source: selectedEdge.source,
      edge_target: selectedEdge.target,
      status: reviewStatus,
      memo: memo,
    };
    try {
      await saveReview(reviewData);
      setReviews(prev => {
        const idx = prev.findIndex(r => r.edge_source === selectedEdge.source && r.edge_target === selectedEdge.target);
        if (idx >= 0) {
          const newArr = [...prev];
          newArr[idx] = reviewData;
          return newArr;
        }
        return [...prev, reviewData];
      });
      alert("Review saved successfully.");
    } catch (e) {
      console.error(e);
      alert("Failed to save review.");
    }
  };

  if (loading) return <div className="loading-container">Loading...</div>;
  if (!caseData) return <div className="error-container">Case not found</div>;

  return (
    <main className="investigation-layout">
      <div className="investigation-header">
        <button className="btn-back" onClick={() => navigate("/")}>&larr; Back to Dashboard</button>
        <h2>Investigation: {caseData.target_transaction}</h2>
        <span className={`case-status-badge ${caseData.status === "REVIEWED" ? "status-reviewed" : "status-pending"}`}>
          {caseData.status}
        </span>
      </div>

      <div className="investigation-content">
        <div className="graph-panel">
          <h3>Transaction Graph</h3>
          <GraphView 
            graph={caseData.graph} 
            recommendedEdges={caseData.recommended_edges} 
            onEdgeClick={(source, target) => setSelectedEdge({ source, target })}
            selectedEdge={selectedEdge}
          />
        </div>

        <div className="side-panel">
          <div className="panel-section">
            <h3>AI Analysis</h3>
            <div className="metrics-grid">
              <div>
                <div className="metric-label">GCN Score</div>
                <div className="metric-value">{caseData.prediction.score} ({caseData.prediction.level})</div>
              </div>
              <div>
                <div className="metric-label">Model</div>
                <div className="metric-value">{caseData.model.name}</div>
              </div>
            </div>
          </div>

          <div className="panel-section">
            <h3>Recommended Edges</h3>
            <ul className="edge-list">
              {caseData.recommended_edges.map(e => (
                <li key={`${e.source}-${e.target}`} 
                    className={`edge-item ${selectedEdge?.source === e.source && selectedEdge?.target === e.target ? 'selected' : ''}`}
                    onClick={() => setSelectedEdge({ source: e.source, target: e.target })}>
                  <strong>Rank {e.rank}</strong>: {e.source} &rarr; {e.target} (Drop: {e.score_drop})
                </li>
              ))}
            </ul>
            <p className="ai-note">추천 연결은 실제 불법자금 경로를 확정하는 결과가 아니라, GCN 판단에 영향을 준 연결을 조사 후보로 제시한 것입니다.</p>
          </div>

          {selectedEdge && (
            <div className="panel-section review-section">
              <h3>Review Selected Edge</h3>
              <p className="selected-edge-info">{selectedEdge.source} &rarr; {selectedEdge.target}</p>
              
              <div className="form-group">
                <label>Status</label>
                <select value={reviewStatus} onChange={e => setReviewStatus(e.target.value as any)}>
                  <option value="">Select status...</option>
                  <option value="추가 조사 필요">추가 조사 필요</option>
                  <option value="특이사항 없음">특이사항 없음</option>
                  <option value="보류">보류</option>
                </select>
              </div>

              <div className="form-group">
                <label>Memo</label>
                <textarea 
                  value={memo} 
                  onChange={e => setMemo(e.target.value)} 
                  placeholder="Enter investigation memo..."
                  rows={4}
                />
              </div>

              <button className="btn-save" onClick={handleSaveReview}>Save Review</button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
