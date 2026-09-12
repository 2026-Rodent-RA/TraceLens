import sys
from pathlib import Path

import numpy as np
import pandas as pd
import torch
from torch_geometric.data import Data

PROJECT_ROOT = Path(__file__).resolve().parents[2]

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ml.training.bybit_data import (
    FEATURE_COLUMNS,
    PROJECT_DIR,
    prepare_data,
)


OUTPUT_PATH = (
    PROJECT_DIR
    / "ml"
    / "data"
    / "processed"
    / "bybit_graph.pt"
)


def build_address_mapping(data):
    addresses = set(
        data["fromaddress"]
    ) | set(
        data["toaddress"]
    )

    sorted_addresses = sorted(addresses)

    return {
        address: index
        for index, address in enumerate(sorted_addresses)
    }


def build_graph():
    train, validation, test = prepare_data()

    # 다시 하나의 데이터로 결 bots
    train = train.copy()
    validation = validation.copy()
    test = test.copy()

    train["split_id"] = 0
    validation["split_id"] = 1
    test["split_id"] = 2

    all_edges = pd.concat(
        [train, validation, test],
        ignore_index=True,
    )

    address_to_id = build_address_mapping(all_edges)

    source_nodes = all_edges[
        "fromaddress"
    ].map(address_to_id)

    target_nodes = all_edges[
        "toaddress"
    ].map(address_to_id)

    edge_array = np.vstack([
        source_nodes.to_numpy(dtype=np.int64),
        target_nodes.to_numpy(dtype=np.int64),
    ])

    edge_index = torch.from_numpy(
        edge_array
    )

    edge_attr = torch.tensor(
        all_edges[FEATURE_COLUMNS].to_numpy(),
        dtype=torch.float32,
    )

    edge_label = torch.tensor(
        all_edges["label"].to_numpy(),
        dtype=torch.long,
    )

    split_ids = torch.tensor(
        all_edges["split_id"].to_numpy(),
        dtype=torch.long,
    )

    graph = Data(
        edge_index=edge_index,
        edge_attr=edge_attr,
        edge_label=edge_label,
        split_id=split_ids,
        num_nodes=len(address_to_id),
    )

    train_history = train

    validation_history = pd.concat(
        [train, validation],
        ignore_index=True,
    )

    test_history = pd.concat(
        [train, validation, test],
        ignore_index=True,
    )

    x_train_raw = build_node_features(
        train_history,
        address_to_id,
    )

    x_validation_raw = build_node_features(
        validation_history,
        address_to_id,
    )

    x_test_raw = build_node_features(
        test_history,
        address_to_id,
    )

    # Train 기간에 실제로 등장한 주소로 정규화 기준 계산
    active_train_nodes = (
        x_train_raw[:, 0]
        + x_train_raw[:, 3]
    ) > 0

    feature_mean = x_train_raw[
        active_train_nodes
    ].mean(
        axis=0,
        keepdims=True,
    )

    feature_std = x_train_raw[
        active_train_nodes
    ].std(
        axis=0,
        keepdims=True,
    )

    feature_std[
        feature_std < 1e-6
    ] = 1.0

    graph.x_train = torch.tensor(
        (x_train_raw - feature_mean) / feature_std,
        dtype=torch.float32,
    )

    graph.x_validation = torch.tensor(
        (x_validation_raw - feature_mean) / feature_std,
        dtype=torch.float32,
    )

    graph.x_test = torch.tensor(
        (x_test_raw - feature_mean) / feature_std,
        dtype=torch.float32,
    )

    graph.node_feature_mean = torch.tensor(
        feature_mean,
        dtype=torch.float32,
    )

    graph.node_feature_std = torch.tensor(
        feature_std,
        dtype=torch.float32,
    )

    graph.address_to_id = address_to_id

    return graph

def build_node_features(
    observed_edges,
    address_to_id,
):
    num_nodes = len(address_to_id)

    # 총 8개의 주소 특징
    features = np.zeros(
        (num_nodes, 8),
        dtype=np.float32,
    )

    outgoing = observed_edges.groupby(
        "fromaddress"
    ).agg(
        out_count=("txhash", "size"),
        out_amount=("amount", "sum"),
        unique_receivers=("toaddress", "nunique"),
    )

    incoming = observed_edges.groupby(
        "toaddress"
    ).agg(
        in_count=("txhash", "size"),
        in_amount=("amount", "sum"),
        unique_senders=("fromaddress", "nunique"),
    )

    out_ids = np.array([
        address_to_id[address]
        for address in outgoing.index
    ])

    in_ids = np.array([
        address_to_id[address]
        for address in incoming.index
    ])

    # 송금 행동
    features[out_ids, 0] = np.log1p(
        outgoing["out_count"]
    )

    features[out_ids, 1] = np.log1p(
        outgoing["out_amount"]
    )

    features[out_ids, 2] = np.log1p(
        outgoing["unique_receivers"]
    )

    # 수신 행동
    features[in_ids, 3] = np.log1p(
        incoming["in_count"]
    )

    features[in_ids, 4] = np.log1p(
        incoming["in_amount"]
    )

    features[in_ids, 5] = np.log1p(
        incoming["unique_senders"]
    )

    out_amount = np.expm1(features[:, 1])
    in_amount = np.expm1(features[:, 4])

    out_count = np.expm1(features[:, 0])
    in_count = np.expm1(features[:, 3])

    # 양수면 출금액이 더 많고, 음수면 입금액이 더 많음
    features[:, 6] = (
        out_amount - in_amount
    ) / (
        out_amount + in_amount + 1e-6
    )

    # 양수면 출금 횟수가 더 많고, 음수면 입금 횟수가 더 많음
    features[:, 7] = (
        out_count - in_count
    ) / (
        out_count + in_count + 1e-6
    )

    return features


def main():
    graph = build_graph()

    OUTPUT_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    torch.save(
        graph,
        OUTPUT_PATH,
    )

    print("=== Bybit 주소 그래프 ===")
    print(f"노드 수: {graph.num_nodes}")
    print(f"간선 수: {graph.num_edges}")
    print(
        f"Train 노드 특징 크기: "
        f"{graph.x_train.shape}"
    )

    print(
        f"Validation 노드 특징 크기: "
        f"{graph.x_validation.shape}"
    )

    print(
        f"Test 노드 특징 크기: "
        f"{graph.x_test.shape}"
    )
    
    print(f"간선 특징 크기: {graph.edge_attr.shape}")

    print(
        "Train 간선:",
        int((graph.split_id == 0).sum()),
    )

    print(
        "Validation 간선:",
        int((graph.split_id == 1).sum()),
    )

    print(
        "Test 간선:",
        int((graph.split_id == 2).sum()),
    )

    print(f"저장 위치: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()