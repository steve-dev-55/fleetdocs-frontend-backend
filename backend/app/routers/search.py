"""Routeur Recherche globale."""
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_company
from app.models import Alert, Company, Document, Vehicle
from app.routers.documents import _doc_to_response
from app.schemas import (
    AlertResponse,
    DocumentResponse,
    SearchResult,
    VehicleResponse,
)

router = APIRouter(prefix="/api/search", tags=["Recherche"])


@router.get("", response_model=SearchResult)
async def global_search(
    q: str = Query(..., min_length=2, description="Terme de recherche"),
    limit: int = Query(10, ge=1, le=50),
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Recherche globale à travers véhicules, documents et alertes."""
    pattern = f"%{q}%"

    # Véhicules
    vehicles_result = await db.execute(
        select(Vehicle)
        .where(
            Vehicle.company_id == company.id,
            or_(
                Vehicle.registration.ilike(pattern),
                Vehicle.brand.ilike(pattern),
                Vehicle.model.ilike(pattern),
                Vehicle.vin.ilike(pattern),
            ),
        )
        .limit(limit)
    )
    vehicles = [
        VehicleResponse.model_validate(v) for v in vehicles_result.scalars().all()
    ]

    # Documents
    docs_result = await db.execute(
        select(Document)
        .options(
            selectinload(Document.document_type),
            selectinload(Document.uploaded_by),
            selectinload(Document.vehicle),
        )
        .where(
            Document.company_id == company.id,
            or_(
                Document.file_name.ilike(pattern),
                Document.reference.ilike(pattern),
                Document.ocr_raw_text.ilike(pattern),
            ),
        )
        .limit(limit)
    )
    documents = [
        _doc_to_response(d) for d in docs_result.scalars().all()
    ]

    # Alertes
    alerts_result = await db.execute(
        select(Alert)
        .where(
            Alert.company_id == company.id,
            Alert.message.ilike(pattern),
        )
        .limit(limit)
    )
    alerts = [
        AlertResponse.model_validate(a) for a in alerts_result.scalars().all()
    ]

    total = len(vehicles) + len(documents) + len(alerts)

    return SearchResult(
        vehicles=vehicles,
        documents=documents,
        alerts=alerts,
        total=total,
    )
