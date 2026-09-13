# TraceLens — PHASE 0 + PHASE 1 Implementation Plan

## 현재 상태

| 항목 | 값 |
|---|---|
| Branch | `sm27` |
| Commits | 3개 (Initial commit → hihi → exclude raw datasets) |
| 파일 | `.gitignore` (Python 중심), `README.md` (placeholder) |
| 기존 구조 | 없음 — 완전 새 시작 |

---

## PHASE 0: Project Scaffold

### 최종 디렉토리 구조

```
TraceLens/
├── ml/
│   └── README.md                      # AI 팀원 placeholder
│
├── frontend/                          # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── types/
│   │   ├── App.tsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── cases.py
│   │   │   ├── reviews.py
│   │   │   ├── reports.py
│   │   │   └── verification.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── schemas.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── analysis_service.py
│   │   │   ├── review_service.py
│   │   │   ├── report_service.py
│   │   │   ├── hashing_service.py
│   │   │   └── blockchain_service.py
│   │   └── repositories/
│   │       ├── __init__.py
│   │       └── store.py
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
│
├── blockchain/
│   ├── contracts/
│   │   └── InvestigationAttestationRegistry.sol
│   ├── scripts/
│   │   └── deploy.js
│   ├── test/
│   │   └── InvestigationAttestationRegistry.test.js
│   ├── hardhat.config.js
│   └── package.json
│
├── mock/
│   ├── analysis-001.json
│   ├── analysis-002.json
│   └── analysis-003.json
│
├── docs/
│   └── architecture.md
│
├── .gitignore                         # 기존 + Node/Hardhat/Frontend 추가
├── .env.example
└── README.md
```

> [!NOTE]
> `schemas/` 디렉토리는 생성하지 않습니다. AI 팀원과 인터페이스가 확정된 이후 생성합니다.

---

### [MODIFY] [.gitignore](file:///Users/seongmink/Desktop/26-2/블록체인대회/TraceLens/.gitignore)

기존 Python gitignore에 Node.js, Hardhat, Frontend 빌드, `.env` 관련 패턴 추가

### [MODIFY] [README.md](file:///Users/seongmink/Desktop/26-2/블록체인대회/TraceLens/README.md)

TraceLens 프로젝트 개요, 구조, 실행 방법 작성

### [NEW] ml/README.md

AI 팀원용 placeholder

### [NEW] mock/analysis-001.json, analysis-002.json, analysis-003.json

Mock AI 분석 데이터 3건

### [NEW] docs/architecture.md

MVP Architecture 문서

---

## PHASE 1: Frontend + Backend Skeleton

### Backend

| 파일 | 역할 |
|---|---|
| `app/main.py` | FastAPI app, CORS, router 등록 |
| `app/api/cases.py` | `GET /api/cases`, `GET /api/cases/{analysis_id}` |
| `app/models/schemas.py` | Pydantic response models |
| `app/services/analysis_service.py` | Mock JSON 로드, case 조회 |
| `app/repositories/store.py` | JSON file 기반 저장소 |
| `requirements.txt` | fastapi, uvicorn, pydantic |

> [!IMPORTANT]
> Analysis Service는 `mock/` 디렉토리를 기본 data source로 사용하되, 향후 `ml/outputs/`로 교체할 수 있도록 경로를 config로 분리합니다.

### Frontend

| 파일 | 역할 |
|---|---|
| `src/services/api.ts` | Backend API 호출 함수 |
| `src/types/analysis.ts` | TypeScript 타입 정의 |
| `src/pages/Dashboard.tsx` | Case 목록 + Case Card |
| `src/App.tsx` | React Router 설정 |
| `src/index.css` | 디자인 시스템 (다크 테마, Cybersecurity 느낌) |

### API Endpoints (PHASE 1)

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/cases` | Mock case 목록 |
| GET | `/api/cases/{analysis_id}` | Mock case 상세 |

### PHASE 1 완료 조건

- `http://localhost:8000/api/cases` 에서 JSON 응답 확인
- `http://localhost:5173` 에서 Dashboard에 Mock Case Card 3개 표시
- Frontend → Backend API 연결 정상 동작

---

## Verification Plan

### PHASE 0
- 모든 디렉토리와 파일이 정상 생성되었는지 확인
- `tree` 명령으로 구조 확인

### PHASE 1
- `cd backend && pip install -r requirements.txt && uvicorn app.main:app` 실행
- `curl http://localhost:8000/api/cases` 로 JSON 응답 확인
- `cd frontend && npm install && npm run dev` 실행
- 브라우저에서 Dashboard 확인
