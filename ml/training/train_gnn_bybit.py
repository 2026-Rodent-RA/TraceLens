import copy
import sys
from pathlib import Path

import numpy as np
import torch
from sklearn.metrics import average_precision_score


PROJECT_ROOT = Path(__file__).resolve().parents[2]

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


from ml.models.graphsage_edge import GraphSAGEEdgeClassifier
from ml.training.bybit_data import PROJECT_DIR, prepare_data
from ml.training.evaluation import (
    evaluate_classification,
    evaluate_ranking,
    evaluate_transaction_ranking,
    find_best_threshold,
)


USE_GRAPH_MESSAGES = True
GRAPH_PATH = (
    PROJECT_DIR
    / "ml"
    / "data"
    / "processed"
    / "bybit_graph.pt"
)

model_filename = (
    "gnn_bybit.pt"
    if USE_GRAPH_MESSAGES
    else "no_message_bybit.pt"
)

model_path = (
    PROJECT_DIR
    / "ml"
    / "outputs"
    / model_filename
)

def select_edges(graph, split_id):
    mask = graph.split_id == split_id

    return (
        graph.edge_index[:, mask],
        graph.edge_attr[mask],
        graph.edge_label[mask],
    )


def standardize_edge_features(graph):
    train_mask = graph.split_id == 0
    train_features = graph.edge_attr[train_mask]

    mean = train_features.mean(dim=0)
    std = train_features.std(dim=0)

    std = torch.where(
        std < 1e-6,
        torch.ones_like(std),
        std,
    )

    graph.edge_attr = (
        graph.edge_attr - mean
    ) / std

    return mean, std


def main():
    torch.manual_seed(42)
    np.random.seed(42)
    device = torch.device("cpu")

    # 우리가 직접 생성한 파일이므로 weights_only=False 사용
    graph = torch.load(
        GRAPH_PATH,
        map_location=device,
        weights_only=False,
    )

    graph = graph.to(device)

    feature_mean, feature_std = (
        standardize_edge_features(graph)
    )

    train_edges, train_features, train_labels = (
        select_edges(graph, 0)
    )

    validation_edges, validation_features, validation_labels = (
        select_edges(graph, 1)
    )

    test_edges, test_features, test_labels = (
        select_edges(graph, 2)
    )

    empty_edges = torch.empty(
        (2, 0),
        dtype=torch.long,
        device=device,
    )

    if USE_GRAPH_MESSAGES:
        train_message_edges = train_edges

        validation_message_edges = graph.edge_index[
            :,
            graph.split_id <= 1,
        ]

        test_message_edges = graph.edge_index[
            :,
            graph.split_id <= 2,
        ]

        experiment_name = "GNN"
    else:
        train_message_edges = empty_edges
        validation_message_edges = empty_edges
        test_message_edges = empty_edges

        experiment_name = "No Message Passing"
        
    model = GraphSAGEEdgeClassifier(
        node_feature_dim=graph.x_train.shape[1],
        edge_feature_dim=graph.edge_attr.shape[1],
        hidden_dim=32,
        dropout=0.2,
    ).to(device)

    positive_count = train_labels.sum()
    negative_count = len(train_labels) - positive_count

    positive_weight = (
        negative_count / positive_count
    ).float()

    loss_function = torch.nn.BCEWithLogitsLoss(
        pos_weight=positive_weight,
    )

    optimizer = torch.optim.Adam(
        model.parameters(),
        lr=0.001,
        weight_decay=1e-4,
    )

    best_validation_pr_auc = -1
    best_model_state = None
    patience = 5
    waiting = 0

    print("=== GNN 학습 시작 ===")
    print(f"device: {device}")
    print(f"train edges: {len(train_labels)}")
    print(f"experiment: {experiment_name}")

    for epoch in range(1, 51):
        model.train()
        optimizer.zero_grad()

        train_logits = model(
            graph.x_train,
            train_message_edges,
            train_edges,
            train_features,
        )

        loss = loss_function(
            train_logits,
            train_labels.float(),
        )

        loss.backward()
        optimizer.step()

        if epoch % 5 != 0:
            continue

        model.eval()

        with torch.no_grad():
            validation_logits = model(
                graph.x_validation,
                validation_message_edges,
                validation_edges,
                validation_features,
            )

            validation_probabilities = torch.sigmoid(
                validation_logits
            ).cpu().numpy()

        validation_pr_auc = average_precision_score(
            validation_labels.cpu().numpy(),
            validation_probabilities,
        )

        print(
            f"epoch {epoch:02d} | "
            f"loss {loss.item():.4f} | "
            f"validation PR-AUC "
            f"{validation_pr_auc:.4f}"
        )

        if validation_pr_auc > best_validation_pr_auc:
            best_validation_pr_auc = validation_pr_auc
            best_model_state = copy.deepcopy(
                model.state_dict()
            )
            waiting = 0
        else:
            waiting += 1

            if waiting >= patience:
                print("조기 종료")
                break

    model.load_state_dict(best_model_state)
    model.eval()

    with torch.no_grad():
        validation_logits = model(
            graph.x_validation,
            validation_message_edges,
            validation_edges,
            validation_features,
        )

        test_logits = model(
            graph.x_test,
            test_message_edges,
            test_edges,
            test_features,
        )

    validation_probabilities = torch.sigmoid(
        validation_logits
    ).cpu().numpy()

    test_probabilities = torch.sigmoid(
        test_logits
    ).cpu().numpy()

    validation_labels_np = validation_labels.cpu().numpy()
    test_labels_np = test_labels.cpu().numpy()

    best_threshold, validation_f1 = find_best_threshold(
        validation_labels_np,
        validation_probabilities,
    )

    print(
        f"\n선택한 임계값: {best_threshold:.2f}"
    )
    print(f"검증 F1: {validation_f1:.4f}")

    evaluate_classification(
        f"{experiment_name} Validation",
        validation_labels_np,
        validation_probabilities,
        best_threshold,
    )

    evaluate_classification(
        f"{experiment_name} Test",
        test_labels_np,
        test_probabilities,
        best_threshold,
    )

    _, _, test_data = prepare_data()

    ranked_test = evaluate_ranking(
        test_data,
        test_probabilities,
    )

    evaluate_transaction_ranking(
        test_data,
        test_probabilities,
    )

    model_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    torch.save(
        {
            "model_state_dict": model.state_dict(),
            "feature_mean": feature_mean,
            "feature_std": feature_std,
            "threshold": best_threshold,
        },
        model_path,
    )

    print(f"\n모델 저장: {model_path}")


if __name__ == "__main__":
    main()