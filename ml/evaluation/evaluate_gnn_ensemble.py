import sys
from pathlib import Path

import numpy as np
from scipy.stats import rankdata


PROJECT_ROOT = Path(__file__).resolve().parents[2]

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


from ml.config import (
    RANKING_DIR,
    SCORE_DIR,
    create_output_directories,
)
from ml.datasets.bybit import prepare_bybit_data
from ml.evaluation.metrics import (
    evaluate_classification,
    evaluate_ranking,
    evaluate_transaction_ranking,
    find_best_threshold,
)


BASE_WEIGHT = 0.9
INTERACTION_WEIGHT = 0.1

BASE_SCORE_PATH = SCORE_DIR / "gnn_scores_feature_v2.npz"
INTERACTION_SCORE_PATH = (
    SCORE_DIR / "gnn_scores_interaction_deep.npz"
)
OUTPUT_PATH = SCORE_DIR / "gnn_ensemble_scores.npz"


def normalize_rank(scores):
    return rankdata(
        scores,
        method="average",
    ) / len(scores)


def load_split_scores(path):
    saved = np.load(path)

    return (
        saved["validation_scores"],
        saved["test_scores"],
    )


def combine_scores(base_scores, interaction_scores):
    return (
        BASE_WEIGHT * normalize_rank(base_scores)
        + INTERACTION_WEIGHT
        * normalize_rank(interaction_scores)
    )


def main():
    create_output_directories()
    _, validation, test = prepare_bybit_data()

    base_validation, base_test = load_split_scores(
        BASE_SCORE_PATH
    )
    interaction_validation, interaction_test = (
        load_split_scores(INTERACTION_SCORE_PATH)
    )

    assert len(validation) == len(base_validation)
    assert len(validation) == len(interaction_validation)
    assert len(test) == len(base_test)
    assert len(test) == len(interaction_test)

    validation_scores = combine_scores(
        base_validation,
        interaction_validation,
    )
    test_scores = combine_scores(
        base_test,
        interaction_test,
    )

    validation_labels = validation["label"].to_numpy()
    test_labels = test["label"].to_numpy()

    threshold, validation_f1 = find_best_threshold(
        validation_labels,
        validation_scores,
    )

    print("=== GNN Rank Ensemble ===")
    print(f"base weight: {BASE_WEIGHT:.1f}")
    print(f"interaction weight: {INTERACTION_WEIGHT:.1f}")
    print(f"validation F1: {validation_f1:.4f}")

    evaluate_classification(
        "Ensemble Validation",
        validation_labels,
        validation_scores,
        threshold,
    )
    evaluate_classification(
        "Ensemble Test",
        test_labels,
        test_scores,
        threshold,
    )

    ranked_test = evaluate_ranking(test, test_scores)
    evaluate_transaction_ranking(test, test_scores)

    np.savez(
        OUTPUT_PATH,
        validation_scores=validation_scores,
        test_scores=test_scores,
        base_weight=BASE_WEIGHT,
        interaction_weight=INTERACTION_WEIGHT,
        threshold=float(threshold),
    )

    ranking_path = (
        RANKING_DIR / "gnn_ensemble_top1000.csv"
    )
    ranked_test.head(1000).to_csv(
        ranking_path,
        index=False,
    )

    print(f"\n점수 저장: {OUTPUT_PATH}")
    print(f"조사 순위 저장: {ranking_path}")


if __name__ == "__main__":
    main()
