"""Application FastAPI FleetDocs.

Point d'entrée de l'API. Configure CORS, inclut tous les routeurs,
expose un endpoint de santé et crée les tables au démarrage.
"""
import logging
import os
import traceback
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import Base, engine

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Cycle de vie : création des tables + seed des types globaux
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Au démarrage : crée les tables, migre les schémas et seed les types globaux."""
    # Crée les tables si elles n'existent pas
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Auto-migrations
    await _migrate_ocr_status_column()
    await _migrate_add_postal_code()

    # Seed les types globaux
    await _seed_global_types()

    # Crée le dossier d'uploads
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    yield

    # À l'arrêt : ferme l'engine
    await engine.dispose()


async def _migrate_ocr_status_column():
    """Convertit la colonne ocr_status de type enum vers varchar."""
    from sqlalchemy import text
    from app.database import async_session

    async with async_session() as db:
        try:
            result = await db.execute(
                text("""
                    SELECT data_type
                    FROM information_schema.columns
                    WHERE table_name = 'documents' AND column_name = 'ocr_status'
                """)
            )
            row = result.fetchone()

            if row and row[0] == "USER-DEFINED":
                logger.info("Migration: converting ocr_status from enum to varchar...")
                await db.execute(
                    text("ALTER TABLE documents ALTER COLUMN ocr_status TYPE VARCHAR(32) USING ocr_status::text")
                )
                await db.execute(
                    text("ALTER TABLE documents ALTER COLUMN ocr_status SET DEFAULT 'manual'")
                )
                await db.execute(
                    text("ALTER TABLE documents ALTER COLUMN ocr_status DROP NOT NULL")
                )
                await db.execute(
                    text("UPDATE documents SET ocr_status = 'manual' WHERE ocr_status IS NULL")
                )
                await db.execute(text("DROP TYPE IF EXISTS ocrstatus"))
                await db.commit()
                logger.info("✓ Migration ocr_status terminée avec succès")
        except Exception as e:
            logger.warning("Migration ocr_status: %s", e)
            await db.rollback()


async def _migrate_add_postal_code():
    """Ajoute la colonne postal_code à companies si elle n'existe pas."""
    from sqlalchemy import text
    from app.database import async_session

    async with async_session() as db:
        try:
            result = await db.execute(
                text("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name = 'companies' AND column_name = 'postal_code'
                """)
            )
            if not result.fetchone():
                logger.info("Migration: adding postal_code column to companies...")
                await db.execute(
                    text("ALTER TABLE companies ADD COLUMN postal_code VARCHAR(20)")
                )
                await db.commit()
                logger.info("✓ Column postal_code added to companies")
        except Exception as e:
            logger.warning("Migration postal_code: %s", e)
            await db.rollback()


async def _seed_global_types():
    """Insère les types globaux de véhicules et documents s'ils n'existent pas."""
    from sqlalchemy import select

    from app.database import async_session
    from app.models import DocumentType, VehicleType

    global_vehicle_types = [
        ("Véhicule léger", "VL", "Voitures, berlines, breaks"),
        ("Poids lourd", "PL", "Camions de plus de 3,5 tonnes"),
        ("Bus", "BUS", "Transport en commun de personnes"),
        ("Minibus", "MINIBUS", "Transport de personnes (8 à 15 places)"),
        ("Semi-remorque", "SEMI", "Ensemble tracteur + remorque"),
        ("Moto", "MOTO", "Deux-roues motorisé"),
        ("Camion benne", "BENNE", "Camion à benne basculante"),
        ("Fourgon", "FOURGON", "Véhicule utilitaire fermé"),
    ]

    global_document_types = [
        ("Carte grise", "CARTE_GRISE", {"warning": 0, "critical": 0}, True, "blue"),
        ("Assurance", "ASSURANCE", {"warning": 30, "critical": 7}, True, "green"),
        ("Contrôle technique", "CT", {"warning": 30, "critical": 0}, True, "orange"),
        ("FIMO/FCO", "FIMO", {"warning": 60, "critical": 0}, True, "purple"),
        ("ADR", "ADR", {"warning": 30, "critical": 0}, False, "red"),
        ("Permis de conduire", "PERMIS", {"warning": 30, "critical": 0}, True, "indigo"),
        ("Vignette", "VIGNETTE", {"warning": 30, "critical": 0}, True, "amber"),
    ]

    async with async_session() as db:
        # Types de véhicules
        for name, code, desc in global_vehicle_types:
            existing = await db.execute(
                select(VehicleType).where(VehicleType.code == code)
            )
            if not existing.scalar_one_or_none():
                db.add(
                    VehicleType(
                        name=name, code=code, description=desc, is_global=True
                    )
                )

        # Types de documents
        for name, code, alert_days, mandatory, color in global_document_types:
            existing = await db.execute(
                select(DocumentType).where(DocumentType.code == code)
            )
            if not existing.scalar_one_or_none():
                db.add(
                    DocumentType(
                        name=name,
                        code=code,
                        alert_days=alert_days,
                        is_mandatory=mandatory,
                        is_global=True,
                        color=color,
                    )
                )

        await db.commit()


# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------


app = FastAPI(
    title="FleetDocs API",
    description=(
        "API de gestion de documents de flottes automobiles en Afrique francophone.\n\n"
        "Tarifs en FCFA (1 € ≈ 656 FCFA) :\n"
        "- Starter : 19 000 FCFA/mois/véhicule\n"
        "- Pro : 32 000 FCFA/mois/véhicule\n"
        "- Enterprise : sur devis\n\n"
        "Authentification via `Authorization: Bearer <token>`."
    ),
    version="1.0.0",
    lifespan=lifespan,
)


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Fichiers statiques (uploads)
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


# ---------------------------------------------------------------------------
# Routeurs
# ---------------------------------------------------------------------------

from app.routers import (  # noqa: E402
    alerts,
    audit_logs,
    auth,
    dashboard,
    document_types,
    documents,
    exports,
    search,
    settings as settings_router,
    users,
    vehicle_types,
    vehicles,
)

app.include_router(auth.router)
app.include_router(vehicles.router)
app.include_router(documents.router)
app.include_router(alerts.router)
app.include_router(dashboard.router)
app.include_router(settings_router.router)
app.include_router(exports.router)
app.include_router(search.router)
app.include_router(audit_logs.router)
app.include_router(users.router)
app.include_router(vehicle_types.router)
app.include_router(document_types.router)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------


@app.get("/api/health", tags=["Système"])
async def health_check():
    """Vérifie que l'API fonctionne."""
    return {
        "status": "ok",
        "service": "FleetDocs API",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/", tags=["Système"])
async def root():
    """Page d'accueil de l'API."""
    return {
        "name": "FleetDocs API",
        "description": "Gestion de documents de flottes automobiles en Afrique francophone",
        "docs": "/docs",
        "health": "/api/health",
    }


# ---------------------------------------------------------------------------
# Global exception handler — preserves CORS headers on 500 errors
# ---------------------------------------------------------------------------


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Capture toutes les exceptions non gérées pour :
    1. Logger l'erreur avec le traceback complet
    2. Retourner un JSON 500 avec CORS headers (sinon le navigateur
       bloque la réponse et affiche une erreur CORS au lieu du 500)
    """
    logger.error(
        "Unhandled exception on %s %s: %s",
        request.method,
        request.url.path,
        str(exc),
    )
    logger.error(traceback.format_exc())

    return JSONResponse(
        status_code=500,
        content={
            "detail": "Une erreur interne est survenue.",
            "error": str(exc),
            "path": str(request.url.path),
        },
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        },
    )
