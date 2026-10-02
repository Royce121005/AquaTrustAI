import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
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
});

