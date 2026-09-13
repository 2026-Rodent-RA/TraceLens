// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title InvestigationAttestationRegistry
 * @notice TraceLens — 기관 간 Investigation Report의 발급자·원본성·무결성·유효 상태를 검증하는 Trust Layer
 *
 * On-chain에 저장하는 정보:
 *   - reportHash (bytes32, SHA-256) — mapping key이자 content-addressable identifier
 *   - issuer (address) — 발급 기관의 Wallet 주소
 *   - issuedAt (uint256) — block.timestamp
 *   - revoked (bool) — 취소 여부
 *
 * On-chain에 저장하지 않는 정보:
 *   - Report 원문, AI 분석 JSON, Transaction Graph, Investigator Memo, 개인정보
 */
contract InvestigationAttestationRegistry {

    // ── State ──────────────────────────────────

    address public owner;
    mapping(address => bool) public authorizedIssuers;
    mapping(bytes32 => Attestation) public attestations;

    struct Attestation {
        address issuer;
        uint256 issuedAt;
        bool revoked;
    }

    // ── Events ─────────────────────────────────

    event IssuerAuthorized(address indexed issuer);
    event IssuerRevoked(address indexed issuer);
    event ReportIssued(
        bytes32 indexed reportHash,
        address indexed issuer,
        uint256 issuedAt
    );
    event ReportRevoked(
        bytes32 indexed reportHash,
        address indexed revoker,
        uint256 revokedAt
    );

    // ── Modifiers ──────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyAuthorizedIssuer() {
        require(authorizedIssuers[msg.sender], "Not authorized issuer");
        _;
    }

    // ── Constructor ────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    // ── Issuer Management ──────────────────────

    /**
     * @notice Owner가 기관(issuer)을 등록합니다.
     * @param issuer 등록할 기관의 Wallet 주소
     */
    function authorizeIssuer(address issuer) external onlyOwner {
        authorizedIssuers[issuer] = true;
        emit IssuerAuthorized(issuer);
    }

    /**
     * @notice Owner가 기관(issuer)의 권한을 해제합니다.
     * @param issuer 해제할 기관의 Wallet 주소
     */
    function revokeIssuer(address issuer) external onlyOwner {
        authorizedIssuers[issuer] = false;
        emit IssuerRevoked(issuer);
    }

    // ── Core Functions ─────────────────────────

    /**
     * @notice 등록된 기관이 Investigation Report를 Blockchain에 발급합니다.
     * @param reportHash Report 원문의 SHA-256 해시 (deterministic serialization 후)
     */
    function issueReport(bytes32 reportHash) external onlyAuthorizedIssuer {
        require(reportHash != bytes32(0), "Invalid hash");
        require(attestations[reportHash].issuedAt == 0, "Already issued");

        attestations[reportHash] = Attestation({
            issuer: msg.sender,
            issuedAt: block.timestamp,
            revoked: false
        });

        emit ReportIssued(reportHash, msg.sender, block.timestamp);
    }

    /**
     * @notice Report 발급자가 자신의 Report를 취소합니다.
     *         기록은 삭제되지 않으며 revoked 상태로 변경됩니다.
     * @param reportHash 취소할 Report의 해시
     */
    function revokeReport(bytes32 reportHash) external {
        Attestation storage att = attestations[reportHash];
        require(att.issuedAt != 0, "Report not found");
        require(att.issuer == msg.sender, "Only issuer can revoke");
        require(!att.revoked, "Already revoked");

        att.revoked = true;
        emit ReportRevoked(reportHash, msg.sender, block.timestamp);
    }

    // ── View Functions ─────────────────────────

    /**
     * @notice On-chain에 등록된 Report의 attestation 정보를 조회합니다.
     * @param reportHash 조회할 Report의 해시
     * @return issuer 발급 기관 주소
     * @return issuedAt 발급 시점 (block.timestamp, 0이면 미등록)
     * @return revoked 취소 여부
     */
    function getAttestation(bytes32 reportHash) external view
        returns (address issuer, uint256 issuedAt, bool revoked)
    {
        Attestation memory att = attestations[reportHash];
        return (att.issuer, att.issuedAt, att.revoked);
    }

    /**
     * @notice Report가 현재 유효한지 확인합니다.
     * @param reportHash 확인할 Report의 해시
     * @return true: 발급됨 + 취소되지 않음, false: 미등록 또는 취소됨
     */
    function isActive(bytes32 reportHash) external view returns (bool) {
        Attestation memory att = attestations[reportHash];
        return (att.issuedAt != 0 && !att.revoked);
    }
}
