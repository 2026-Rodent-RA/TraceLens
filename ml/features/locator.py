import numpy as np


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
    label_counts = data.groupby("txhash")["label"].nunique()
    mixed_txhashes = label_counts[label_counts > 1].index

    return data[
        data["txhash"].isin(mixed_txhashes)
    ].copy()


def build_pairwise_dataset(
    data,
    feature_columns=LOCATOR_FEATURES,
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
        ][feature_columns].to_numpy()
        negatives = group[
            group["label"] == 0
        ][feature_columns].to_numpy()

        for positive in positives:
            count = min(max_negatives, len(negatives))
            selected_indices = rng.choice(
                len(negatives),
                size=count,
                replace=False,
            )

            for negative in negatives[selected_indices]:
                difference = positive - negative
                differences.append(difference)
                pair_labels.append(1)
                differences.append(-difference)
                pair_labels.append(0)

    return (
        np.asarray(differences),
        np.asarray(pair_labels),
    )
