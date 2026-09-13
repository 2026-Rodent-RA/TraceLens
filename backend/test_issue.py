import sys
import os
import requests

# 1. Generate Report
res = requests.post("http://localhost:8000/api/reports", json={"analysis_id": "analysis-001", "reviews": []})
if res.status_code != 200:
    print("Generate Error:", res.text)
    sys.exit(1)
    
report_id = res.json()["report_id"]
report_hash = res.json()["report_hash"]
print(f"Generated Report: {report_id}")

# 2. Issue Report
res_issue = requests.post(f"http://localhost:8000/api/reports/issue", json={"report_id": report_id, "report_hash": report_hash})
print(f"Issue Status: {res_issue.status_code}")
print(f"Issue Response: {res_issue.text}")

