"""Modèles SQLAlchemy pour FleetDocs.

Utilise le style SQLAlchemy 2.0 avec `Mapped[]` et `mapped_column()`.
Les IDs sont des UUID PostgreSQL natifs.
"""
import enum
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


# ---------------------------------------------------------------------------
# Énumérations
# ---------------------------------------------------------------------------


class UserRole(str, enum.Enum):
    """Rôles utilisateur (RBAC)."""

    super_admin = "super_admin"
    admin = "admin"
    manager = "manager"
    fleet_manager = "fleet_manager"
    operator = "operator"


class UserStatus(str, enum.Enum):
    """Statut d'un compte utilisateur."""

    active = "active"
    inactive = "inactive"
    invited = "invited"


class VehicleStatus(str, enum.Enum):
    """Statut opérationnel d'un véhicule."""

    active = "active"
    maintenance = "maintenance"
    out_of_service = "out_of_service"
    sold = "sold"
    archived = "archived"


# OCR supprimé pour le MVP — saisie manuelle uniquement
class ValidityStatus(str, enum.Enum):
    """Statut de validité d'un document."""

    valid = "valid"
    expiring_soon = "expiring_soon"
    expired = "expired"
    unknown = "unknown"


class AlertType(str, enum.Enum):
    """Type d'alerte."""

    document_expiring = "document_expiring"
    document_expired = "document_expired"
    ocr_failed = "ocr_failed"
    compliance_issue = "compliance_issue"


class AlertCategory(str, enum.Enum):
    """Catégorie d'alerte."""

    document = "document"
    vehicle = "vehicle"
    compliance = "compliance"
    system = "system"


class AlertSeverity(str, enum.Enum):
    """Sévérité d'une alerte."""

    info = "info"
    warning = "warning"
    critical = "critical"


class AlertStatus(str, enum.Enum):
    """Statut d'une alerte."""

    active = "active"
    resolved = "resolved"
    dismissed = "dismissed"


class PlanType(str, enum.Enum):
    """Plan d'abonnement."""

    starter = "starter"
    pro = "pro"
    enterprise = "enterprise"


class SubscriptionStatus(str, enum.Enum):
    """Statut d'un abonnement."""

    active = "active"
    canceled = "canceled"
    past_due = "past_due"
    trialing = "trialing"


# ---------------------------------------------------------------------------
# Modèles
# ---------------------------------------------------------------------------


def _uuid() -> uuid.UUID:
    return uuid.uuid4()


class Company(Base):
    """Société (tenant multi-locataire)."""

    __tablename__ = "companies"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_uuid
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    siret: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    logo_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    plan: Mapped[PlanType] = mapped_column(
        SQLEnum(PlanType), nullable=False, default=PlanType.starter
    )
    max_vehicles: Mapped[int] = mapped_column(Integer, nullable=False, default=50)
    address: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    users: Mapped[List["User"]] = relationship(
        back_populates="company", cascade="all, delete-orphan"
    )
    vehicles: Mapped[List["Vehicle"]] = relationship(
        back_populates="company", cascade="all, delete-orphan"
    )
    documents: Mapped[List["Document"]] = relationship(
        back_populates="company", cascade="all, delete-orphan"
    )
    alerts: Mapped[List["Alert"]] = relationship(
        back_populates="company", cascade="all, delete-orphan"
    )
    vehicle_types: Mapped[List["VehicleType"]] = relationship(
        back_populates="company", cascade="all, delete-orphan"
    )
    document_types: Mapped[List["DocumentType"]] = relationship(
        back_populates="company", cascade="all, delete-orphan"
    )
    subscription: Mapped[Optional["Subscription"]] = relationship(
        back_populates="company", uselist=False, cascade="all, delete-orphan"
    )


class User(Base):
    """Utilisateur de l'application."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_uuid
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    first_name: Mapped[str] = mapped_column(String(128), nullable=False)
    last_name: Mapped[str] = mapped_column(String(128), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        SQLEnum(UserRole), nullable=False, default=UserRole.admin
    )
    status: Mapped[UserStatus] = mapped_column(
        SQLEnum(UserStatus), nullable=False, default=UserStatus.active
    )
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    mfa_secret: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    company_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=True
    )
    last_login_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    company: Mapped[Optional["Company"]] = relationship(back_populates="users")
    sessions: Mapped[List["Session"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    documents_uploaded: Mapped[List["Document"]] = relationship(
        back_populates="uploaded_by"
    )
    comments: Mapped[List["Comment"]] = relationship(
        back_populates="author", cascade="all, delete-orphan"
    )
    status_changes: Mapped[List["VehicleStatusHistory"]] = relationship(
        back_populates="changed_by"
    )
    alerts_resolved: Mapped[List["Alert"]] = relationship(
        back_populates="resolved_by"
    )
    share_links: Mapped[List["ShareLink"]] = relationship(
        back_populates="created_by", cascade="all, delete-orphan"
    )
    audit_logs: Mapped[List["AuditLog"]] = relationship(back_populates="user")


class VehicleType(Base):
    """Type de véhicule (global ou spécifique à une société)."""

    __tablename__ = "vehicle_types"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_uuid
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    is_global: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    company_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    company: Mapped[Optional["Company"]] = relationship(back_populates="vehicle_types")
    vehicles: Mapped[List["Vehicle"]] = relationship(back_populates="vehicle_type")


class Vehicle(Base):
    """Véhicule de la flotte."""

    __tablename__ = "vehicles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_uuid
    )
    registration: Mapped[str] = mapped_column(String(32), nullable=False)
    brand: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    model: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    ptac_kg: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    vin: Mapped[Optional[str]] = mapped_column(String(17), nullable=True)
    status: Mapped[VehicleStatus] = mapped_column(
        SQLEnum(VehicleStatus), nullable=False, default=VehicleStatus.active
    )
    photo_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    custom_fields: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB, nullable=True, default=dict
    )
    mileage: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    color: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    fuel_type: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    vehicle_type_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("vehicle_types.id", ondelete="SET NULL"),
        nullable=True,
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    company: Mapped["Company"] = relationship(back_populates="vehicles")
    vehicle_type: Mapped[Optional["VehicleType"]] = relationship(back_populates="vehicles")
    documents: Mapped[List["Document"]] = relationship(
        back_populates="vehicle", cascade="all, delete-orphan"
    )
    status_history: Mapped[List["VehicleStatusHistory"]] = relationship(
        back_populates="vehicle", cascade="all, delete-orphan"
    )
    alerts: Mapped[List["Alert"]] = relationship(
        back_populates="vehicle", cascade="all, delete-orphan"
    )


class VehicleStatusHistory(Base):
    """Historique des changements de statut d'un véhicule."""

    __tablename__ = "vehicle_status_history"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_uuid
    )
    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False
    )
    old_status: Mapped[Optional[VehicleStatus]] = mapped_column(
        SQLEnum(VehicleStatus), nullable=True
    )
    new_status: Mapped[VehicleStatus] = mapped_column(
        SQLEnum(VehicleStatus), nullable=False
    )
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    changed_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    vehicle: Mapped["Vehicle"] = relationship(back_populates="status_history")
    changed_by: Mapped[Optional["User"]] = relationship(back_populates="status_changes")


class DocumentType(Base):
    """Type de document (global ou spécifique à une société)."""

    __tablename__ = "document_types"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_uuid
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    alert_days: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB, nullable=True
    )
    is_mandatory: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_global: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    icon: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    color: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    company_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    company: Mapped[Optional["Company"]] = relationship(back_populates="document_types")
    documents: Mapped[List["Document"]] = relationship(back_populates="document_type")


class Document(Base):
    """Document téléversé pour un véhicule."""

    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_uuid
    )
    file_name: Mapped[str] = mapped_column(String(512), nullable=False)
    file_url: Mapped[str] = mapped_column(String(1024), nullable=False)
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    mime_type: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # OCR supprimé pour le MVP — les colonnes sont gardées pour la migration
    # mais ne sont plus utilisées. Elles seront supprimées dans une future migration.
    ocr_status: Mapped[Optional[str]] = mapped_column(String(32), nullable=True, default="manual")
    ocr_raw_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ocr_confidence: Mapped[Optional[float]] = mapped_column(nullable=True)
    ocr_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)

    validity_status: Mapped[ValidityStatus] = mapped_column(
        SQLEnum(ValidityStatus), nullable=False, default=ValidityStatus.unknown
    )
    expiry_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    issued_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    reference: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    document_type_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("document_types.id", ondelete="SET NULL"),
        nullable=True,
    )
    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )
    uploaded_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    document_type: Mapped[Optional["DocumentType"]] = relationship(
        back_populates="documents"
    )
    vehicle: Mapped["Vehicle"] = relationship(back_populates="documents")
    company: Mapped["Company"] = relationship(back_populates="documents")
    uploaded_by: Mapped[Optional["User"]] = relationship(back_populates="documents_uploaded")
    comments: Mapped[List["Comment"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )
    alerts: Mapped[List["Alert"]] = relationship(back_populates="document")
    share_links: Mapped[List["ShareLink"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )


class Comment(Base):
    """Commentaire sur un document."""

    __tablename__ = "comments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_uuid
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False
    )
    author_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("comments.id", ondelete="CASCADE"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=True,
    )

    document: Mapped["Document"] = relationship(back_populates="comments")
    author: Mapped[Optional["User"]] = relationship(back_populates="comments")
    parent: Mapped[Optional["Comment"]] = relationship(
        remote_side="Comment.id", back_populates="replies"
    )
    replies: Mapped[List["Comment"]] = relationship(
        back_populates="parent", cascade="all, delete-orphan"
    )


class Alert(Base):
    """Alerte sur un document ou un véhicule."""

    __tablename__ = "alerts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_uuid
    )
    type: Mapped[AlertType] = mapped_column(SQLEnum(AlertType), nullable=False)
    category: Mapped[AlertCategory] = mapped_column(
        SQLEnum(AlertCategory), nullable=False, default=AlertCategory.document
    )
    severity: Mapped[AlertSeverity] = mapped_column(
        SQLEnum(AlertSeverity), nullable=False, default=AlertSeverity.warning
    )
    status: Mapped[AlertStatus] = mapped_column(
        SQLEnum(AlertStatus), nullable=False, default=AlertStatus.active
    )
    message: Mapped[str] = mapped_column(Text, nullable=False)

    vehicle_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=True
    )
    document_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=True
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )
    triggered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    resolved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    resolved_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    resolution_comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    vehicle: Mapped[Optional["Vehicle"]] = relationship(back_populates="alerts")
    document: Mapped[Optional["Document"]] = relationship(back_populates="alerts")
    company: Mapped["Company"] = relationship(back_populates="alerts")
    resolved_by: Mapped[Optional["User"]] = relationship(back_populates="alerts_resolved")


class ShareLink(Base):
    """Lien de partage signé pour un document."""

    __tablename__ = "share_links"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_uuid
    )
    token: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False
    )
    created_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    revoked_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    document: Mapped["Document"] = relationship(back_populates="share_links")
    created_by: Mapped[Optional["User"]] = relationship(back_populates="share_links")


class AuditLog(Base):
    """Journal d'audit des actions utilisateur."""

    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_uuid
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    company_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="SET NULL"), nullable=True
    )
    action: Mapped[str] = mapped_column(String(128), nullable=False)
    resource: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    resource_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    metadata_: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        "metadata", JSONB, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped[Optional["User"]] = relationship(back_populates="audit_logs")


class Subscription(Base):
    """Abonnement Stripe d'une société."""

    __tablename__ = "subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_uuid
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"),
        unique=True, nullable=False,
    )
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    stripe_subscription_id: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    plan: Mapped[PlanType] = mapped_column(
        SQLEnum(PlanType), nullable=False, default=PlanType.starter
    )
    status: Mapped[SubscriptionStatus] = mapped_column(
        SQLEnum(SubscriptionStatus), nullable=False, default=SubscriptionStatus.active
    )
    current_period_end: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    amount_fcfa: Mapped[int] = mapped_column(Integer, nullable=False, default=19000)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    company: Mapped["Company"] = relationship(back_populates="subscription")


class Session(Base):
    """Session utilisateur active (pour le suivi des connexions)."""

    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_uuid
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token: Mapped[str] = mapped_column(String(512), unique=True, nullable=False)
    user_agent: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    last_active_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    revoked_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    user: Mapped["User"] = relationship(back_populates="sessions")
