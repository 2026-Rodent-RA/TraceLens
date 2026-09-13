# ml/ — AI / Data (Team Member A)

이 디렉토리는 **팀원 A**가 담당하는 AI / Machine Learning 영역입니다.

## 담당 업무

| 항목 | 설명 |
|---|---|
| Dataset | Elliptic Dataset 처리 및 전처리 |
| 모델 | Random Forest, GCN |
| 분석 | 대상 거래 분석, 중요 거래 연결 추천 |
| Edge Ablation | 모델 판단에 미치는 영향 측정 |
| 출력 | 최종 AI 분석 결과 JSON 생성 |

## 예정 구조

```
ml/
├── data/
│   ├── raw/        # 원본 Dataset (Git 미포함, .gitignore 처리)
│   └── processed/  # 전처리된 데이터
├── notebooks/      # 실험용 Jupyter Notebook
├── src/            # 모델 코드
└── outputs/        # AI 분석 결과 JSON (Backend에서 읽는 위치)
```

## 현재 상태

AI 팀원과의 Output Schema가 아직 확정되지 않았습니다.

현재 서비스 개발에는 `mock/` 디렉토리의 임시 데이터를 사용합니다.

AI 팀원이 실제 분석 결과를 `ml/outputs/`에 배치하면,
Backend의 환경변수 `ANALYSIS_DATA_DIR`을 변경하는 것만으로
Mock 데이터에서 실제 AI 출력으로 교체할 수 있습니다.

## 주의사항

- `ml/data/raw/` 는 Git에 포함되지 않습니다
- `ml/outputs/` 는 Git에 포함되지 않습니다 (용량 및 보안)
- AI 모델 코드를 Frontend/Backend 팀이 임의로 추가하지 않습니다
