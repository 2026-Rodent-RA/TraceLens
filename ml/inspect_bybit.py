from pathlib import Path

import pandas as pd


DATA_PATH = (
    Path(__file__).resolve().parent
    / "data"
    / "raw"
    / "Bybit_BC"
    / "Tx_info_Bitcoin.csv"
)

USE_COLUMNS = [
    "txhash",
    "fromaddress",
    "toaddress",
    "time",
    "amount",
    "label",
    "date_time",
]


def main():
    df = pd.read_csv(
        DATA_PATH,
        usecols=USE_COLUMNS,
    )

    print("=== 기본 구조 ===")
    print("행 수:", len(df))
    print("고유 거래 해시:", df["txhash"].nunique())
    print(
        "고유 주소:",
        len(set(df["fromaddress"]) | set(df["toaddress"])),
    )

    print("\n=== 라벨 분포 ===")
    print(df["label"].value_counts(dropna=False).sort_index())

    print("\n=== 결측값 ===")
    print(df.isna().sum())

    print("\n=== 시간 범위 ===")
    df["datetime"] = pd.to_datetime(
        df["time"],
        unit="s",
        utc=True,
    )
    print("시작:", df["datetime"].min())
    print("종료:", df["datetime"].max())

    print("\n=== 중복과 자기 연결 ===")
    duplicate_columns = [
        "txhash",
        "fromaddress",
        "toaddress",
        "amount",
        "label",
    ]

    print(
        "완전 중복 전송:",
        df.duplicated(subset=duplicate_columns).sum(),
    )
    print(
        "보낸 주소와 받은 주소가 같은 행:",
        (df["fromaddress"] == df["toaddress"]).sum(),
    )

    print("\n=== 거래 해시별 전송 수 ===")
    transfers_per_tx = df.groupby("txhash").size()
    print(transfers_per_tx.describe())

    print("\n=== 거래 해시 내부 라벨 ===")
    labels_per_tx = df.groupby("txhash")["label"].nunique()

    print(
        "라벨이 하나뿐인 거래 해시:",
        (labels_per_tx == 1).sum(),
    )
    print(
        "0과 1이 함께 있는 거래 해시:",
        (labels_per_tx > 1).sum(),
    )

    print("\n=== 혼합 라벨 거래 예시 ===")
    mixed_hashes = labels_per_tx[
        labels_per_tx > 1
    ].index[:3]

    example_columns = [
        "txhash",
        "fromaddress",
        "toaddress",
        "amount",
        "label",
        "datetime",
    ]

    print(
        df.loc[
            df["txhash"].isin(mixed_hashes),
            example_columns,
        ]
        .sort_values(["txhash", "label"])
        .to_string(index=False)
    )


    # 자기 연결 여부
    df["is_self_transfer"] = (
        df["fromaddress"] == df["toaddress"]
    )

    print("\n=== 자기 연결과 라벨 관계 ===")
    print(
        pd.crosstab(
            df["is_self_transfer"],
            df["label"],
            margins=True,
        )
    )

    print("\n=== 자기 연결별 자금세탁 비율 ===")
    print(
        df.groupby("is_self_transfer")["label"]
        .agg(["count", "mean"])
    )

    # 동일 거래 해시 안에서 금액 순위
    # 가장 큰 금액의 rank가 1
    df["amount_rank_in_tx"] = (
        df.groupby("txhash")["amount"]
        .rank(method="dense", ascending=False)
    )

    print("\n=== 거래 내부 금액 순위별 라벨 ===")
    print(
        df.groupby("amount_rank_in_tx")["label"]
        .agg(["count", "mean"])
        .head(10)
    )

    print("\n=== 가장 큰 출력과 라벨 관계 ===")
    df["is_largest_amount"] = (
        df["amount_rank_in_tx"] == 1
    )

    print(
        pd.crosstab(
            df["is_largest_amount"],
            df["label"],
            normalize="index",
        )
    )

    print("\n=== 날짜별 라벨 분포 ===")

    df["date"] = df["datetime"].dt.date

    daily_labels = pd.crosstab(
        df["date"],
        df["label"],
    )

    daily_labels["total"] = daily_labels.sum(axis=1)
    daily_labels["laundering_ratio"] = (
        daily_labels[1] / daily_labels["total"]
    )

    print(daily_labels)

    print("\n=== 시간 분할별 라벨 분포 ===")

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

    split_labels = pd.crosstab(
        df["split"],
        df["label"],
    )

    split_labels["total"] = split_labels.sum(axis=1)
    split_labels["laundering_ratio"] = (
        split_labels[1] / split_labels["total"]
    )

    print(split_labels)

    print("\n=== 분할 간 거래 해시 중복 ===")

    txhash_splits = df.groupby("txhash")["split"].nunique()

    print(
        "여러 분할에 등장한 거래 해시:",
        (txhash_splits > 1).sum(),
    )

    print("\n=== 분할별 고유 주소 수 ===")

    address_sets = {}

    for split_name, split_df in df.groupby("split"):
        address_sets[split_name] = (
            set(split_df["fromaddress"])
            | set(split_df["toaddress"])
        )

        print(
            split_name,
            len(address_sets[split_name]),
        )

    print("\n=== 학습 주소와의 중복 ===")

    for split_name in ["validation", "test"]:
        overlap = (
            address_sets["train"]
            & address_sets[split_name]
        )

        print(
            split_name,
            len(overlap),
            "/",
            len(address_sets[split_name]),
            f"({len(overlap) / len(address_sets[split_name]):.2%})",
        )

if __name__ == "__main__":
    main()