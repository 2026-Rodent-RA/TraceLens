from pathlib import Path

import numpy as np
import pandas as pd


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

    data = pd.read_csv(
        DATA_PATH,
        usecols=columns,
    )

    # 완전히 동일한 송금 행 제거
    data = data.drop_duplicates().copy()

    data["datetime"] = pd.to_datetime(
        data["time"],
        unit="s",
        utc=True,
    )

    return data


def build_features(data):
    data = data.copy()

    # 금액 차이를 완화한 특징
    data["log_amount"] = np.log1p(
        data["amount"]
    )

    # 송신 주소와 수신 주소가 같은지 표시
    data["is_self_transfer"] = (
        data["fromaddress"]
        == data["toaddress"]
    ).astype(int)

    tx_group = data.groupby("txhash")

    # 같은 거래 내부의 송금 개수
    data["tx_transfer_count"] = (
        tx_group["txhash"].transform("size")
    )

    # 같은 거래 내부의 고유 송신자 수
    data["tx_unique_senders"] = (
        tx_group["fromaddress"].transform("nunique")
    )

    # 같은 거래 내부의 고유 수신자 수
    data["tx_unique_receivers"] = (
        tx_group["toaddress"].transform("nunique")
    )

    # 같은 거래 내부의 전체 금액
    total_amount = tx_group["amount"].transform("sum")

    # 해당 송금이 거래 전체 금액에서 차지하는 비율
    data["amount_share_in_tx"] = (
        data["amount"]
        / total_amount.clip(lower=1e-12)
    )

    # 같은 거래 안에서 금액이 몇 번째로 큰지
    data["amount_rank_in_tx"] = (
        tx_group["amount"].rank(
            method="dense",
            ascending=False,
        )
    )

    # 거래 크기를 고려한 상대 금액 순위
    data["amount_rank_ratio"] = (
        data["amount_rank_in_tx"]
        / data["tx_transfer_count"]
    )

    return data


def assign_split(data):
    data = data.copy()

    data["split"] = "train"

    validation_start = pd.Timestamp(
        "2025-03-01",
        tz="UTC",
    )

    test_start = pd.Timestamp(
        "2025-03-04",
        tz="UTC",
    )

    data.loc[
        data["datetime"] >= validation_start,
        "split",
    ] = "validation"

    data.loc[
        data["datetime"] >= test_start,
        "split",
    ] = "test"

    return data


def prepare_data():
    data = load_data()
    data = build_features(data)
    data = assign_split(data)

    train = data[
        data["split"] == "train"
    ].copy()

    validation = data[
        data["split"] == "validation"
    ].copy()

    test = data[
        data["split"] == "test"
    ].copy()

    return train, validation, test