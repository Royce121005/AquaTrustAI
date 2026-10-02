export type AnyRecord = Record<string, unknown>;
export type User = { username: string; role: string; user_id: string; facility_id?: string | null };
export type Facility = { facility_id: string; facility_name: string; facility_type: string; location?: AnyRecord; status: string };
export type Reading = { reading_id: string; facility_id: string; observed_at: string; treatment_stage?: string | null; parameter: string; value: number | null; unit: string; source: string; quality_status: string; anomaly_status?: string | null; anomaly_score?: number | null };
export type TreatmentRecord = { record_id: string; facility_id: string; period_start: string; period_end: string; record_version: number; record_state: string; quality_status: string; anomaly_status: string; compliance_status: string; canonical_hash?: string | null; certificate_id?: string | null; signature_id?: string | null; anchor_status: string; supersedes_record_id?: string | null; provenance?: AnyRecord; evidence_snapshot?: AnyRecord; created_at: string; finalized_at?: string | null };
export type Anchor = { anchor_id: string; record_id: string; facility_id: string; canonical_hash: string; compliance_status: string; anchor_status: string; transaction_id?: string | null; network_reference?: AnyRecord | null; created_at: string; anchored_at?: string | null };
export type DatasetRow = Record<string, string>;
export type DatasetInfo = { id: string; title: string; description: string; url: string; source: string };
