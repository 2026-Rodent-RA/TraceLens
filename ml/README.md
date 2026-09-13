# TraceLens ML

Bybit-BC 전송 데이터로 고위험 거래를 탐지하고, 거래 내부에서 조사할 주소 연결을 순위화합니다.

## 구성

| 단계 | 구현 |
|---|---|
| 데이터·특징 | 전송 금액, 거래 내부 순위·비율, 주소 활동 및 시간 특징 |
| 위험 탐지 | GraphSAGE 기반 edge classifier |
| 위치 추천 | GNN 점수를 결합한 Stacked Pairwise Locator |
| 평가 | PR-AUC, Precision/Recall@K, Hit@K, MRR |
| 서비스 출력 | 조사 사건 JSON과 백엔드 호환 `analysis-*.json` |

## 주요 디렉토리

```text
ml/
├── datasets/       # 데이터 로더와 시간 분할
├── features/       # 거래·주소·Locator 특징
├── graph/          # PyTorch Geometric 그래프 생성
├── models/         # GraphSAGE edge 모델
├── training/       # RF, GNN, Locator 학습
├── evaluation/     # 모델 및 조사 순위 평가
├── inference/      # 점수 추출과 데모 JSON 생성
└── outputs/        # 로컬 모델·점수·평가 결과(Git 제외)
```

## MVP JSON 생성

프로젝트 루트에서 ML 환경을 활성화한 뒤 실행합니다.

```powershell
python ml/inference/build_demo_cases.py
python ml/inference/export_backend_cases.py
```

생성 결과:

- `demo/data/investigation_cases.json`: ML 정보가 포함된 전체 조사 사건 묶음
- `demo/backend_cases/analysis-*.json`: FastAPI와 React가 사용하는 사건별 JSON

원본 데이터와 학습 산출물인 `ml/data`, `ml/outputs`는 Git에 포함하지 않습니다.
