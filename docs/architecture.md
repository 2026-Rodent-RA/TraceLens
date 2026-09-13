# TraceLens — MVP Architecture

> **TraceLens**는 AI가 블록체인 거래 그래프에서 조사자가 우선 확인할 거래 연결을 추천하고,
> 조사자가 작성한 분석 보고서를 다른 기관과 공유할 때
> Blockchain을 이용해 발급자와 원본성, 무결성, 현재 유효 상태를 검증할 수 있도록 하는
> 온체인 조사 지원 서비스

---

## 핵심 영역

| 영역 | 설명 |
|---|---|
| AI | GCN 기반 거래 그래프 분석, 중요 연결 추천, Edge Ablation |
| Human Investigator | AI 추천 검토, Review/Memo 작성, 보고서 생성 |
| Blockchain | 보고서 해시 등록 및 기관 간 원본성·무결성 검증 |

> **⚠️ 중요**: Blockchain은 AI 판단의 정확성을 증명하지 않습니다.
> Blockchain의 역할은 기관 간 보고서 전달 시 "발급자 / 원본성 / 무결성 / 유효 상태"를
> 중앙 DB 없이 검증하는 **Trust / Proof Layer**입니다.

---

## MVP 시스템 구성

```
Browser (http://localhost:5173)
  │
  │  REST API (HTTP)
  ▼
React + Vite + TypeScript
  │
  │  REST API
  ▼
FastAPI Backend (http://localhost:8000)
  │
  ├── [PHASE 1] Mock AI Data (mock/*.json)
  │             ↓ 향후 교체 → ml/outputs/
  │
  ├── [PHASE 2] Investigation Review (SQLite)
  │
  ├── [PHASE 3] Report Generator + SHA-256 Hashing
  │
  └── [PHASE 4] Blockchain Service
                  │
                  │  JSON-RPC (web3.py)
                  ▼
           Hardhat Local EVM (http://127.0.0.1:8545)
                  │
                  ▼
      InvestigationAttestationRegistry.sol
```

---

## Ports

| 서비스 | 주소 |
|---|---|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| Hardhat Local EVM | http://127.0.0.1:8545 |

---

## Tech Stack

### Frontend
- React 18 + TypeScript + Vite
- React Router
- Cytoscape.js (Transaction Graph 시각화)
- Vanilla CSS / CSS Modules

### Backend
- Python 3.11+
- FastAPI + Pydantic v2
- Uvicorn
- web3.py (Blockchain 연동, PHASE 4~)
- SQLite (Review/Report 저장, PHASE 2~)

### Blockchain
- Solidity 0.8.x
- Hardhat
- Local EVM (개발/Demo)

---

## Data Flow: Mock → Real AI 교체 경로

현재 (개발 초기):
```
mock/analysis-001.json  ─┐
mock/analysis-002.json  ─┼─▶  analysis_service.py  ─▶  API  ─▶  Frontend
mock/analysis-003.json  ─┘
```

AI 팀원 Output 완성 후:
```
ml/outputs/analysis-XXX.json  ─▶  analysis_service.py  ─▶  API  ─▶  Frontend
```

Backend 환경변수 `ANALYSIS_DATA_DIR`만 변경하면 교체 완료.

---

## Blockchain 역할 명확화

### Blockchain이 검증하는 것
1. 이 보고서를 어느 기관이 발급했는가?
2. 발급 당시 원본 Report Hash는 무엇인가?
3. 현재 전달받은 Report가 원본과 동일한가?
4. 전달 과정에서 Report가 변조되지 않았는가?
5. 해당 Report가 현재 취소된 상태인가?

### Blockchain이 증명하지 않는 것
- 해당 거래가 실제 범죄 거래라는 사실
- AI의 Risk Score가 정답이라는 사실
- 추천 Edge가 실제 불법자금 이동 경로라는 사실

---

## Smart Contract: InvestigationAttestationRegistry

```solidity
struct InvestigationReport {
    bytes32 reportHash;
    address issuer;
    uint256 issuedAt;
    bool revoked;
}

function issueReport(bytes32 reportHash) external
function getReport(uint256 reportId) external view
function verifyReportHash(uint256 reportId, bytes32 hash) external view returns (bool)
function revokeReport(uint256 reportId) external
function isActive(uint256 reportId) external view returns (bool)
```

---

## 개발 단계

| Phase | 목표 | 완료 기준 |
|---|---|---|
| PHASE 0 | Project Scaffold | Monorepo 구조 생성 |
| PHASE 1 | Frontend + Backend Skeleton | Mock Case → FastAPI → Dashboard |
| PHASE 2 | Investigation UI | Graph, Review, Memo 저장 |
| PHASE 3 | Report + Hashing | 동일 Report → 동일 Hash |
| PHASE 4 | Blockchain | Backend → Smart Contract 연동 |
| PHASE 5 | Verification | VERIFIED / TAMPERED / REVOKED |
| PHASE 6 | Stabilization | Demo 준비, 오류 처리, README |

---

## 저장 방식 (PHASE별)

| Phase | 저장 대상 | 방식 |
|---|---|---|
| 1 | Analysis (Read-only) | JSON File (mock/) |
| 2 | Review, Memo | SQLite |
| 3 | Report | SQLite |
| 3 | Report Hash | SHA-256 (Python hashlib) |
| 4 | Blockchain Record | Smart Contract (on-chain) |

---

## Blockchain에 저장하지 않는 것

- 전체 Investigation Report 원문
- 전체 AI JSON
- Transaction Graph
- Investigator Memo
- Dataset 원본
- 개인정보

Blockchain에는 검증에 필요한 **최소 정보만** 저장합니다.
(reportHash, issuer address, issuedAt timestamp, revoked 상태)
