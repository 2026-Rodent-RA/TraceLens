"""backend/app/api/attestation.py
Attestation API Router.
"""
from fastapi import APIRouter, HTTPException

from app.models.attestation import (
    AttestationResponse,
    IssueResponse,
    VerificationResponse,
    RevokeResponse,
    VerificationStatus,
    ExternalVerificationRequest,
    IssueRequest,
    RevokeRequest
)
from app.services.hashing_service import generate_report_hash
from app.services.blockchain_service import blockchain_service

router = APIRouter(prefix="/api/reports", tags=["attestation"])

@router.post("/issue", response_model=IssueResponse)
def issue_report(req: IssueRequest):
    """지정된 Report Hash를 Blockchain에 발급 등록합니다."""
    # Blockchain 상태 확인 (이미 등록되었는지)
    try:
        att = blockchain_service.get_attestation(req.report_hash)
        if att["is_issued"]:
            raise HTTPException(status_code=400, detail="Report already issued on blockchain")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=f"Blockchain connection error: {str(e)}")

    # 발급 트랜잭션 전송
    try:
        receipt = blockchain_service.issue_report(req.report_hash)
        return IssueResponse(
            report_id=req.report_id,
            report_hash=req.report_hash,
            tx_hash=receipt["tx_hash"],
            issuer=receipt["issuer"],
            block_number=receipt["block_number"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Issue transaction failed: {str(e)}")


@router.get("/attestation/{report_hash}", response_model=AttestationResponse)
def get_attestation(report_hash: str):
    """Blockchain에서 Report의 attestation 정보를 조회합니다."""
    try:
        att = blockchain_service.get_attestation(report_hash)
        return AttestationResponse(
            report_hash=report_hash,
            issuer=att["issuer"],
            issued_at=att["issued_at"],
            revoked=att["revoked"],
            is_issued=att["is_issued"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Blockchain connection error: {str(e)}")


@router.post("/revoke", response_model=RevokeResponse)
def revoke_report(req: RevokeRequest):
    """Blockchain에서 Report를 취소합니다."""
    try:
        receipt = blockchain_service.revoke_report(req.report_hash)
        return RevokeResponse(
            report_id=req.report_id,
            report_hash=req.report_hash,
            tx_hash=receipt["tx_hash"],
            revoked_by=receipt["revoked_by"],
            block_number=receipt["block_number"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Revoke transaction failed: {str(e)}")


@router.post("/verify", response_model=VerificationResponse)
def verify_external_report(req: ExternalVerificationRequest):
    """외부 기관에서 받은 Report JSON의 무결성을 Blockchain을 통해 검증합니다."""
    # 1. 파일 내 Content로 Hash 계산
    current_hash = generate_report_hash(req.content)
    
    # 2. 파일에 명시된 Hash와 실제 계산된 Hash 비교 (Tamper 확인)
    if current_hash != req.report_hash:
        return VerificationResponse(
            report_id=req.report_id,
            status=VerificationStatus.HASH_MISMATCH,
            current_hash=current_hash,
            message="The computed hash does not match the report_hash in the file. The file has been tampered with."
        )
        
    # 3. Blockchain 상태 조회
    try:
        att = blockchain_service.get_attestation(current_hash)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Blockchain connection error: {str(e)}")
        
    # 4. 검증 판정
    if not att["is_issued"]:
        status = VerificationStatus.NOT_VERIFIED
        msg = "The report hash is valid, but no issuance record exists on the blockchain."
    elif att["revoked"]:
        status = VerificationStatus.REVOKED
        msg = "The report is authentic but has been revoked by the issuer."
    else:
        status = VerificationStatus.VERIFIED
        msg = "The report is authentic, issued on the blockchain, and currently valid."
        
    return VerificationResponse(
        report_id=req.report_id,
        status=status,
        current_hash=current_hash,
        on_chain_issuer=att["issuer"] if att["is_issued"] else None,
        on_chain_issued_at=att["issued_at"] if att["is_issued"] else None,
        on_chain_revoked=att["revoked"] if att["is_issued"] else None,
        message=msg
    )
