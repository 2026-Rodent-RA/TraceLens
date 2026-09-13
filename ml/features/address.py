import numpy as np


NODE_FEATURE_DIM = 8


def build_address_features(observed_edges, address_to_id):
    features = np.zeros(
        (len(address_to_id), NODE_FEATURE_DIM),
        dtype=np.float32,
    )

    outgoing = observed_edges.groupby("fromaddress").agg(
        out_count=("txhash", "size"),
        out_amount=("amount", "sum"),
        unique_receivers=("toaddress", "nunique"),
    )
    incoming = observed_edges.groupby("toaddress").agg(
        in_count=("txhash", "size"),
        in_amount=("amount", "sum"),
        unique_senders=("fromaddress", "nunique"),
    )

    out_ids = np.fromiter(
        (address_to_id[address] for address in outgoing.index),
        dtype=np.int64,
    )
    in_ids = np.fromiter(
        (address_to_id[address] for address in incoming.index),
        dtype=np.int64,
    )

    features[out_ids, 0] = np.log1p(outgoing["out_count"])
    features[out_ids, 1] = np.log1p(outgoing["out_amount"])
    features[out_ids, 2] = np.log1p(
        outgoing["unique_receivers"]
    )
    features[in_ids, 3] = np.log1p(incoming["in_count"])
    features[in_ids, 4] = np.log1p(incoming["in_amount"])
    features[in_ids, 5] = np.log1p(incoming["unique_senders"])

    out_amount = np.expm1(features[:, 1])
    in_amount = np.expm1(features[:, 4])
    out_count = np.expm1(features[:, 0])
    in_count = np.expm1(features[:, 3])

    features[:, 6] = (
        (out_amount - in_amount)
        / (out_amount + in_amount + 1e-6)
    )
    features[:, 7] = (
        (out_count - in_count)
        / (out_count + in_count + 1e-6)
    )

    return features
