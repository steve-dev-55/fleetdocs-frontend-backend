"""Routeur Véhicules.

Endpoints CRUD + statuts + timeline + photo + QR code.
"""
import os
import secrets
import urllib.parse
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload
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
    VehicleType,
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
        select(Vehicle)
        .options(selectinload(Vehicle.vehicle_type))
        .where(
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
    # Populate vehicle_type_name from the relationship if loaded
    if vehicle.vehicle_type:
        resp.vehicle_type_name = vehicle.vehicle_type.name
        resp.vehicle_type_code = vehicle.vehicle_type.code
    return resp


# ---------------------------------------------------------------------------
# Liste
# ---------------------------------------------------------------------------


@router.get("", response_model=List[VehicleResponse])
async def list_vehicles(
    search: Optional[str] = Query(None, description="Recherche (immat, marque, modèle)"),
    status_filter: Optional[str] = Query(None, alias="status"),
    vehicle_type_id: Optional[str] = None,  # Accept UUID or type name
    compliance: Optional[str] = None,  # Ignored (filtered client-side)
    pagination: PaginationParams = Depends(get_pagination_params),
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Liste les véhicules de la société avec filtres et pagination."""
    from sqlalchemy.orm import selectinload
    query = (
        select(Vehicle)
        .options(selectinload(Vehicle.vehicle_type))
        .where(Vehicle.company_id == company.id)
    )

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

    # "all" (ou vide) signifie "pas de filtre" — évite l'erreur 422 quand le
    # frontend envoie explicitement status=all pour dire "tous les statuts".
    if status_filter and status_filter != "all":
        # Map legacy status values to current enum values
        status_map = {
            "available": "active",
            "in_service": "active",
            "broken_down": "maintenance",
            "in_garage": "maintenance",
            "immobilized": "out_of_service",
        }
        mapped_status = status_map.get(status_filter, status_filter)
        try:
            status_enum = VehicleStatus(mapped_status)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Statut invalide : {status_filter}",
            )
        query = query.where(Vehicle.status == VehicleStatus(mapped_status))

    # Type filter: frontend sends the type name (e.g. "Fourgon") or "all"
    # We need to resolve it to a vehicle_type_id
    type_filter = vehicle_type_id  # could be UUID string or type name
    if type_filter and type_filter != "all":
        # Try to resolve as UUID first
        try:
            from uuid import UUID as UUIDType
            uuid_val = UUIDType(type_filter)
            query = query.where(Vehicle.vehicle_type_id == uuid_val)
        except (ValueError, AttributeError):
            # Not a UUID — treat as type name and resolve via VehicleType
            vt_result = await db.execute(
                select(VehicleType).where(VehicleType.name == type_filter)
            )
            vt = vt_result.scalar_one_or_none()
            if vt:
                query = query.where(Vehicle.vehicle_type_id == vt.id)
            else:
                # Unknown type — return empty result
                query = query.where(Vehicle.id == None)  # noqa: E711

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
    # Re-query with selectinload to avoid greenlet error
    result = await db.execute(
        select(Vehicle)
        .options(selectinload(Vehicle.vehicle_type))
        .where(Vehicle.id == vehicle.id)
    )
    vehicle = result.scalar_one()
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
    # On charge Vehicle.documents et Vehicle.status_history en eager-load ICI :
    # VehicleDetailResponse.model_validate(vehicle) accède automatiquement à ces
    # relations pour les champs "documents"/"status_history" du schéma, et un
    # accès lazy sur une session async plante avec MissingGreenlet.
    result = await db.execute(
        select(Vehicle)
        .options(
            selectinload(Vehicle.vehicle_type),
            selectinload(Vehicle.documents).selectinload(Document.document_type),
            selectinload(Vehicle.status_history),
        )
        .where(Vehicle.id == vehicle_id, Vehicle.company_id == company.id)
    )
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Véhicule introuvable.",
        )

    documents = sorted(vehicle.documents, key=lambda d: d.created_at, reverse=True)
    history = sorted(vehicle.status_history, key=lambda h: h.changed_at, reverse=True)

    resp = VehicleDetailResponse.model_validate(vehicle)
    resp.documents = [DocumentResponse.model_validate(d) for d in documents]
    resp.status_history = [
        VehicleStatusHistoryResponse.model_validate(h) for h in history
    ]
    resp.documents_count = len(documents)
    # Populate vehicle_type_name from the relationship if loaded
    if vehicle.vehicle_type:
        resp.vehicle_type_name = vehicle.vehicle_type.name
        resp.vehicle_type_code = vehicle.vehicle_type.code
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
# Suppression (archive d'abord, puis suppression physique)
# ---------------------------------------------------------------------------


@router.delete("/{vehicle_id}")
async def delete_vehicle(
    vehicle_id: UUID,
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Supprime un véhicule.

    Comportement en 2 étapes :
    1. Si le véhicule n'est pas encore archivé → on l'archive (suppression logique).
    2. Si le véhicule est déjà archivé → on le supprime physiquement (avec ses
       documents, alertes, historique, commentaires et liens de partage via CASCADE).
    """
    # Vérifie que le véhicule existe et appartient à la société
    result = await db.execute(
        select(Vehicle)
        .options(
            selectinload(Vehicle.documents),
            selectinload(Vehicle.status_history),
            selectinload(Vehicle.alerts),
        )
        .where(Vehicle.id == vehicle_id, Vehicle.company_id == company.id)
    )
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Véhicule introuvable.",
        )

    # Étape 1 : archive si pas encore archivé
    if vehicle.status != VehicleStatus.archived:
        history = VehicleStatusHistory(
            vehicle_id=vehicle.id,
            old_status=vehicle.status,
            new_status=VehicleStatus.archived,
            comment="Véhicule archivé",
        )
        db.add(history)
        vehicle.status = VehicleStatus.archived
        await db.commit()
        return {"message": "Véhicule archivé avec succès.", "archived": True}

    # Étape 2 : suppression physique (les relations sont supprimées via CASCADE)
    # Supprime les fichiers physiques des documents
    for doc in vehicle.documents:
        if doc.file_url:
            filename = doc.file_url.split("/uploads/")[-1]
            filepath = os.path.join(settings.UPLOAD_DIR, filename)
            if os.path.exists(filepath):
                try:
                    os.remove(filepath)
                except OSError:
                    pass

    # Supprime le véhicule (les relations DB cascade suppriment docs, alertes, etc.)
    await db.delete(vehicle)
    await db.commit()
    return {"message": "Véhicule supprimé définitivement.", "deleted": True}


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
                title=f"Statut : {h.new_status.value if hasattr(h.new_status, 'value') else h.new_status}",
                description=h.comment,
                timestamp=h.changed_at,
                metadata={
                    "old_status": (h.old_status.value if hasattr(h.old_status, 'value') else str(h.old_status)) if h.old_status else None,
                    "new_status": h.new_status.value if hasattr(h.new_status, 'value') else str(h.new_status),
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
                description=f"Document : {d.file_name}",
                timestamp=d.created_at,
                metadata={
                    "document_id": str(d.id),
                    "ocr_status": str(d.ocr_status) if d.ocr_status else "manual",
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
                title=f"Alerte : {a.type.value if hasattr(a.type, 'value') else str(a.type)}",
                description=a.message,
                timestamp=a.triggered_at,
                metadata={
                    "severity": a.severity.value if hasattr(a.severity, 'value') else str(a.severity),
                    "status": a.status.value if hasattr(a.status, 'value') else str(a.status),
                },
            )
        )

    events.sort(key=lambda e: e.timestamp, reverse=True)
    return events


# ---------------------------------------------------------------------------
# Champs personnalisés
# ---------------------------------------------------------------------------


@router.get("/{vehicle_id}/custom-fields")
async def get_vehicle_custom_fields(
    vehicle_id: UUID,
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Retourne les champs personnalisés (JSONB) d'un véhicule."""
    vehicle = await _get_vehicle_or_404(db, vehicle_id, company.id)
    return vehicle.custom_fields or {}


@router.put("/{vehicle_id}/custom-fields")
async def update_vehicle_custom_fields(
    vehicle_id: UUID,
    payload: Dict[str, Any],
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Remplace les champs personnalisés (JSONB) d'un véhicule."""
    vehicle = await _get_vehicle_or_404(db, vehicle_id, company.id)
    vehicle.custom_fields = payload
    await db.commit()
    await db.refresh(vehicle)
    return vehicle.custom_fields or {}


# ---------------------------------------------------------------------------
# Photo
# ---------------------------------------------------------------------------


@router.get("/{vehicle_id}/photo")
async def get_vehicle_photo(
    vehicle_id: UUID,
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Retourne l'URL de la photo courante d'un véhicule (ou null)."""
    vehicle = await _get_vehicle_or_404(db, vehicle_id, company.id)
    return {"photo_url": vehicle.photo_url}


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