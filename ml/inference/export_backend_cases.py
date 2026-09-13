import argparse
import json
import random
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


from ml.config import (
    BACKEND_CASES_DIR,
    DEMO_CASES_PATH,
    FRONTEND_DEMO_DIR,
)


def backend_risk_level(level):
    return {
        "critical": "HIGH",
        "high": "HIGH",
        "medium": "MEDIUM",
        "low": "LOW",
    }[level]


def unique_address_pairs(transfers):
    seen = set()
    unique_transfers = []

    for transfer in transfers:
        pair = (
            transfer["from_address"],
            transfer["to_address"],
        )
        if pair in seen:
            continue

        seen.add(pair)
        unique_transfers.append(transfer)

    return unique_transfers


def score_after_pair_removal(transfers, removed_transfer):
    removed_pair = (
        removed_transfer["from_address"],
        removed_transfer["to_address"],
    )
    remaining = [
        transfer["gnn_risk_score"]
        for transfer in transfers
        if (
            transfer["from_address"],
            transfer["to_address"],
        ) != removed_pair
    ]

    return max(remaining, default=0.0)


def build_backend_case(case):
    transfers = case["transfers"]
    graph_transfers = unique_address_pairs(transfers)
    original_score = case["risk_score"]
    recommended = graph_transfers[0]

    recommended_edges = []
    for rank, transfer in enumerate(
        graph_transfers[:3],
        start=1,
    ):
        removed_score = score_after_pair_removal(
            transfers,
            transfer,
        )
        recommended_edges.append({
            "source": transfer["from_address"],
            "target": transfer["to_address"],
            "rank": rank,
            "score_drop": round(
                max(0.0, original_score - removed_score),
                6,
            ),
        })

    random_candidates = graph_transfers[1:] or graph_transfers
    random_transfer = random.Random(case["rank"]).choice(
        random_candidates
    )

    return {
        "analysis_id": f"analysis-{case['rank']:03d}",
        "dataset": "Bybit-BC",
        "target_transaction": case["txhash"],
        "prediction": {
            "score": original_score,
            "level": backend_risk_level(case["risk_level"]),
        },
        "model": {
            "name": "GraphSAGE + Stacked Locator",
            "version": "mvp-1.0",
        },
        "graph": {
            "nodes": [
                {"id": node["id"]}
                for node in case["nodes"]
            ],
            "edges": [
                {
                    "source": transfer["from_address"],
                    "target": transfer["to_address"],
                }
                for transfer in graph_transfers
            ],
        },
        "recommended_edges": recommended_edges,
        "validation": {
            "original_score": original_score,
            "recommended_removed_score": round(
                score_after_pair_removal(
                    transfers,
                    recommended,
                ),
                6,
            ),
            "random_removed_score": round(
                score_after_pair_removal(
                    transfers,
                    random_transfer,
                ),
                6,
            ),
        },
        "status": "PENDING_REVIEW",
    }


def export_backend_cases(source, output_dir):
    bundle = json.loads(source.read_text(encoding="utf-8"))
    output_dir.mkdir(parents=True, exist_ok=True)

    for stale_file in output_dir.glob("analysis-*.json"):
        stale_file.unlink()

    results = []
    for case in bundle["cases"]:
        backend_case = build_backend_case(case)
        output_path = (
            output_dir
            / f"{backend_case['analysis_id']}.json"
        )
        output_path.write_text(
            json.dumps(
                backend_case,
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )
        results.append(backend_case)

    return results


def export_frontend_demo(cases, output_dir):
    case_dir = output_dir / "cases"
    case_dir.mkdir(parents=True, exist_ok=True)

    for stale_file in case_dir.glob("analysis-*.json"):
        stale_file.unlink()

    summaries = []
    for case in cases:
        summaries.append({
            "analysis_id": case["analysis_id"],
            "target_transaction": case["target_transaction"],
            "prediction_score": case["prediction"]["score"],
            "prediction_level": case["prediction"]["level"],
            "model_name": case["model"]["name"],
            "status": case["status"],
        })

        output_path = case_dir / f"{case['analysis_id']}.json"
        output_path.write_text(
            json.dumps(case, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    (output_dir / "cases.json").write_text(
        json.dumps(summaries, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--source",
        type=Path,
        default=DEMO_CASES_PATH,
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=BACKEND_CASES_DIR,
    )
    parser.add_argument(
        "--frontend-output-dir",
        type=Path,
        default=FRONTEND_DEMO_DIR,
    )

    return parser.parse_args()


def main():
    args = parse_args()
    results = export_backend_cases(
        args.source,
        args.output_dir,
    )
    export_frontend_demo(
        results,
        args.frontend_output_dir,
    )

    print("=== Backend Cases Export ===")
    print(f"생성 건수: {len(results)}")
    print(f"Backend 저장 위치: {args.output_dir}")
    print(f"Frontend 저장 위치: {args.frontend_output_dir}")


if __name__ == "__main__":
    main()
