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


from ml.training.bybit_data import PROJECT_DIR, prepare_data
from ml.training.evaluation import (
    evaluate_transaction_ranking,
)


LOCATOR_FEATURES = [
    "log_amount",
    "is_self_transfer",
    "amount_share_in_tx",
    "amount_rank_in_tx",
    "amount_rank_ratio",
    "is_largest",
    "is_second_largest",
]


def add_locator_features(data):
    data = data.copy()

    data["is_largest"] = (
        data["amount_rank_in_tx"] == 1
    ).astype(int)

    data["is_second_largest"] = (
        data["amount_rank_in_tx"] == 2
    ).astype(int)

    return data


def select_mixed_transactions(data):
    label_counts = data.groupby(
        "txhash"
    )["label"].nunique()

    mixed_txhashes = label_counts[
        label_counts > 1
    ].index

    return data[
        data["txhash"].isin(mixed_txhashes)
    ].copy()


def build_pairwise_dataset(
    data,
    max_negatives=5,
    seed=42,
):
    rng = np.random.default_rng(seed)

    differences = []
    pair_labels = []

    mixed = select_mixed_transactions(data)

    for _, group in mixed.groupby("txhash"):
        positives = group[
            group["label"] == 1
        ][LOCATOR_FEATURES].to_numpy()

        negatives = group[
            group["label"] == 0
        ][LOCATOR_FEATURES].to_numpy()

        for positive in positives:
            count = min(
                max_negatives,
                len(negatives),
            )

            selected_indices = rng.choice(
                len(negatives),
                size=count,
                replace=False,
            )

            selected_negatives = negatives[
                selected_indices
            ]

            for negative in selected_negatives:
                difference = positive - negative

                # positive 출력이 더 위험한 순서
                differences.append(difference)
                pair_labels.append(1)

                # 순서를 반대로 한 대칭 표본
                differences.append(-difference)
                pair_labels.append(0)

    return (
        np.asarray(differences),
        np.asarray(pair_labels),
    )


def main():
    train, validation, test = prepare_data()

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

    output_path = (
        PROJECT_DIR
        / "ml"
        / "outputs"
        / "locator_pairwise.joblib"
    )

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