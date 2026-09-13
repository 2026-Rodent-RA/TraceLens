import pandas as pd

from ml.config import BYBIT_TRANSACTION_PATH
from ml.features.transaction import build_transaction_features


VALIDATION_START = pd.Timestamp("2025-03-01", tz="UTC")
TEST_START = pd.Timestamp("2025-03-04", tz="UTC")


def load_bybit_data():
    columns = [
        "txhash",
        "fromaddress",
        "toaddress",
        "time",
        "amount",
        "label",
    ]
    data = pd.read_csv(
        BYBIT_TRANSACTION_PATH,
        usecols=columns,
    )
    data = data.drop_duplicates().copy()
    data["datetime"] = pd.to_datetime(
        data["time"],
        unit="s",
        utc=True,
    )

    return data


def assign_temporal_split(data):
    data = data.copy()
    data["split"] = "train"
    data.loc[
        data["datetime"] >= VALIDATION_START,
        "split",
    ] = "validation"
    data.loc[
        data["datetime"] >= TEST_START,
        "split",
    ] = "test"

    return data


def prepare_bybit_data():
    data = load_bybit_data()
    data = build_transaction_features(data)
    data = assign_temporal_split(data)

    train = data[data["split"] == "train"].copy()
    validation = data[data["split"] == "validation"].copy()
    test = data[data["split"] == "test"].copy()

    return train, validation, test
