"""Routeur Véhicules.

Endpoints CRUD + statuts + timeline + photo + QR code.
"""
import os
import secrets
import urllib.parse
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_active_user
from app.config import settings
from app.database import get_db
from app.deps import PaginationParams, get_current_company, get_pagination_params
from app.models import (
    Alert,
    Company,
    Document,
    User,
    Vehicle,
    VehicleStatus,
    VehicleStatusHistory,
)
from app.schemas import (
    DocumentResponse,
    TimelineEvent,
    VehicleCreate,
    VehicleDetailResponse,
    VehicleResponse,
    VehicleStatusChange,
    VehicleStatusHistoryResponse,
    VehicleUpdate,
)

router = APIRouter(prefix="/api/vehicles", tags=["Véhicules"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _get_vehicle_or_404(
    db: AsyncSession, vehicle_id: UUID, company_id: UUID
) -> Vehicle:
    result = await db.execute(
        select(Vehicle).where(
            Vehicle.id == vehicle_id, Vehicle.company_id == company_id
        )
    )
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Véhicule introuvable.",
        )
    return vehicle


def _vehicle_to_response(
    vehicle: Vehicle, documents_count: int = 0, compliance_rate: Optional[float] = None
) -> VehicleResponse:
    resp = VehicleResponse.model_validate(vehicle)
    resp.documents_count = documents_count
    resp.compliance_rate = compliance_rate
    return resp


# ---------------------------------------------------------------------------
# Liste
# ---------------------------------------------------------------------------


@router.get("", response_model=List[VehicleResponse])
async def list_vehicles(
    search: Optional[str] = Query(None, description="Recherche (immat, marque, modèle)"),
    status_filter: Optional[VehicleStatus] = Query(None, alias="status"),
    vehicle_type_id: Optional[UUID] = None,
    pagination: PaginationParams = Depends(get_pagination_params),
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Liste les véhicules de la société avec filtres et pagination."""
    query = select(Vehicle).where(Vehicle.company_id == company.id)

    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(
                Vehicle.registration.ilike(pattern),
                Vehicle.brand.ilike(pattern),
                Vehicle.model.ilike(pattern),
                Vehicle.vin.ilike(pattern),
            )
        )

    if status_filter:
        query = query.where(Vehicle.status == status_filter)

    if vehicle_type_id:
        query = query.where(Vehicle.vehicle_type_id == vehicle_type_id)

    query = query.order_by(Vehicle.created_at.desc())
    query = query.offset(pagination.offset).limit(pagination.limit)

    result = await db.execute(query)
    vehicles = result.scalars().all()

    responses = []
    for v in vehicles:
        count_result = await db.execute(
            select(func.count(Document.id)).where(Document.vehicle_id == v.id)
        )
        doc_count = count_result.scalar_one()
        responses.append(_vehicle_to_response(v, documents_count=doc_count))

    return responses


# ---------------------------------------------------------------------------
# Création
# ---------------------------------------------------------------------------


@router.post("", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
async def create_vehicle(
    payload: VehicleCreate,
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Crée un nouveau véhicule."""
    count_result = await db.execute(
        select(func.count(Vehicle.id)).where(Vehicle.company_id == company.id)
    )
    current_count = count_result.scalar_one()
    if current_count >= company.max_vehicles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Limite du plan atteinte ({company.max_vehicles} véhicules). "
            f"Passez à un plan supérieur pour ajouter plus de véhicules.",
        )

    existing = await db.execute(
        select(Vehicle).where(
            Vehicle.registration == payload.registration,
            Vehicle.company_id == company.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Un véhicule avec cette immatriculation existe déjà.",
        )

    vehicle = Vehicle(
        **payload.model_dump(exclude_unset=True),
        company_id=company.id,
    )
    db.add(vehicle)
    await db.commit()
    await db.refresh(vehicle)

    return _vehicle_to_response(vehicle)


# ---------------------------------------------------------------------------
# Détail
# ---------------------------------------------------------------------------


@router.get("/{vehicle_id}", response_model=VehicleDetailResponse)
async def get_vehicle(
    vehicle_id: UUID,
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Détail d'un véhicule avec documents et historique de statuts."""
    vehicle = await _get_vehicle_or_404(db, vehicle_id, company.id)

    docs_result = await db.execute(
        select(Document)
        .where(Document.vehicle_id == vehicle.id)
        .order_by(Document.created_at.desc())
    )
    documents = docs_result.scalars().all()

    history_result = await db.execute(
        select(VehicleStatusHistory)
        .where(VehicleStatusHistory.vehicle_id == vehicle.id)
        .order_by(VehicleStatusHistory.changed_at.desc())
    )
    history = history_result.scalars().all()

    resp = VehicleDetailResponse.model_validate(vehicle)
    resp.documents = [DocumentResponse.model_validate(d) for d in documents]
    resp.status_history = [
        VehicleStatusHistoryResponse.model_validate(h) for h in history
    ]
    resp.documents_count = len(documents)
    return resp


# ---------------------------------------------------------------------------
# Mise à jour
# ---------------------------------------------------------------------------


@router.put("/{vehicle_id}", response_model=VehicleResponse)
async def update_vehicle(
    vehicle_id: UUID,
    payload: VehicleUpdate,
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Met à jour un véhicule."""
    vehicle = await _get_vehicle_or_404(db, vehicle_id, company.id)

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(vehicle, key, value)

    await db.commit()
    await db.refresh(vehicle)
    return _vehicle_to_response(vehicle)


# ---------------------------------------------------------------------------
# Suppression (archivage)
# ---------------------------------------------------------------------------


@router.delete("/{vehicle_id}")
async def delete_vehicle(
    vehicle_id: UUID,
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Archive un véhicule (suppression logique)."""
    vehicle = await _get_vehicle_or_404(db, vehicle_id, company.id)

    if vehicle.status == VehicleStatus.archived:
        return {"message": "Véhicule déjà archivé."}

    history = VehicleStatusHistory(
        vehicle_id=vehicle.id,
        old_status=vehicle.status,
        new_status=VehicleStatus.archived,
        comment="Véhicule archivé",
    )
    db.add(history)

    vehicle.status = VehicleStatus.archived
    await db.commit()
    return {"message": "Véhicule archivé avec succès."}


# ---------------------------------------------------------------------------
# Changement de statut
# ---------------------------------------------------------------------------


@router.post("/{vehicle_id}/status", response_model=VehicleStatusHistoryResponse)
async def change_vehicle_status(
    vehicle_id: UUID,
    payload: VehicleStatusChange,
    current_user: User = Depends(get_current_active_user),
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Change le statut d'un véhicule avec un commentaire."""
    vehicle = await _get_vehicle_or_404(db, vehicle_id, company.id)

    old_status = vehicle.status
    history = VehicleStatusHistory(
        vehicle_id=vehicle.id,
        old_status=old_status,
        new_status=payload.status,
        comment=payload.comment,
        changed_by_id=current_user.id,
    )
    db.add(history)
    vehicle.status = payload.status
    await db.commit()
    await db.refresh(history)
    return history


# ---------------------------------------------------------------------------
# Timeline agrégée
# ---------------------------------------------------------------------------


@router.get("/{vehicle_id}/timeline", response_model=List[TimelineEvent])
async def get_vehicle_timeline(
    vehicle_id: UUID,
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Timeline agrégée : changements de statut + documents + alertes."""
    vehicle = await _get_vehicle_or_404(db, vehicle_id, company.id)

    events: List[TimelineEvent] = []

    history_result = await db.execute(
        select(VehicleStatusHistory)
        .where(VehicleStatusHistory.vehicle_id == vehicle.id)
        .order_by(VehicleStatusHistory.changed_at.desc())
    )
    for h in history_result.scalars().all():
        events.append(
            TimelineEvent(
                id=f"status-{h.id}",
                type="status_change",
                title=f"Statut : {h.new_status.value}",
                description=h.comment,
                timestamp=h.changed_at,
                metadata={
                    "old_status": h.old_status.value if h.old_status else None,
                    "new_status": h.new_status.value,
                },
            )
        )

    docs_result = await db.execute(
        select(Document)
        .where(Document.vehicle_id == vehicle.id)
        .order_by(Document.created_at.desc())
    )
    for d in docs_result.scalars().all():
        events.append(
            TimelineEvent(
                id=f"document-{d.id}",
                type="document_uploaded",
                title=f"Document : {d.file_name}",
                description=f"Statut OCR : {d.ocr_status.value}",
                timestamp=d.created_at,
                metadata={
                    "document_id": str(d.id),
                    "ocr_status": d.ocr_status.value,
                },
            )
        )

    alerts_result = await db.execute(
        select(Alert)
        .where(Alert.vehicle_id == vehicle.id)
        .order_by(Alert.triggered_at.desc())
    )
    for a in alerts_result.scalars().all():
        events.append(
            TimelineEvent(
                id=f"alert-{a.id}",
                type="alert",
                title=f"Alerte : {a.type.value}",
                description=a.message,
                timestamp=a.triggered_at,
                metadata={
                    "severity": a.severity.value,
                    "status": a.status.value,
                },
            )
        )

    events.sort(key=lambda e: e.timestamp, reverse=True)
    return events


# ---------------------------------------------------------------------------
# Photo
# ---------------------------------------------------------------------------


@router.post("/{vehicle_id}/photo", response_model=VehicleResponse)
async def upload_vehicle_photo(
    vehicle_id: UUID,
    file: UploadFile = File(...),
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Téléverse une photo pour un véhicule."""
    vehicle = await _get_vehicle_or_404(db, vehicle_id, company.id)

    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format d'image non supporté. Utilisez JPEG, PNG ou WebP.",
        )

    contents = await file.read()
    if len(contents) > settings.max_upload_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Fichier trop volumineux (max {settings.MAX_UPLOAD_SIZE_MB} Mo).",
        )

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    ext = file.filename.split(".")[-1] if file.filename else "jpg"
    filename = f"vehicle-{vehicle.id}-{secrets.token_hex(8)}.{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(contents)

    vehicle.photo_url = f"{settings.base_url}/uploads/{filename}"
    await db.commit()
    await db.refresh(vehicle)

    return _vehicle_to_response(vehicle)


# ---------------------------------------------------------------------------
# QR Code
# ---------------------------------------------------------------------------


@router.get("/{vehicle_id}/qrcode")
async def get_vehicle_qrcode(
    vehicle_id: UUID,
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Génère un QR code pointant vers la fiche du véhicule."""
    vehicle = await _get_vehicle_or_404(db, vehicle_id, company.id)

    qr_url = f"{settings.base_url}/vehicles/{vehicle.id}"
    svg = _generate_qr_svg(qr_url)

    return {
        "vehicle_id": str(vehicle.id),
        "registration": vehicle.registration,
        "url": qr_url,
        "qr_code_svg": svg,
    }


def _generate_qr_svg(data: str) -> str:
    """Génère un QR code simplifié en SVG.

    Note : pour une production réelle, utilisez la bibliothèque `qrcode`.
    """
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" '
        f'viewBox="0 0 200 200">'
        f'<rect width="200" height="200" fill="white"/>'
        f'<rect x="10" y="10" width="180" height="180" fill="none" '
        f'stroke="black" stroke-width="2"/>'
        f'<text x="100" y="100" text-anchor="middle" font-size="9" '
        f'font-family="monospace">{data[:28]}</text>'
        f'<text x="100" y="115" text-anchor="middle" font-size="9" '
        f'font-family="monospace">{data[28:56]}</text>'
        f"</svg>"
    )
