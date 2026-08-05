"""Routeur Alertes."""
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_active_user
from app.database import get_db
from app.deps import PaginationParams, get_current_company, get_pagination_params
from app.models import (
    Alert,
    AlertCategory,
    AlertSeverity,
    AlertStatus,
    AlertType,
    Company,
    Document,
    User,
    Vehicle,
)
from app.schemas import AlertResolveRequest, AlertResponse, AlertSummary

router = APIRouter(prefix="/api/alerts", tags=["Alertes"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _enrich_alert(db: AsyncSession, alert: Alert) -> AlertResponse:
    """Enrichit une alerte avec l'immatriculation du véhicule et le nom du document."""
    resp = AlertResponse.model_validate(alert)
    if alert.vehicle_id:
        veh_result = await db.execute(
            select(Vehicle.registration).where(Vehicle.id == alert.vehicle_id)
        )
        reg = veh_result.scalar_one_or_none()
        resp.vehicle_registration = reg
    if alert.document_id:
        doc_result = await db.execute(
            select(Document.file_name).where(Document.id == alert.document_id)
        )
        name = doc_result.scalar_one_or_none()
        resp.document_name = name
    return resp


# ---------------------------------------------------------------------------
# Liste
# ---------------------------------------------------------------------------


@router.get("", response_model=List[AlertResponse])
async def list_alerts(
    category: Optional[AlertCategory] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    type_filter: Optional[AlertType] = Query(None, alias="type"),
    severity: Optional[AlertSeverity] = None,
    vehicle_id: Optional[UUID] = None,
    pagination: PaginationParams = Depends(get_pagination_params),
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Liste les alertes avec filtres."""
    query = select(Alert).where(Alert.company_id == company.id)

    if category:
        query = query.where(Alert.category == category)
    # "all" (ou vide) signifie "pas de filtre" — évite l'erreur 422 quand le
    # frontend envoie explicitement status=all pour dire "tous les statuts".
    if status_filter and status_filter != "all":
        try:
            status_enum = AlertStatus(status_filter)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Statut invalide : {status_filter}",
            )
        query = query.where(Alert.status == status_enum)
    if type_filter:
        query = query.where(Alert.type == type_filter)
    if severity:
        query = query.where(Alert.severity == severity)
    if vehicle_id:
        query = query.where(Alert.vehicle_id == vehicle_id)

    query = query.order_by(Alert.triggered_at.desc())
    query = query.offset(pagination.offset).limit(pagination.limit)

    result = await db.execute(query)
    alerts = result.scalars().all()

    responses = []
    for a in alerts:
        responses.append(await _enrich_alert(db, a))
    return responses


# ---------------------------------------------------------------------------
# Résumé
# ---------------------------------------------------------------------------


@router.get("/summary", response_model=AlertSummary)
async def get_alert_summary(
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Compte les alertes par statut, sévérité et catégorie."""
    base_query = select(Alert).where(Alert.company_id == company.id)

    # Total
    total_result = await db.execute(
        select(func.count(Alert.id)).where(Alert.company_id == company.id)
    )
    total = total_result.scalar_one()

    # Par statut
    status_counts = {}
    for s in AlertStatus:
        r = await db.execute(
            select(func.count(Alert.id)).where(
                Alert.company_id == company.id, Alert.status == s
            )
        )
        status_counts[s.value] = r.scalar_one()

    # Par sévérité
    severity_counts = {}
    for s in AlertSeverity:
        r = await db.execute(
            select(func.count(Alert.id)).where(
                Alert.company_id == company.id, Alert.severity == s
            )
        )
        severity_counts[s.value] = r.scalar_one()

    # Par catégorie
    category_counts = {}
    for c in AlertCategory:
        r = await db.execute(
            select(func.count(Alert.id)).where(
                Alert.company_id == company.id, Alert.category == c
            )
        )
        category_counts[c.value] = r.scalar_one()

    return AlertSummary(
        total=total,
        active=status_counts.get("active", 0),
        resolved=status_counts.get("resolved", 0),
        dismissed=status_counts.get("dismissed", 0),
        by_severity=severity_counts,
        by_category=category_counts,
    )


# ---------------------------------------------------------------------------
# Résolution
# ---------------------------------------------------------------------------


@router.post("/{alert_id}/resolve", response_model=AlertResponse)
async def resolve_alert(
    alert_id: UUID,
    payload: AlertResolveRequest,
    current_user: User = Depends(get_current_active_user),
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Marque une alerte comme résolue."""
    result = await db.execute(
        select(Alert).where(
            Alert.id == alert_id, Alert.company_id == company.id
        )
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alerte introuvable.",
        )

    if alert.status == AlertStatus.resolved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cette alerte est déjà résolue.",
        )

    alert.status = AlertStatus.resolved
    alert.resolved_at = datetime.now(timezone.utc)
    alert.resolved_by_id = current_user.id
    alert.resolution_comment = payload.comment

    await db.commit()
    await db.refresh(alert)
    return await _enrich_alert(db, alert)
