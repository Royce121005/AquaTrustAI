"""003_member2_intelligence_schema

Alembic migration for Member 2 deliverables:
1. Adds sensor calibration and drift tracking fields to sensors table.
2. Creates predictions table for downstream effluent forecasting.
3. Creates recommendations table for prescriptive process actions.

Revision ID: 003_member2_intelligence_schema
Revises: 002_digital_twin_schema
Create Date: 2026-11-17 00:00:00.000000 UTC
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '003_member2_intelligence_schema'
down_revision: Union[str, None] = '002_digital_twin_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == 'postgresql'
    json_type = postgresql.JSONB(astext_type=sa.Text()) if is_postgres else sa.JSON()
    uuid_type = postgresql.UUID(as_uuid=True) if is_postgres else sa.String(36)

    # 1. Alter sensors table
    op.add_column('sensors', sa.Column('last_calibrated_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('sensors', sa.Column('calibration_status', sa.String(32), nullable=False, server_default='calibrated'))
    op.add_column('sensors', sa.Column('drift_flag', sa.Boolean(), nullable=False, server_default='false'))

    # 2. Create predictions table
    op.create_table(
        'predictions',
        sa.Column('prediction_id', uuid_type, primary_key=True),
        sa.Column('facility_id', uuid_type, sa.ForeignKey('facilities.facility_id', ondelete='CASCADE'), nullable=False),
        sa.Column('treatment_stage', sa.String(64), nullable=False, server_default='effluent'),
        sa.Column('cycle_timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('horizon_hours', sa.Float(), nullable=False, server_default='6.0'),
        sa.Column('predicted_parameters', json_type, nullable=False),
        sa.Column('overall_risk_status', sa.String(32), nullable=False, server_default='LOW_RISK'),
        sa.Column('overall_risk_score', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('is_cpcb_compliant', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('model_version', sa.String(64), nullable=False, server_default='treatment_predictor_v1.0.0'),
        sa.Column('summary_explanation', sa.Text(), nullable=True),
        sa.Column('metadata', json_type, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_predictions_facility_timestamp', 'predictions', ['facility_id', 'cycle_timestamp'])

    # 3. Create recommendations table
    op.create_table(
        'recommendations',
        sa.Column('recommendation_id', uuid_type, primary_key=True),
        sa.Column('facility_id', uuid_type, sa.ForeignKey('facilities.facility_id', ondelete='CASCADE'), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('action', sa.Text(), nullable=False),
        sa.Column('category', sa.String(64), nullable=False, server_default='AERATION'),
        sa.Column('severity', sa.String(32), nullable=False, server_default='MEDIUM'),
        sa.Column('urgency', sa.String(32), nullable=False, server_default='WITHIN_1_HOUR'),
        sa.Column('related_parameter', sa.String(64), nullable=False, server_default='general'),
        sa.Column('trigger_source', sa.String(64), nullable=False, server_default='AI_INFERENCE'),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('parameter_target', json_type, nullable=True),
        sa.Column('estimated_impact', sa.Text(), nullable=True),
        sa.Column('status', sa.String(32), nullable=False, server_default='active'),
        sa.Column('applied_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('applied_by', uuid_type, nullable=True),
        sa.Column('metadata', json_type, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_recommendations_facility_status', 'recommendations', ['facility_id', 'status'])


def downgrade() -> None:
    op.drop_index('ix_recommendations_facility_status', table_name='recommendations')
    op.drop_table('recommendations')

    op.drop_index('ix_predictions_facility_timestamp', table_name='predictions')
    op.drop_table('predictions')

    op.drop_column('sensors', 'drift_flag')
    op.drop_column('sensors', 'calibration_status')
    op.drop_column('sensors', 'last_calibrated_at')
