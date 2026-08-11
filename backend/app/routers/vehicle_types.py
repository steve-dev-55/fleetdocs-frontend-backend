"""Routeur Types de véhicules (CRUD pour les types spécifiques à la société)."""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_company
from app.models import Company, VehicleType
from app.schemas import VehicleTypeCreate, VehicleTypeResponse

router = APIRouter(prefix="/api/vehicle-types", tags=["Types de véhicules"])


@router.get("", response_model=List[VehicleTypeResponse])
async def list_vehicle_types(
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Liste les types de véhicules (globaux + spécifiques à la société)."""
    result = await db.execute(
        select(VehicleType).where(
            or_(
                VehicleType.is_global.is_(True),
                VehicleType.company_id == company.id,
            )
        ).order_by(VehicleType.name.asc())
    )
    types = result.scalars().all()
    return [VehicleTypeResponse.model_validate(t) for t in types]


@router.post("", response_model=VehicleTypeResponse, status_code=status.HTTP_201_CREATED)
async def create_vehicle_type(
    payload: VehicleTypeCreate,
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Crée un type de véhicule spécifique à la société."""
    # Vérifie l'unicité du code
    existing = await db.execute(
        select(VehicleType).where(VehicleType.code == payload.code)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Un type de véhicule avec le code '{payload.code}' existe déjà.",
        )

    vehicle_type = VehicleType(
        name=payload.name,
        code=payload.code,
        description=payload.description,
        is_global=False,
        company_id=company.id,
    )
    db.add(vehicle_type)
    await db.commit()
    await db.refresh(vehicle_type)
    return vehicle_type


@router.put("/{type_id}", response_model=VehicleTypeResponse)
async def update_vehicle_type(
    type_id: UUID,
    payload: VehicleTypeCreate,
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Met à jour un type de véhicule (uniquement les types de la société)."""
    result = await db.execute(
        select(VehicleType).where(
            VehicleType.id == type_id,
            VehicleType.company_id == company.id,
            VehicleType.is_global.is_(False),
        )
    )
    vehicle_type = result.scalar_one_or_none()
    if not vehicle_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Type de véhicule introuvable ou non modifiable (type global).",
        )

    vehicle_type.name = payload.name
    vehicle_type.code = payload.code
    vehicle_type.description = payload.description
    await db.commit()
    await db.refresh(vehicle_type)
    return vehicle_type


@router.delete("/{type_id}")
async def delete_vehicle_type(
    type_id: UUID,
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Supprime un type de véhicule (uniquement les types de la société)."""
    result = await db.execute(
        select(VehicleType).where(
            VehicleType.id == type_id,
            VehicleType.company_id == company.id,
            VehicleType.is_global.is_(False),
        )
    )
    vehicle_type = result.scalar_one_or_none()
    if not vehicle_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Type de véhicule introuvable ou non supprimable (type global).",
        )

    await db.delete(vehicle_type)
    await db.commit()
    return {"message": "Type de véhicule supprimé avec succès."}
