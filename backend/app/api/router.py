"""AquaTrust AI — API Router Aggregation.

Mounts versioned API routers conforming to MASTER/API_ENDPOINT_REGISTRY.md.
"""

from fastapi import APIRouter
from app.api.v1.health import router as health_router
from app.api.v1.ingestion import router as ingestion_router
from app.api.v1.facilities import router as facilities_router
from app.api.v1.validation import router as validation_router
from app.api.v1.anomalies import router as anomalies_router
from app.api.v1.simulator import router as simulator_router

from app.api.v1.compliance import router as compliance_router
from app.api.v1.treatment_records import router as treatment_records_router
from app.api.v1.certificates import router as certificates_router
from app.api.v1.verification import router as verification_router
from app.api.v1.corrections import router as corrections_router
from app.api.v1.audit import router as audit_router
from app.api.v1.dlt import router as dlt_router
from app.api.v1.auth import router as auth_router

api_router = APIRouter()

# Mount API v1 routers
api_router.include_router(health_router, prefix="", tags=["health"])
api_router.include_router(auth_router, prefix="", tags=["Authentication & RBAC"])
api_router.include_router(ingestion_router, prefix="", tags=["Telemetry Ingestion"])
api_router.include_router(facilities_router, prefix="", tags=["Facilities"])
api_router.include_router(validation_router, prefix="", tags=["Pre-AI Validation"])
api_router.include_router(anomalies_router, prefix="", tags=["AI Anomaly Detection"])
api_router.include_router(simulator_router, prefix="", tags=["Telemetry Simulator Bridge"])
api_router.include_router(compliance_router, prefix="", tags=["Compliance Rules & Evaluation"])
api_router.include_router(treatment_records_router, prefix="", tags=["Treatment Records"])
api_router.include_router(certificates_router, prefix="", tags=["Treatment Certificates"])
api_router.include_router(verification_router, prefix="", tags=["Cryptographic Verification & Trust"])
api_router.include_router(corrections_router, prefix="", tags=["Append-Only Lineage & Corrections"])
api_router.include_router(audit_router, prefix="", tags=["Security & Compliance Audit Logs"])
api_router.include_router(dlt_router, prefix="", tags=["Distributed Ledger (DLT) Anchors"])
