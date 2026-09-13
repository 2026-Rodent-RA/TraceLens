import sys
import os
import copy
import requests

BASE_URL = "http://localhost:8000"

def run_tests():
    print("=== TraceLens PHASE 5 E2E Verification Test ===")
    
    # 1. Create a report and issue it on blockchain (Institution A flow)
    res = requests.post(f"{BASE_URL}/api/reports", json={"analysis_id": "analysis-003", "reviews": []})
    if res.status_code != 200:
        print("Failed to create report")
        return
    
    report_data = res.json()
    report_id = report_data["report_id"]
    report_hash = report_data["report_hash"]
    print(f"\n[1] Generated Report: {report_id}")
    
    # Issue
    issue_res = requests.post(f"{BASE_URL}/api/reports/issue", json={"report_id": report_id, "report_hash": report_hash})
    if issue_res.status_code != 200:
        print("Failed to issue report on blockchain:", issue_res.text)
        return
    print("[1] Issued on Blockchain successfully.")
    
    print("\n---")
    
    # CASE A: 정상 검증 (Institution B flow)
    print("\n[CASE A] Verifying Original Report JSON (Simulating Institution B)")
    verify_res = requests.post(f"{BASE_URL}/api/reports/verify", json=report_data)
    result_a = verify_res.json()
    print(f"Status: {result_a['status']}")
    assert result_a['status'] == "VERIFIED", f"Expected VERIFIED, got {result_a['status']}"
    
    # CASE B: 변조 검증
    print("\n[CASE B] Verifying Tampered Report JSON")
    tampered_data = copy.deepcopy(report_data)
    # Modify a value inside content
    tampered_data["content"]["prediction_score"] = 0.99
    
    verify_res_b = requests.post(f"{BASE_URL}/api/reports/verify", json=tampered_data)
    result_b = verify_res_b.json()
    print(f"Status: {result_b['status']}")
    print(f"Message: {result_b['message']}")
    assert result_b['status'] == "HASH_MISMATCH", f"Expected HASH_MISMATCH, got {result_b['status']}"
    
    # CASE C: 취소 검증
    print("\n[CASE C] Verifying Revoked Report JSON")
    # Revoke original report (Institution A flow)
    revoke_res = requests.post(f"{BASE_URL}/api/reports/revoke", json={"report_id": report_id, "report_hash": report_hash})
    if revoke_res.status_code != 200:
        print("Failed to revoke report:", revoke_res.text)
        return
    print("(Institution A revoked the report)")
    
    # Verify again using original data (Institution B flow)
    verify_res_c = requests.post(f"{BASE_URL}/api/reports/verify", json=report_data)
    result_c = verify_res_c.json()
    print(f"Status: {result_c['status']}")
    assert result_c['status'] == "REVOKED", f"Expected REVOKED, got {result_c['status']}"
    
    print("\n=== All Tests Passed Successfully! ===")

if __name__ == "__main__":
    run_tests()
