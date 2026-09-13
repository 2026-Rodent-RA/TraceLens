import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from app.services.hashing_service import generate_report_hash
import copy

def run_test():
    base_content = {
        "analysis_id": "analysis-001",
        "dataset": "Bybit-BC",
        "target_transaction": "tx-1024",
        "model_name": "GraphSAGE + Stacked Locator",
        "model_version": "mvp-1.0",
        "prediction_score": 0.87,
        "prediction_level": "HIGH",
        "recommended_edges": [
            {"source": "tx-1010", "target": "tx-1024", "rank": 1, "score_drop": 0.31}
        ],
        "reviews": [
            {"edge_source": "tx-1010", "edge_target": "tx-1024", "status": "추가 조사 필요", "memo": "특이사항 발견됨"}
        ]
    }
    
    hash_a = generate_report_hash(base_content)
    hash_a_again = generate_report_hash(base_content)
    
    print(f"Hash A == Hash A_again: {hash_a == hash_a_again}")
    
    content_b = copy.deepcopy(base_content)
    content_b["reviews"][0]["memo"] = "특이사항 발견됨!"
    hash_b = generate_report_hash(content_b)
    
    print(f"Hash A != Hash B: {hash_a != hash_b}")
    
    content_c = copy.deepcopy(base_content)
    content_c["prediction_score"] = 0.88
    hash_c = generate_report_hash(content_c)
    
    print(f"Hash A != Hash C: {hash_a != hash_c}")

if __name__ == "__main__":
    run_test()
