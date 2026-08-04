"""Routeur Types de documents (CRUD pour les types spécifiques à la société)."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_company
from app.models import Company, DocumentType
from app.schemas import DocumentTypeCreate, DocumentTypeResponse

router = APIRouter(prefix="/api/document-types", tags=["Types de documents"])


@router.get("", response_model=List[DocumentTypeResponse])
async def list_document_types(
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Liste les types de documents (globaux + spécifiques à la société)."""
    result = await db.execute(
        select(DocumentType).where(
            or_(
                DocumentType.is_global.is_(True),
                DocumentType.company_id == company.id,
            )
        ).order_by(DocumentType.name.asc())
    )
    types = result.scalars().all()
    return [DocumentTypeResponse.model_validate(t) for t in types]


@router.post("", response_model=DocumentTypeResponse, status_code=status.HTTP_201_CREATED)
async def create_document_type(
    payload: DocumentTypeCreate,
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Crée un type de document spécifique à la société."""
    existing = await db.execute(
        select(DocumentType).where(DocumentType.code == payload.code)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Un type de document avec le code '{payload.code}' existe déjà.",
        )

    doc_type = DocumentType(
        name=payload.name,
        code=payload.code,
        alert_days=payload.alert_days,
        is_mandatory=payload.is_mandatory,
        description=payload.description,
        icon=payload.icon,
        color=payload.color,
        is_global=False,
        company_id=company.id,
    )
    db.add(doc_type)
    await db.commit()
    await db.refresh(doc_type)
    return doc_type


@router.put("/{type_id}", response_model=DocumentTypeResponse)
async def update_document_type(
    type_id: int,
    payload: DocumentTypeCreate,
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Met à jour un type de document (uniquement les types de la société)."""
    result = await db.execute(
        select(DocumentType).where(
            DocumentType.id == type_id,
            DocumentType.company_id == company.id,
            DocumentType.is_global.is_(False),
        )
    )
    doc_type = result.scalar_one_or_none()
    if not doc_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Type de document introuvable ou non modifiable (type global).",
        )

    doc_type.name = payload.name
    doc_type.code = payload.code
    doc_type.alert_days = payload.alert_days
    doc_type.is_mandatory = payload.is_mandatory
    doc_type.description = payload.description
    doc_type.icon = payload.icon
    doc_type.color = payload.color
    await db.commit()
    await db.refresh(doc_type)
    return doc_type


@router.delete("/{type_id}")
async def delete_document_type(
    type_id: int,
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Supprime un type de document (uniquement les types de la société)."""
    result = await db.execute(
        select(DocumentType).where(
            DocumentType.id == type_id,
            DocumentType.company_id == company.id,
            DocumentType.is_global.is_(False),
        )
    )
    doc_type = result.scalar_one_or_none()
    if not doc_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Type de document introuvable ou non supprimable (type global).",
        )

    await db.delete(doc_type)
    await db.commit()
    return {"message": "Type de document supprimé avec succès."}
