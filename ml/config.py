from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parents[1]
ML_DIR = PROJECT_DIR / "ml"

DATA_DIR = ML_DIR / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
PROCESSED_DATA_DIR = DATA_DIR / "processed"

BYBIT_BC_DIR = RAW_DATA_DIR / "Bybit_BC"

BYBIT_TRANSACTION_PATH = (
    BYBIT_BC_DIR / "Tx_info_Bitcoin.csv"
)

BYBIT_SEMANTIC_PATH = (
    BYBIT_BC_DIR
    / "semantics_flow_embedding_with_label_train_2025-11-13-00-35-30.parquet"
)

BYBIT_GRAPH_PATH = (
    PROCESSED_DATA_DIR / "bybit_graph.pt"
)

OUTPUT_DIR = ML_DIR / "outputs"

MODEL_DIR = OUTPUT_DIR / "models"
SCORE_DIR = OUTPUT_DIR / "scores"
RANKING_DIR = OUTPUT_DIR / "rankings"
REPORT_DIR = OUTPUT_DIR / "reports"


def create_output_directories():
    for directory in [
        MODEL_DIR,
        SCORE_DIR,
        RANKING_DIR,
        REPORT_DIR,
    ]:
        directory.mkdir(
            parents=True,
            exist_ok=True,
        )
