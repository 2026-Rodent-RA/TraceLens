import numpy as np
import pandas as pd

from sklearn.metrics import (
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)


def evaluate_classification(
    name,
    labels,
    probabilities,
    threshold,
):
    predictions = (
        probabilities >= threshold
    ).astype(int)

    print(f"\n=== {name} ===")
    print(f"threshold: {threshold:.2f}")
    print(
        "precision:",
        f"{precision_score(labels, predictions):.4f}",
    )
    print(
        "recall:",
        f"{recall_score(labels, predictions):.4f}",
    )
    print(
        "f1:",
        f"{f1_score(labels, predictions):.4f}",
    )
    print(
        "PR-AUC:",
        f"{average_precision_score(labels, probabilities):.4f}",
    )
    print("confusion matrix:")
    print(confusion_matrix(labels, predictions))


def evaluate_ranking(data, probabilities):
    ranked = data[
        [
            "txhash",
            "fromaddress",
            "toaddress",
            "amount",
            "label",
        ]
    ].copy()

    ranked["risk_score"] = probabilities

    ranked = ranked.sort_values(
        "risk_score",
        ascending=False,
    ).reset_index(drop=True)

    total_rows = len(ranked)
    total_positive = int(ranked["label"].sum())
    positive_ratio = ranked["label"].mean()

    print("\n=== 전체 조사 순위 평가 ===")
    print(f"전체 송금 수: {total_rows}")
    print(f"실제 자금세탁 송금 수: {total_positive}")
    print(f"자금세탁 기본 비율: {positive_ratio:.4f}")

    for k in [100, 500, 1000, 1500]:
        selected = ranked.head(k)
        detected = int(selected["label"].sum())

        precision_at_k = detected / len(selected)
        recall_at_k = detected / total_positive
        lift = precision_at_k / positive_ratio

        print(f"\nTop-{k}")
        print(f"발견한 자금세탁 송금: {detected}")
        print(f"Precision@{k}: {precision_at_k:.4f}")
        print(f"Recall@{k}: {recall_at_k:.4f}")
        print(f"Lift@{k}: {lift:.2f}배")

    for percentage in [0.01, 0.05, 0.10]:
        k = max(
            1,
            int(np.ceil(total_rows * percentage)),
        )

        selected = ranked.head(k)
        detected = int(selected["label"].sum())

        precision = detected / k
        recall = detected / total_positive
        lift = precision / positive_ratio

        print(f"\n상위 {percentage:.0%} 조사")
        print(f"조사 송금 수: {k}")
        print(f"발견한 자금세탁 송금: {detected}")
        print(f"Precision: {precision:.4f}")
        print(f"Recall: {recall:.4f}")
        print(f"Lift: {lift:.2f}배")

    return ranked


def evaluate_transaction_ranking(
    data,
    probabilities,
):
    ranked = data[
        [
            "txhash",
            "amount",
            "label",
        ]
    ].copy()

    ranked["risk_score"] = probabilities

    label_count = ranked.groupby(
        "txhash"
    )["label"].nunique()

    mixed_txhashes = label_count[
        label_count > 1
    ].index

    mixed = ranked[
        ranked["txhash"].isin(mixed_txhashes)
    ]

    first_positive_ranks = []

    for _, group in mixed.groupby("txhash"):
        group = group.sort_values(
            ["risk_score", "amount"],
            ascending=[False, False],
        )

        positions = np.flatnonzero(
            group["label"].to_numpy() == 1
        )

        if len(positions) > 0:
            first_positive_ranks.append(
                int(positions[0]) + 1
            )

    ranks = np.asarray(first_positive_ranks)

    print("\n=== 거래 내부 위치 추적 평가 ===")
    print(f"평가 대상 혼합 거래 수: {len(ranks)}")

    for k in [1, 3, 5]:
        hits = int(np.sum(ranks <= k))
        hit_rate = np.mean(ranks <= k)

        print(
            f"Hit@{k}: {hit_rate:.4f} "
            f"({hits}/{len(ranks)})"
        )

    print(f"MRR: {np.mean(1 / ranks):.4f}")

def find_best_threshold(
    y_true,
    probabilities,
):
    """
    검증 데이터에서 F1 점수가 가장 높은
    분류 임계값을 찾는다.
    """

    thresholds = np.arange(
        0.05,
        0.96,
        0.01,
    )

    results = []

    for threshold in thresholds:
        predictions = (
            probabilities >= threshold
        ).astype(int)

        score = f1_score(
            y_true,
            predictions,
            zero_division=0,
        )

        results.append(
            (threshold, score)
        )

    return max(
        results,
        key=lambda item: item[1],
    )