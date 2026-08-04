"""Configuration de l'application FleetDocs.

Charge les variables d'environnement via Pydantic Settings.
"""
from functools import lru_cache
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Paramètres de l'application chargés depuis .env."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Base de données
    DATABASE_URL: str = (
        "postgresql+asyncpg://postgres:password@localhost:5432/fleetdocs"
    )

    # JWT
    JWT_SECRET: str = "change-this-to-a-32-char-random-string"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 10080  # 7 jours

    # CORS
    CORS_ORIGINS: str = (
        "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
    )

    # Stockage fichiers
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 20

    # Mistral AI (OCR)
    MISTRAL_API_KEY: str = ""

    # Stripe
    STRIPE_SECRET_KEY: str = ""

    # SMTP
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@fleetdocs.africa"

    @field_validator("CORS_ORIGINS")
    @classmethod
    def parse_cors(cls, v: str) -> str:
        return v

    @property
    def cors_origins_list(self) -> List[str]:
        """Retourne la liste des origines CORS autorisées."""
        return [
            origin.strip()
            for origin in self.CORS_ORIGINS.split(",")
            if origin.strip()
        ]

    @property
    def max_upload_size_bytes(self) -> int:
        """Taille maximale de téléversement en octets."""
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    @property
    def base_url(self) -> str:
        """URL de base pour les fichiers téléversés."""
        return "http://localhost:8000"


@lru_cache
def get_settings() -> Settings:
    """Retourne une instance unique des paramètres."""
    return Settings()


settings = get_settings()
