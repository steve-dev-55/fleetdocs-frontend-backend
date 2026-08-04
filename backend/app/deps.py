"""Dépendances communes pour les routeurs FastAPI."""
from typing import Optional

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_active_user, require_role
from app.database import get_db
from app.models import Company, User, UserRole

# Réexporte les dépendances principales
__all__ = [
    "get_db",
    "get_current_user",
    "get_current_active_user",
    "get_current_company",
    "require_role",
    "get_pagination_params",
    "PaginationParams",
]


async def get_current_company(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> Company:
    """Récupère la société de l'utilisateur courant.

    Lève une erreur 403 si l'utilisateur n'a pas de société (super_admin hors contexte).
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Aucune société associée à ce compte.",
        )
    result = await db.execute(
        select(Company).where(Company.id == current_user.company_id)
    )
    company = result.scalar_one_or_none()
    if company is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Société introuvable.",
        )
    return company


class PaginationParams:
    """Paramètres de pagination communs."""

    def __init__(self, page: int = 1, page_size: int = 20):
        self.page = max(1, page)
        self.page_size = min(max(1, page_size), 100)

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size

    @property
    def limit(self) -> int:
        return self.page_size


def get_pagination_params(page: int = 1, page_size: int = 20) -> PaginationParams:
    """Dépendance de pagination."""
    return PaginationParams(page=page, page_size=page_size)
