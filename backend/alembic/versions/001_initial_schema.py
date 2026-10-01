"""001_initial_schema

Initial PostgreSQL schema migration establishing 17 tables conforming to
MASTER/DATABASE_SCHEMA.md and Member 2 Backend Architecture.

Revision ID: 001_initial_schema
Revises:
Create Date: 2026-09-28 00:00:00.000000 UTC

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. facilities
    op.create_table(
        'facilities',
        sa.Column('facility_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('facility_name', sa.String(), nullable=False),
        sa.Column('facility_type', sa.String(), nullable=False),
        sa.Column('location', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('capacity', sa.Numeric(precision=20, scale=6), nullable=True),
        sa.Column('capacity_unit', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='active'),
        sa.Column('provenance', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 2. sensors
    op.create_table(
        'sensors',
        sa.Column('sensor_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('facility_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('facilities.facility_id', ondelete='CASCADE'), nullable=False),
        sa.Column('parameter', sa.String(), nullable=False),
        sa.Column('unit', sa.String(), nullable=False),
        sa.Column('treatment_stage', sa.String(), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='active'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 3. readings
    op.create_table(
        'readings',
        sa.Column('reading_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('facility_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('facilities.facility_id', ondelete='CASCADE'), nullable=False),
        sa.Column('sensor_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('sensors.sensor_id', ondelete='SET NULL'), nullable=True),
        sa.Column('observed_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('treatment_stage', sa.String(), nullable=True),
        sa.Column('parameter', sa.String(), nullable=False),
        sa.Column('value', sa.Numeric(precision=20, scale=6), nullable=True),
        sa.Column('unit', sa.String(), nullable=False),
        sa.Column('source', sa.String(), nullable=False, server_default='telemetry'),
        sa.Column('provenance', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('quality_status', sa.String(), nullable=False, server_default='pending'),
        sa.Column('ingestion_batch_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_readings_facility_observed', 'readings', ['facility_id', 'observed_at'])
    op.create_index('ix_readings_parameter_observed', 'readings', ['parameter', 'observed_at'])
    op.create_index('ix_readings_ingestion_batch', 'readings', ['ingestion_batch_id'])

    # 4. validation_results
    op.create_table(
        'validation_results',
        sa.Column('validation_result_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('reading_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('readings.reading_id', ondelete='CASCADE'), nullable=False),
        sa.Column('quality_status', sa.String(), nullable=False),
        sa.Column('validation_flags', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('validation_version', sa.String(), nullable=False, server_default='1.0.0'),
        sa.Column('validated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_validation_results_reading_id', 'validation_results', ['reading_id'])

    # 5. anomaly_results
    op.create_table(
        'anomaly_results',
        sa.Column('anomaly_result_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('reading_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('readings.reading_id', ondelete='CASCADE'), nullable=False),
        sa.Column('anomaly_status', sa.String(), nullable=False),
        sa.Column('anomaly_score', sa.Numeric(precision=20, scale=10), nullable=True),
        sa.Column('model_version', sa.String(), nullable=False),
        sa.Column('feature_set_version', sa.String(), nullable=False, server_default='v1.0'),
        sa.Column('inference_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('model_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.create_index('ix_anomaly_results_reading_id', 'anomaly_results', ['reading_id'])

    # 6. compliance_rules
    op.create_table(
        'compliance_rules',
        sa.Column('rule_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('parameter', sa.String(), nullable=False),
        sa.Column('operator', sa.String(), nullable=False),
        sa.Column('threshold', sa.Numeric(precision=20, scale=6), nullable=True),
        sa.Column('threshold_min', sa.Numeric(precision=20, scale=6), nullable=True),
        sa.Column('threshold_max', sa.Numeric(precision=20, scale=6), nullable=True),
        sa.Column('threshold_unit', sa.String(), nullable=False),
        sa.Column('facility_scope', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('stage_scope', sa.String(), nullable=True, server_default='final_effluent'),
        sa.Column('effective_from', sa.DateTime(timezone=True), nullable=False),
        sa.Column('effective_to', sa.DateTime(timezone=True), nullable=True),
        sa.Column('rule_version', sa.String(), nullable=False, server_default='1.0.0'),
        sa.Column('source_reference', sa.String(), nullable=False, server_default='CPCB_2021'),
        sa.Column('active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 7. signing_keys
    op.create_table(
        'signing_keys',
        sa.Column('key_id', sa.String(), primary_key=True),
        sa.Column('algorithm', sa.String(), nullable=False, server_default='ES256'),
        sa.Column('curve', sa.String(), nullable=False, server_default='P-256'),
        sa.Column('public_key', sa.String(), nullable=False),
        sa.Column('fingerprint', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='active'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
    )

    # 8. treatment_records
    op.create_table(
        'treatment_records',
        sa.Column('record_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('facility_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('facilities.facility_id', ondelete='CASCADE'), nullable=False),
        sa.Column('period_start', sa.DateTime(timezone=True), nullable=False),
        sa.Column('period_end', sa.DateTime(timezone=True), nullable=False),
        sa.Column('record_version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('record_state', sa.String(), nullable=False, server_default='draft'),
        sa.Column('quality_status', sa.String(), nullable=False, server_default='pending'),
        sa.Column('anomaly_status', sa.String(), nullable=False, server_default='pending'),
        sa.Column('compliance_status', sa.String(), nullable=False, server_default='pending'),
        sa.Column('provenance', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('evidence_snapshot', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('certificate_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('canonical_hash', sa.String(length=64), nullable=True),
        sa.Column('signature_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('anchor_status', sa.String(), nullable=False, server_default='not_required'),
        sa.Column('supersedes_record_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('treatment_records.record_id', ondelete='RESTRICT'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('finalized_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_treatment_records_facility_period', 'treatment_records', ['facility_id', 'period_start', 'period_end'])
    op.create_index('ix_treatment_records_canonical_hash', 'treatment_records', ['canonical_hash'])

    # 9. compliance_results
    op.create_table(
        'compliance_results',
        sa.Column('compliance_result_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('treatment_record_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('treatment_records.record_id', ondelete='CASCADE'), nullable=False),
        sa.Column('compliance_status', sa.String(), nullable=False),
        sa.Column('rule_version', sa.String(), nullable=False, server_default='1.0.0'),
        sa.Column('parameter_results', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('evaluated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_compliance_results_record_id', 'compliance_results', ['treatment_record_id'])

    # 10. certificates
    op.create_table(
        'certificates',
        sa.Column('certificate_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('record_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('treatment_records.record_id', ondelete='CASCADE'), unique=True, nullable=False),
        sa.Column('certificate_version', sa.String(), nullable=False, server_default='1.0.0'),
        sa.Column('issuer_identity', sa.String(), nullable=False),
        sa.Column('issued_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('compliance_summary', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('canonical_hash', sa.String(length=64), nullable=False),
        sa.Column('signature_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('dlt_anchor_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='valid'),
    )
    op.create_index('ix_certificates_canonical_hash', 'certificates', ['canonical_hash'])

    # 11. cryptographic_artifacts
    op.create_table(
        'cryptographic_artifacts',
        sa.Column('signature_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('record_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('treatment_records.record_id', ondelete='RESTRICT'), unique=True, nullable=False),
        sa.Column('canonicalization_version', sa.String(), nullable=False, server_default='atc-v1'),
        sa.Column('hash_algorithm', sa.String(), nullable=False, server_default='SHA-256'),
        sa.Column('canonical_hash', sa.String(length=64), nullable=False),
        sa.Column('signature_algorithm', sa.String(), nullable=False, server_default='ES256'),
        sa.Column('signature_value', sa.String(), nullable=False),
        sa.Column('key_id', sa.String(), sa.ForeignKey('signing_keys.key_id', ondelete='RESTRICT'), nullable=False),
        sa.Column('signed_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_crypto_artifacts_canonical_hash', 'cryptographic_artifacts', ['canonical_hash'])

    # 12. dlt_anchors
    op.create_table(
        'dlt_anchors',
        sa.Column('anchor_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('record_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('treatment_records.record_id', ondelete='RESTRICT'), unique=True, nullable=False),
        sa.Column('certificate_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('certificates.certificate_id', ondelete='SET NULL'), nullable=True),
        sa.Column('facility_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('facilities.facility_id', ondelete='CASCADE'), nullable=False),
        sa.Column('event_timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('canonical_hash', sa.String(length=64), nullable=False),
        sa.Column('compliance_status', sa.String(), nullable=False),
        sa.Column('signature_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('network_reference', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('transaction_id', sa.String(), nullable=True),
        sa.Column('anchor_status', sa.String(), nullable=False, server_default='pending'),
        sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('confirmed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('failure_code', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_dlt_anchors_canonical_hash', 'dlt_anchors', ['canonical_hash'])
    op.create_index('ix_dlt_anchors_transaction_id', 'dlt_anchors', ['transaction_id'])

    # 13. corrections
    op.create_table(
        'corrections',
        sa.Column('correction_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('original_record_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('treatment_records.record_id', ondelete='RESTRICT'), nullable=False),
        sa.Column('requested_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('authorized_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('reason', sa.String(), nullable=False),
        sa.Column('proposed_changes', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='pending'),
        sa.Column('corrected_record_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('treatment_records.record_id', ondelete='RESTRICT'), nullable=True),
        sa.Column('new_certificate_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('new_hash', sa.String(length=64), nullable=True),
        sa.Column('new_signature_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('new_dlt_anchor_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('authorized_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_corrections_original_record', 'corrections', ['original_record_id'])

    # 14. audit_logs
    op.create_table(
        'audit_logs',
        sa.Column('audit_log_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('actor_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('actor_role', sa.String(), nullable=True),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('resource_type', sa.String(), nullable=False),
        sa.Column('resource_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('request_id', sa.String(), nullable=True),
        sa.Column('outcome', sa.String(), nullable=False, server_default='success'),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_audit_logs_action_created', 'audit_logs', ['action', 'created_at'])
    op.create_index('ix_audit_logs_resource', 'audit_logs', ['resource_type', 'resource_id'])

    # 15. users
    op.create_table(
        'users',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('username', sa.String(), unique=True, nullable=False),
        sa.Column('email', sa.String(), unique=True, nullable=True),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('role', sa.String(), nullable=False, server_default='operator'),
        sa.Column('external_subject', sa.String(), unique=True, nullable=True),
        sa.Column('display_name', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='active'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_users_username', 'users', ['username'])
    op.create_index('ix_users_role', 'users', ['role'])

    # 16. experiment_runs
    op.create_table(
        'experiment_runs',
        sa.Column('experiment_run_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('experiment_name', sa.String(), nullable=False),
        sa.Column('architecture_variant', sa.String(), nullable=False),
        sa.Column('workload_size', sa.Integer(), nullable=False),
        sa.Column('scenario_id', sa.String(), nullable=True),
        sa.Column('environment_snapshot', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('seed', sa.Integer(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('ended_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='running'),
    )

    # 17. experiment_metrics
    op.create_table(
        'experiment_metrics',
        sa.Column('metric_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('experiment_run_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('experiment_runs.experiment_run_id', ondelete='CASCADE'), nullable=False),
        sa.Column('metric_name', sa.String(), nullable=False),
        sa.Column('metric_value', sa.Numeric(precision=20, scale=6), nullable=False),
        sa.Column('unit', sa.String(), nullable=False),
        sa.Column('percentile', sa.String(), nullable=True),
        sa.Column('sample_count', sa.Integer(), nullable=True),
        sa.Column('measurement_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.create_index('ix_experiment_metrics_run_id', 'experiment_metrics', ['experiment_run_id'])


def downgrade() -> None:
    op.drop_table('experiment_metrics')
    op.drop_table('experiment_runs')
    op.drop_table('users')
    op.drop_table('audit_logs')
    op.drop_table('corrections')
    op.drop_table('dlt_anchors')
    op.drop_table('cryptographic_artifacts')
    op.drop_table('certificates')
    op.drop_table('compliance_results')
    op.drop_table('treatment_records')
    op.drop_table('signing_keys')
    op.drop_table('compliance_rules')
    op.drop_table('anomaly_results')
    op.drop_table('validation_results')
    op.drop_table('readings')
    op.drop_table('sensors')
    op.drop_table('facilities')
