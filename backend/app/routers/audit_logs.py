"""Routeur Journaux d'audit."""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import PaginationParams, get_current_company, get_pagination_params
from app.models import AuditLog, Company, User
from app.schemas import AuditLogResponse

router = APIRouter(prefix="/api/audit-logs", tags=["Journaux d'audit"])


@router.get("", response_model=List[AuditLogResponse])
async def list_audit_logs(
    action: Optional[str] = None,
    resource: Optional[str] = None,
    user_id: Optional[UUID] = None,
    pagination: PaginationParams = Depends(get_pagination_params),
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Liste les journaux d'audit (paginés, filtrables)."""
    query = select(AuditLog).where(AuditLog.company_id == company.id)

    if action:
        query = query.where(AuditLog.action.ilike(f"%{action}%"))
    if resource:
        query = query.where(AuditLog.resource == resource)
    if user_id:
        query = query.where(AuditLog.user_id == user_id)

    query = query.order_by(AuditLog.created_at.desc())
    query = query.offset(pagination.offset).limit(pagination.limit)

    result = await db.execute(query)
    logs = result.scalars().all()

    # Enrichit avec le nom de l'utilisateur
    responses = []
    for log in logs:
        resp = AuditLogResponse.model_validate(log)
        if log.user_id:
            user_result = await db.execute(select(User).where(User.id == log.user_id))
            user = user_result.scalar_one_or_none()
            if user:
                resp.user_name = f"{user.first_name} {user.last_name}"
        responses.append(resp)

    return responses
