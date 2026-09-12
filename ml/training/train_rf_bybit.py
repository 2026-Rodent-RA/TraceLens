from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from evaluation import (
    evaluate_classification,
    evaluate_ranking,
    evaluate_transaction_ranking,
    find_best_threshold,
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

    evaluate_classification(
        "Validation",
        y_validation,
        validation_probabilities,
        best_threshold,
    )

    evaluate_classification(
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

    evaluate_transaction_ranking(
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