import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
from scipy.special import expit


PROJECT_ROOT = Path(__file__).resolve().parents[2]

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


from ml.config import (
    DEMO_CASES_PATH,
    MODEL_DIR,
    SCORE_DIR,
)
from ml.datasets.bybit import prepare_bybit_data
from ml.explanation.reasons import (
    explain_case,
    explain_transfer,
)
from ml.features.locator import add_locator_features


DEFAULT_LIMIT = 20
GNN_SCORE_PATH = SCORE_DIR / "gnn_scores.npz"
LOCATOR_PATH = MODEL_DIR / "stacked_locator.joblib"


def risk_level(score):
    if score >= 0.9:
        return "critical"
    if score >= 0.7:
        return "high"
    if score >= 0.5:
        return "medium"
    return "low"


def build_nodes(group):
    senders = set(group["fromaddress"])
    receivers = set(group["toaddress"])
    nodes = []

    for address in sorted(senders | receivers):
        if address in senders and address in receivers:
            role = "sender_receiver"
        elif address in senders:
            role = "sender"
        else:
            role = "receiver"

        nodes.append({
            "id": address,
            "role": role,
        })

    return nodes


def build_case(txhash, group, case_rank):
    group = group.sort_values(
        ["locator_score", "gnn_risk_score", "amount"],
        ascending=False,
    ).copy()

    top_transfer = group.iloc[0]
    transfers = []

    for transfer_rank, (row_id, row) in enumerate(
        group.iterrows(),
        start=1,
    ):
        transfers.append({
            "id": f"{txhash}:{row_id}",
            "rank": transfer_rank,
            "from_address": row["fromaddress"],
            "to_address": row["toaddress"],
            "amount_btc": round(float(row["amount"]), 8),
            "amount_share": round(
                float(row["amount_share_in_tx"]),
                6,
            ),
            "gnn_risk_score": round(
                float(row["gnn_risk_score"]),
                6,
            ),
            "locator_score": round(
                float(row["locator_score"]),
                6,
            ),
            "recommended": transfer_rank == 1,
            "reasons": explain_transfer(row),
        })

    case_score = float(group["gnn_risk_score"].max())
    occurred_at = group["datetime"].min().isoformat()

    return {
        "case_id": f"case-{case_rank:03d}",
        "rank": case_rank,
        "txhash": txhash,
        "occurred_at": occurred_at,
        "risk_score": round(case_score, 6),
        "risk_level": risk_level(case_score),
        "transfer_count": len(group),
        "total_amount_btc": round(
            float(group["amount"].sum()),
            8,
        ),
        "recommended_address": top_transfer["toaddress"],
        "summary": (
            f"{len(group)}개 송금 중 {top_transfer['toaddress']}로 "
            "전달된 출력을 우선 조사 대상으로 추천합니다."
        ),
        "evidence": explain_case(group, top_transfer),
        "nodes": build_nodes(group),
        "transfers": transfers,
    }


def build_demo_cases(limit):
    _, _, test = prepare_bybit_data()
    test = add_locator_features(test)

    gnn_scores = np.load(GNN_SCORE_PATH)["test_scores"]
    if len(test) != len(gnn_scores):
        raise ValueError(
            "Test 데이터와 GNN 점수의 행 수가 다릅니다."
        )

    locator_artifact = joblib.load(LOCATOR_PATH)
    locator = locator_artifact["model"]
    locator_features = locator_artifact["features"]

    test["gnn_risk_score"] = gnn_scores
    raw_locator_scores = locator.decision_function(
        test[locator_features].to_numpy()
    )
    test["locator_score"] = expit(raw_locator_scores)

    transaction_risk = test.groupby("txhash")[
        "gnn_risk_score"
    ].max()
    selected_txhashes = transaction_risk.nlargest(
        limit
    ).index

    cases = []
    for case_rank, txhash in enumerate(
        selected_txhashes,
        start=1,
    ):
        group = test[test["txhash"] == txhash]
        cases.append(build_case(txhash, group, case_rank))

    return {
        "schema_version": "1.0.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "model": {
            "detector": "GraphSAGE edge classifier",
            "locator": "Pairwise stacked locator",
            "dataset": "Bybit-BC",
        },
        "case_count": len(cases),
        "cases": cases,
    }


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--limit",
        type=int,
        default=DEFAULT_LIMIT,
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEMO_CASES_PATH,
    )

    return parser.parse_args()


def main():
    args = parse_args()
    result = build_demo_cases(args.limit)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(
            result,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print("=== TraceLens Demo Cases ===")
    print(f"생성 건수: {result['case_count']}")
    print(f"저장 위치: {args.output}")


if __name__ == "__main__":
    main()
