import sys
from pathlib import Path

import numpy as np
import torch


PROJECT_ROOT = Path(__file__).resolve().parents[2]

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


from ml.config import BYBIT_GRAPH_PATH, MODEL_DIR, SCORE_DIR
from ml.models.graphsage_edge import GraphSAGEEdgeClassifier


GRAPH_PATH = BYBIT_GRAPH_PATH

MODEL_PATH = MODEL_DIR / "gnn_bybit.pt"

OUTPUT_PATH = SCORE_DIR / "gnn_scores.npz"


def main():
    device = torch.device("cpu")

    graph = torch.load(
        GRAPH_PATH,
        map_location=device,
        weights_only=False,
    ).to(device)

    checkpoint = torch.load(
        MODEL_PATH,
        map_location=device,
        weights_only=False,
    )

    # 학습 때 사용한 기준으로 간선 특징 정규화
    edge_mean = checkpoint["feature_mean"]
    edge_std = checkpoint["feature_std"]

    graph.edge_attr = (
        graph.edge_attr - edge_mean
    ) / edge_std

    model = GraphSAGEEdgeClassifier(
        node_feature_dim=graph.x_train.shape[1],
        edge_feature_dim=graph.edge_attr.shape[1],
        hidden_dim=32,
        dropout=0.2,
    ).to(device)

    model.load_state_dict(
        checkpoint["model_state_dict"]
    )

    model.eval()

    validation_mask = graph.split_id == 1
    test_mask = graph.split_id == 2

    validation_edges = graph.edge_index[
        :,
        validation_mask,
    ]

    test_edges = graph.edge_index[
        :,
        test_mask,
    ]

    validation_message_edges = graph.edge_index[
        :,
        graph.split_id <= 1,
    ]

    test_message_edges = graph.edge_index[
        :,
        graph.split_id <= 2,
    ]

    with torch.inference_mode():
        validation_logits = model(
            graph.x_validation,
            validation_message_edges,
            validation_edges,
            graph.edge_attr[validation_mask],
        )

        test_logits = model(
            graph.x_test,
            test_message_edges,
            test_edges,
            graph.edge_attr[test_mask],
        )

    validation_scores = torch.sigmoid(
        validation_logits
    ).cpu().numpy()

    test_scores = torch.sigmoid(
        test_logits
    ).cpu().numpy()

    np.savez(
        OUTPUT_PATH,
        validation_scores=validation_scores,
        test_scores=test_scores,
    )

    print("=== GNN 점수 추출 완료 ===")
    print(
        "Validation 점수:",
        validation_scores.shape,
    )
    print(
        "Test 점수:",
        test_scores.shape,
    )
    print(
        "Validation 점수 범위:",
        validation_scores.min(),
        "~",
        validation_scores.max(),
    )
    print(
        "Test 점수 범위:",
        test_scores.min(),
        "~",
        test_scores.max(),
    )
    print(f"저장 위치: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
