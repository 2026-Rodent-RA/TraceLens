"""backend/app/models/attestation.py
Pydantic models for Blockchain Attestation.
"""
from enum import Enum
from typing import Optional
from pydantic import BaseModel


class VerificationStatus(str, Enum):
    NOT_ISSUED = "NOT_ISSUED"
    VERIFIED = "VERIFIED"
    TAMPERED = "TAMPERED"
    REVOKED = "REVOKED"
    HASH_MISMATCH = "HASH_MISMATCH"
    NOT_VERIFIED = "NOT_VERIFIED"



class AttestationResponse(BaseModel):
    """On-chain attestation 정보."""
    report_hash: str
    issuer: str
    issued_at: int
    revoked: bool
    is_issued: bool  # issuedAt > 0


class IssueResponse(BaseModel):
    """Report 발급 결과."""
    report_id: str
    report_hash: str
    tx_hash: str
    issuer: str
    block_number: int


class VerificationResponse(BaseModel):
    """Report 검증 결과."""
    report_id: str
    status: VerificationStatus
    current_hash: str
    on_chain_issuer: Optional[str] = None
    on_chain_issued_at: Optional[int] = None
    on_chain_revoked: Optional[bool] = None
    message: str


class RevokeResponse(BaseModel):
    """Report 취소 결과."""
    report_id: str
    report_hash: str
    tx_hash: str
    revoked_by: str
    block_number: int


class ExternalVerificationRequest(BaseModel):
    """외부 기관에서 전달받은 Report JSON 검증 요청"""
    report_id: str
    content: dict
    report_hash: str
    generated_at: str

class IssueRequest(BaseModel):
    report_id: str
    report_hash: str

class RevokeRequest(BaseModel):
    report_id: str
    report_hash: str
