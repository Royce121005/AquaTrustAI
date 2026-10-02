"""AquaTrust AI — Import All 125 CPCB UP Treatment Facilities.

Reads datasets/processed/DATASET_04_CPCB_UP_STP/cpcb_up_stp_processed.csv
and imports all 125 official CPCB sewage treatment facilities into PostgreSQL.
Preserves existing UUIDs and foreign-key integrity for Bharwara, Jajmau, and Dinapur.
"""

import os
import sys
import uuid
from decimal import Decimal
import pandas as pd
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import sessionmaker

# Ensure paths
repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
for p in [repo_root, backend_root]:
    if p not in sys.path:
        sys.path.insert(0, p)

from app.models.facility import Facility
from app.db.base import utc_now

# Canonical anchor plant UUIDs to maintain strict foreign key integrity
CANONICAL_ANCHORS = {
    "STP_UP_LUCKNOW_045": uuid.UUID("085a9719-c9d0-4562-b4d7-bc389dec12b3"),
    "STP_UP_KANPUR_014": uuid.UUID("13000000-0000-0000-0000-000000000014"),
    "STP_UP_VARANASI_032": uuid.UUID("14000000-0000-0000-0000-000000000032"),
}


def import_facilities(db_url: str):
    """Import all 125 CPCB facilities into the target database."""
    print(f"\n[INFO] Connecting to database...")
    engine = create_engine(db_url, pool_pre_ping=True)
    Session = sessionmaker(bind=engine)
    session = Session()

    csv_path = os.path.join(
        repo_root,
        "datasets",
        "processed",
        "DATASET_04_CPCB_UP_STP",
        "cpcb_up_stp_processed.csv",
    )
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Processed CSV not found at: {csv_path}")

    df = pd.read_csv(csv_path)
    print(f"[INFO] Loaded {len(df)} records from {csv_path}")

    # Fetch existing facility IDs
    existing_facilities = {
        f.facility_id: f for f in session.query(Facility).all()
    }
    print(f"[INFO] Currently registered facilities in database: {len(existing_facilities)}")

    inserted_count = 0
    updated_count = 0

    for idx, row in df.iterrows():
        cpcb_id = str(row["facility_id"]).strip()

        # Deterministic UUID mapping
        if cpcb_id in CANONICAL_ANCHORS:
            fac_id = CANONICAL_ANCHORS[cpcb_id]
        else:
            fac_id = uuid.uuid5(uuid.NAMESPACE_DNS, f"aquatrust.facility.{cpcb_id}")

        # Clean facility name
        raw_name = row.get("stp_name")
        if pd.isna(raw_name) or not str(raw_name).strip():
            if idx == 24:
                facility_name = "20 MLD STP Naini (Unit 2)"
            elif idx == 46:
                facility_name = "56 MLD STP Daulatganj (Unit 2)"
            else:
                facility_name = f"CPCB STP {cpcb_id}"
        else:
            facility_name = str(raw_name).strip()

        # Clean city / district
        raw_city = row.get("city_town_district")
        if pd.isna(raw_city) or not str(raw_city).strip():
            if idx == 24:
                city = "Prayagraj"
            elif idx == 46:
                city = "Lucknow"
            else:
                city = "Uttar Pradesh"
        else:
            city = str(raw_city).strip()

        # Clean capacity
        raw_cap = row.get("installed_capacity_mld")
        try:
            if pd.isna(raw_cap) or float(raw_cap) <= 0:
                capacity = None
            else:
                capacity = Decimal(str(round(float(raw_cap), 4)))
        except (ValueError, TypeError):
            capacity = None

        # Clean technology & river catchment
        raw_tech = row.get("technology_process")
        technology = str(raw_tech).strip() if pd.notna(raw_tech) and str(raw_tech).strip() else "Municipal Treatment"

        raw_catchment = row.get("river_catchment")
        catchment = str(raw_catchment).strip() if pd.notna(raw_catchment) and str(raw_catchment).strip() else "Ganga Basin"

        raw_receiving = row.get("receiving_water_body")
        receiving = str(raw_receiving).strip() if pd.notna(raw_receiving) and str(raw_receiving).strip() else None

        raw_phase = row.get("ganga_phase")
        ganga_phase = str(raw_phase).strip() if pd.notna(raw_phase) and str(raw_phase).strip() else None

        raw_year = row.get("year_of_commissioning")
        year = str(raw_year).strip() if pd.notna(raw_year) and str(raw_year).strip() else None

        raw_om = row.get("om_authority")
        om_authority = str(raw_om).strip() if pd.notna(raw_om) and str(raw_om).strip() else None

        location = {
            "city": city,
            "state": "UP",
            "country": "India",
            "river_catchment": catchment,
            "receiving_water_body": receiving,
        }

        provenance = {
            "cpcb_id": cpcb_id,
            "technology": technology,
            "om_authority": om_authority,
            "ganga_phase": ganga_phase,
            "year_of_commissioning": year,
            "dataset_source": "DATASET_04_CPCB_UP_STP",
            "provenance_id": str(row.get("provenance_id", "")),
        }

        if fac_id in existing_facilities:
            # Update metadata if needed without touching relationships
            fac = existing_facilities[fac_id]
            fac.status = "active"
            updated_count += 1
        else:
            new_fac = Facility(
                facility_id=fac_id,
                facility_name=facility_name,
                facility_type="municipal_stp",
                location=location,
                capacity=capacity,
                capacity_unit="MLD",
                status="active",
                provenance=provenance,
                created_at=utc_now(),
                updated_at=utc_now(),
            )
            session.add(new_fac)
            inserted_count += 1

    session.commit()

    total_now = session.query(Facility).count()
    print(f"[SUCCESS] Facilities import completed:")
    print(f"  - Newly inserted: {inserted_count}")
    print(f"  - Already registered: {updated_count}")
    print(f"  - Total facilities in DB: {total_now}")
    session.close()


if __name__ == "__main__":
    db_target = sys.argv[1] if len(sys.argv) > 1 else os.getenv("DATABASE_URL")
    if not db_target:
        from app.core.config import get_settings
        db_target = get_settings().DATABASE_URL

    import_facilities(db_target)
