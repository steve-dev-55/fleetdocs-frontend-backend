"""Script de seed : crée les tables et les données de démonstration.

Utilisation :
    python -m app.seed

Crée :
- Les types globaux de véhicules et documents
- Une société de démo "Transport Dupont SARL" (Dakar, Sénégal)
- Un utilisateur admin : marie.dupont@transport-dupont.sn / demo
- 8 véhicules (Renault, Peugeot, Mercedes, Toyota, Iveco)
- 25 documents
- 12 alertes
"""
import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone
from uuid import uuid4

# Ajoute le dossier backend au path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select

from app.auth import hash_password
from app.database import Base, async_session, engine
from app.models import (
    Alert,
    AlertCategory,
    AlertSeverity,
    AlertStatus,
    AlertType,
    Company,
    Document,
    DocumentType,
    PlanType,
    Subscription,
    SubscriptionStatus,
    User,
    UserRole,
    UserStatus,
    ValidityStatus,
    Vehicle,
    VehicleStatus,
    VehicleStatusHistory,
    VehicleType,
)


# ---------------------------------------------------------------------------
# Données de seed
# ---------------------------------------------------------------------------


GLOBAL_VEHICLE_TYPES = [
    ("Véhicule léger", "VL", "Voitures, berlines, breaks"),
    ("Poids lourd", "PL", "Camions de plus de 3,5 tonnes"),
    ("Bus", "BUS", "Transport en commun de personnes"),
    ("Minibus", "MINIBUS", "Transport de personnes (8 à 15 places)"),
    ("Semi-remorque", "SEMI", "Ensemble tracteur + remorque"),
    ("Moto", "MOTO", "Deux-roues motorisé"),
    ("Camion benne", "BENNE", "Camion à benne basculante"),
    ("Fourgon", "FOURGON", "Véhicule utilitaire fermé"),
]

GLOBAL_DOCUMENT_TYPES = [
    ("Carte grise", "CARTE_GRISE", {"warning": 0, "critical": 0}, True, "blue"),
    ("Assurance", "ASSURANCE", {"warning": 30, "critical": 7}, True, "green"),
    ("Contrôle technique", "CT", {"warning": 30, "critical": 0}, True, "orange"),
    ("FIMO/FCO", "FIMO", {"warning": 60, "critical": 0}, True, "purple"),
    ("ADR", "ADR", {"warning": 30, "critical": 0}, False, "red"),
    ("Permis de conduire", "PERMIS", {"warning": 30, "critical": 0}, True, "indigo"),
    ("Vignette", "VIGNETTE", {"warning": 30, "critical": 0}, True, "amber"),
]


# Véhicules de démo (marques communes en Afrique de l'Ouest)
DEMO_VEHICLES = [
    {
        "registration": "DK-2024-AB",
        "brand": "Renault",
        "model": "Master III",
        "ptac_kg": 3500,
        "year": 2022,
        "vin": "VF1MA000000000001",
        "vehicle_type_code": "FOURGON",
        "status": VehicleStatus.active,
        "mileage": 45000,
        "color": "Blanc",
        "fuel_type": "Diesel",
    },
    {
        "registration": "DK-2023-CD",
        "brand": "Peugeot",
        "model": "Partner",
        "ptac_kg": 2000,
        "year": 2021,
        "vin": "VF1P2000000000022",
        "vehicle_type_code": "VL",
        "status": VehicleStatus.active,
        "mileage": 67000,
        "color": "Gris",
        "fuel_type": "Diesel",
    },
    {
        "registration": "DK-2022-EF",
        "brand": "Mercedes-Benz",
        "model": "Actros 1845",
        "ptac_kg": 19000,
        "year": 2020,
        "vin": "WDB96000000000033",
        "vehicle_type_code": "PL",
        "status": VehicleStatus.active,
        "mileage": 234000,
        "color": "Blanc",
        "fuel_type": "Diesel",
    },
    {
        "registration": "DK-2021-GH",
        "brand": "Toyota",
        "model": "Hilux",
        "ptac_kg": 2800,
        "year": 2019,
        "vin": "JTEBU000000000044",
        "vehicle_type_code": "VL",
        "status": VehicleStatus.maintenance,
        "mileage": 156000,
        "color": "Beige",
        "fuel_type": "Diesel",
    },
    {
        "registration": "DK-2020-IJ",
        "brand": "Iveco",
        "model": "Daily 70C18",
        "ptac_kg": 7000,
        "year": 2018,
        "vin": "ZCFA7000000000055",
        "vehicle_type_code": "PL",
        "status": VehicleStatus.active,
        "mileage": 289000,
        "color": "Blanc",
        "fuel_type": "Diesel",
    },
    {
        "registration": "DK-2024-KL",
        "brand": "Renault",
        "model": "Trafic III",
        "ptac_kg": 2800,
        "year": 2023,
        "vin": "VF1FL000000000066",
        "vehicle_type_code": "FOURGON",
        "status": VehicleStatus.active,
        "mileage": 12000,
        "color": "Blanc",
        "fuel_type": "Diesel",
    },
    {
        "registration": "DK-2019-MN",
        "brand": "Mercedes-Benz",
        "model": "Sprinter 515",
        "ptac_kg": 5000,
        "year": 2017,
        "vin": "WDB90600000000077",
        "vehicle_type_code": "BUS",
        "status": VehicleStatus.out_of_service,
        "mileage": 412000,
        "color": "Blanc",
        "fuel_type": "Diesel",
    },
    {
        "registration": "DK-2023-OP",
        "brand": "Peugeot",
        "model": "308",
        "ptac_kg": 1800,
        "year": 2022,
        "vin": "VF33C000000000088",
        "vehicle_type_code": "VL",
        "status": VehicleStatus.active,
        "mileage": 23000,
        "color": "Bleu",
        "fuel_type": "Essence",
    },
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def days_from_now(days: int) -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=days)


def days_ago(days: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days)


# ---------------------------------------------------------------------------
# Seed principal
# ---------------------------------------------------------------------------


async def seed_global_types(db):
    """Insère les types globaux."""
    print("→ Création des types globaux...")

    for name, code, desc in GLOBAL_VEHICLE_TYPES:
        existing = await db.execute(
            select(VehicleType).where(VehicleType.code == code)
        )
        if not existing.scalar_one_or_none():
            db.add(
                VehicleType(
                    name=name, code=code, description=desc, is_global=True
                )
            )

    for name, code, alert_days, mandatory, color in GLOBAL_DOCUMENT_TYPES:
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

    await db.flush()
    print(f"  ✓ {len(GLOBAL_VEHICLE_TYPES)} types de véhicules, "
          f"{len(GLOBAL_DOCUMENT_TYPES)} types de documents")


async def seed_demo_data(db):
    """Crée la société, l'utilisateur et les données de démo."""
    # Vérifie si la société existe déjà
    existing = await db.execute(
        select(Company).where(Company.name == "Transport Dupont SARL")
    )
    existing_company = existing.scalar_one_or_none()
    if existing_company:
        print("→ Les données de démo existent déjà. Suppression...")
        await db.delete(existing_company)
        await db.flush()

    print("→ Création de la société de démo...")
    company = Company(
        name="Transport Dupont SARL",
        siret="SN-DKR-2018-00342",
        plan=PlanType.pro,
        max_vehicles=200,
        address="Avenue Léopold Sédar Senghor, Immeuble Baobab, 3e étage",
        phone="+221 33 821 45 67",
        city="Dakar",
        country="Sénégal",
    )
    db.add(company)
    await db.flush()

    # Abonnement
    subscription = Subscription(
        company_id=company.id,
        plan=PlanType.pro,
        status=SubscriptionStatus.active,
        amount_fcfa=32000,
        current_period_end=days_from_now(30),
    )
    db.add(subscription)

    print("→ Création de l'utilisateur admin...")
    admin = User(
        email="marie.dupont@transport-dupont.sn",
        password_hash=hash_password("demo"),
        first_name="Marie",
        last_name="Dupont",
        role=UserRole.admin,
        status=UserStatus.active,
        company_id=company.id,
        phone="+221 77 123 45 67",
        last_login_at=days_ago(1),
    )
    db.add(admin)

    # Quelques utilisateurs supplémentaires
    extra_users = [
        User(
            email="ousmane.fall@transport-dupont.sn",
            password_hash=hash_password("demo"),
            first_name="Ousmane",
            last_name="Fall",
            role=UserRole.fleet_manager,
            status=UserStatus.active,
            company_id=company.id,
            phone="+221 76 987 65 43",
        ),
        User(
            email="fatou.ndiaye@transport-dupont.sn",
            password_hash=hash_password("demo"),
            first_name="Fatou",
            last_name="Ndiaye",
            role=UserRole.operator,
            status=UserStatus.active,
            company_id=company.id,
            phone="+221 70 456 78 90",
        ),
        User(
            email="ibrahima.sow@transport-dupont.sn",
            password_hash=hash_password("demo"),
            first_name="Ibrahima",
            last_name="Sow",
            role=UserRole.manager,
            status=UserStatus.active,
            company_id=company.id,
            phone="+221 78 345 12 34",
        ),
    ]
    for u in extra_users:
        db.add(u)
    await db.flush()

    print("→ Création des véhicules...")
    vehicles = []
    for vdata in DEMO_VEHICLES:
        # Récupère le type de véhicule
        vt_result = await db.execute(
            select(VehicleType).where(
                VehicleType.code == vdata["vehicle_type_code"]
            )
        )
        vtype = vt_result.scalar_one()

        vehicle = Vehicle(
            registration=vdata["registration"],
            brand=vdata["brand"],
            model=vdata["model"],
            ptac_kg=vdata["ptac_kg"],
            year=vdata["year"],
            vin=vdata["vin"],
            status=vdata["status"],
            mileage=vdata["mileage"],
            color=vdata["color"],
            fuel_type=vdata["fuel_type"],
            vehicle_type_id=vtype.id,
            company_id=company.id,
        )
        db.add(vehicle)
        vehicles.append(vehicle)
    await db.flush()
    print(f"  ✓ {len(vehicles)} véhicules créés")

    # Historique de statuts pour quelques véhicules
    print("→ Création de l'historique de statuts...")
    # Le 4e véhicule (Hilux) est en maintenance
    history1 = VehicleStatusHistory(
        vehicle_id=vehicles[3].id,
        old_status=VehicleStatus.active,
        new_status=VehicleStatus.maintenance,
        comment="Révision des freins - atelier de Pikine",
        changed_by_id=admin.id,
        changed_at=days_ago(5),
    )
    # Le 7e véhicule (Sprinter) est hors service
    history2 = VehicleStatusHistory(
        vehicle_id=vehicles[6].id,
        old_status=VehicleStatus.active,
        new_status=VehicleStatus.out_of_service,
        comment="Problème moteur - en attente de pièces",
        changed_by_id=admin.id,
        changed_at=days_ago(15),
    )
    db.add_all([history1, history2])

    print("→ Création des documents...")
    # Récupère les types de documents
    doc_types = {}
    for code in ["CARTE_GRISE", "ASSURANCE", "CT", "FIMO", "VIGNETTE", "PERMIS"]:
        result = await db.execute(
            select(DocumentType).where(DocumentType.code == code)
        )
        doc_types[code] = result.scalar_one()

    # Génère 25 documents répartis sur les véhicules
    documents = []
    doc_configs = [
        # (vehicle_index, doc_type_code, validity, expiry_offset_days)
        (0, "CARTE_GRISE", ValidityStatus.valid, 365, "manual"),
        (0, "ASSURANCE", ValidityStatus.valid, 120, "manual"),
        (0, "CT", ValidityStatus.expiring_soon, 20, "manual"),
        (0, "VIGNETTE", ValidityStatus.valid, 300, "manual"),
        (1, "CARTE_GRISE", ValidityStatus.valid, 400, "manual"),
        (1, "ASSURANCE", ValidityStatus.expired, -10, "manual"),
        (1, "CT", ValidityStatus.valid, 200, "manual"),
        (2, "CARTE_GRISE", ValidityStatus.valid, 500, "manual"),
        (2, "ASSURANCE", ValidityStatus.expiring_soon, 15, "manual"),
        (2, "CT", ValidityStatus.expired, -30, "manual"),
        (2, "FIMO", ValidityStatus.valid, 250, "manual"),
        (2, "VIGNETTE", ValidityStatus.valid, 180, "manual"),
        (3, "CARTE_GRISE", ValidityStatus.valid, 350, "manual"),
        (3, "ASSURANCE", ValidityStatus.valid, 90, "manual"),
        (3, "CT", ValidityStatus.unknown, None, "manual"),
        (4, "CARTE_GRISE", ValidityStatus.valid, 280, "manual"),
        (4, "ASSURANCE", ValidityStatus.expiring_soon, 8, "manual"),
        (4, "CT", ValidityStatus.valid, 150, "manual"),
        (4, "FIMO", ValidityStatus.valid, 320, "manual"),
        (5, "CARTE_GRISE", ValidityStatus.valid, 600, "manual"),
        (5, "ASSURANCE", ValidityStatus.valid, 340, "manual"),
        (5, "VIGNETTE", ValidityStatus.valid, 290, "manual"),
        (6, "CARTE_GRISE", ValidityStatus.valid, 200, "manual"),
        (6, "ASSURANCE", ValidityStatus.expired, -45, "manual"),
        (7, "CARTE_GRISE", ValidityStatus.valid, 450, "manual"),
        (7, "ASSURANCE", ValidityStatus.valid, 110, "manual"),
        (7, "CT", ValidityStatus.valid, 220, "manual"),
    ]

    for idx, (v_idx, dt_code, validity, expiry_days, ocr_st) in enumerate(doc_configs):
        if v_idx >= len(vehicles):
            continue
        vehicle = vehicles[v_idx]
        doc_type = doc_types[dt_code]
        expiry = days_from_now(expiry_days) if expiry_days is not None else None
        issued = days_ago(180)

        doc = Document(
            file_name=f"{dt_code.lower()}_{vehicle.registration.replace('-', '')}.pdf",
            file_url=f"http://localhost:8000/uploads/demo_{idx}.pdf",
            file_size=240000 + idx * 1000,
            mime_type="application/pdf",
            version=1,
            ocr_status=ocr_st,
            ocr_raw_text=(
                f"Document: {doc_type.name}\nVéhicule: {vehicle.registration}\n"
                if ocr_st == "manual"
                else None
            ),
            ocr_confidence=0.92 if ocr_st == "manual" else None,
            ocr_data=(
                {
                    "document_type": doc_type.name,
                    "registration": vehicle.registration,
                    "expiry_date": expiry.isoformat() if expiry else None,
                }
                if ocr_st == "manual"
                else None
            ),
            validity_status=validity,
            expiry_date=expiry,
            issued_date=issued,
            reference=f"REF-{dt_code}-{idx:03d}",
            document_type_id=doc_type.id,
            vehicle_id=vehicle.id,
            company_id=company.id,
            uploaded_by_id=admin.id,
        )
        db.add(doc)
        documents.append(doc)
    await db.flush()
    print(f"  ✓ {len(documents)} documents créés")

    print("→ Création des alertes...")
    # Génère 12 alertes
    alert_configs = [
        # (vehicle_idx, doc_idx, type, severity, status, message, days_ago)
        (1, 5, AlertType.document_expired, AlertSeverity.critical, AlertStatus.active,
         "Assurance expirée depuis le 10/02/2025 pour DK-2023-CD", 10),
        (2, 8, AlertType.document_expiring, AlertSeverity.warning, AlertStatus.active,
         "Assurance expirant dans 15 jours pour DK-2022-EF", 1),
        (2, 9, AlertType.document_expired, AlertSeverity.critical, AlertStatus.active,
         "Contrôle technique expiré pour DK-2022-EF", 30),
        (3, 14, AlertType.ocr_failed, AlertSeverity.info, AlertStatus.active,
         "OCR en attente pour le contrôle technique de DK-2021-GH", 3),
        (4, 16, AlertType.document_expiring, AlertSeverity.warning, AlertStatus.active,
         "Assurance expirant dans 8 jours pour DK-2020-IJ", 1),
        (6, 23, AlertType.document_expired, AlertSeverity.critical, AlertStatus.active,
         "Assurance expirée depuis 45 jours pour DK-2019-MN", 45),
        (0, 2, AlertType.document_expiring, AlertSeverity.warning, AlertStatus.active,
         "Contrôle technique expirant dans 20 jours pour DK-2024-AB", 2),
        (2, 9, AlertType.compliance_issue, AlertSeverity.critical, AlertStatus.resolved,
         "Véhicule DK-2022-EF non conforme (CT expiré) - résolu", 60),
        (3, None, AlertType.compliance_issue, AlertSeverity.warning, AlertStatus.active,
         "Véhicule DK-2021-GH en maintenance prolongée", 5),
        (6, None, AlertType.compliance_issue, AlertSeverity.critical, AlertStatus.active,
         "Véhicule DK-2019-MN hors service - documents à vérifier", 15),
        (4, 18, AlertType.document_expiring, AlertSeverity.info, AlertStatus.dismissed,
         "FIMO/FCO expirant dans 320 jours pour DK-2020-IJ", 1),
        (2, 10, AlertType.document_expiring, AlertSeverity.info, AlertStatus.active,
         "FIMO/FCO expirant dans 250 jours pour DK-2022-EF", 1),
    ]

    for v_idx, doc_idx, atype, severity, astatus, message, days in alert_configs:
        if v_idx >= len(vehicles):
            continue
        vehicle = vehicles[v_idx]
        doc = documents[doc_idx] if doc_idx is not None and doc_idx < len(documents) else None

        alert = Alert(
            type=atype,
            category=AlertCategory.document if doc_idx is not None else AlertCategory.vehicle,
            severity=severity,
            status=astatus,
            message=message,
            vehicle_id=vehicle.id,
            document_id=doc.id if doc else None,
            company_id=company.id,
            triggered_at=days_ago(days),
            resolved_at=days_ago(days - 5) if astatus == AlertStatus.resolved else None,
            resolved_by_id=admin.id if astatus == AlertStatus.resolved else None,
            resolution_comment="Document renouvelé" if astatus == AlertStatus.resolved else None,
        )
        db.add(alert)
    await db.flush()
    print(f"  ✓ {len(alert_configs)} alertes créées")

    await db.commit()
    return company, admin


# ---------------------------------------------------------------------------
# Entrée principale
# ---------------------------------------------------------------------------


async def main():
    print("=" * 60)
    print("  FleetDocs - Seed de la base de données")
    print("=" * 60)

    # Crée les tables
    print("\n→ Création des tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("  ✓ Tables créées (ou déjà existantes)")

    # Seed
    async with async_session() as db:
        await seed_global_types(db)
        await seed_demo_data(db)

    print("\n" + "=" * 60)
    print("  ✓ Seed terminé avec succès !")
    print("=" * 60)
    print("\nCompte de démonstration :")
    print("  Email     : marie.dupont@transport-dupont.sn")
    print("  Mot de passe : demo")
    print("  Société   : Transport Dupont SARL (Dakar, Sénégal)")
    print("\nDémarrez le serveur :")
    print("  uvicorn app.main:app --reload --port 8000")
    print("  Documentation : http://localhost:8000/docs\n")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
