"""Routeur Utilisateurs : liste, invitation, désactivation."""
from datetime import datetime, timezone
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import create_invitation_token, get_current_active_user
from app.config import settings
from app.database import get_db
from app.deps import get_current_company
from app.models import Company, User, UserRole, UserStatus
from app.schemas import UserInvite, UserResponse

router = APIRouter(prefix="/api/users", tags=["Utilisateurs"])


@router.get("", response_model=List[UserResponse])
async def list_users(
    current_user: User = Depends(get_current_active_user),
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Liste les utilisateurs de la société."""
    result = await db.execute(
        select(User)
        .where(User.company_id == company.id)
        .order_by(User.created_at.desc())
    )
    users = result.scalars().all()
    return [UserResponse.model_validate(u) for u in users]


@router.post("/invite", status_code=status.HTTP_201_CREATED)
async def invite_user(
    payload: UserInvite,
    current_user: User = Depends(get_current_active_user),
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Invite un nouvel utilisateur dans la société.

    Crée un compte en statut "invited" et génère un jeton d'invitation.
    """
    # Vérifie que l'email n'existe pas déjà
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Un compte existe déjà avec cet email.",
        )

    # Crée l'utilisateur invité
    invited_user = User(
        email=payload.email,
        first_name=payload.first_name,
        last_name=payload.last_name,
        role=payload.role,
        status=UserStatus.invited,
        company_id=company.id,
    )
    db.add(invited_user)
    await db.flush()

    # Génère le jeton d'invitation
    token = create_invitation_token(
        payload.email, str(company.id), payload.role.value
    )

    # Envoie l'email d'invitation (si SMTP configuré)
    invite_url = f"{settings.base_url.replace(':8000', ':3000')}/accept-invitation?token={token}"
    if settings.SMTP_HOST:
        try:
            from app.routers.auth import _send_email
            _send_email(
                to=payload.email,
                subject=f"Invitation à rejoindre {company.name} sur FleetDocs",
                body=(
                    f"Bonjour {payload.first_name},\n\n"
                    f"Vous avez été invité(e) à rejoindre {company.name} sur FleetDocs.\n"
                    f"Rôle : {payload.role.value}\n\n"
                    f"Cliquez sur ce lien pour activer votre compte :\n{invite_url}\n\n"
                    f"Cordialement,\nL'équipe FleetDocs"
                ),
            )
        except Exception:
            pass

    await db.commit()

    return {
        "message": "Invitation envoyée avec succès.",
        "invite_url": invite_url,
        "token": token if not settings.SMTP_HOST else None,
        "detail": "Mode dev : SMTP non configuré, le jeton est retourné directement."
        if not settings.SMTP_HOST
        else None,
    }


@router.post("/{user_id}/deactivate", response_model=UserResponse)
async def deactivate_user(
    user_id: UUID,
    current_user: User = Depends(get_current_active_user),
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Désactive un utilisateur de la société."""
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous ne pouvez pas désactiver votre propre compte.",
        )

    result = await db.execute(
        select(User).where(
            User.id == user_id, User.company_id == company.id
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur introuvable.",
        )

    if user.role == UserRole.super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Impossible de désactiver un super administrateur.",
        )

    user.status = UserStatus.inactive
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/{user_id}/activate", response_model=UserResponse)
async def activate_user(
    user_id: UUID,
    current_user: User = Depends(get_current_active_user),
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Réactive un utilisateur désactivé."""
    result = await db.execute(
        select(User).where(
            User.id == user_id, User.company_id == company.id
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur introuvable.",
        )

    user.status = UserStatus.active
    await db.commit()
    await db.refresh(user)
    return user


class RoleUpdateRequest(BaseModel):
    role: UserRole


@router.put("/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: UUID,
    payload: RoleUpdateRequest,
    current_user: User = Depends(get_current_active_user),
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Modifie le rôle d'un utilisateur."""
    result = await db.execute(
        select(User).where(
            User.id == user_id, User.company_id == company.id
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur introuvable.",
        )

    user.role = payload.role
    await db.commit()
    await db.refresh(user)
    return user
