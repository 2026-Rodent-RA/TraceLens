# backend/app/config.py
"""
Application configuration.
ANALYSIS_DATA_DIR 환경변수로 AI 분석 JSON 경로를 교체할 수 있습니다.
DATABASE_URL 환경변수 하나로 SQLite(Local) / PostgreSQL(Production) 전환 가능.
"""
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Data source: ML 파이프라인이 내보낸 백엔드 호환 사건 JSON
    analysis_data_dir: Path = (
        Path(__file__).resolve().parents[2]
        / "demo"
        / "backend_cases"
    )

    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    # Local 기본값: localhost만 허용
    # Production: CORS_ORIGINS='["https://tracelens.vercel.app"]' 환경변수로 교체
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ]



    # Blockchain
    blockchain_rpc_url: str = "http://127.0.0.1:8545"
    contract_address: str = ""
    issuer_private_key: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
