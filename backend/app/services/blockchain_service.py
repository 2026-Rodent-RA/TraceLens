"""backend/app/services/blockchain_service.py
web3.py 기반 Blockchain 통신 서비스.
Report Service가 RPC / ABI / Solidity 세부 구현을 몰라도 되게 추상화합니다.
"""
import json
from pathlib import Path
from typing import Optional
from web3 import Web3

from app.config import settings


class BlockchainService:
    """InvestigationAttestationRegistry Smart Contract와 통신하는 서비스."""

    def __init__(self):
        self._w3: Optional[Web3] = None
        self._contract = None
        self._account = None
        self._initialized = False

    def _ensure_initialized(self):
        """Lazy initialization — 첫 호출 시 web3 연결."""
        if self._initialized:
            return

        if not settings.blockchain_rpc_url or not settings.contract_address:
            raise RuntimeError(
                "Blockchain not configured. "
                "Set BLOCKCHAIN_RPC_URL and CONTRACT_ADDRESS in .env"
            )

        self._w3 = Web3(Web3.HTTPProvider(settings.blockchain_rpc_url))
        if not self._w3.is_connected():
            raise RuntimeError(
                f"Cannot connect to blockchain node at {settings.blockchain_rpc_url}"
            )

        # ABI 로드
        abi_path = Path(__file__).parent.parent / "contracts" / "InvestigationAttestationRegistry.json"
        if not abi_path.exists():
            raise FileNotFoundError(
                f"ABI file not found: {abi_path}\n"
                "Run: npx hardhat run scripts/deploy.js --network localhost"
            )
        with open(abi_path, "r") as f:
            abi_data = json.load(f)

        self._contract = self._w3.eth.contract(
            address=Web3.to_checksum_address(settings.contract_address),
            abi=abi_data["abi"]
        )

        # Issuer account 설정
        if settings.issuer_private_key:
            self._account = self._w3.eth.account.from_key(settings.issuer_private_key)
        else:
            raise RuntimeError(
                "ISSUER_PRIVATE_KEY not configured in .env"
            )

        self._initialized = True

    def _hex_to_bytes32(self, hex_str: str) -> bytes:
        """SHA-256 hex string → bytes32 (0x prefix 처리)."""
        clean = hex_str.replace("0x", "")
        return bytes.fromhex(clean)

    def _send_tx(self, fn):
        """트랜잭션 빌드 → 서명 → 전송 → receipt 반환."""
        self._ensure_initialized()
        tx = fn.build_transaction({
            "from": self._account.address,
            "nonce": self._w3.eth.get_transaction_count(self._account.address),
            "gas": 200000,
            "gasPrice": self._w3.eth.gas_price,
        })
        signed = self._w3.eth.account.sign_transaction(tx, self._account.key)
        tx_hash = self._w3.eth.send_raw_transaction(signed.rawTransaction)
        receipt = self._w3.eth.wait_for_transaction_receipt(tx_hash)
        return receipt

    def issue_report(self, report_hash_hex: str) -> dict:
        """Report를 Blockchain에 발급 등록합니다."""
        self._ensure_initialized()
        hash_bytes = self._hex_to_bytes32(report_hash_hex)
        fn = self._contract.functions.issueReport(hash_bytes)
        receipt = self._send_tx(fn)
        return {
            "tx_hash": receipt.transactionHash.hex(),
            "block_number": receipt.blockNumber,
            "issuer": self._account.address,
            "status": receipt.status,  # 1 = success
        }

    def get_attestation(self, report_hash_hex: str) -> dict:
        """On-chain attestation 정보를 조회합니다 (view call, 무료)."""
        self._ensure_initialized()
        hash_bytes = self._hex_to_bytes32(report_hash_hex)
        issuer, issued_at, revoked = self._contract.functions.getAttestation(hash_bytes).call()
        return {
            "issuer": issuer,
            "issued_at": issued_at,
            "revoked": revoked,
            "is_issued": issued_at > 0,
        }

    def revoke_report(self, report_hash_hex: str) -> dict:
        """Report를 취소합니다 (issuer만 가능)."""
        self._ensure_initialized()
        hash_bytes = self._hex_to_bytes32(report_hash_hex)
        fn = self._contract.functions.revokeReport(hash_bytes)
        receipt = self._send_tx(fn)
        return {
            "tx_hash": receipt.transactionHash.hex(),
            "block_number": receipt.blockNumber,
            "revoked_by": self._account.address,
            "status": receipt.status,
        }

    def is_active(self, report_hash_hex: str) -> bool:
        """Report가 현재 유효한지 확인합니다 (view call)."""
        self._ensure_initialized()
        hash_bytes = self._hex_to_bytes32(report_hash_hex)
        return self._contract.functions.isActive(hash_bytes).call()

    def is_connected(self) -> bool:
        """Blockchain 노드 연결 상태를 확인합니다."""
        try:
            self._ensure_initialized()
            return self._w3.is_connected()
        except Exception:
            return False


# Singleton instance
blockchain_service = BlockchainService()
