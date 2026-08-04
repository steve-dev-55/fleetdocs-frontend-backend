"""Routeur d'authentification.

Endpoints : register, login, logout, me, forgot/reset password,
accept-invitation, MFA setup/verify/disable, sessions.
"""
import secrets
from datetime import datetime, timedelta, timezone
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import (
    create_access_token,
    create_invitation_token,
    create_reset_token,
    generate_mfa_secret,
    get_current_active_user,
    get_totp_qr_url,
    hash_password,
    verify_invitation_token,
    verify_password,
    verify_reset_token,
    verify_totp,
)
from app.config import settings
from app.database import get_db
from app.deps import get_current_company
from app.models import (
    AuditLog,
    Company,
    PlanType,
    Session as SessionModel,
    Subscription,
    SubscriptionStatus,
    User,
    UserRole,
    UserStatus,
)
from app.schemas import (
    AcceptInvitationRequest,
    ForgotPasswordRequest,
    LoginRequest,
    MFASetupResponse,
    MFAVerifyRequest,
    ResetPasswordRequest,
    SessionResponse,
    TokenResponse,
    UserCreate,
    UserInvite,
    UserResponse,
)

router = APIRouter(prefix="/api/auth", tags=["Authentification"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _create_session(
    db: AsyncSession,
    user: User,
    request: Request,
) -> tuple[SessionModel, str]:
    """Crée une session utilisateur et retourne (session, token)."""
    token = create_access_token({"sub": str(user.id)})
    session = SessionModel(
        user_id=user.id,
        token=token,
        user_agent=request.headers.get("user-agent", "")[:512],
        ip_address=request.client.host if request.client else None,
    )
    db.add(session)
    await db.flush()
    # Recrée un token incluant l'ID de session
    token = create_access_token({"sub": str(user.id), "sid": str(session.id)})
    session.token = token
    return session, token


async def _log_audit(
    db: AsyncSession,
    user: User,
    action: str,
    resource: str = None,
    request: Request = None,
    metadata: dict = None,
):
    """Journalise une action."""
    log = AuditLog(
        user_id=user.id if user else None,
        company_id=user.company_id if user else None,
        action=action,
        resource=resource,
        ip_address=request.client.host if request and request.client else None,
        user_agent=request.headers.get("user-agent", "")[:512] if request else None,
        metadata_=metadata,
    )
    db.add(log)


# ---------------------------------------------------------------------------
# Inscription (PLG)
# ---------------------------------------------------------------------------


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: UserCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Inscription d'un nouvel utilisateur + création de société (PLG signup)."""
    # Vérifie que l'email n'existe pas déjà
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Un compte existe déjà avec cet email.",
        )

    # Crée la société
    plan = payload.plan or PlanType.starter
    max_vehicles = 50 if plan == PlanType.starter else 200 if plan == PlanType.pro else 10000
    company = Company(
        name=payload.company_name or f"Société de {payload.first_name}",
        plan=plan,
        max_vehicles=max_vehicles,
        country="Sénégal",
    )
    db.add(company)
    await db.flush()

    # Crée l'abonnement
    amount = 19000 if plan == PlanType.starter else 32000 if plan == PlanType.pro else 0
    subscription = Subscription(
        company_id=company.id,
        plan=plan,
        status=SubscriptionStatus.active,
        amount_fcfa=amount,
        current_period_end=datetime.now(timezone.utc) + timedelta(days=30),
    )
    db.add(subscription)

    # Crée l'utilisateur admin
    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        first_name=payload.first_name,
        last_name=payload.last_name,
        role=UserRole.admin,
        status=UserStatus.active,
        company_id=company.id,
        phone=payload.phone,
    )
    db.add(user)
    await db.flush()

    await _log_audit(db, user, "user.register", "user", request, {"email": payload.email})

    session, token = await _create_session(db, user, request)
    await db.commit()

    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


# ---------------------------------------------------------------------------
# Connexion
# ---------------------------------------------------------------------------


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Connexion utilisateur : email + mot de passe → jeton JWT."""
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect.",
        )

    if user.status != UserStatus.active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte désactivé. Contactez votre administrateur.",
        )

    # Met à jour la dernière connexion
    user.last_login_at = datetime.now(timezone.utc)

    await _log_audit(db, user, "user.login", "user", request)
    session, token = await _create_session(db, user, request)
    await db.commit()

    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


# ---------------------------------------------------------------------------
# Déconnexion
# ---------------------------------------------------------------------------


@router.post("/logout")
async def logout(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Déconnexion : révoque la session courante."""
    # Récupère le token
    auth_header = request.headers.get("authorization", "")
    token = auth_header.replace("Bearer ", "") if auth_header else ""

    # Révoque la session
    if token:
        await db.execute(
            update(SessionModel)
            .where(SessionModel.token == token)
            .values(revoked_at=datetime.now(timezone.utc))
        )

    await _log_audit(db, current_user, "user.logout", "user", request)
    await db.commit()
    return {"message": "Déconnexion réussie."}


# ---------------------------------------------------------------------------
# Profil courant
# ---------------------------------------------------------------------------


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_active_user)):
    """Retourne l'utilisateur courant."""
    return current_user


# ---------------------------------------------------------------------------
# Mot de passe oublié / réinitialisation
# ---------------------------------------------------------------------------


@router.post("/forgot-password")
async def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Génère un jeton de réinitialisation et envoie un email (si SMTP configuré)."""
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    # Pour des raisons de sécurité, on renvoie toujours le même message
    message = "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé."

    if not user:
        return {"message": message}

    token = create_reset_token(user.email)

    # Tentative d'envoi d'email (non bloquant)
    try:
        if settings.SMTP_HOST:
            _send_email(
                to=user.email,
                subject="Réinitialisation de votre mot de passe FleetDocs",
                body=f"Cliquez sur ce lien pour réinitialiser votre mot de passe : "
                f"http://localhost:3000/reset-password?token={token}",
            )
    except Exception:
        pass  # On ne bloque pas en cas d'échec SMTP

    await _log_audit(
        db, user, "user.forgot_password", "user", request, {"email": payload.email}
    )
    await db.commit()

    # En mode dev, on retourne le token pour les tests
    if not settings.SMTP_HOST:
        return {"message": message, "reset_token": token, "detail": "Mode dev : SMTP non configuré."}
    return {"message": message}


@router.post("/reset-password")
async def reset_password(
    payload: ResetPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Réinitialise le mot de passe à partir d'un jeton valide."""
    email = verify_reset_token(payload.token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Jeton de réinitialisation invalide ou expiré.",
        )

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur introuvable.",
        )

    user.password_hash = hash_password(payload.password)
    await _log_audit(db, user, "user.reset_password", "user", request)
    await db.commit()

    return {"message": "Mot de passe réinitialisé avec succès."}


# ---------------------------------------------------------------------------
# Invitation
# ---------------------------------------------------------------------------


@router.post("/accept-invitation", response_model=TokenResponse)
async def accept_invitation(
    payload: AcceptInvitationRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Valide un jeton d'invitation et active le compte utilisateur."""
    info = verify_invitation_token(payload.token)
    if not info:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Jeton d'invitation invalide ou expiré.",
        )

    email = info.get("sub")
    company_id = info.get("company_id")
    role = info.get("role", UserRole.operator)

    # Vérifie si l'utilisateur existe déjà (créé en statut "invited")
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is None:
        # Crée un nouvel utilisateur
        if not payload.first_name or not payload.last_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Le prénom et le nom sont obligatoires.",
            )
        user = User(
            email=email,
            password_hash=hash_password(payload.password),
            first_name=payload.first_name,
            last_name=payload.last_name,
            role=UserRole(role),
            status=UserStatus.active,
            company_id=UUID(company_id) if company_id else None,
        )
        db.add(user)
    else:
        # Active l'utilisateur invité
        user.password_hash = hash_password(payload.password)
        user.status = UserStatus.active
        if payload.first_name:
            user.first_name = payload.first_name
        if payload.last_name:
            user.last_name = payload.last_name

    await db.flush()
    await _log_audit(db, user, "user.accept_invitation", "user", request)
    session, token = await _create_session(db, user, request)
    await db.commit()

    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


# ---------------------------------------------------------------------------
# MFA
# ---------------------------------------------------------------------------


@router.post("/mfa/setup", response_model=MFASetupResponse)
async def mfa_setup(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Génère un secret TOTP + l'URL du QR code (non encore activé)."""
    secret = generate_mfa_secret()
    qr_url = get_totp_qr_url(secret, current_user.email)

    # Stocke le secret en attendant la vérification (non activé)
    current_user.mfa_secret = secret
    await db.commit()

    return MFASetupResponse(secret=secret, qr_code_url=qr_url)


@router.post("/mfa/verify")
async def mfa_verify(
    payload: MFAVerifyRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Vérifie un code TOTP et active le MFA."""
    if not current_user.mfa_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucun secret MFA configuré. Appelez /mfa/setup d'abord.",
        )

    if not verify_totp(current_user.mfa_secret, payload.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Code TOTP invalide. Réessayez.",
        )

    current_user.mfa_enabled = True
    await db.commit()

    return {"message": "MFA activé avec succès."}


@router.post("/mfa/disable")
async def mfa_disable(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Désactive le MFA."""
    current_user.mfa_enabled = False
    current_user.mfa_secret = None
    await db.commit()
    return {"message": "MFA désactivé."}


# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------


@router.get("/sessions", response_model=List[SessionResponse])
async def list_sessions(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Liste les sessions actives de l'utilisateur courant."""
    result = await db.execute(
        select(SessionModel)
        .where(
            SessionModel.user_id == current_user.id,
            SessionModel.revoked_at.is_(None),
        )
        .order_by(SessionModel.last_active_at.desc())
    )
    sessions = result.scalars().all()

    current_token = request.headers.get("authorization", "").replace("Bearer ", "")
    responses = []
    for s in sessions:
        resp = SessionResponse.model_validate(s)
        resp.is_current = s.token == current_token
        responses.append(resp)
    return responses


@router.delete("/sessions/{session_id}")
async def revoke_session(
    session_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Révoque une session."""
    result = await db.execute(
        select(SessionModel).where(
            SessionModel.id == session_id,
            SessionModel.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session introuvable.",
        )
    session.revoked_at = datetime.now(timezone.utc)
    await db.commit()
    return {"message": "Session révoquée."}


# ---------------------------------------------------------------------------
# Email (helper)
# ---------------------------------------------------------------------------


def _send_email(to: str, subject: str, body: str):
    """Envoie un email via SMTP (si configuré)."""
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    if not settings.SMTP_HOST:
        return

    msg = MIMEMultipart()
    msg["From"] = settings.SMTP_FROM_EMAIL
    msg["To"] = to
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        if settings.SMTP_USER:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(msg)
