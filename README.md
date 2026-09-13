# TraceLens

TraceLens는 온체인 거래 그래프에서 위험 송금을 탐지하고, 조사자가 먼저 확인할 자금 흐름을 순위로 제공하는 조사 지원 서비스입니다.

## ML 파이프라인

1. Bybit 거래 데이터를 시간 기준으로 Train, Validation, Test로 분리합니다.
2. 거래 특징과 주소 행동 특징을 생성합니다.
3. 주소를 노드, 송금을 간선으로 하는 그래프를 생성합니다.
4. GraphSAGE Detector가 전체 송금의 위험도를 계산합니다.
5. Pairwise Locator가 거래 내부에서 의심 출력의 우선순위를 계산합니다.

## 폴더 구조

```text
ml/
├── config.py          # 공통 데이터 및 출력 경로
├── datasets/          # 데이터 로딩과 시간 분할
├── features/          # 거래, 주소, Locator 특징
├── graph/             # PyTorch Geometric 그래프 생성
├── models/            # 모델 구조
├── training/          # 모델 학습
├── evaluation/        # 평가 지표와 베이스라인 비교
├── inference/         # 저장 모델의 점수 추출
├── tools/             # 데이터 검사 도구
├── data/              # 원본 및 전처리 데이터
└── outputs/
    ├── models/        # 학습된 모델
    ├── scores/        # Validation/Test 위험 점수
    ├── rankings/      # 조사 우선순위
    └── reports/       # 평가 비교 결과
```

## 환경 구성

```bat
conda activate tracelens
python -m pip install -r requirements.txt
```

## 실행 순서

프로젝트 루트에서 경로 방식으로 실행합니다.

```bat
python ml/tools/inspect_bybit.py
python ml/graph/build_bybit_graph.py
python ml/training/train_rf_bybit.py
python ml/training/train_gnn_bybit.py
python ml/inference/export_gnn_scores.py
python ml/training/train_locator_bybit.py
python ml/training/train_stacked_locator.py
python ml/evaluation/compare_baselines.py
```

대용량 원본 데이터와 학습 산출물은 Git에 포함하지 않습니다.
