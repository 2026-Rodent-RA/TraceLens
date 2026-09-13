# blockchain/ — Smart Contract (PHASE 4~)

이 디렉토리는 **Solidity Smart Contract** 및 **Hardhat** 설정을 포함합니다.

## 구현 예정 (PHASE 4)

- `contracts/InvestigationAttestationRegistry.sol`
- `scripts/deploy.js`
- `test/InvestigationAttestationRegistry.test.js`
- `hardhat.config.js`

## Contract 역할

```
Institution A → issueReport(reportHash) → Blockchain
Institution B → verifyReportHash(reportId, hash) → VERIFIED / TAMPERED / REVOKED
```

## 주의

현재 Web Skeleton(PHASE 1~3) 완성 이후 별도 Implementation Plan 검토 후 구현합니다.
