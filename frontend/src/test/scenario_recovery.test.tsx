import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import DigitalTwinPage from '../pages/DigitalTwinPage';
import * as digitalTwinApi from '../api/digitalTwin';
import * as facilitiesApi from '../api/facilities';

vi.mock('../api/facilities', () => ({
  listFacilitiesApi: vi.fn(),
  getFacilityApi: vi.fn(),
}));

vi.mock('../api/digitalTwin', () => ({
  getFacilityTwinStateApi: vi.fn(),
  getFacilityPredictionsApi: vi.fn(),
  getFacilityRecommendationsApi: vi.fn(),
  getFacilitySustainabilityApi: vi.fn(),
  runScenarioApi: vi.fn(),
  getScenarioApi: vi.fn(),
  startTwinEngineApi: vi.fn(),
  stopTwinEngineApi: vi.fn(),
  pauseTwinEngineApi: vi.fn(),
  resumeTwinEngineApi: vi.fn(),
  getTwinEngineStatusApi: vi.fn(),
}));

// Mock ResizeObserver for Recharts ResponsiveContainer in jsdom
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock as any;

describe('E2E-011: Frontend Scenario UI Browser Refresh & State Recovery', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
    vi.clearAllMocks();

    vi.mocked(facilitiesApi.listFacilitiesApi).mockResolvedValue([
      {
        facility_id: 'fac-test-01',
        facility_name: 'Central STP',
        facility_code: 'CSTP-01',
        facility_type: 'sewage_treatment_plant',
        status: 'active',
        capacity: 50.0,
        capacity_unit: 'MLD',
        location: { city: 'Bengaluru' },
      },
    ] as any);

    vi.mocked(digitalTwinApi.getFacilityTwinStateApi).mockResolvedValue({
      facility_id: 'fac-test-01',
      state_version: 1,
      observed_at: new Date().toISOString(),
      stage_states: {
        biological_aeration: {
          do_dissolved_oxygen: 2.1,
          mlss_suspended_solids: 2900,
          temperature_c: 24.5,
          our_oxygen_uptake_rate: 18.2,
        },
      },
      sensor_states: {},
      latest_observations: {},
      data_quality: 'valid',
      state_freshness: 'fresh',
      process_model_version: '1.0.0',
    } as any);

    vi.mocked(digitalTwinApi.getTwinEngineStatusApi).mockResolvedValue({
      status: 'running',
      mode: 'simulation',
      is_active: true,
      last_tick_at: new Date().toISOString(),
    } as any);
  });

  it('recovers scenario state after browser refresh via URL query params and preserves parameters', async () => {
    const recoveredScenario = {
      scenario_id: 'scen-persisted-101',
      facility_id: 'fac-test-01',
      scenario_type: 'influent_quality_change',
      scenario_name: 'Organic Inflow Shock (+45%)',
      duration_minutes: 180,
      time_step_seconds: 900,
      status: 'completed',
      parameters: { bod_change_percent: 45.0 },
      comparison_summary: {
        compliance_risk_detected: true,
        baseline_max_bod: 24.5,
        scenario_max_bod: 38.2,
        critical_stage: 'final_effluent',
      },
      results: [
        {
          step_index: 0,
          simulation_timestamp: new Date().toISOString(),
          treatment_stage: 'final_effluent',
          parameter: 'bod',
          baseline_value: 20.0,
          scenario_value: 20.0,
        },
        {
          step_index: 1,
          simulation_timestamp: new Date(Date.now() + 1800000).toISOString(),
          treatment_stage: 'final_effluent',
          parameter: 'bod',
          baseline_value: 21.0,
          scenario_value: 38.2,
        },
      ],
      time_series: [
        { time: 'T+00m', baseline_bod: 20.0, scenario_bod: 20.0 },
        { time: 'T+30m', baseline_bod: 21.0, scenario_bod: 35.0 },
      ],
      created_at: new Date().toISOString(),
    };

    vi.mocked(digitalTwinApi.getScenarioApi).mockResolvedValue(recoveredScenario as any);

    // Simulate browser loading directly with persisted scenario URL params (?tab=scenarios&scenarioId=scen-persisted-101)
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/twin/fac-test-01?tab=scenarios&scenarioId=scen-persisted-101']}>
          <DigitalTwinPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Assert scenario details are fetched from API
    await waitFor(() => {
      expect(digitalTwinApi.getScenarioApi).toHaveBeenCalledWith('scen-persisted-101');
    });

    // Verify parameters and title recovered
    await waitFor(() => {
      const nameInput = screen.getByDisplayValue('Organic Inflow Shock (+45%)');
      expect(nameInput).toBeInTheDocument();
    });

    // Verify compliance risk badge is rendered truthfully for completed scenario
    expect(screen.getByText(/Compliance Risk Detected \(Effluent > 30 mg\/L\)/i)).toBeInTheDocument();
  });

  it('ensures incomplete work is not falsely reported as completed upon browser refresh', async () => {
    const inProgressScenario = {
      scenario_id: 'scen-running-999',
      facility_id: 'fac-test-01',
      scenario_type: 'aeration_failure',
      scenario_name: 'Blower Tripping Simulation',
      duration_minutes: 120,
      time_step_seconds: 300,
      status: 'running', // Still actively running, kinetics incomplete
      parameters: { do_reduction_percent: 80.0 },
      comparison_summary: null,
      time_series: [],
      created_at: new Date().toISOString(),
    };

    vi.mocked(digitalTwinApi.getScenarioApi).mockResolvedValue(inProgressScenario as any);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/twin/fac-test-01?tab=scenarios&scenarioId=scen-running-999']}>
          <DigitalTwinPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(digitalTwinApi.getScenarioApi).toHaveBeenCalledWith('scen-running-999');
    });

    // Incomplete scenario MUST display in-progress banner and NOT claim "Compliant" or "Completed"
    await waitFor(() => {
      expect(screen.getByText(/Simulation RUNNING \(Incomplete - In Progress\)/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/Compliant with Discharge Norms/i)).not.toBeInTheDocument();
  });
});
