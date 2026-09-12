from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)


PROJECT_DIR = Path(__file__).resolve().parents[2]

DATA_PATH = (
    PROJECT_DIR
    / "ml"
    / "data"
    / "raw"
    / "Bybit_BC"
    / "Tx_info_Bitcoin.csv"
)

FEATURE_COLUMNS = [
    "log_amount",
    "is_self_transfer",
    "tx_transfer_count",
    "tx_unique_senders",
    "tx_unique_receivers",
    "amount_share_in_tx",
    "amount_rank_in_tx",
    "amount_rank_ratio",
]


def load_data():
    columns = [
        "txhash",
        "fromaddress",
        "toaddress",
        "time",
        "amount",
        "label",
    ]

    df = pd.read_csv(
        DATA_PATH,
        usecols=columns,
    )

    # 완전히 같은 전송 행만 제거
    df = df.drop_duplicates().copy()

    df["datetime"] = pd.to_datetime(
        df["time"],
        unit="s",
        utc=True,
    )

    return df


def build_features(df):
    # 금액 분포가 매우 치우쳐 있으므로 로그 변환
    df["log_amount"] = np.log1p(df["amount"])

    # 자기 주소로 돌아가는 전송인지
    df["is_self_transfer"] = (
        df["fromaddress"] == df["toaddress"]
    ).astype(int)

    # 같은 거래 해시에 포함된 전송 수
    df["tx_transfer_count"] = (
        df.groupby("txhash")["txhash"]
        .transform("size")
    )

    # 같은 거래 해시의 송신·수신 주소 다양성
    df["tx_unique_senders"] = (
        df.groupby("txhash")["fromaddress"]
        .transform("nunique")
    )

    df["tx_unique_receivers"] = (
        df.groupby("txhash")["toaddress"]
        .transform("nunique")
    )

    # 해당 전송 금액이 동일 거래 전체 금액에서 차지하는 비율
    tx_total_amount = (
        df.groupby("txhash")["amount"]
        .transform("sum")
    )

    df["amount_share_in_tx"] = (
        df["amount"]
        / tx_total_amount.replace(0, np.nan)
    ).fillna(0.0)

    # 동일 거래 안에서 금액이 몇 번째로 큰지
    df["amount_rank_in_tx"] = (
        df.groupby("txhash")["amount"]
        .rank(method="dense", ascending=False)
    )

    # 거래 크기가 달라도 비교할 수 있도록 순위를 정규화
    df["amount_rank_ratio"] = (
        df["amount_rank_in_tx"]
        / df["tx_transfer_count"]
    )

    return df


def assign_split(df):
    train_end = pd.Timestamp(
        "2025-03-01",
        tz="UTC",
    )
    validation_end = pd.Timestamp(
        "2025-03-04",
        tz="UTC",
    )

    df["split"] = "test"

    df.loc[
        df["datetime"] < train_end,
        "split",
    ] = "train"

    df.loc[
        (df["datetime"] >= train_end)
        & (df["datetime"] < validation_end),
        "split",
    ] = "validation"

    return df


def find_best_threshold(y_true, probabilities):
    thresholds = np.arange(0.05, 0.96, 0.01)

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

        results.append((threshold, score))

    return max(
        results,
        key=lambda item: item[1],
    )


def evaluate(name, y_true, probabilities, threshold):
    predictions = (
        probabilities >= threshold
    ).astype(int)

    print(f"\n=== {name} ===")
    print(f"threshold: {threshold:.2f}")

    print(
        "precision:",
        f"{precision_score(y_true, predictions, zero_division=0):.4f}",
    )
    print(
        "recall:",
        f"{recall_score(y_true, predictions, zero_division=0):.4f}",
    )
    print(
        "f1:",
        f"{f1_score(y_true, predictions, zero_division=0):.4f}",
    )
    print(
        "PR-AUC:",
        f"{average_precision_score(y_true, probabilities):.4f}",
    )

    print("confusion matrix:")
    print(confusion_matrix(y_true, predictions))

def evaluate_ranking(data, probabilities):
    """
    모델의 예측 확률을 조사 우선순위로 사용하여 평가한다.

    data:
        txhash와 label이 포함된 원본 평가 DataFrame

    probabilities:
        각 행이 자금세탁 송금일 확률
    """

    ranked = data[["txhash", "fromaddress", "toaddress", "amount", "label"]].copy()
    ranked["risk_score"] = probabilities

    # 위험 점수가 높은 송금부터 정렬
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

    # 조사할 수 있는 송금 개수가 고정된 경우
    for k in [100, 500, 1000, 1500]:
        if k > total_rows:
            continue

        selected = ranked.head(k)

        detected = int(selected["label"].sum())
        precision_at_k = detected / k
        recall_at_k = detected / total_positive
        lift = precision_at_k / positive_ratio

        print(f"\nTop-{k}")
        print(f"  발견한 자금세탁 송금: {detected}")
        print(f"  Precision@{k}: {precision_at_k:.4f}")
        print(f"  Recall@{k}: {recall_at_k:.4f}")
        print(f"  Lift@{k}: {lift:.2f}배")

    # 전체 데이터 중 일정 비율만 조사하는 경우
    for percentage in [0.01, 0.05, 0.10]:
        k = max(1, int(np.ceil(total_rows * percentage)))
        selected = ranked.head(k)

        detected = int(selected["label"].sum())
        precision = detected / k
        recall = detected / total_positive
        lift = precision / positive_ratio

        print(f"\n상위 {percentage:.0%} 조사")
        print(f"  조사 송금 수: {k}")
        print(f"  발견한 자금세탁 송금: {detected}")
        print(f"  Precision: {precision:.4f}")
        print(f"  Recall: {recall:.4f}")
        print(f"  Lift: {lift:.2f}배")

    return ranked

def evaluate_within_transaction_ranking(data, probabilities):
    """
    같은 txhash 내부에서 실제 자금세탁 송금을
    상위 몇 번째로 배치했는지 평가한다.
    """

    ranked = data[["txhash", "fromaddress", "toaddress", "amount", "label"]].copy()
    ranked["risk_score"] = probabilities

    # 정상 출력과 자금세탁 출력이 모두 존재하는 거래만 선택
    label_count = ranked.groupby("txhash")["label"].nunique()
    mixed_txhashes = label_count[label_count > 1].index

    mixed = ranked[ranked["txhash"].isin(mixed_txhashes)].copy()

    print("\n=== 거래 내부 위치 추적 평가 ===")
    print(f"평가 대상 혼합 거래 수: {len(mixed_txhashes)}")

    hit_counts = {
        1: 0,
        3: 0,
        5: 0,
    }

    reciprocal_ranks = []

    for _, group in mixed.groupby("txhash"):
        group = group.sort_values(
            "risk_score",
            ascending=False,
        ).reset_index(drop=True)

        # 첫 번째 실제 자금세탁 송금의 순위
        positive_positions = np.flatnonzero(
            group["label"].to_numpy() == 1
        )

        if len(positive_positions) == 0:
            continue

        first_positive_rank = int(positive_positions[0]) + 1
        reciprocal_ranks.append(1 / first_positive_rank)

        for k in hit_counts:
            if first_positive_rank <= k:
                hit_counts[k] += 1

    evaluated_transactions = len(reciprocal_ranks)

    if evaluated_transactions == 0:
        print("평가 가능한 혼합 거래가 없습니다.")
        return

    for k, hits in hit_counts.items():
        hit_rate = hits / evaluated_transactions

        print(f"Hit@{k}: {hit_rate:.4f} "
              f"({hits}/{evaluated_transactions})")

    mean_reciprocal_rank = np.mean(reciprocal_ranks)
    print(f"MRR: {mean_reciprocal_rank:.4f}")


def main():
    df = load_data()
    df = build_features(df)
    df = assign_split(df)

    train = df[df["split"] == "train"]
    validation = df[df["split"] == "validation"]
    test = df[df["split"] == "test"]

    X_train = train[FEATURE_COLUMNS]
    y_train = train["label"]

    X_validation = validation[FEATURE_COLUMNS]
    y_validation = validation["label"]

    X_test = test[FEATURE_COLUMNS]
    y_test = test["label"]

    print("=== 데이터 크기 ===")
    print("train:", len(train))
    print("validation:", len(validation))
    print("test:", len(test))

    print("\n=== 사용 특징 ===")
    for feature in FEATURE_COLUMNS:
        print("-", feature)

    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=12,
        min_samples_leaf=5,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )

    model.fit(X_train, y_train)

    validation_probabilities = model.predict_proba(
        X_validation
    )[:, 1]

    best_threshold, validation_f1 = find_best_threshold(
        y_validation,
        validation_probabilities,
    )

    print(
        "\n검증 데이터에서 선택한 임계값:",
        f"{best_threshold:.2f}",
    )
    print(
        "검증 F1:",
        f"{validation_f1:.4f}",
    )

    test_probabilities = model.predict_proba(
        X_test
    )[:, 1]

    evaluate(
        "Validation",
        y_validation,
        validation_probabilities,
        best_threshold,
    )

    evaluate(
        "Test",
        y_test,
        test_probabilities,
        best_threshold,
    )

    importance = pd.Series(
        model.feature_importances_,
        index=FEATURE_COLUMNS,
    ).sort_values(ascending=False)

    print("\n=== 특징 중요도 ===")
    print(importance)


    ranked_test = evaluate_ranking(
        test,
        test_probabilities,
    )

    evaluate_within_transaction_ranking(
        test,
        test_probabilities,
    )

    OUTPUT_DIR = PROJECT_DIR / "ml" / "outputs"
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    ranked_test["rank"] = np.arange(1, len(ranked_test) + 1)

    ranked_test.head(1000).to_csv(
        OUTPUT_DIR / "rf_bybit_top1000.csv",
        index=False,
    )

    print(
        "\n조사 우선순위 저장:",
        OUTPUT_DIR / "rf_bybit_top1000.csv",
    )


if __name__ == "__main__":
    main()