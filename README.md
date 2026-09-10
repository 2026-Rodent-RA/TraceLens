# TraceLens

> AI-assisted On-chain Investigation Platform

**TraceLens**는 AI가 블록체인 거래 그래프에서 조사자가 우선 확인할 거래 연결을 추천하고,
조사자가 작성한 분석 보고서를 다른 기관과 공유할 때
Blockchain을 이용해 발급자와 원본성, 무결성, 현재 유효 상태를 검증하는 온체인 조사 지원 서비스입니다.

---

## 프로젝트 구조

```
TraceLens/
├── ml/           # AI / Data (팀원 A) — GCN, Edge Ablation, 분석 결과
├── frontend/     # React + TypeScript + Vite — 조사 Dashboard
├── backend/      # FastAPI — REST API, Report 생성, Blockchain 연동
├── blockchain/   # Solidity + Hardhat — InvestigationAttestationRegistry
├── mock/         # Mock AI 분석 데이터 (개발용)
└── docs/         # 아키텍처, API, 개발 가이드
```

---

## 실행 방법

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env           # 환경변수 설정
uvicorn app.main:app --reload --port 8000
```

API Docs: http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Dashboard: http://localhost:5173

### 3. Blockchain (PHASE 4 이후)

```bash
cd blockchain
npm install
npx hardhat node              # Local EVM 실행
npx hardhat run scripts/deploy.js --network localhost
```

---

## 개발 단계

| Phase | 목표 | 상태 |
|---|---|---|
| 0 | Project Scaffold | ✅ 완료 |
| 1 | Frontend + Backend Skeleton | 🔄 진행 중 |
| 2 | Investigation UI (Graph, Review, Memo) | ⏳ 예정 |
| 3 | Report + SHA-256 Hashing | ⏳ 예정 |
| 4 | Blockchain 연동 | ⏳ 예정 |
| 5 | Verification (VERIFIED / TAMPERED / REVOKED) | ⏳ 예정 |
| 6 | Stabilization + Demo | ⏳ 예정 |

---

## 역할 분담

| 역할 | 담당 |
|---|---|
| AI / Data | 팀원 A |
| Frontend + Backend + Blockchain | 팀원 B |

---

## 중요 참고

- Blockchain은 AI 판단의 정확성을 인증하지 않습니다
- Blockchain의 역할은 기관 간 보고서의 **발급자 / 원본성 / 무결성 / 유효 상태** 검증입니다
- `tx-XXXX` 형태의 ID는 Elliptic Dataset Demo용 식별자이며, 실제 Bitcoin Transaction Hash가 아닙니다

자세한 내용: [docs/architecture.md](docs/architecture.md)