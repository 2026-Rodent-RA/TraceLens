import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from bybit_data import (
    FEATURE_COLUMNS,
    PROJECT_DIR,
    prepare_data,
)


def calculate_metrics(labels, scores):
    ranked = pd.DataFrame({
        "label": labels.to_numpy(),
        "score": scores,
    })

    ranked = ranked.sort_values(
        "score",
        ascending=False,
    )

    total_positive = ranked["label"].sum()

    result = {
        "PR-AUC": average_precision_score(
            ranked["label"],
            ranked["score"],
        ),
    }

    for k in [100, 500, 1000]:
        selected = ranked.head(k)
        detected = selected["label"].sum()

        result[f"P@{k}"] = detected / k
        result[f"R@{k}"] = detected / total_positive

    return result

def calculate_transaction_metrics(data, scores):
    result = data[
        [
            "txhash",
            "amount",
            "label",
        ]
    ].copy()

    result["score"] = scores

    # 정상과 자금세탁 출력이 함께 있는 거래 선택
    label_counts = result.groupby(
        "txhash"
    )["label"].nunique()

    mixed_txhashes = label_counts[
        label_counts > 1
    ].index

    mixed = result[
        result["txhash"].isin(mixed_txhashes)
    ]

    first_positive_ranks = []

    for _, group in mixed.groupby("txhash"):
        # 점수가 같으면 금액이 큰 송금을 먼저 배치
        group = group.sort_values(
            ["score", "amount"],
            ascending=[False, False],
        )

        positive_positions = np.flatnonzero(
            group["label"].to_numpy() == 1
        )

        if len(positive_positions) > 0:
            rank = int(positive_positions[0]) + 1
            first_positive_ranks.append(rank)

    ranks = np.asarray(first_positive_ranks)

    return {
        "Hit@1": np.mean(ranks <= 1),
        "Hit@3": np.mean(ranks <= 3),
        "Hit@5": np.mean(ranks <= 5),
        "MRR": np.mean(1 / ranks),
        "Mixed TX": len(ranks),
    }


def main():
    train, _, test = prepare_data()

    X_train = train[FEATURE_COLUMNS]
    y_train = train["label"]

    X_test = test[FEATURE_COLUMNS]
    y_test = test["label"]

    # 1. 금액이 큰 송금 우선
    amount_score = test[
        "log_amount"
    ].to_numpy()

    # 2. 외부 송금을 먼저 배치하고 금액순 정렬
    normalized_amount = (
        test["log_amount"]
        - test["log_amount"].min()
    ) / (
        test["log_amount"].max()
        - test["log_amount"].min()
        + 1e-12
    )

    external_amount_score = (
        (1 - test["is_self_transfer"]) * 2
        + normalized_amount
    ).to_numpy()

    # 3. Logistic Regression
    logistic_model = make_pipeline(
        StandardScaler(),
        LogisticRegression(
            class_weight="balanced",
            max_iter=1000,
            random_state=42,
        ),
    )

    logistic_model.fit(
        X_train,
        y_train,
    )

    logistic_score = logistic_model.predict_proba(
        X_test
    )[:, 1]

    # 4. Random Forest
    rf_model = RandomForestClassifier(
        n_estimators=200,
        max_depth=12,
        min_samples_leaf=5,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )

    rf_model.fit(
        X_train,
        y_train,
    )

    rf_score = rf_model.predict_proba(
        X_test
    )[:, 1]

    methods = {
        "Amount only": amount_score,
        "External then amount": external_amount_score,
        "Logistic Regression": logistic_score,
        "Random Forest": rf_score,
    }

    rows = []

    for name, scores in methods.items():
        ranking_metrics = calculate_metrics(
            y_test,
            scores,
        )

        transaction_metrics = (
            calculate_transaction_metrics(
                test,
                scores,
            )
        )

        rows.append({
            "method": name,
            **ranking_metrics,
            **transaction_metrics,
    })

    comparison = pd.DataFrame(rows)
    comparison = comparison.set_index("method")

    print("\n=== 베이스라인 비교 ===")
    print(comparison.round(4).to_string())

    output_path = (
        PROJECT_DIR
        / "ml"
        / "outputs"
        / "baseline_comparison.csv"
    )

    output_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    comparison.to_csv(output_path)

    print(f"\n결과 저장: {output_path}")


if __name__ == "__main__":
    main()