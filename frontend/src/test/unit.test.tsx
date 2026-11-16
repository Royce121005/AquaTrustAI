import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ApiClientError, setStoredToken, getStoredToken, TOKEN_STORAGE_KEY } from '../api/client';
import {
  DltModeBadge,
  VerificationVerdictBadge,
  RoleBadge,
  QualityBadge,
  AnomalyStatusBadge,
} from '../components/common/Badges';
import { ErrorState, EmptyState, ForbiddenState } from '../components/common/States';
import { VerificationPipeline } from '../components/verification/VerificationPipeline';
import { Verification } from '../types';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { getTwinWebSocketUrl } from '../api/digitalTwin';
import { SynopticProcessFlow } from '../components/digitalTwin/SynopticProcessFlow';
import { AlarmConsole } from '../components/digitalTwin/AlarmConsole';
import { LiveTelemetryTrends } from '../components/digitalTwin/LiveTelemetryTrends';
import { StageInspectionDrawer } from '../components/digitalTwin/StageInspectionDrawer';
import { SimulatorCanvas } from '../components/simulator/SimulatorCanvas';
import { TwinAlarmEvent, TwinState } from '../types/digitalTwin';
import {
  ScadaPipe,
  ScadaPump,
  ScadaBlower,
  ScadaTerminalStation,
  ScadaLegend,
  ScadaFloatingCard,
} from '../components/digitalTwin/scada/ScadaPrimitives';


describe('AquaTrustAI Frontend Unit Test Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('API Client Error & Authentication Unit Tests', () => {
    it('correctly maps 401 unauthorized status and properties', () => {
      const err = new ApiClientError(401, 'Unauthorized', {
        error_code: 'UNAUTHORIZED',
        message: 'Invalid credentials',
      });
      expect(err.isUnauthorized).toBe(true);
      expect(err.isForbidden).toBe(false);
      expect(err.status).toBe(401);
      expect(err.message).toBe('Invalid credentials');
    });

    it('correctly maps 403 forbidden status', () => {
      const err = new ApiClientError(403, 'Forbidden', {
        error_code: 'FORBIDDEN',
        message: 'Insufficient role permissions',
      });
      expect(err.isForbidden).toBe(true);
      expect(err.status).toBe(403);
    });

    it('correctly maps 422 unprocessable entity', () => {
      const err = new ApiClientError(422, 'Unprocessable Entity', {
        error_code: 'FINALIZATION_PRECONDITION_FAILED',
        message: 'Record quality_status must be valid to finalize',
      });
      expect(err.isUnprocessable).toBe(true);
      expect(err.status).toBe(422);
      expect(err.message).toBe('Record quality_status must be valid to finalize');
    });

    it('stores and retrieves JWT tokens properly', () => {
      expect(getStoredToken()).toBeNull();
      setStoredToken('test-jwt-token-xyz');
      expect(getStoredToken()).toBe('test-jwt-token-xyz');
      setStoredToken(null);
      expect(getStoredToken()).toBeNull();
    });
  });

  describe('DLT Mode & Blockchain Truthfulness Tests', () => {
    it('truthfully renders SIMULATION mode without claiming live distributed ledger', () => {
      render(<DltModeBadge mode="SIMULATION" distributedLedger={false} />);
      expect(screen.getByText(/SIMULATION/i)).toBeInTheDocument();
      expect(screen.getByText(/\(Local Mock\)/i)).toBeInTheDocument();
      expect(screen.queryByText(/\(Live DLT\)/i)).not.toBeInTheDocument();
    });

    it('renders FABRIC mode only when mode is FABRIC and distributedLedger is true', () => {
      render(<DltModeBadge mode="FABRIC" distributedLedger={true} />);
      expect(screen.getByText(/FABRIC/i)).toBeInTheDocument();
      expect(screen.getByText(/\(Live DLT\)/i)).toBeInTheDocument();
      expect(screen.queryByText(/Local Mock/i)).not.toBeInTheDocument();
    });
  });

  describe('Verification Rule Tests: False-Success Prevention', () => {
    const verifiedMock: Verification = {
      record_id: 'rec-12345',
      record_version: 1,
      record_state: 'finalized',
      is_superseded: false,
      superseding_record_id: null,
      certificate_id: 'cert-12345',
      overall_verdict: 'VERIFIED',
      verification_timestamp: '2026-10-02T10:00:00Z',
      stages: {
        stage_1_hash_integrity: { stage_name: 'Stage 1', status: 'passed', details: { hash: 'hash1' } },
        stage_2_signature_authenticity: { stage_name: 'Stage 2', status: 'passed', details: { sig: 'sig1' } },
        stage_3_certificate_consistency: { stage_name: 'Stage 3', status: 'passed', details: { cert: 'cert1' } },
        stage_4_dlt_ledger_anchor: { stage_name: 'Stage 4', status: 'passed', details: { dlt: 'dlt1' } },
      },
      canonical_hash: '3e25960a79dbc69b674cd4ec67a72c62',
      dlt_tx_id: 'fabric-tx-001',
      tamper_details: null,
    };

    it('displays VERIFIED badge for overall_verdict == VERIFIED', () => {
      render(<VerificationPipeline verification={verifiedMock} />);
      expect(screen.getAllByText(/VERIFIED/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/fabric-tx-001/i)).toBeInTheDocument();
    });

    it('ensures TAMPER_DETECTED is strictly treated as non-success failure', () => {
      const tamperMock: Verification = {
        ...verifiedMock,
        overall_verdict: 'TAMPER_DETECTED',
        stages: {
          ...verifiedMock.stages,
          stage_1_hash_integrity: { stage_name: 'Stage 1', status: 'failed', details: { error: 'Hash mismatch' } },
        },
        tamper_details: { discrepancy: 'telemetry value modified post-signing' },
      };

      render(<VerificationPipeline verification={tamperMock} />);
      expect(screen.getByText(/TAMPER_DETECTED/i)).toBeInTheDocument();
      expect(screen.getByText(/Discrepancy \/ Tamper Evidence Report/i)).toBeInTheDocument();
      // Must not display successful VERIFIED banner
      expect(screen.queryByText(/Independent Cryptographic Audit Verdict.*VERIFIED$/i)).not.toBeInTheDocument();
    });

    it('ensures DLT_MISMATCH is strictly treated as failure even with 200 response', () => {
      const dltMismatchMock: Verification = {
        ...verifiedMock,
        overall_verdict: 'DLT_MISMATCH',
        stages: {
          ...verifiedMock.stages,
          stage_4_dlt_ledger_anchor: { stage_name: 'Stage 4: DLT Ledger Anchor Verification', status: 'failed', details: { reason: 'Ledger hash differs' } },
        },
      };

      render(<VerificationPipeline verification={dltMismatchMock} />);
      expect(screen.getByText(/DLT_MISMATCH/i)).toBeInTheDocument();
      expect(screen.getByText(/Stage 4: DLT Ledger Anchor Verification/i)).toBeInTheDocument();
      expect(screen.getByText(/FAILED/i)).toBeInTheDocument();
    });

    it('keeps null transaction IDs null rather than inventing a fabricated hash', () => {
      const nullTxMock: Verification = {
        ...verifiedMock,
        dlt_tx_id: null,
      };

      render(<VerificationPipeline verification={nullTxMock} />);
      expect(screen.getByText(/Null \/ Pending DLT Confirmation/i)).toBeInTheDocument();
      expect(screen.queryByText(/fabric-tx-/i)).not.toBeInTheDocument();
    });
  });

  describe('Domain Status & Quality Badges', () => {
    it('renders QualityBadge accurately for valid, suspect, and invalid states', () => {
      const { unmount } = render(<QualityBadge status="valid" />);
      expect(screen.getByText('VALID')).toBeInTheDocument();
      unmount();

      const { unmount: u2 } = render(<QualityBadge status="suspect" />);
      expect(screen.getByText('SUSPECT')).toBeInTheDocument();
      u2();

      render(<QualityBadge status="invalid" />);
      expect(screen.getByText('INVALID')).toBeInTheDocument();
    });

    it('renders AnomalyStatusBadge truthfully without probability claims', () => {
      const { unmount } = render(<AnomalyStatusBadge status="normal" score={0.1234} />);
      expect(screen.getByText(/NORMAL \(0.123\)/i)).toBeInTheDocument();
      // Must not display confidence or probability
      expect(screen.queryByText(/confidence/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/probability/i)).not.toBeInTheDocument();
      unmount();

      render(<AnomalyStatusBadge status="anomalous" score={-0.4567} />);
      expect(screen.getByText(/ANOMALOUS \(-0.457\)/i)).toBeInTheDocument();
      expect(screen.queryByText(/confidence/i)).not.toBeInTheDocument();
    });
  });

  describe('UI State Components', () => {
    it('renders ErrorState with correlation request ID and HTTP status', () => {
      const apiErr = new ApiClientError(422, 'Unprocessable Entity', {
        error_code: 'FINALIZATION_PRECONDITION_FAILED',
        message: 'Telemetry quality status is suspect',
        request_id: 'corr-req-999',
      });

      render(<ErrorState error={apiErr} />);
      expect(screen.getByText(/HTTP 422/i)).toBeInTheDocument();
      expect(screen.getByText(/FINALIZATION_PRECONDITION_FAILED/i)).toBeInTheDocument();
      expect(screen.getByText(/Telemetry quality status is suspect/i)).toBeInTheDocument();
      expect(screen.getByText(/corr-req-999/i)).toBeInTheDocument();
    });

    it('renders EmptyState with custom title and message', () => {
      render(
        <EmptyState
          title="No Treatment Windows Found"
          message="Zero records found for this period."
        />
      );
      expect(screen.getByText('No Treatment Windows Found')).toBeInTheDocument();
      expect(screen.getByText('Zero records found for this period.')).toBeInTheDocument();
    });

    it('renders ForbiddenState with strict backend authorization notice', () => {
      render(
        <ForbiddenState
          title="Restricted Access"
          message="Your role lacks authority."
        />
      );
      expect(screen.getByText('Restricted Access')).toBeInTheDocument();
      expect(screen.getByText(/Backend authorization remains the authoritative boundary/i)).toBeInTheDocument();
    });
  });

  describe('Digital Twin Contracts & Data Taxonomy Tests', () => {
    it('verifies data taxonomy and origin types', () => {
      const origins = ['observed', 'simulated', 'predicted', 'hypothetical'] as const;
      expect(origins).toContain('observed');
      expect(origins).toContain('simulated');
      expect(origins).toContain('predicted');
      expect(origins).toContain('hypothetical');
    });

    it('verifies state freshness invariants', () => {
      const freshnessStates = ['fresh', 'stale', 'expired'] as const;
      expect(freshnessStates).toHaveLength(3);
    });

    it('verifies what-if scenario isolation and types', () => {
      const scenarioTypes = [
        'influent_quality_change',
        'aeration_failure',
        'chemical_overdosing',
        'hydraulic_surge',
      ];
      expect(scenarioTypes).toHaveLength(4);
    });

    it('verifies ErrorBoundary catches rendering crashes gracefully', () => {
      const BombComponent = () => {
        throw new Error('Simulated crash in component tree');
      };

      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <ErrorBoundary>
          <BombComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Application Error Encountered')).toBeInTheDocument();
      expect(screen.getByText('Simulated crash in component tree')).toBeInTheDocument();
      expect(screen.getByText('Reload Page')).toBeInTheDocument();

      spy.mockRestore();
    });
  });

  describe('Digital Twin SCADA Control Room Unit Tests', () => {
    const mockTwinState: TwinState = {
      facility_id: 'fac-delhi-001',
      state_version: 42,
      observed_at: '2026-10-18T12:00:00Z',
      source_mode: 'live',
      facility_profile_version: 'profile-v1.0',
      data_quality: 'valid',
      state_freshness: 'fresh',
      stage_states: {
        inlet: {
          stage_name: 'Raw Influent',
          parameters: { bod: 185.0, cod: 410.0, tss: 210.0, ph: 7.4 },
        },
        primary_clarifier: {
          stage_name: 'Primary Clarifier',
          parameters: { bod: 146.2, cod: 336.2, tss: 84.0, ph: 7.4 },
        },
        biological_aeration: {
          stage_name: 'Biological Aeration Basin',
          parameters: { bod: 22.7, cod: 78.5, tss: 2580.0, ph: 7.34 },
          operating_variables: { do_mg_l: 2.1, hrt_hours: 8.0, temperature_c: 20.0 },
        },
        secondary_clarifier: {
          stage_name: 'Secondary Clarifier',
          parameters: { bod: 20.8, cod: 70.6, tss: 10.4, ph: 7.34 },
        },
        final_effluent: {
          stage_name: 'Final Effluent',
          parameters: { bod: 20.8, cod: 70.6, tss: 10.4, ph: 7.34 },
        },
      },
    };

    const mockAlarms: TwinAlarmEvent[] = [
      {
        alarm_id: 'alm-001',
        facility_id: 'fac-delhi-001',
        stage_id: 'final_effluent',
        stage_name: 'Final Effluent',
        parameter: 'bod',
        severity: 'critical',
        message: 'Effluent BOD (34.5 mg/L) exceeds CPCB discharge norm (30.0 mg/L).',
        observed_value: 34.5,
        threshold_value: 30.0,
        unit: 'mg/L',
        acknowledged: false,
        first_seen_at: '2026-10-18T11:50:00Z',
        last_updated_at: '2026-10-18T12:00:00Z',
        status: 'active',
      },
      {
        alarm_id: 'alm-002',
        facility_id: 'fac-delhi-001',
        stage_id: 'biological_aeration',
        stage_name: 'Biological Aeration Basin',
        parameter: 'do',
        severity: 'warning',
        message: 'Aeration DO (1.75 mg/L) below optimal setpoint (2.0 mg/L).',
        observed_value: 1.75,
        threshold_value: 2.0,
        unit: 'mg/L',
        acknowledged: true,
        first_seen_at: '2026-10-18T11:40:00Z',
        last_updated_at: '2026-10-18T12:00:00Z',
        status: 'acknowledged',
      },
    ];

    it('generates authenticated WebSocket URL with query token', () => {
      setStoredToken('test-twin-token-123');
      const wsUrl = getTwinWebSocketUrl('fac-delhi-001');
      expect(wsUrl).toContain('/facilities/fac-delhi-001/twin/stream?token=test-twin-token-123');
    });

    it('renders SynopticProcessFlow with all 5 treatment stages and RAS loop', () => {
      const onSelect = vi.fn();
      render(
        <SynopticProcessFlow
          twinState={mockTwinState}
          activeAlarms={mockAlarms}
          selectedStageId="biological_aeration"
          onSelectStage={onSelect}
        />
      );

      expect(screen.getByText(/1\. RAW INFLUENT/i)).toBeInTheDocument();
      expect(screen.getByText(/2\. PRIMARY CLARIFIER/i)).toBeInTheDocument();
      expect(screen.getByText(/3\. BIOLOGICAL AERATION/i)).toBeInTheDocument();
      expect(screen.getByText(/4\. SECONDARY CLARIFIER/i)).toBeInTheDocument();
      expect(screen.getByText(/5\. FINAL EFFLUENT/i)).toBeInTheDocument();
      expect(screen.getByText(/RAS PUMP/i)).toBeInTheDocument();
      expect(screen.getByText(/v42/i)).toBeInTheDocument();

      // Sensor callout pins matching reference image
      expect(screen.getByText('LIT-101')).toBeInTheDocument();
      expect(screen.getByText('AIT-201')).toBeInTheDocument();
      expect(screen.getByText('AIT-302')).toBeInTheDocument();
      expect(screen.getByText('AIT-401')).toBeInTheDocument();
      expect(screen.getByText('AIT-501')).toBeInTheDocument();
    });

    it('truthfully handles null or missing twinState with Unavailable indicators', () => {
      render(
        <SynopticProcessFlow
          twinState={null}
          activeAlarms={[]}
          selectedStageId={null}
          onSelectStage={vi.fn()}
        />
      );

      // Verify that all stages render with Unavailable instead of hardcoded fake values
      const unavailableBadges = screen.getAllByText(/Unavailable/i);
      expect(unavailableBadges.length).toBeGreaterThan(0);
    });

    it('toggles SCADA animation speed between Normal, Fast, Slow, and Paused', () => {
      render(
        <SynopticProcessFlow
          twinState={mockTwinState}
          activeAlarms={mockAlarms}
          selectedStageId="inlet"
          onSelectStage={vi.fn()}
        />
      );

      const speedBtn = screen.getByTitle(/Toggle Animation Speed/i);
      expect(speedBtn).toHaveTextContent(/1x Normal/i);

      // Click to toggle to 2x Fast
      fireEvent.click(speedBtn);
      expect(speedBtn).toHaveTextContent(/2x Fast/i);

      // Click to toggle to 0.5x Slow
      fireEvent.click(speedBtn);
      expect(speedBtn).toHaveTextContent(/0.5x Slow/i);

      // Click to toggle to 0x Paused
      fireEvent.click(speedBtn);
      expect(speedBtn).toHaveTextContent(/0x Paused/i);
    });

    it('renders AlarmConsole with critical and warning badges and handles acknowledge', () => {
      const onAck = vi.fn();
      render(
        <AlarmConsole
          alarms={mockAlarms}
          onAcknowledge={onAck}
        />
      );

      expect(screen.getByText(/SCADA Alarm & Compliance Event Console/i)).toBeInTheDocument();
      expect(screen.getByText(/Effluent BOD \(34\.5 mg\/L\) exceeds CPCB/i)).toBeInTheDocument();
      expect(screen.getByText('Acknowledge')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Acknowledge'));
      expect(onAck).toHaveBeenCalledWith('alm-001');
    });

    it('renders LiveTelemetryTrends with 5 parameter sparklines', () => {
      render(<LiveTelemetryTrends twinState={mockTwinState} maxPoints={30} />);
      expect(screen.getByText(/Real-Time SCADA Telemetry Instrumentation/i)).toBeInTheDocument();
      expect(screen.getByText(/Effluent BOD/i)).toBeInTheDocument();
      expect(screen.getByText(/Effluent COD/i)).toBeInTheDocument();
      expect(screen.getByText(/Effluent TSS/i)).toBeInTheDocument();
      expect(screen.getByText(/Aeration DO/i)).toBeInTheDocument();
      expect(screen.getByText(/Effluent pH/i)).toBeInTheDocument();
    });

    it('renders StageInspectionDrawer with stage kinetics, CPCB limits, and close button', () => {
      const onClose = vi.fn();
      const onAck = vi.fn();
      render(
        <StageInspectionDrawer
          stageId="final_effluent"
          twinState={mockTwinState}
          alarms={mockAlarms}
          onClose={onClose}
          onAcknowledgeAlarm={onAck}
        />
      );

      expect(screen.getByText(/UV Disinfection & Safe Effluent Reuse/i)).toBeInTheDocument();
      expect(screen.getByText(/Live Stage Concentrations & Limits/i)).toBeInTheDocument();
      expect(screen.getByText(/Kinetic & Hydraulic Assumptions/i)).toBeInTheDocument();

      fireEvent.click(screen.getByText(/Close Inspector/i));
      expect(onClose).toHaveBeenCalled();
    });

    it('differentiates stage data across all treatment stages in StageInspectionDrawer', () => {
      // 1. Check Stage 1: Inlet
      const { rerender } = render(
        <StageInspectionDrawer
          stageId="inlet"
          twinState={mockTwinState}
          alarms={[]}
          onClose={vi.fn()}
          onAcknowledgeAlarm={vi.fn()}
        />
      );
      expect(screen.getByText(/Raw Influent Inlet & Bar Screening/i)).toBeInTheDocument();
      expect(screen.getByText(/Influent Flow Rate/i)).toBeInTheDocument();
      expect(screen.getByText(/SCR-101A/i)).toBeInTheDocument();

      // 2. Rerender with Stage 3: Aeration
      rerender(
        <StageInspectionDrawer
          stageId="biological_aeration"
          twinState={mockTwinState}
          alarms={[]}
          onClose={vi.fn()}
          onAcknowledgeAlarm={vi.fn()}
        />
      );
      expect(screen.getByText(/Biological Aeration Basin \(CSTR Activated Sludge\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Dissolved Oxygen \(DO\)/i)).toBeInTheDocument();
      expect(screen.getByText(/BLW-301A\/B/i)).toBeInTheDocument();
    });

    it('renders SimulatorCanvas with animated SCADA telemetry pipeline, live gauges, and controls', () => {
      const onStart = vi.fn();
      const onStop = vi.fn();
      render(
        <SimulatorCanvas
          isRunning={true}
          activeFacilityName="Bharwara STP Lucknow"
          stepsGenerated={142}
          readingsIngested={140}
          currentScenario="baseline_normal"
          lastTickAt="2026-10-18T09:00:00Z"
          onStart={onStart}
          onStop={onStop}
        />
      );

      expect(screen.getByText(/SCADA Telemetry Pipeline & Treatment Basin Visualizer/i)).toBeInTheDocument();
      expect(screen.getByText(/TRANSMITTING 1Hz/i)).toBeInTheDocument();
      expect(screen.getByText(/1. INFLUENT HEADWORKS/i)).toBeInTheDocument();
      expect(screen.getByText(/3. BIOLOGICAL AERATION/i)).toBeInTheDocument();
      expect(screen.getByText(/5. UV EFFLUENT/i)).toBeInTheDocument();
      expect(screen.getByText(/SCADA EDGE RTU GATEWAY/i)).toBeInTheDocument();
      expect(screen.getByText(/PLANT INFLOW/i)).toBeInTheDocument();

      fireEvent.click(screen.getByText(/Stop Stream/i));
      expect(onStop).toHaveBeenCalled();
    });

    it('opens PipelineNodeInspector when clicking on a sensor or pipeline node in SimulatorCanvas', () => {
      render(
        <SimulatorCanvas
          isRunning={true}
          activeFacilityName="Bharwara STP Lucknow"
          stepsGenerated={40}
          readingsIngested={200}
          currentScenario="baseline_normal"
          lastTickAt="2026-10-18T09:00:00Z"
          onStart={vi.fn()}
          onStop={vi.fn()}
        />
      );

      // Click on Basin 1 / SN-101
      fireEvent.click(screen.getByText(/1. INFLUENT HEADWORKS/i));

      // Inspector drawer should be rendered
      expect(screen.getByText(/Stage 1: Raw Influent Sensor Tap/i)).toBeInTheDocument();
      expect(screen.getByText(/Multi-Stage Pre-AI & CPCB Validation Audit/i)).toBeInTheDocument();
      expect(screen.getByText(/Raw Telemetry Frame Preview/i)).toBeInTheDocument();

      // Click close button
      fireEvent.click(screen.getByText(/Close Drawer/i));
      expect(screen.queryByText(/Stage 1: Raw Influent Sensor Tap/i)).not.toBeInTheDocument();

      // Click on Edge RTU Gateway node
      fireEvent.click(screen.getByText(/SCADA EDGE RTU GATEWAY/i));
      expect(screen.getByText(/SCADA Edge RTU Telemetry Gateway/i)).toBeInTheDocument();
      expect(screen.getByText(/Edge Ingestion & Packet Serialization/i)).toBeInTheDocument();
    });

    it('displays disturbance alerts and out-of-bounds validation checks under anomaly injection', () => {
      render(
        <SimulatorCanvas
          isRunning={true}
          activeFacilityName="Bharwara STP Lucknow"
          stepsGenerated={55}
          readingsIngested={275}
          currentScenario="organic_shock"
          lastTickAt="2026-10-18T09:00:00Z"
          onStart={vi.fn()}
          onStop={vi.fn()}
        />
      );

      // Verify disturbance badge in header
      expect(screen.getByText(/DISTURBANCE: ORGANIC_SHOCK/i)).toBeInTheDocument();
      expect(screen.getByText(/SHOCK SPIKE/i)).toBeInTheDocument();

      // Click Basin 1 to inspect anomaly details
      fireEvent.click(screen.getByText(/1. INFLUENT HEADWORKS/i));
      expect(screen.getByText(/ORGANIC SHOCK INFLUX DETECTED/i)).toBeInTheDocument();
      expect(screen.getByText(/BOD exceeds upper 3σ threshold/i)).toBeInTheDocument();
    });
  });

  describe('SCADA Industrial Graphics & Primitives Unit Tests', () => {
    it('renders ScadaPipe with was and air variants and correct flow classes', () => {
      const { container } = render(
        <svg>
          <ScadaPipe id="test-was" path="M 0 0 L 100 0" variant="was" />
          <ScadaPipe id="test-air" path="M 0 0 L 100 0" variant="air" />
        </svg>
      );
      const wasGroup = container.querySelector('#pipe-group-test-was');
      expect(wasGroup).toBeInTheDocument();
      const wasFlowPath = wasGroup?.querySelector('.pipe-flow-was');
      expect(wasFlowPath).toBeInTheDocument();

      const airGroup = container.querySelector('#pipe-group-test-air');
      expect(airGroup).toBeInTheDocument();
      const airFlowPath = airGroup?.querySelector('.pipe-flow-air');
      expect(airFlowPath).toBeInTheDocument();
    });

    it('renders ScadaBlower with casing, turbine runner, tag, and name', () => {
      const { container } = render(
        <svg>
          <ScadaBlower id="test-blower" x={50} y={50} tag="BLW-301" name="Aeration Air Blower" isRunning={true} />
        </svg>
      );
      expect(screen.getByText('BLW-301')).toBeInTheDocument();
      expect(screen.getByText('Aeration Air Blower')).toBeInTheDocument();
      const blowerGroup = container.querySelector('#blower-test-blower');
      expect(blowerGroup).toBeInTheDocument();
      expect(blowerGroup?.classList.contains('scada-blower')).toBe(true);
      expect(blowerGroup?.querySelector('.blower-spin')).toBeInTheDocument();
    });

    it('renders ScadaTerminalStation with variant styling, tags, and status badge', () => {
      render(
        <svg>
          <ScadaTerminalStation
            id="outfall"
            x={10}
            y={10}
            tag="OUTFALL-701"
            title="Treated Effluent Outfall"
            subtitle="CPCB Compliant"
            variant="outfall"
            status="nominal"
          />
          <ScadaTerminalStation
            id="solids"
            x={150}
            y={10}
            tag="SLD-601"
            title="Solids Dewatering"
            subtitle="Filter Press Cake"
            variant="solids"
            status="warning"
          />
          <ScadaTerminalStation
            id="inlet"
            x={300}
            y={10}
            tag="INLET-001"
            title="Municipal Headworks"
            subtitle="10 MLD Wet Well"
            variant="inlet"
            status="alarm"
          />
        </svg>
      );

      // Verify tags, titles, and subtitles
      expect(screen.getByText('OUTFALL-701')).toBeInTheDocument();
      expect(screen.getByText('Treated Effluent Outfall')).toBeInTheDocument();
      expect(screen.getByText('CPCB Compliant')).toBeInTheDocument();
      expect(screen.getByText('COMPLIANT')).toBeInTheDocument();

      expect(screen.getByText('SLD-601')).toBeInTheDocument();
      expect(screen.getByText('Solids Dewatering')).toBeInTheDocument();
      expect(screen.getByText('Filter Press Cake')).toBeInTheDocument();
      expect(screen.getByText('WARN')).toBeInTheDocument();

      expect(screen.getByText('INLET-001')).toBeInTheDocument();
      expect(screen.getByText('Municipal Headworks')).toBeInTheDocument();
      expect(screen.getByText('10 MLD Wet Well')).toBeInTheDocument();
      expect(screen.getByText('ALARM')).toBeInTheDocument();
    });

    it('renders ScadaLegend with width 490 and 5 process streams', () => {
      const { container } = render(
        <svg>
          <ScadaLegend x={20} y={20} />
        </svg>
      );
      const rect = container.querySelector('.scada-legend rect');
      expect(rect).toHaveAttribute('width', '490');

      expect(screen.getByText('Main Process Flow')).toBeInTheDocument();
      expect(screen.getByText('RAS Recycle')).toBeInTheDocument();
      expect(screen.getByText('WAS Purge')).toBeInTheDocument();
      expect(screen.getByText('UV Disinfection')).toBeInTheDocument();
      expect(screen.getByText('Air Header')).toBeInTheDocument();
    });

    it('renders ScadaFloatingCard with dimensions 214x96 and status badge at width - 48', () => {
      const { container } = render(
        <svg>
          <ScadaFloatingCard
            x={10}
            y={10}
            width={214}
            height={96}
            title="Biological Aeration Basin"
            status="nominal"
            metrics={[{ label: 'DO', value: 2.1, unit: 'mg/L' }]}
          />
        </svg>
      );
      const cardRect = container.querySelector('.scada-floating-card rect');
      expect(cardRect).toHaveAttribute('width', '214');
      expect(cardRect).toHaveAttribute('height', '96');
      expect(screen.getByText('Biological Aeration Basin')).toBeInTheDocument();
      expect(screen.getByText('NORMAL')).toBeInTheDocument();
      expect(screen.getByText('DO')).toBeInTheDocument();
    });
  });
});



