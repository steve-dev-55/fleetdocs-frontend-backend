"""Routeur Paramètres : société, compte, facturation, notifications."""
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_active_user, hash_password
from app.database import get_db
from app.deps import get_current_company
from app.models import (
    Company,
    PlanType,
    Subscription,
    SubscriptionStatus,
    User,
    UserRole,
)
from app.schemas import (
    BillingResponse,
    CompanyResponse,
    CompanyUpdate,
    NotificationSettings,
    PlanInfo,
    PLANS_INFO,
    UpgradePlanRequest,
    UserResponse,
    UserUpdate,
)

router = APIRouter(prefix="/api/settings", tags=["Paramètres"])


# ---------------------------------------------------------------------------
# Société
# ---------------------------------------------------------------------------


@router.get("/company", response_model=CompanyResponse)
async def get_company_settings(
    company: Company = Depends(get_current_company),
):
    """Retourne les paramètres de la société."""
    return company


@router.put("/company", response_model=CompanyResponse)
async def update_company_settings(
    payload: CompanyUpdate,
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Met à jour les paramètres de la société."""
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(company, key, value)
    await db.commit()
    await db.refresh(company)
    return company


# ---------------------------------------------------------------------------
# Compte utilisateur
# ---------------------------------------------------------------------------


@router.get("/account", response_model=UserResponse)
async def get_account_settings(
    current_user: User = Depends(get_current_active_user),
):
    """Retourne les paramètres du compte utilisateur courant."""
    return current_user


@router.put("/account", response_model=UserResponse)
async def update_account_settings(
    payload: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Met à jour le compte utilisateur courant."""
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(current_user, key, value)
    await db.commit()
    await db.refresh(current_user)
    return current_user


# ---------------------------------------------------------------------------
# Facturation
# ---------------------------------------------------------------------------


def _max_vehicles_for_plan(plan: PlanType) -> int:
    if plan == PlanType.starter:
        return 50
    if plan == PlanType.pro:
        return 200
    return 10000


def _amount_for_plan(plan: PlanType) -> int:
    if plan == PlanType.starter:
        return 19000
    if plan == PlanType.pro:
        return 32000
    return 0


def _mock_invoices(plan: PlanType) -> List[Dict[str, Any]]:
    """Génère des factures mockées pour les 3 derniers mois."""
    from datetime import datetime
    now = datetime.now(timezone.utc)
    amount = _amount_for_plan(plan)
    invoices = []
    for i in range(3):
        date = now - timedelta(days=30 * i)
        invoices.append(
            {
                "id": f"INV-{date.strftime('%Y%m')}-{1000 + i}",
                "date": date.isoformat(),
                "amount_fcfa": amount,
                "status": "paid",
                "plan": plan.value,
                "download_url": f"/api/exports/invoice/INV-{date.strftime('%Y%m')}-{1000 + i}",
            }
        )
    return invoices


@router.get("/billing", response_model=BillingResponse)
async def get_billing_settings(
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Retourne les informations de facturation."""
    # Récupère l'abonnement
    sub_result = await db.execute(
        select(Subscription).where(Subscription.company_id == company.id)
    )
    subscription = sub_result.scalar_one_or_none()

    # Compte les véhicules actuels
    from sqlalchemy import func
    from app.models import Vehicle, VehicleStatus

    count_result = await db.execute(
        select(func.count(Vehicle.id)).where(
            Vehicle.company_id == company.id,
            Vehicle.status != VehicleStatus.archived,
        )
    )
    current_vehicles = count_result.scalar_one()

    plan = subscription.plan if subscription else company.plan
    amount = subscription.amount_fcfa if subscription else _amount_for_plan(plan)
    status_val = subscription.status if subscription else SubscriptionStatus.active

    return BillingResponse(
        plan=plan,
        status=status_val,
        max_vehicles=company.max_vehicles,
        current_vehicles=current_vehicles,
        amount_fcfa=amount,
        current_period_end=subscription.current_period_end if subscription else None,
        invoices=_mock_invoices(plan),
    )


@router.post("/billing/upgrade", response_model=BillingResponse)
async def upgrade_plan(
    payload: UpgradePlanRequest,
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Change le plan d'abonnement."""
    if payload.plan == PlanType.enterprise:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le plan Enterprise nécessite un devis. Contactez notre équipe commerciale.",
        )

    new_max = _max_vehicles_for_plan(payload.plan)
    new_amount = _amount_for_plan(payload.plan)

    # Met à jour la société
    company.plan = payload.plan
    company.max_vehicles = new_max

    # Met à jour l'abonnement
    sub_result = await db.execute(
        select(Subscription).where(Subscription.company_id == company.id)
    )
    subscription = sub_result.scalar_one_or_none()
    if subscription:
        subscription.plan = payload.plan
        subscription.amount_fcfa = new_amount
        subscription.current_period_end = datetime.now(timezone.utc) + timedelta(days=30)
    else:
        subscription = Subscription(
            company_id=company.id,
            plan=payload.plan,
            status=SubscriptionStatus.active,
            amount_fcfa=new_amount,
            current_period_end=datetime.now(timezone.utc) + timedelta(days=30),
        )
        db.add(subscription)

    await db.commit()

    # Compte les véhicules
    from sqlalchemy import func
    from app.models import Vehicle, VehicleStatus

    count_result = await db.execute(
        select(func.count(Vehicle.id)).where(
            Vehicle.company_id == company.id,
            Vehicle.status != VehicleStatus.archived,
        )
    )
    current_vehicles = count_result.scalar_one()

    return BillingResponse(
        plan=payload.plan,
        status=SubscriptionStatus.active,
        max_vehicles=new_max,
        current_vehicles=current_vehicles,
        amount_fcfa=new_amount,
        current_period_end=subscription.current_period_end,
        invoices=_mock_invoices(payload.plan),
    )


@router.get("/plans", response_model=List[PlanInfo])
async def list_plans():
    """Liste les plans disponibles avec leurs tarifs en FCFA."""
    return PLANS_INFO


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

# Stockage simple en mémoire (en production : table dédiée)
# Clé : user_id, Valeur : NotificationSettings
_notification_settings: Dict[str, NotificationSettings] = {}


@router.get("/notifications", response_model=NotificationSettings)
async def get_notification_settings(
    current_user: User = Depends(get_current_active_user),
):
    """Retourne les préférences de notification de l'utilisateur."""
    return _notification_settings.get(
        str(current_user.id), NotificationSettings()
    )


@router.put("/notifications", response_model=NotificationSettings)
async def update_notification_settings(
    payload: NotificationSettings,
    current_user: User = Depends(get_current_active_user),
):
    """Met à jour les préférences de notification."""
    _notification_settings[str(current_user.id)] = payload
    return payload
