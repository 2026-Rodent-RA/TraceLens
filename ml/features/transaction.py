import numpy as np


FEATURE_COLUMNS = [
    "log_amount",
    "is_self_transfer",
    "tx_transfer_count",
    "tx_unique_senders",
    "tx_unique_receivers",
    "amount_share_in_tx",
    "amount_rank_in_tx",
    "amount_rank_ratio",
    "log_tx_total_amount",
    "amount_to_max_ratio",
    "is_largest_amount",
    "is_second_largest_amount",
    "tx_external_transfer_count",
    "external_amount_share_in_tx",
    "tx_amount_entropy",
]


def build_transaction_features(data):
    data = data.copy()

    data["log_amount"] = np.log1p(data["amount"])
    data["is_self_transfer"] = (
        data["fromaddress"] == data["toaddress"]
    ).astype(int)

    tx_group = data.groupby("txhash")
    data["tx_transfer_count"] = (
        tx_group["txhash"].transform("size")
    )
    data["tx_unique_senders"] = (
        tx_group["fromaddress"].transform("nunique")
    )
    data["tx_unique_receivers"] = (
        tx_group["toaddress"].transform("nunique")
    )

    total_amount = tx_group["amount"].transform("sum")
    data["amount_share_in_tx"] = (
        data["amount"] / total_amount.clip(lower=1e-12)
    )
    data["amount_rank_in_tx"] = tx_group["amount"].rank(
        method="dense",
        ascending=False,
    )
    data["amount_rank_ratio"] = (
        data["amount_rank_in_tx"]
        / data["tx_transfer_count"]
    )

    data["log_tx_total_amount"] = np.log1p(total_amount)
    max_amount = tx_group["amount"].transform("max")
    data["amount_to_max_ratio"] = (
        data["amount"] / max_amount.clip(lower=1e-12)
    )
    data["is_largest_amount"] = (
        data["amount_rank_in_tx"] == 1
    ).astype(int)
    data["is_second_largest_amount"] = (
        data["amount_rank_in_tx"] == 2
    ).astype(int)

    is_external = 1 - data["is_self_transfer"]
    data["tx_external_transfer_count"] = (
        is_external.groupby(data["txhash"]).transform("sum")
    )
    external_amount = data["amount"] * is_external
    external_total = external_amount.groupby(
        data["txhash"]
    ).transform("sum")
    data["external_amount_share_in_tx"] = (
        external_total / total_amount.clip(lower=1e-12)
    )

    amount_share = data["amount_share_in_tx"].clip(
        lower=1e-12
    )
    entropy_component = -amount_share * np.log(amount_share)
    data["tx_amount_entropy"] = entropy_component.groupby(
        data["txhash"]
    ).transform("sum")

    return data
