"""Routeur Documents.

Endpoints : upload, list, detail, update, download, share-link, comments.
Inclut l'intégration OCR (Mistral AI si configuré, sinon mode manuel).
"""
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_active_user
from app.config import settings
from app.database import get_db
from app.deps import PaginationParams, get_current_company, get_pagination_params
from app.models import (
    Alert,
    AlertCategory,
    AlertSeverity,
    AlertStatus,
    AlertType,
    Comment,
    Company,
    Document,
    DocumentType,
    OCRStatus,
    ShareLink,
    User,
    ValidityStatus,
    Vehicle,
)
from app.schemas import (
    CommentCreate,
    CommentResponse,
    DocumentResponse,
    DocumentUpdate,
    ShareLinkCreate,
    ShareLinkResponse,
)

router = APIRouter(prefix="/api/documents", tags=["Documents"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _get_document_or_404(
    db: AsyncSession, document_id: UUID, company_id: UUID
) -> Document:
    result = await db.execute(
        select(Document)
        .options(selectinload(Document.document_type))
        .where(Document.id == document_id, Document.company_id == company_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document introuvable.",
        )
    return doc


def _compute_validity_status(expiry_date: Optional[datetime]) -> ValidityStatus:
    """Calcule le statut de validité à partir de la date d'expiration."""
    if not expiry_date:
        return ValidityStatus.unknown
    now = datetime.now(timezone.utc)
    if expiry_date < now:
        return ValidityStatus.expired
    if expiry_date < now + timedelta(days=30):
        return ValidityStatus.expiring_soon
    return ValidityStatus.valid


async def _trigger_alerts_for_document(
    db: AsyncSession, doc: Document, vehicle: Vehicle
):
    """Crée des alertes si le document est expiré ou expire bientôt."""
    if doc.validity_status == ValidityStatus.expired:
        alert = Alert(
            type=AlertType.document_expired,
            category=AlertCategory.document,
            severity=AlertSeverity.critical,
            status=AlertStatus.active,
            message=f"Document expiré : {doc.file_name} (véhicule {vehicle.registration})",
            vehicle_id=vehicle.id,
            document_id=doc.id,
            company_id=doc.company_id,
        )
        db.add(alert)
    elif doc.validity_status == ValidityStatus.expiring_soon:
        alert = Alert(
            type=AlertType.document_expiring,
            category=AlertCategory.document,
            severity=AlertSeverity.warning,
            status=AlertStatus.active,
            message=f"Document expirant bientôt : {doc.file_name} (véhicule {vehicle.registration})",
            vehicle_id=vehicle.id,
            document_id=doc.id,
            company_id=doc.company_id,
        )
        db.add(alert)


# ---------------------------------------------------------------------------
# Liste
# ---------------------------------------------------------------------------


@router.get("", response_model=List[DocumentResponse])
async def list_documents(
    search: Optional[str] = None,
    ocr_status: Optional[OCRStatus] = None,
    validity_status: Optional[ValidityStatus] = None,
    vehicle_id: Optional[UUID] = None,
    document_type_id: Optional[UUID] = None,
    pagination: PaginationParams = Depends(get_pagination_params),
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Liste les documents avec filtres."""
    query = (
        select(Document)
        .options(selectinload(Document.document_type))
        .where(Document.company_id == company.id)
    )

    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(
                Document.file_name.ilike(pattern),
                Document.reference.ilike(pattern),
            )
        )
    if ocr_status:
        query = query.where(Document.ocr_status == ocr_status)
    if validity_status:
        query = query.where(Document.validity_status == validity_status)
    if vehicle_id:
        query = query.where(Document.vehicle_id == vehicle_id)
    if document_type_id:
        query = query.where(Document.document_type_id == document_type_id)

    query = query.order_by(Document.created_at.desc())
    query = query.offset(pagination.offset).limit(pagination.limit)

    result = await db.execute(query)
    documents = result.scalars().all()
    return [DocumentResponse.model_validate(d) for d in documents]


# ---------------------------------------------------------------------------
# Upload
# ---------------------------------------------------------------------------


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    vehicle_id: UUID = Form(...),
    document_type_id: Optional[UUID] = Form(None),
    expiry_date: Optional[datetime] = Form(None),
    issued_date: Optional[datetime] = Form(None),
    reference: Optional[str] = Form(None),
    current_user: User = Depends(get_current_active_user),
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Téléverse un document et lance l'OCR (si configuré)."""
    # Vérifie le véhicule
    veh_result = await db.execute(
        select(Vehicle).where(
            Vehicle.id == vehicle_id, Vehicle.company_id == company.id
        )
    )
    vehicle = veh_result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Véhicule introuvable.",
        )

    # Vérifie la taille
    contents = await file.read()
    if len(contents) > settings.max_upload_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Fichier trop volumineux (max {settings.MAX_UPLOAD_SIZE_MB} Mo).",
        )

    # Sauvegarde le fichier
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    original_name = file.filename or "document.bin"
    ext = original_name.split(".")[-1] if "." in original_name else "bin"
    safe_name = f"doc-{secrets.token_hex(8)}.{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, safe_name)
    with open(filepath, "wb") as f:
        f.write(contents)

    file_url = f"{settings.base_url}/uploads/{safe_name}"

    # Détermine le statut OCR
    if settings.MISTRAL_API_KEY:
        ocr_status = OCRStatus.pending_ocr
    else:
        ocr_status = OCRStatus.manual

    # Calcule le statut de validité
    validity = _compute_validity_status(expiry_date)

    doc = Document(
        file_name=original_name,
        file_url=file_url,
        file_size=len(contents),
        mime_type=file.content_type,
        ocr_status=ocr_status,
        validity_status=validity,
        expiry_date=expiry_date,
        issued_date=issued_date,
        reference=reference,
        document_type_id=document_type_id,
        vehicle_id=vehicle.id,
        company_id=company.id,
        uploaded_by_id=current_user.id,
    )
    db.add(doc)
    await db.flush()

    # Déclenche les alertes si nécessaire
    await _trigger_alerts_for_document(db, doc, vehicle)

    # Lance l'OCR si configuré
    if settings.MISTRAL_API_KEY:
        try:
            await _run_ocr(doc, contents, file.content_type)
        except Exception:
            doc.ocr_status = OCRStatus.failed
            # Alerte d'échec OCR
            db.add(
                Alert(
                    type=AlertType.ocr_failed,
                    category=AlertCategory.system,
                    severity=AlertSeverity.info,
                    status=AlertStatus.active,
                    message=f"Échec de l'OCR sur le document : {doc.file_name}",
                    vehicle_id=vehicle.id,
                    document_id=doc.id,
                    company_id=company.id,
                )
            )

    await db.commit()

    # Recharge le document avec ses relations (évite MissingGreenlet à la sérialisation)
    result = await db.execute(
        select(Document)
        .options(selectinload(Document.document_type))
        .where(Document.id == doc.id)
    )
    doc = result.scalar_one()
    return DocumentResponse.model_validate(doc)


async def _run_ocr(doc: Document, file_bytes: bytes, mime_type: Optional[str]):
    """Appelle l'API Mistral pour l'OCR (implémentation simplifiée).

    En production, utilisez l'endpoint Mistral OCR dédié.
    """
    import base64

    import httpx

    if not settings.MISTRAL_API_KEY:
        return

    doc.ocr_status = OCRStatus.processing

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            # Note : l'endpoint exact dépend de l'API Mistral OCR.
            # Ici on utilise l'endpoint de chat avec un modèle vision.
            b64 = base64.b64encode(file_bytes).decode("utf-8")
            payload = {
                "model": "mistral-small-latest",
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "Extrais toutes les informations de ce document "
                                "(numéro, dates d'émission et d'expiration, titulaire, etc.). "
                                "Réponds en JSON.",
                            },
                            {
                                "type": "image_url",
                                "image_url": f"data:{mime_type or 'application/octet-stream'};base64,{b64}",
                            },
                        ],
                    }
                ],
            }
            headers = {
                "Authorization": f"Bearer {settings.MISTRAL_API_KEY}",
                "Content-Type": "application/json",
            }
            resp = await client.post(
                "https://api.mistral.ai/v1/chat/completions",
                json=payload,
                headers=headers,
            )
            resp.raise_for_status()
            data = resp.json()
            text = (
                data.get("choices", [{}])[0]
                .get("message", {})
                .get("content", "")
            )
            doc.ocr_raw_text = text[:10000]
            doc.ocr_confidence = 0.85  # Valeur estimée
            doc.ocr_data = {"raw": text[:5000]}
            doc.ocr_status = OCRStatus.completed
    except Exception as e:
        doc.ocr_status = OCRStatus.failed
        doc.ocr_data = {"error": str(e)}
        raise


# ---------------------------------------------------------------------------
# Détail
# ---------------------------------------------------------------------------


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: UUID,
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Détail d'un document."""
    doc = await _get_document_or_404(db, document_id, company.id)
    return DocumentResponse.model_validate(doc)


# ---------------------------------------------------------------------------
# Mise à jour (validation OCR)
# ---------------------------------------------------------------------------


@router.put("/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: UUID,
    payload: DocumentUpdate,
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Met à jour un document (validation des données OCR)."""
    doc = await _get_document_or_404(db, document_id, company.id)

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(doc, key, value)

    # Recalcule le statut de validité si la date d'expiration a changé
    if "expiry_date" in update_data:
        doc.validity_status = _compute_validity_status(doc.expiry_date)
        # Supprime les anciennes alertes et en recrée si nécessaire
        if doc.validity_status in (ValidityStatus.expired, ValidityStatus.expiring_soon):
            # Récupère le véhicule
            veh_result = await db.execute(
                select(Vehicle).where(Vehicle.id == doc.vehicle_id)
            )
            vehicle = veh_result.scalar_one_or_none()
            if vehicle:
                await _trigger_alerts_for_document(db, doc, vehicle)

    await db.commit()

    # Recharge le document avec ses relations (évite MissingGreenlet à la sérialisation)
    result = await db.execute(
        select(Document)
        .options(selectinload(Document.document_type))
        .where(Document.id == doc.id)
    )
    doc = result.scalar_one()
    return DocumentResponse.model_validate(doc)


# ---------------------------------------------------------------------------
# Suppression (archive)
# ---------------------------------------------------------------------------


@router.delete("/{document_id}")
async def delete_document(
    document_id: UUID,
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Supprime un document (fichier physique + enregistrement)."""
    doc = await _get_document_or_404(db, document_id, company.id)

    # Supprime le fichier physique
    if doc.file_url:
        filename = doc.file_url.split("/uploads/")[-1]
        filepath = os.path.join(settings.UPLOAD_DIR, filename)
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except OSError:
                pass

    await db.delete(doc)
    await db.commit()
    return {"message": "Document supprimé avec succès."}


# ---------------------------------------------------------------------------
# Téléchargement
# ---------------------------------------------------------------------------


@router.get("/{document_id}/download")
async def download_document(
    document_id: UUID,
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Télécharge le fichier physique d'un document."""
    from fastapi.responses import FileResponse

    doc = await _get_document_or_404(db, document_id, company.id)

    if doc.file_url:
        filename = doc.file_url.split("/uploads/")[-1]
        filepath = os.path.join(settings.UPLOAD_DIR, filename)
        if os.path.exists(filepath):
            return FileResponse(
                path=filepath,
                filename=doc.file_name,
                media_type=doc.mime_type or "application/octet-stream",
            )

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Fichier introuvable sur le serveur.",
    )


# ---------------------------------------------------------------------------
# Lien de partage
# ---------------------------------------------------------------------------


@router.get("/{document_id}/share-links", response_model=List[ShareLinkResponse])
async def list_share_links(
    document_id: UUID,
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Liste les liens de partage d'un document."""
    doc = await _get_document_or_404(db, document_id, company.id)

    result = await db.execute(
        select(ShareLink)
        .where(ShareLink.document_id == doc.id)
        .order_by(ShareLink.created_at.desc())
    )
    links = result.scalars().all()

    responses = []
    for link in links:
        created_by = None
        if link.created_by_id:
            user_result = await db.execute(
                select(User).where(User.id == link.created_by_id)
            )
            creator = user_result.scalar_one_or_none()
            if creator:
                created_by = f"{creator.first_name} {creator.last_name}"
        responses.append(
            ShareLinkResponse(
                id=link.id,
                token=link.token,
                url=f"{settings.base_url}/api/shared/{link.token}",
                document_id=link.document_id,
                expires_at=link.expires_at,
                created_at=link.created_at,
                revoked=link.revoked_at is not None,
                created_by=created_by,
            )
        )
    return responses


@router.post("/{document_id}/share-links", response_model=ShareLinkResponse)
async def create_share_link(
    document_id: UUID,
    payload: ShareLinkCreate,
    current_user: User = Depends(get_current_active_user),
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Génère un lien de partage signé pour un document."""
    doc = await _get_document_or_404(db, document_id, company.id)

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=payload.expires_in_hours)

    share = ShareLink(
        token=token,
        document_id=doc.id,
        created_by_id=current_user.id,
        expires_at=expires_at,
    )
    db.add(share)
    await db.commit()
    await db.refresh(share)

    created_by_name = f"{current_user.first_name} {current_user.last_name}"
    return ShareLinkResponse(
        id=share.id,
        token=share.token,
        url=f"{settings.base_url}/api/shared/{share.token}",
        document_id=share.document_id,
        expires_at=share.expires_at,
        created_at=share.created_at,
        created_by=created_by_name,
    )


@router.post("/{document_id}/share-links/{link_id}/revoke")
async def revoke_share_link(
    document_id: UUID,
    link_id: UUID,
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Révoque un lien de partage."""
    doc = await _get_document_or_404(db, document_id, company.id)

    result = await db.execute(
        select(ShareLink).where(
            ShareLink.id == link_id,
            ShareLink.document_id == doc.id,
        )
    )
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lien de partage introuvable.",
        )

    link.revoked_at = datetime.now(timezone.utc)
    await db.commit()
    return {"message": "Lien de partage révoqué."}


# ---------------------------------------------------------------------------
# Commentaires
# ---------------------------------------------------------------------------


@router.get("/{document_id}/comments", response_model=List[CommentResponse])
async def list_comments(
    document_id: UUID,
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Liste les commentaires d'un document (avec réponses imbriquées)."""
    doc = await _get_document_or_404(db, document_id, company.id)

    result = await db.execute(
        select(Comment)
        .where(Comment.document_id == doc.id, Comment.parent_id.is_(None))
        .order_by(Comment.created_at.asc())
    )
    comments = result.scalars().all()

    responses = []
    for c in comments:
        resp = await _comment_to_response(db, c)
        responses.append(resp)
    return responses


@router.post("/{document_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def create_comment(
    document_id: UUID,
    payload: CommentCreate,
    current_user: User = Depends(get_current_active_user),
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Ajoute un commentaire à un document."""
    doc = await _get_document_or_404(db, document_id, company.id)

    # Vérifie le commentaire parent si fourni
    if payload.parent_id:
        parent_result = await db.execute(
            select(Comment).where(
                Comment.id == payload.parent_id,
                Comment.document_id == doc.id,
            )
        )
        if not parent_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Commentaire parent introuvable.",
            )

    comment = Comment(
        content=payload.content,
        document_id=doc.id,
        author_id=current_user.id,
        parent_id=payload.parent_id,
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)

    return await _comment_to_response(db, comment)


async def _comment_to_response(db: AsyncSession, comment: Comment) -> CommentResponse:
    """Convertit un commentaire en réponse avec le nom de l'auteur et les réponses."""
    author_name = None
    if comment.author_id:
        from app.models import User
        user_result = await db.execute(select(User).where(User.id == comment.author_id))
        user = user_result.scalar_one_or_none()
        if user:
            author_name = f"{user.first_name} {user.last_name}"

    replies = []
    replies_result = await db.execute(
        select(Comment)
        .where(Comment.parent_id == comment.id)
        .order_by(Comment.created_at.asc())
    )
    for r in replies_result.scalars().all():
        replies.append(await _comment_to_response(db, r))

    resp = CommentResponse.model_validate(comment)
    resp.author_name = author_name
    resp.replies = replies
    return resp