"""Utilitaires d'authentification : JWT, mots de passe, MFA TOTP.

Utilise python-jose pour les JWT et passlib[bcrypt] pour le hachage.
"""
import base64
import hashlib
import hmac
import json
import secrets
import struct
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import Session as SessionModel
from app.models import User, UserRole, UserStatus

# Configuration du hachage
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Schéma OAuth2 (le tokenUrl est purement indicatif pour la doc Swagger)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# ---------------------------------------------------------------------------
# Mots de passe
# ---------------------------------------------------------------------------


def hash_password(password: str) -> str:
    """Hache un mot de passe avec bcrypt."""
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: Optional[str]) -> bool:
    """Vérifie un mot de passe contre son hash."""
    if not password_hash:
        return False
    return pwd_context.verify(password, password_hash)


# ---------------------------------------------------------------------------
# JWT
# ---------------------------------------------------------------------------


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Crée un jeton JWT signé.

    Args:
        data: Données à inclure (doit contenir "sub" = user id).
        expires_delta: Durée de validité (défaut : config JWT_EXPIRE_MINUTES).

    Returns:
        Le jeton JWT encodé.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Dict[str, Any]:
    """Décode et vérifie un jeton JWT."""
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Jeton invalide ou expiré : {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ---------------------------------------------------------------------------
# Dépendances d'authentification
# ---------------------------------------------------------------------------


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Récupère l'utilisateur courant à partir du jeton JWT.

    Vérifie également que la session associée est toujours valide.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Impossible de valider les identifiants",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    user_id_str: Optional[str] = payload.get("sub")
    session_id_str: Optional[str] = payload.get("sid")

    if user_id_str is None:
        raise credentials_exception

    try:
        import uuid
        user_id = uuid.UUID(user_id_str)
    except (ValueError, TypeError):
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    # Vérifie la session (si présente)
    if session_id_str:
        try:
            import uuid
            session_id = uuid.UUID(session_id_str)
            sess_result = await db.execute(
                select(SessionModel).where(
                    SessionModel.id == session_id,
                    SessionModel.user_id == user_id,
                    SessionModel.revoked_at.is_(None),
                )
            )
            session = sess_result.scalar_one_or_none()
            if session is None:
                raise credentials_exception
        except (ValueError, TypeError):
            # Si l'ID de session est malformé, on ignore la vérification
            pass

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Vérifie que l'utilisateur courant est actif."""
    if current_user.status != UserStatus.active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte désactivé. Contactez votre administrateur.",
        )
    return current_user


# ---------------------------------------------------------------------------
# Contrôle d'accès basé sur les rôles (RBAC)
# ---------------------------------------------------------------------------

# Hiérarchie des rôles (du plus élevé au plus bas)
ROLE_HIERARCHY: Dict[UserRole, int] = {
    UserRole.super_admin: 100,
    UserRole.admin: 90,
    UserRole.manager: 70,
    UserRole.fleet_manager: 50,
    UserRole.operator: 30,
}


def require_role(*roles: UserRole):
    """Dépendance qui exige un rôle parmi ceux listés.

    Usage :
        @router.get("/...", dependencies=[Depends(require_role(UserRole.admin))])
    ou
        current_user = Depends(require_role(UserRole.admin, UserRole.manager))
    """
    allowed_levels = {ROLE_HIERARCHY[r] for r in roles}

    async def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        user_level = ROLE_HIERARCHY.get(current_user.role, 0)
        # Un utilisateur peut accéder si son niveau est >= au niveau minimum requis
        min_required = min(allowed_levels)
        if user_level < min_required:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous n'avez pas les permissions nécessaires pour cette action.",
            )
        return current_user

    return role_checker


def require_permission(min_role: UserRole):
    """Dépendance qui exige un rôle au moins égal à `min_role` dans la hiérarchie."""
    min_level = ROLE_HIERARCHY[min_role]

    async def permission_checker(
        current_user: User = Depends(get_current_active_user),
    ) -> User:
        user_level = ROLE_HIERARCHY.get(current_user.role, 0)
        if user_level < min_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permissions insuffisantes.",
            )
        return current_user

    return permission_checker


# ---------------------------------------------------------------------------
# MFA TOTP (RFC 6238) — implémentation manuelle sans dépendance externe
# ---------------------------------------------------------------------------


def generate_mfa_secret() -> str:
    """Génère un secret TOTP en base32 (20 octets / 32 caractères)."""
    return secrets.token_urlsafe(20).rstrip("=").upper()[:32]


def _base32_decode(secret: str) -> bytes:
    """Décode une chaîne base32 (en gérant le padding manquant)."""
    padding = "=" * (-len(secret) % 8)
    return base64.b32decode(secret + padding)


def generate_totp(secret: str, timestamp: Optional[int] = None, period: int = 30) -> str:
    """Génère un code TOTP à 6 chiffres."""
    if timestamp is None:
        timestamp = int(time.time())
    counter = timestamp // period
    key = _base32_decode(secret)
    msg = struct.pack(">Q", counter)
    digest = hmac.new(key, msg, hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    code = struct.unpack(">I", digest[offset : offset + 4])[0] & 0x7FFFFFFF
    return f"{code % 1000000:06d}"


def verify_totp(secret: str, code: str, period: int = 30, window: int = 1) -> bool:
    """Vérifie un code TOTP avec une fenêtre de tolérance."""
    if not code or not code.isdigit() or len(code) != 6:
        return False
    timestamp = int(time.time())
    for offset in range(-window, window + 1):
        if hmac.compare_digest(
            generate_totp(secret, timestamp + offset * period, period), code
        ):
            return True
    return False


def get_totp_qr_url(secret: str, email: str, issuer: str = "FleetDocs") -> str:
    """Retourne l'URL otpauth:// pour générer un QR code."""
    import urllib.parse
    label = urllib.parse.quote(f"{issuer}:{email}")
    params = urllib.parse.urlencode(
        {"secret": secret, "issuer": issuer, "algorithm": "SHA1", "digits": 6, "period": 30}
    )
    return f"otpauth://totp/{label}?{params}"


# ---------------------------------------------------------------------------
# Jetons de réinitialisation / invitation (JWT à courte durée)
# ---------------------------------------------------------------------------


def create_reset_token(email: str) -> str:
    """Crée un jeton de réinitialisation de mot de passe (1 heure)."""
    return create_access_token(
        {"sub": email, "type": "reset"}, expires_delta=timedelta(hours=1)
    )


def create_invitation_token(email: str, company_id: str, role: str) -> str:
    """Crée un jeton d'invitation (7 jours)."""
    return create_access_token(
        {"sub": email, "company_id": company_id, "role": role, "type": "invitation"},
        expires_delta=timedelta(days=7),
    )


def verify_reset_token(token: str) -> Optional[str]:
    """Vérifie un jeton de réinitialisation et retourne l'email."""
    payload = decode_access_token(token)
    if payload.get("type") != "reset":
        return None
    return payload.get("sub")


def verify_invitation_token(token: str) -> Optional[Dict[str, Any]]:
    """Vérifie un jeton d'invitation et retourne les infos."""
    payload = decode_access_token(token)
    if payload.get("type") != "invitation":
        return None
    return payload
