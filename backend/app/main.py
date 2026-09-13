"""backend/app/main.py
FastAPI application entry point.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.cases import router as cases_router
from app.api.reports import router as reports_router
from app.api.attestation import router as attestation_router

app = FastAPI(
    title="TraceLens API",
    description="AI-assisted On-chain Investigation Platform — Backend API",
    version="0.1.0"
)

# CORS — Frontend(localhost:5173)에서 접근 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(cases_router)
app.include_router(reports_router)
app.include_router(attestation_router)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "TraceLens API",
        "analysis_data_dir": str(settings.analysis_data_dir),
    }
