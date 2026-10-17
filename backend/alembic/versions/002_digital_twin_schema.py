"""002_digital_twin_schema

Alembic migration adding persistent digital twin state, transitions, scenarios,
scenario comparative results, process model registry, and predictions/recommendations.

Revision ID: 002_digital_twin_schema
Revises: 001_initial_schema
Create Date: 2026-10-17 00:00:00.000000 UTC
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '002_digital_twin_schema'
down_revision: Union[str, None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. twin_configurations
    op.create_table(
        'twin_configurations',
        sa.Column('config_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('facility_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('facilities.facility_id', ondelete='CASCADE'), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('facility_profile_version', sa.String(), nullable=False, server_default='profile-v1.0'),
        sa.Column('technology_type', sa.String(), nullable=False, server_default='activated_sludge'),
        sa.Column('treatment_stages', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('sensors_config', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('operating_variables', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('model_version', sa.String(), nullable=False, server_default='aquatrust-process-v1.0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('facility_id', 'version', name='uq_twin_configs_facility_version'),
    )
    op.create_index('ix_twin_configs_facility_active', 'twin_configurations', ['facility_id', 'is_active'])

    # 2. twin_states
    op.create_table(
        'twin_states',
        sa.Column('state_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('facility_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('facilities.facility_id', ondelete='CASCADE'), nullable=False),
        sa.Column('state_version', sa.Integer(), nullable=False),
        sa.Column('observed_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('source_mode', sa.String(), nullable=False, server_default='simulation'),
        sa.Column('facility_profile_version', sa.String(), nullable=False, server_default='profile-v1.0'),
        sa.Column('stage_states', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('sensor_states', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('latest_observations', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('last_accepted_observation_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('latest_received_observation_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('data_quality', sa.String(), nullable=False, server_default='valid'),
        sa.Column('state_freshness', sa.String(), nullable=False, server_default='fresh'),
        sa.Column('process_model_version', sa.String(), nullable=False, server_default='aquatrust-process-v1.0'),
        sa.Column('last_processed_reading_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('readings.reading_id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('facility_id', 'state_version', name='uq_twin_states_facility_version'),
    )
    op.create_index('ix_twin_states_facility_observed', 'twin_states', ['facility_id', 'observed_at'])
    op.create_index('ix_twin_states_facility_version', 'twin_states', ['facility_id', 'state_version'])

    # 3. twin_state_events
    op.create_table(
        'twin_state_events',
        sa.Column('event_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('facility_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('facilities.facility_id', ondelete='CASCADE'), nullable=False),
        sa.Column('reading_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('readings.reading_id', ondelete='SET NULL'), nullable=True),
        sa.Column('previous_state_version', sa.Integer(), nullable=True),
        sa.Column('new_state_version', sa.Integer(), nullable=False),
        sa.Column('event_type', sa.String(), nullable=False),
        sa.Column('event_payload', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_twin_events_facility_version', 'twin_state_events', ['facility_id', 'new_state_version'])
    op.create_index('ix_twin_events_reading', 'twin_state_events', ['reading_id'])

    # 4. twin_model_versions
    op.create_table(
        'twin_model_versions',
        sa.Column('model_version_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('model_name', sa.String(), nullable=False),
        sa.Column('model_type', sa.String(), nullable=False),
        sa.Column('version', sa.String(), nullable=False),
        sa.Column('configuration_hash', sa.String(), nullable=False),
        sa.Column('parameters', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('validation_status', sa.String(), nullable=False, server_default='validated'),
        sa.Column('validation_metrics', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('model_name', 'version', name='uq_twin_models_name_version'),
    )
    op.create_index('ix_twin_models_hash', 'twin_model_versions', ['configuration_hash'])

    # 5. twin_scenarios
    op.create_table(
        'twin_scenarios',
        sa.Column('scenario_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('facility_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('facilities.facility_id', ondelete='CASCADE'), nullable=False),
        sa.Column('base_state_version', sa.Integer(), nullable=False),
        sa.Column('scenario_type', sa.String(), nullable=False),
        sa.Column('scenario_name', sa.String(), nullable=False),
        sa.Column('parameters', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), nullable=False, server_default='120'),
        sa.Column('time_step_seconds', sa.Integer(), nullable=False, server_default='900'),
        sa.Column('random_seed', sa.Integer(), nullable=True, server_default='42'),
        sa.Column('status', sa.String(), nullable=False, server_default='pending'),
        sa.Column('error_details', sa.String(), nullable=True),
        sa.Column('model_version', sa.String(), nullable=False, server_default='aquatrust-process-v1.0'),
        sa.Column('created_by', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_twin_scenarios_facility', 'twin_scenarios', ['facility_id'])
    op.create_index('ix_twin_scenarios_status', 'twin_scenarios', ['status'])

    # 6. twin_scenario_results
    op.create_table(
        'twin_scenario_results',
        sa.Column('result_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('scenario_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('twin_scenarios.scenario_id', ondelete='CASCADE'), nullable=False),
        sa.Column('step_index', sa.Integer(), nullable=False),
        sa.Column('simulation_timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('treatment_stage', sa.String(), nullable=False),
        sa.Column('parameter', sa.String(), nullable=False),
        sa.Column('baseline_value', sa.Numeric(precision=20, scale=6), nullable=True),
        sa.Column('scenario_value', sa.Numeric(precision=20, scale=6), nullable=True),
        sa.Column('unit', sa.String(), nullable=False),
        sa.Column('estimated_compliance_status', sa.String(), nullable=False, server_default='compliant'),
        sa.Column('uncertainty_interval', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('data_origin', sa.String(), nullable=False, server_default='simulated'),
    )
    op.create_index('ix_twin_scen_res_scen_step', 'twin_scenario_results', ['scenario_id', 'step_index'])
    op.create_index('ix_twin_scen_res_scen_stage', 'twin_scenario_results', ['scenario_id', 'treatment_stage'])

    # 7. twin_predictions
    op.create_table(
        'twin_predictions',
        sa.Column('prediction_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('facility_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('facilities.facility_id', ondelete='CASCADE'), nullable=False),
        sa.Column('base_state_version', sa.Integer(), nullable=False),
        sa.Column('model_version', sa.String(), nullable=False),
        sa.Column('horizon_hours', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('predicted_values', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('uncertainty_bounds', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('input_features', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='ready'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_twin_predictions_facility_version', 'twin_predictions', ['facility_id', 'base_state_version'])

    # 8. twin_recommendations
    op.create_table(
        'twin_recommendations',
        sa.Column('recommendation_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('facility_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('facilities.facility_id', ondelete='CASCADE'), nullable=False),
        sa.Column('scenario_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('twin_scenarios.scenario_id', ondelete='SET NULL'), nullable=True),
        sa.Column('recommendation_type', sa.String(), nullable=False),
        sa.Column('priority', sa.String(), nullable=False, server_default='review'),
        sa.Column('evidence', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('suggested_action', sa.String(), nullable=False),
        sa.Column('expected_outcome', sa.String(), nullable=True),
        sa.Column('limitations', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('requires_human_review', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('status', sa.String(), nullable=False, server_default='active'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_twin_rec_facility_status', 'twin_recommendations', ['facility_id', 'status'])


def downgrade() -> None:
    op.drop_table('twin_recommendations')
    op.drop_table('twin_predictions')
    op.drop_table('twin_scenario_results')
    op.drop_table('twin_scenarios')
    op.drop_table('twin_model_versions')
    op.drop_table('twin_state_events')
    op.drop_table('twin_states')
    op.drop_table('twin_configurations')
