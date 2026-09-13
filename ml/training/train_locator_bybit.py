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


from ml.config import MODEL_DIR
from ml.datasets.bybit import prepare_bybit_data
from ml.evaluation.metrics import (
    evaluate_transaction_ranking,
)
from ml.features.locator import (
    LOCATOR_FEATURES,
    add_locator_features,
    build_pairwise_dataset,
)


def main():
    train, validation, test = prepare_bybit_data()

    train = add_locator_features(train)
    validation = add_locator_features(validation)
    test = add_locator_features(test)

    pair_features, pair_labels = (
        build_pairwise_dataset(train)
    )

    print("=== Pairwise Locator 학습 ===")
    print(f"학습 비교 쌍: {len(pair_labels)}")
    print(
        "Train 혼합 거래:",
        train.groupby("txhash")["label"]
        .nunique()
        .gt(1)
        .sum(),
    )

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

    validation_scores = locator.decision_function(
        validation[LOCATOR_FEATURES]
    )

    test_scores = locator.decision_function(
        test[LOCATOR_FEATURES]
    )

    print("\n=== Pairwise Locator Validation ===")
    evaluate_transaction_ranking(
        validation,
        validation_scores,
    )

    print("\n=== Pairwise Locator Test ===")
    evaluate_transaction_ranking(
        test,
        test_scores,
    )

    # 기존 최강 규칙과 동일한 데이터에서 비교
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

    output_path = MODEL_DIR / "locator_pairwise.joblib"

    output_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    joblib.dump(
        {
            "model": locator,
            "features": LOCATOR_FEATURES,
        },
        output_path,
    )

    print(f"\nLocator 저장: {output_path}")


if __name__ == "__main__":
    main()
