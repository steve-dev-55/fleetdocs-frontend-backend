"""Routeur Dashboard : KPIs, graphiques, alertes et documents récents."""
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_company
from app.models import (
    Alert,
    AlertStatus,
    Company,
    Document,
    OCRStatus,
    ValidityStatus,
    Vehicle,
    VehicleStatus,
)
from app.schemas import AlertResponse, DashboardResponse, DocumentResponse

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("", response_model=DashboardResponse)
async def get_dashboard(
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Retourne les KPIs, données de graphiques et éléments récents."""
    company_id = company.id

    # --- KPIs ---
    total_vehicles = (
        await db.execute(
            select(func.count(Vehicle.id)).where(
                Vehicle.company_id == company_id,
                Vehicle.status != VehicleStatus.archived,
            )
        )
    ).scalar_one()

    total_documents = (
        await db.execute(
            select(func.count(Document.id)).where(Document.company_id == company_id)
        )
    ).scalar_one()

    # Taux de conformité = documents valides / total documents
    valid_docs = (
        await db.execute(
            select(func.count(Document.id)).where(
                Document.company_id == company_id,
                Document.validity_status == ValidityStatus.valid,
            )
        )
    ).scalar_one()

    compliance_rate = (valid_docs / total_documents * 100) if total_documents > 0 else 100.0

    active_alerts = (
        await db.execute(
            select(func.count(Alert.id)).where(
                Alert.company_id == company_id,
                Alert.status == AlertStatus.active,
            )
        )
    ).scalar_one()

    pending_ocr = (
        await db.execute(
            select(func.count(Document.id)).where(
                Document.company_id == company_id,
                Document.ocr_status.in_([OCRStatus.pending_ocr, OCRStatus.processing]),
            )
        )
    ).scalar_one()

    expired_docs = (
        await db.execute(
            select(func.count(Document.id)).where(
                Document.company_id == company_id,
                Document.validity_status == ValidityStatus.expired,
            )
        )
    ).scalar_one()

    expiring_soon = (
        await db.execute(
            select(func.count(Document.id)).where(
                Document.company_id == company_id,
                Document.validity_status == ValidityStatus.expiring_soon,
            )
        )
    ).scalar_one()

    kpis: Dict[str, Any] = {
        "total_vehicles": total_vehicles,
        "total_documents": total_documents,
        "compliance_rate": round(compliance_rate, 1),
        "active_alerts": active_alerts,
        "pending_ocr": pending_ocr,
        "expired_documents": expired_docs,
        "expiring_soon_documents": expiring_soon,
        "max_vehicles": company.max_vehicles,
        "vehicles_usage_percentage": round(
            (total_vehicles / company.max_vehicles * 100) if company.max_vehicles > 0 else 0, 1
        ),
    }

    # --- Graphiques ---
    # Véhicules par statut
    status_result = await db.execute(
        select(Vehicle.status, func.count(Vehicle.id))
        .where(Vehicle.company_id == company_id)
        .group_by(Vehicle.status)
    )
    vehicles_by_status = {s.value: c for s, c in status_result.all()}

    # Documents par statut de validité
    validity_result = await db.execute(
        select(Document.validity_status, func.count(Document.id))
        .where(Document.company_id == company_id)
        .group_by(Document.validity_status)
    )
    documents_by_validity = {s.value: c for s, c in validity_result.all()}

    # Documents par statut OCR
    ocr_result = await db.execute(
        select(Document.ocr_status, func.count(Document.id))
        .where(Document.company_id == company_id)
        .group_by(Document.ocr_status)
    )
    documents_by_ocr = {s.value: c for s, c in ocr_result.all()}

    # Alertes par sévérité
    severity_result = await db.execute(
        select(Alert.severity, func.count(Alert.id))
        .where(Alert.company_id == company_id, Alert.status == AlertStatus.active)
        .group_by(Alert.severity)
    )
    alerts_by_severity = {s.value: c for s, c in severity_result.all()}

    # Documents téléversés sur les 30 derniers jours (par jour)
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    docs_timeline_result = await db.execute(
        select(
            func.date_trunc("day", Document.created_at).label("day"),
            func.count(Document.id),
        )
        .where(Document.company_id == company_id, Document.created_at >= thirty_days_ago)
        .group_by("day")
        .order_by("day")
    )
    documents_timeline = [
        {"date": day.isoformat() if day else None, "count": count}
        for day, count in docs_timeline_result.all()
    ]

    charts: Dict[str, Any] = {
        "vehicles_by_status": vehicles_by_status,
        "documents_by_validity": documents_by_validity,
        "documents_by_ocr": documents_by_ocr,
        "alerts_by_severity": alerts_by_severity,
        "documents_timeline": documents_timeline,
    }

    # --- Alertes récentes ---
    recent_alerts_result = await db.execute(
        select(Alert)
        .where(Alert.company_id == company_id)
        .order_by(Alert.triggered_at.desc())
        .limit(5)
    )
    recent_alerts = [
        AlertResponse.model_validate(a) for a in recent_alerts_result.scalars().all()
    ]

    # --- Documents récents ---
    recent_docs_result = await db.execute(
        select(Document)
        .where(Document.company_id == company_id)
        .order_by(Document.created_at.desc())
        .limit(5)
    )
    recent_documents = [
        DocumentResponse.model_validate(d) for d in recent_docs_result.scalars().all()
    ]

    # --- Documents expirant bientôt ---
    expiring_result = await db.execute(
        select(Document)
        .where(
            Document.company_id == company_id,
            Document.validity_status == ValidityStatus.expiring_soon,
        )
        .order_by(Document.expiry_date.asc())
        .limit(5)
    )
    expiring_documents = [
        DocumentResponse.model_validate(d) for d in expiring_result.scalars().all()
    ]

    return DashboardResponse(
        kpis=kpis,
        charts=charts,
        recent_alerts=recent_alerts,
        recent_documents=recent_documents,
        expiring_documents=expiring_documents,
    )
