import torch
from torch import nn
from torch_geometric.nn import SAGEConv


class GraphSAGEEdgeClassifier(nn.Module):
    def __init__(
        self,
        node_feature_dim,
        edge_feature_dim,
        hidden_dim=32,
        dropout=0.2,
    ):
        super().__init__()

        # 자금이 나가는 방향의 이웃 집계
        self.forward_conv1 = SAGEConv(
            node_feature_dim,
            hidden_dim,
        )

        # 자금이 들어오는 방향의 이웃 집계
        self.backward_conv1 = SAGEConv(
            node_feature_dim,
            hidden_dim,
        )

        combined_dim = hidden_dim * 2

        self.forward_conv2 = SAGEConv(
            combined_dim,
            hidden_dim,
        )

        self.backward_conv2 = SAGEConv(
            combined_dim,
            hidden_dim,
        )

        node_embedding_dim = hidden_dim * 2

        # 송신 노드, 수신 노드, 송금 특징을 결합
        classifier_input_dim = (
            node_embedding_dim * 2
            + edge_feature_dim
        )

        self.edge_classifier = nn.Sequential(
            nn.Linear(
                classifier_input_dim,
                hidden_dim,
            ),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, 1),
        )

        self.dropout = nn.Dropout(dropout)

    def encode_nodes(
        self,
        node_features,
        message_edge_index,
    ):
        reverse_edge_index = message_edge_index.flip(0)

        forward_hidden = self.forward_conv1(
            node_features,
            message_edge_index,
        )

        backward_hidden = self.backward_conv1(
            node_features,
            reverse_edge_index,
        )

        hidden = torch.cat(
            [forward_hidden, backward_hidden],
            dim=1,
        )

        hidden = torch.relu(hidden)
        hidden = self.dropout(hidden)

        forward_output = self.forward_conv2(
            hidden,
            message_edge_index,
        )

        backward_output = self.backward_conv2(
            hidden,
            reverse_edge_index,
        )

        node_embeddings = torch.cat(
            [forward_output, backward_output],
            dim=1,
        )

        return torch.relu(node_embeddings)

    def forward(
        self,
        node_features,
        message_edge_index,
        target_edge_index,
        target_edge_features,
    ):
        node_embeddings = self.encode_nodes(
            node_features,
            message_edge_index,
        )

        source_nodes = target_edge_index[0]
        target_nodes = target_edge_index[1]

        source_embeddings = node_embeddings[
            source_nodes
        ]

        target_embeddings = node_embeddings[
            target_nodes
        ]

        edge_input = torch.cat(
            [
                source_embeddings,
                target_embeddings,
                target_edge_features,
            ],
            dim=1,
        )

        logits = self.edge_classifier(
            edge_input
        ).squeeze(1)

        return logits