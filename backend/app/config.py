# backend/app/config.py
"""
Application configuration.
ANALYSIS_DATA_DIR 환경변수 하나만 바꾸면 mock/ → ml/outputs/ 교체 가능.
"""
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Data source: 개발 초기에는 mock/ 사용, AI 출력 완성 후 ml/outputs 로 변경
    analysis_data_dir: Path = Path(__file__).parent.parent.parent / "mock"

    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
