"""backend/app/services/hashing_service.py
Deterministic serialization & Hashing service.
선택한 Hash 알고리즘: SHA-256
이유: Python 표준 라이브러리(hashlib)로 기본 지원되며, Solidity에서도 sha256() precompile을 통해
      네이티브하게 검증할 수 있어 가볍고 호환성이 좋기 때문입니다.
"""
import hashlib
import json
from typing import Dict, Any

def serialize_deterministically(data: Dict[str, Any]) -> str:
    """
    동일한 데이터 구조에 대해 항상 동일한 문자열이 나오도록 결정적 직렬화를 수행합니다.
    - JSON key 정렬 (sort_keys=True)
    - 불필요한 공백 제거 (separators=(',', ':'))
    """
    return json.dumps(data, sort_keys=True, separators=(',', ':'), ensure_ascii=False)

def generate_report_hash(content_dict: Dict[str, Any]) -> str:
    """
    결정적으로 직렬화된 Report Content 문자열을 SHA-256으로 해시합니다.
    """
    serialized = serialize_deterministically(content_dict)
    return hashlib.sha256(serialized.encode('utf-8')).hexdigest()
