"""Schémas Pydantic v2 pour la validation des données.

Tous les messages d'erreur sont en français.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional, Union
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
)

from app.models import (
    AlertCategory,
    AlertSeverity,
    AlertStatus,
    AlertType,
    OCRStatus,
    PlanType,
    SubscriptionStatus,
    UserRole,
    UserStatus,
    ValidityStatus,
    VehicleStatus,
)


# ---------------------------------------------------------------------------
# Mixins
# ---------------------------------------------------------------------------


class ORMModel(BaseModel):
    """Modèle de base avec conversion depuis les attributs ORM."""

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------


class CompanyCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, description="Nom de la société")
    siret: Optional[str] = Field(None, max_length=64)
    plan: PlanType = PlanType.starter
    address: Optional[str] = Field(None, max_length=512)
    phone: Optional[str] = Field(None, max_length=32)
    city: Optional[str] = Field(None, max_length=128)
    country: Optional[str] = Field(None, max_length=128)


class UserCreate(BaseModel):
    email: EmailStr = Field(..., description="Adresse email")
    password: str = Field(..., min_length=8, max_length=128,
                          description="Mot de passe (8 caractères min)")
    first_name: str = Field(..., min_length=1, max_length=128, description="Prénom")
    last_name: str = Field(..., min_length=1, max_length=128, description="Nom")
    role: UserRole = UserRole.admin
    phone: Optional[str] = Field(None, max_length=32)
    company_name: Optional[str] = Field(None, max_length=255, description="Nom de la société (inscription PLG)")
    plan: PlanType = PlanType.starter

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Le mot de passe doit contenir au moins 8 caractères")
        return v


class UserInvite(BaseModel):
    email: EmailStr = Field(..., description="Adresse email")
    first_name: str = Field(..., min_length=1, max_length=128)
    last_name: str = Field(..., min_length=1, max_length=128)
    role: UserRole = UserRole.operator


class UserUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=128)
    last_name: Optional[str] = Field(None, min_length=1, max_length=128)
    phone: Optional[str] = Field(None, max_length=32)
    avatar_url: Optional[str] = Field(None, max_length=512)


class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="Adresse email")
    password: str = Field(..., min_length=1, description="Mot de passe")


class ForgotPasswordRequest(BaseModel):
    email: EmailStr = Field(..., description="Adresse email")


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., description="Jeton de réinitialisation")
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Le mot de passe doit contenir au moins 8 caractères")
        return v


class AcceptInvitationRequest(BaseModel):
    token: str = Field(..., description="Jeton d'invitation")
    password: str = Field(..., min_length=8, max_length=128)
    first_name: Optional[str] = Field(None, min_length=1, max_length=128)
    last_name: Optional[str] = Field(None, min_length=1, max_length=128)


class MFASetupResponse(BaseModel):
    secret: str
    qr_code_url: str


class MFAVerifyRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=6, description="Code TOTP à 6 chiffres")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


# ---------------------------------------------------------------------------
# Réponses
# ---------------------------------------------------------------------------


class CompanyResponse(ORMModel):
    id: UUID
    name: str
    siret: Optional[str] = None
    logo_url: Optional[str] = None
    plan: PlanType
    max_vehicles: int
    address: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class UserResponse(ORMModel):
    id: UUID
    email: str
    first_name: str
    last_name: str
    role: UserRole
    status: UserStatus
    mfa_enabled: bool
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    company_id: Optional[UUID] = None
    last_login_at: Optional[datetime] = None
    created_at: datetime


class SessionResponse(ORMModel):
    id: UUID
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    last_active_at: datetime
    created_at: datetime
    is_current: bool = False


# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------


class VehicleTypeCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    code: str = Field(..., min_length=1, max_length=32)
    description: Optional[str] = None


class VehicleTypeResponse(ORMModel):
    id: UUID
    name: str
    code: str
    is_global: bool
    description: Optional[str] = None
    company_id: Optional[UUID] = None
    created_at: datetime


class DocumentTypeCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    code: str = Field(..., min_length=1, max_length=32)
    # Accepte soit un dict {"warning": 30, "critical": 7} soit un array [90, 60, 30]
    alert_days: Optional[Union[Dict[str, Any], List[int]]] = None
    is_mandatory: bool = False
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None

    @field_validator("alert_days", mode="before")
    @classmethod
    def normalize_alert_days(cls, v):
        """Convertit les arrays en dict pour la compatibilité DB."""
        if isinstance(v, list):
            # Convertit [90, 60, 30] en {"warning": 30, "critical": 0}
            # en assumant que le plus petit = critical, les autres = warning
            if not v:
                return None
            sorted_days = sorted(v)
            return {"warning": sorted_days[0], "critical": 0}
        return v


class DocumentTypeResponse(ORMModel):
    id: UUID
    name: str
    code: str
    alert_days: Optional[Dict[str, Any]] = None
    is_mandatory: bool
    is_global: bool
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    company_id: Optional[UUID] = None
    created_at: datetime


# ---------------------------------------------------------------------------
# Véhicules
# ---------------------------------------------------------------------------


class VehicleCreate(BaseModel):
    registration: str = Field(..., min_length=2, max_length=32,
                              description="Immatriculation du véhicule")
    brand: Optional[str] = Field(None, max_length=128)
    model: Optional[str] = Field(None, max_length=128)
    ptac_kg: Optional[int] = Field(None, ge=0, le=100000)
    year: Optional[int] = Field(None, ge=1900, le=2100)
    vin: Optional[str] = Field(None, max_length=17, description="VIN (17 caractères)")
    vehicle_type_id: Optional[UUID] = None
    photo_url: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None
    mileage: Optional[int] = Field(None, ge=0)
    color: Optional[str] = None
    fuel_type: Optional[str] = None

    @field_validator("vin")
    @classmethod
    def validate_vin(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) != 17:
            raise ValueError("Le numéro VIN doit contenir exactement 17 caractères")
        return v

    @field_validator("registration")
    @classmethod
    def validate_registration(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("L'immatriculation est obligatoire")
        return v.strip().upper()


class VehicleUpdate(BaseModel):
    registration: Optional[str] = Field(None, min_length=2, max_length=32)
    brand: Optional[str] = Field(None, max_length=128)
    model: Optional[str] = Field(None, max_length=128)
    ptac_kg: Optional[int] = Field(None, ge=0, le=100000)
    year: Optional[int] = Field(None, ge=1900, le=2100)
    vin: Optional[str] = Field(None, max_length=17)
    vehicle_type_id: Optional[UUID] = None
    photo_url: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None
    mileage: Optional[int] = Field(None, ge=0)
    color: Optional[str] = None
    fuel_type: Optional[str] = None

    @field_validator("vin")
    @classmethod
    def validate_vin(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) != 17:
            raise ValueError("Le numéro VIN doit contenir exactement 17 caractères")
        return v


class VehicleStatusChange(BaseModel):
    status: VehicleStatus
    comment: Optional[str] = None


class VehicleResponse(ORMModel):
    id: UUID
    registration: str
    brand: Optional[str] = None
    model: Optional[str] = None
    ptac_kg: Optional[int] = None
    year: Optional[int] = None
    vin: Optional[str] = None
    status: VehicleStatus
    photo_url: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None
    mileage: Optional[int] = None
    color: Optional[str] = None
    fuel_type: Optional[str] = None
    vehicle_type_id: Optional[UUID] = None
    company_id: UUID
    created_at: datetime
    updated_at: datetime
    documents_count: int = 0
    compliance_rate: Optional[float] = None


class VehicleDetailResponse(VehicleResponse):
    documents: List["DocumentResponse"] = []
    status_history: List["VehicleStatusHistoryResponse"] = []


class VehicleStatusHistoryResponse(ORMModel):
    id: UUID
    old_status: Optional[VehicleStatus] = None
    new_status: VehicleStatus
    comment: Optional[str] = None
    changed_by_id: Optional[UUID] = None
    changed_at: datetime


class TimelineEvent(ORMModel):
    id: str
    type: str
    title: str
    description: Optional[str] = None
    timestamp: datetime
    user: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------


class DocumentMetadata(BaseModel):
    """Données extraites par OCR ou saisies manuellement."""
    document_type_id: Optional[UUID] = None
    expiry_date: Optional[datetime] = None
    issued_date: Optional[datetime] = None
    reference: Optional[str] = None
    ocr_data: Optional[Dict[str, Any]] = None


class DocumentUpdate(BaseModel):
    document_type_id: Optional[UUID] = None
    expiry_date: Optional[datetime] = None
    issued_date: Optional[datetime] = None
    reference: Optional[str] = None
    ocr_data: Optional[Dict[str, Any]] = None
    ocr_status: Optional[OCRStatus] = None
    ocr_confidence: Optional[float] = None
    validity_status: Optional[ValidityStatus] = None


class DocumentResponse(ORMModel):
    id: UUID
    file_name: str
    file_url: str
    file_size: int
    mime_type: Optional[str] = None
    version: int
    ocr_status: OCRStatus
    ocr_raw_text: Optional[str] = None
    ocr_confidence: Optional[float] = None
    ocr_data: Optional[Dict[str, Any]] = None
    validity_status: ValidityStatus
    expiry_date: Optional[datetime] = None
    issued_date: Optional[datetime] = None
    reference: Optional[str] = None
    document_type_id: Optional[UUID] = None
    vehicle_id: UUID
    company_id: UUID
    uploaded_by_id: Optional[UUID] = None
    uploaded_by_name: Optional[str] = None
    created_at: datetime
    document_type: Optional[DocumentTypeResponse] = None


class ShareLinkCreate(BaseModel):
    expires_in_hours: int = Field(72, ge=1, le=720, description="Durée de validité en heures")


class ShareLinkResponse(ORMModel):
    id: UUID
    token: str
    url: str
    document_id: UUID
    expires_at: Optional[datetime] = None
    created_at: datetime
    revoked: bool = False
    created_by: Optional[str] = None


class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    parent_id: Optional[UUID] = None


class CommentResponse(ORMModel):
    id: UUID
    content: str
    document_id: UUID
    author_id: Optional[UUID] = None
    parent_id: Optional[UUID] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    author_name: Optional[str] = None
    replies: List["CommentResponse"] = []


# ---------------------------------------------------------------------------
# Alertes
# ---------------------------------------------------------------------------


class AlertResponse(ORMModel):
    id: UUID
    type: AlertType
    category: AlertCategory
    severity: AlertSeverity
    status: AlertStatus
    message: str
    vehicle_id: Optional[UUID] = None
    document_id: Optional[UUID] = None
    company_id: UUID
    triggered_at: datetime
    resolved_at: Optional[datetime] = None
    resolved_by_id: Optional[UUID] = None
    resolution_comment: Optional[str] = None
    vehicle_registration: Optional[str] = None
    document_name: Optional[str] = None


class AlertResolveRequest(BaseModel):
    comment: Optional[str] = Field(None, max_length=1000)


class AlertSummary(BaseModel):
    total: int
    active: int
    resolved: int
    dismissed: int
    by_severity: Dict[str, int]
    by_category: Dict[str, int]


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------


class DashboardResponse(BaseModel):
    kpis: Dict[str, Any]
    charts: Dict[str, Any]
    recent_alerts: List[AlertResponse]
    recent_documents: List[DocumentResponse]
    expiring_documents: List[DocumentResponse]


# ---------------------------------------------------------------------------
# Paramètres
# ---------------------------------------------------------------------------


class CompanyUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    siret: Optional[str] = Field(None, max_length=64)
    logo_url: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None


class NotificationSettings(BaseModel):
    email_alerts: bool = True
    document_expiring: bool = True
    document_expired: bool = True
    ocr_completed: bool = False
    weekly_report: bool = True


class BillingResponse(BaseModel):
    plan: PlanType
    status: SubscriptionStatus
    max_vehicles: int
    current_vehicles: int
    amount_fcfa: int
    current_period_end: Optional[datetime] = None
    invoices: List[Dict[str, Any]] = []


class UpgradePlanRequest(BaseModel):
    plan: PlanType


# ---------------------------------------------------------------------------
# Recherche + Audit
# ---------------------------------------------------------------------------


class SearchResult(BaseModel):
    vehicles: List[VehicleResponse]
    documents: List[DocumentResponse]
    alerts: List[AlertResponse]
    total: int


class AuditLogResponse(ORMModel):
    id: UUID
    user_id: Optional[UUID] = None
    company_id: Optional[UUID] = None
    action: str
    resource: Optional[str] = None
    resource_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = Field(
        None, validation_alias="metadata_", serialization_alias="metadata"
    )
    created_at: datetime
    user_name: Optional[str] = None


# ---------------------------------------------------------------------------
# Pagination
# ---------------------------------------------------------------------------


class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    page_size: int
    total_pages: int


class MessageResponse(BaseModel):
    message: str
    detail: Optional[Any] = None


# ---------------------------------------------------------------------------
# Plans
# ---------------------------------------------------------------------------


class PlanInfo(BaseModel):
    code: PlanType
    name: str
    price_fcfa: int
    max_vehicles: int
    features: List[str]


PLANS_INFO: List[PlanInfo] = [
    PlanInfo(
        code=PlanType.starter,
        name="Starter",
        price_fcfa=19000,
        max_vehicles=50,
        features=[
            "Gestion de documents illimitée",
            "OCR basique (50 documents/mois)",
            "Alertes d'expiration",
            "1 utilisateur",
            "Support email",
        ],
    ),
    PlanInfo(
        code=PlanType.pro,
        name="Pro",
        price_fcfa=32000,
        max_vehicles=200,
        features=[
            "Tout le plan Starter",
            "OCR illimité",
            "Utilisateurs illimités",
            "Rôles et permissions",
            "Export PDF/Excel",
            "API d'intégration",
            "Support prioritaire",
        ],
    ),
    PlanInfo(
        code=PlanType.enterprise,
        name="Enterprise",
        price_fcfa=0,
        max_vehicles=10000,
        features=[
            "Tout le plan Pro",
            "Véhicules illimités (1000+)",
            "SSO / SAML",
            "Personnalisation avancée",
            "Account manager dédié",
            "SLA 99,9 %",
            "Formation sur site",
        ],
    ),
]


# Mises à jour des forward refs
TokenResponse.model_rebuild()
VehicleDetailResponse.model_rebuild()
CommentResponse.model_rebuild()
