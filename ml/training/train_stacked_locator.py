import sys
from pathlib import Path

import joblib
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler


PROJECT_ROOT = Path(__file__).resolve().parents[2]

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


from ml.config import MODEL_DIR, SCORE_DIR
from ml.datasets.bybit import prepare_bybit_data
from ml.evaluation.metrics import evaluate_transaction_ranking
from ml.features.locator import (
    LOCATOR_FEATURES,
    add_locator_features,
    build_pairwise_dataset,
)


SCORE_PATH = (
    SCORE_DIR / "gnn_scores.npz"
)

OUTPUT_PATH = (
    MODEL_DIR / "stacked_locator.joblib"
)

STACKED_FEATURES = [
    *LOCATOR_FEATURES,
    "gnn_risk_score",
]


def main():
    _, validation, test = prepare_bybit_data()

    validation = add_locator_features(validation)
    test = add_locator_features(test)

    gnn_scores = np.load(SCORE_PATH)

    validation_scores = gnn_scores[
        "validation_scores"
    ]

    test_scores = gnn_scores[
        "test_scores"
    ]

    assert len(validation) == len(validation_scores)
    assert len(test) == len(test_scores)

    validation["gnn_risk_score"] = validation_scores
    test["gnn_risk_score"] = test_scores

    # GNN 학습에 사용되지 않은 Validation 점수로
    # 2단계 Locator를 학습한다.
    pair_features, pair_labels = build_pairwise_dataset(
        validation,
        feature_columns=STACKED_FEATURES,
    )

    print("=== GNN Stacked Locator ===")
    print(f"학습 비교 쌍: {len(pair_labels)}")

    locator = make_pipeline(
        StandardScaler(),
        LogisticRegression(
            fit_intercept=False,
            max_iter=1000,
            random_state=42,
        ),
    )

    locator.fit(
        pair_features,
        pair_labels,
    )

    locator_scores = locator.decision_function(
        test[STACKED_FEATURES].to_numpy()
    )

    print("\n=== Stacked Locator Test ===")
    evaluate_transaction_ranking(
        test,
        locator_scores,
    )

    normalized_amount = (
        test["log_amount"]
        - test["log_amount"].min()
    ) / (
        test["log_amount"].max()
        - test["log_amount"].min()
        + 1e-12
    )

    rule_scores = (
        (1 - test["is_self_transfer"]) * 2
        + normalized_amount
    ).to_numpy()

    print("\n=== External-then-amount 규칙 Test ===")
    evaluate_transaction_ranking(
        test,
        rule_scores,
    )

    joblib.dump(
        {
            "model": locator,
            "features": STACKED_FEATURES,
        },
        OUTPUT_PATH,
    )

    print(f"\nLocator 저장: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
