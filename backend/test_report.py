import sys
import os
sys.path.append(os.getcwd())
from app.services.report_service import create_report

try:
    print(create_report("analysis-001", []))
except Exception as e:
    import traceback
    traceback.print_exc()
