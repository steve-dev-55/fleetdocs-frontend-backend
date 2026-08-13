"""Routeur Super Admin — Gestion multi-tenant."""
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_active_user
from app.database import get_db
from app.models import (
    Alert,
    AlertStatus,
    Company,
    Document,
    Subscription,
    SubscriptionStatus,
    User,
    UserRole,
    UserStatus,
    Vehicle,
    VehicleStatus,
)
from app.schemas import ORMModel

router = APIRouter(prefix="/api/admin", tags=["Super Admin"])


# ---------------------------------------------------------------------------
# Dépendance : exige le rôle super_admin
# ---------------------------------------------------------------------------

async def require_super_admin(
    current_user: User = Depends(get_current_active_user),
) -> User:
    if current_user.role != UserRole.super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé au super administrateur.",
        )
    return current_user


# ---------------------------------------------------------------------------
# Schémas
# ---------------------------------------------------------------------------

class AdminCompanyResponse(ORMModel):
    id: UUID
    name: str
    siret: Optional[str] = None
    plan: Optional[str] = None
    max_vehicles: int = 50
    city: Optional[str] = None
    country: Optional[str] = None
    created_at: datetime
    # Stats
    vehicle_count: int = 0
    user_count: int = 0
    document_count: int = 0
    subscription_status: Optional[str] = None


class AdminCompanyUpdate(BaseModel):
    name: Optional[str] = None
    plan: Optional[str] = None
    max_vehicles: Optional[int] = None


class AdminDashboardResponse(BaseModel):
    companies_count: int
    users_count: int
    vehicles_count: int
    documents_count: int
    active_alerts: int
    active_subscriptions: int
    companies: List[AdminCompanyResponse] = []


# ---------------------------------------------------------------------------
# Dashboard global
# ---------------------------------------------------------------------------

@router.get("/dashboard", response_model=AdminDashboardResponse)
async def get_admin_dashboard(
    admin: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Tableau de bord global du super admin (multi-tenant)."""
    companies_count = (await db.execute(
        select(func.count(Company.id))
    )).scalar_one()

    users_count = (await db.execute(
        select(func.count(User.id))
    )).scalar_one()

    vehicles_count = (await db.execute(
        select(func.count(Vehicle.id)).where(Vehicle.status != VehicleStatus.archived)
    )).scalar_one()

    documents_count = (await db.execute(
        select(func.count(Document.id))
    )).scalar_one()

    active_alerts = (await db.execute(
        select(func.count(Alert.id)).where(Alert.status == AlertStatus.active)
    )).scalar_one()

    active_subscriptions = (await db.execute(
        select(func.count(Subscription.id)).where(
            Subscription.status == SubscriptionStatus.active
        )
    )).scalar_one()

    # Liste des sociétés avec stats
    companies_result = await db.execute(
        select(Company).order_by(Company.created_at.desc()).limit(20)
    )
    companies = []
    for c in companies_result.scalars().all():
        veh_count = (await db.execute(
            select(func.count(Vehicle.id)).where(
                Vehicle.company_id == c.id,
                Vehicle.status != VehicleStatus.archived,
            )
        )).scalar_one()
        usr_count = (await db.execute(
            select(func.count(User.id)).where(User.company_id == c.id)
        )).scalar_one()
        doc_count = (await db.execute(
            select(func.count(Document.id)).where(Document.company_id == c.id)
        )).scalar_one()
        sub_result = await db.execute(
            select(Subscription).where(Subscription.company_id == c.id)
        )
        sub = sub_result.scalar_one_or_none()

        companies.append(AdminCompanyResponse(
            id=c.id,
            name=c.name,
            siret=c.siret,
            plan=c.plan.value if c.plan else None,
            max_vehicles=c.max_vehicles,
            city=c.city,
            country=c.country,
            created_at=c.created_at,
            vehicle_count=veh_count,
            user_count=usr_count,
            document_count=doc_count,
            subscription_status=sub.status.value if sub else None,
        ))

    return AdminDashboardResponse(
        companies_count=companies_count,
        users_count=users_count,
        vehicles_count=vehicles_count,
        documents_count=documents_count,
        active_alerts=active_alerts,
        active_subscriptions=active_subscriptions,
        companies=companies,
    )


# ---------------------------------------------------------------------------
# Gestion des sociétés
# ---------------------------------------------------------------------------

@router.get("/companies", response_model=List[AdminCompanyResponse])
async def list_companies(
    admin: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Liste toutes les sociétés."""
    result = await db.execute(
        select(Company).order_by(Company.created_at.desc())
    )
    companies = []
    for c in result.scalars().all():
        veh_count = (await db.execute(
            select(func.count(Vehicle.id)).where(
                Vehicle.company_id == c.id,
                Vehicle.status != VehicleStatus.archived,
            )
        )).scalar_one()
        usr_count = (await db.execute(
            select(func.count(User.id)).where(User.company_id == c.id)
        )).scalar_one()
        doc_count = (await db.execute(
            select(func.count(Document.id)).where(Document.company_id == c.id)
        )).scalar_one()
        sub_result = await db.execute(
            select(Subscription).where(Subscription.company_id == c.id)
        )
        sub = sub_result.scalar_one_or_none()
        companies.append(AdminCompanyResponse(
            id=c.id,
            name=c.name,
            siret=c.siret,
            plan=c.plan.value if c.plan else None,
            max_vehicles=c.max_vehicles,
            city=c.city,
            country=c.country,
            created_at=c.created_at,
            vehicle_count=veh_count,
            user_count=usr_count,
            document_count=doc_count,
            subscription_status=sub.status.value if sub else None,
        ))
    return companies


@router.put("/companies/{company_id}", response_model=AdminCompanyResponse)
async def update_company(
    company_id: UUID,
    payload: AdminCompanyUpdate,
    admin: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Met à jour une société (nom, plan, max_vehicles)."""
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(404, "Société introuvable.")

    if payload.name:
        company.name = payload.name
    if payload.plan:
        from app.models import PlanType
        try:
            company.plan = PlanType(payload.plan)
        except ValueError:
            raise HTTPException(400, f"Plan invalide: {payload.plan}")
    if payload.max_vehicles is not None:
        company.max_vehicles = payload.max_vehicles

    await db.commit()
    await db.refresh(company)
    return AdminCompanyResponse(
        id=company.id,
        name=company.name,
        siret=company.siret,
        plan=company.plan.value,
        max_vehicles=company.max_vehicles,
        city=company.city,
        country=company.country,
        created_at=company.created_at,
    )


@router.delete("/companies/{company_id}")
async def delete_company(
    company_id: UUID,
    admin: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Supprime une société et toutes ses données."""
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(404, "Société introuvable.")

    await db.delete(company)
    await db.commit()
    return {"message": "Société supprimée avec succès."}


# ---------------------------------------------------------------------------
# Gestion des utilisateurs (tous tenants)
# ---------------------------------------------------------------------------

@router.get("/users", response_model=List[dict])
async def list_all_users(
    admin: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Liste tous les utilisateurs (tous tenants confondus)."""
    result = await db.execute(
        select(User).order_by(User.created_at.desc())
    )
    users = []
    for u in result.scalars().all():
        # Get company name
        comp_name = None
        if u.company_id:
            comp_result = await db.execute(select(Company).where(Company.id == u.company_id))
            comp = comp_result.scalar_one_or_none()
            comp_name = comp.name if comp else None
        users.append({
            "id": str(u.id),
            "email": u.email,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "role": u.role.value,
            "status": u.status.value,
            "company_id": str(u.company_id) if u.company_id else None,
            "company_name": comp_name,
            "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
            "created_at": u.created_at.isoformat(),
        })
    return users
