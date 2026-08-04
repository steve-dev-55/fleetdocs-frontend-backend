"""Routeur Exports : PDF (fiche véhicule) et Excel/CSV (flotte)."""
import csv
import io
from datetime import datetime, timezone
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_company
from app.models import Company, Document, Vehicle, VehicleStatus

router = APIRouter(prefix="/api/exports", tags=["Exports"])


# ---------------------------------------------------------------------------
# PDF fiche véhicule (génère un PDF simple sans dépendance externe)
# ---------------------------------------------------------------------------


@router.post("/vehicle-pdf/{vehicle_id}")
async def export_vehicle_pdf(
    vehicle_id: UUID,
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Génère un PDF de la fiche véhicule (format simplifié).

    Note : pour une production réelle, installez `reportlab` ou `weasyprint`.
    Ici on génère un PDF minimaliste à la main.
    """
    result = await db.execute(
        select(Vehicle).where(
            Vehicle.id == vehicle_id, Vehicle.company_id == company.id
        )
    )
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Véhicule introuvable.",
        )

    docs_result = await db.execute(
        select(Document).where(Document.vehicle_id == vehicle.id)
    )
    documents = docs_result.scalars().all()

    # Génère un PDF minimaliste (structure valide PDF 1.4)
    pdf_content = _generate_simple_pdf(vehicle, company, documents)

    filename = f"fiche-vehicule-{vehicle.registration}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_content),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _generate_simple_pdf(
    vehicle: Vehicle, company: Company, documents: List[Document]
) -> bytes:
    """Génère un PDF minimaliste valide (sans bibliothèque externe).

    Ce PDF contient le texte de la fiche véhicule. Pour un rendu riche,
    utilisez reportlab ou weasyprint en production.
    """
    lines = [
        f"FleetDocs - Fiche Vehicule",
        f"",
        f"Societe : {company.name}",
        f"Date : {datetime.now(timezone.utc).strftime('%d/%m/%Y')}",
        f"",
        f"IMMATRICULATION : {vehicle.registration}",
        f"Marque : {vehicle.brand or '-'}",
        f"Modele : {vehicle.model or '-'}",
        f"Annee : {vehicle.year or '-'}",
        f"VIN : {vehicle.vin or '-'}",
        f"PTAC : {vehicle.ptac_kg or '-'} kg",
        f"Statut : {vehicle.status.value}",
        f"Kilometrage : {vehicle.mileage or '-'} km",
        f"Carburant : {vehicle.fuel_type or '-'}",
        f"Couleur : {vehicle.color or '-'}",
        f"",
        f"DOCUMENTS ({len(documents)}) :",
    ]
    for d in documents:
        lines.append(
            f"  - {d.file_name} | {d.validity_status.value} | "
            f"expire le {d.expiry_date.strftime('%d/%m/%Y') if d.expiry_date else '-'}"
        )

    # Encode en PDF simple
    content = "\n".join(lines)
    pdf = _build_pdf(content)
    return pdf


def _build_pdf(text: str) -> bytes:
    """Construit un fichier PDF minimaliste contenant le texte donné."""
    # Échappe les parenthèses pour la syntaxe PDF
    escaped = text.replace("\\", r"\\").replace("(", r"\(").replace(")", r"\)")
    lines = escaped.split("\n")

    # Construit les objets PDF
    objects = []
    # Objet 1 : Catalog
    objects.append(b"<< /Type /Catalog /Pages 2 0 R >>")
    # Objet 2 : Pages
    objects.append(b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>")
    # Objet 3 : Page
    objects.append(
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
        b"/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>"
    )
    # Objet 4 : Contents (flux de texte)
    content_lines = ["BT", "/F1 10 Tf", "50 800 Td", "14 TL"]
    for line in lines:
        content_lines.append(f"({line}) Tj")
        content_lines.append("T*")
    content_lines.append("ET")
    content_stream = "\n".join(content_lines).encode("latin-1", errors="replace")
    objects.append(
        f"<< /Length {len(content_stream)} >>\nstream\n".encode("latin-1")
        + content_stream
        + b"\nendstream"
    )
    # Objet 5 : Font
    objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")

    # Assemble le PDF
    pdf = bytearray(b"%PDF-1.4\n")
    offsets = []
    for i, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf += f"{i} 0 obj\n".encode()
        pdf += obj
        pdf += b"\nendobj\n"

    # Table xref
    xref_offset = len(pdf)
    pdf += b"xref\n"
    pdf += f"0 {len(objects) + 1}\n".encode()
    pdf += b"0000000000 65535 f \n"
    for offset in offsets:
        pdf += f"{offset:010d} 00000 n \n".encode()

    pdf += b"trailer\n"
    pdf += f"<< /Size {len(objects) + 1} /Root 1 0 R >>\n".encode()
    pdf += b"startxref\n"
    pdf += f"{xref_offset}\n".encode()
    pdf += b"%%EOF\n"

    return bytes(pdf)


# ---------------------------------------------------------------------------
# Excel / CSV flotte
# ---------------------------------------------------------------------------


@router.post("/fleet-excel")
async def export_fleet_excel(
    company: Company = Depends(get_current_company),
    db: AsyncSession = Depends(get_db),
):
    """Exporte la flotte au format CSV (compatible Excel)."""
    result = await db.execute(
        select(Vehicle).where(Vehicle.company_id == company.id)
        .order_by(Vehicle.registration.asc())
    )
    vehicles = result.scalars().all()

    # Compte les documents par véhicule
    output = io.StringIO()
    # BOM UTF-8 pour Excel
    output.write("\ufeff")
    writer = csv.writer(output, delimiter=";")
    writer.writerow(
        [
            "Immatriculation",
            "Marque",
            "Modele",
            "Annee",
            "VIN",
            "PTAC (kg)",
            "Statut",
            "Kilometrage",
            "Carburant",
            "Couleur",
            "Nombre documents",
            "Documents expires",
            "Date creation",
        ]
    )

    for v in vehicles:
        docs_result = await db.execute(
            select(Document).where(Document.vehicle_id == v.id)
        )
        docs = docs_result.scalars().all()
        expired = sum(1 for d in docs if d.validity_status.value == "expired")

        writer.writerow(
            [
                v.registration,
                v.brand or "",
                v.model or "",
                v.year or "",
                v.vin or "",
                v.ptac_kg or "",
                v.status.value,
                v.mileage or "",
                v.fuel_type or "",
                v.color or "",
                len(docs),
                expired,
                v.created_at.strftime("%d/%m/%Y") if v.created_at else "",
            ]
        )

    filename = f"flotte-{company.name.replace(' ', '-')}-{datetime.now().strftime('%Y%m%d')}.csv"
    content = output.getvalue().encode("utf-8")
    return StreamingResponse(
        io.BytesIO(content),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "text/csv; charset=utf-8",
        },
    )
