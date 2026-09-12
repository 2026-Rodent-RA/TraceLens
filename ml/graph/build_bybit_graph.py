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

    # 각 노드는 우선 1이라는 단순한 특징을 가짐
    graph.x = torch.ones(
        (graph.num_nodes, 1),
        dtype=torch.float32,
    )

    graph.address_to_id = address_to_id

    return graph


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
    print(f"노드 특징 크기: {graph.x.shape}")
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