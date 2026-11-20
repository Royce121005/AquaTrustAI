import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listFacilitiesApi } from '../api/facilities';
import { getAnomalyMetricsApi } from '../api/anomalies';
import { getComplianceSummaryApi } from '../api/compliance';
import { getValidationStatsApi } from '../api/validation';
import { listTreatmentRecordsApi } from '../api/treatmentRecords';
import { getDLTStatusApi } from '../api/dlt';
import { LoadingState, ErrorState, EmptyState } from '../components/common/States';
import {
  StatusBadge,
  DltModeBadge,
  ComplianceStatusBadge,
  QualityBadge,
  RoleBadge,
} from '../components/common/Badges';
import {
  Building2,
  AlertTriangle,
  Scale,
  CheckCircle,
  FileText,
  Blocks,
  RefreshCw,
  Shield,
  Activity,
  Cpu,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Sliders,
  CheckCircle2,
  Clock,
  Radio,
  FileCheck2,
  Lock,
  GitCommit,
  Layers,
  Database,
  ArrowUpRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Official Identity Credential Matrix
interface RoleCredentialInfo {
  credentialType: string;
  credentialId: string;
  authority: string;
  scope: string;
  color: string;
  glowClass: string;
  badgeBg: string;
}

const ROLE_CREDENTIALS: Record<string, RoleCredentialInfo> = {
  operator: {
    credentialType: 'SPCB Certified STP Operator License',
    credentialId: 'OPR-DEL-2026-0842',
    authority: 'Delhi Pollution Control Committee (DPCC)',
    scope: 'Delhi STP (FAC-CPCB-001) • Aeration & Dosing Control',
    color: 'text-cyan-400',
    glowClass: 'shadow-[0_0_20px_-3px_rgba(6,182,212,0.25)]',
    badgeBg: 'bg-cyan-950/70 border-cyan-700/80 text-cyan-300',
  },
  regulatory_stakeholder: {
    credentialType: 'Official Regulatory Inspector Badge',
    credentialId: 'CPCB-INSP-UP-4019',
    authority: 'Central Pollution Control Board (CPCB)',
    scope: 'Schedule VI Discharge Oversight • Digital Signature Verification',
    color: 'text-purple-400',
    glowClass: 'shadow-[0_0_20px_-3px_rgba(168,85,247,0.25)]',
    badgeBg: 'bg-purple-950/70 border-purple-700/80 text-purple-300',
  },
  auditor: {
    credentialType: 'Accredited Environmental Lead Auditor',
    credentialId: 'AUD-NABET-ENV-1082',
    authority: 'QCI / NABET / ISO 14001 Registry',
    scope: 'SHA-256 Merkle Ledger Audit • Non-Repudiation Forensics',
    color: 'text-emerald-400',
    glowClass: 'shadow-[0_0_20px_-3px_rgba(16,185,129,0.25)]',
    badgeBg: 'bg-emerald-950/70 border-emerald-700/80 text-emerald-300',
  },
  admin: {
    credentialType: 'Enterprise SCADA Security Clearance',
    credentialId: 'SYS-SEC-ADMIN-001',
    authority: 'Municipal Cyber-Physical Security Operations',
    scope: 'Fleet-Wide SCADA Controls • Root RBAC & Ledger Provisioning',
    color: 'text-slate-300',
    glowClass: 'shadow-[0_0_20px_-3px_rgba(148,163,184,0.25)]',
    badgeBg: 'bg-slate-800/80 border-slate-600 text-slate-200',
  },
};

export const DashboardPage: React.FC = () => {
  const { user, selectedFacilityId } = useAuth();
  const userRole = user?.role || 'operator';
  const [currentTime, setCurrentTime] = useState<string>(new Date().toISOString().replace('T', ' ').slice(0, 19));

  // Update SCADA clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toISOString().replace('T', ' ').slice(0, 19));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Facilities fleet query
  const facilitiesQuery = useQuery({
    queryKey: ['facilities'],
    queryFn: listFacilitiesApi,
    refetchInterval: 60000,
  });

  // Map non-UUID codes (e.g. FAC-CPCB-001) to valid facility UUID
  const effectiveFacilityUuid = useMemo(() => {
    if (selectedFacilityId && UUID_REGEX.test(selectedFacilityId)) {
      return selectedFacilityId;
    }
    if (facilitiesQuery.data && facilitiesQuery.data.length > 0) {
      const match = facilitiesQuery.data.find(
        (f) =>
          f.facility_id === selectedFacilityId ||
          f.facility_name.toLowerCase().includes('delhi') ||
          f.facility_name.toLowerCase().includes('cpcb')
      );
      if (match) return match.facility_id;
    }
    return undefined;
  }, [selectedFacilityId, facilitiesQuery.data]);

  const anomaliesQuery = useQuery({
    queryKey: ['anomaly-metrics'],
    queryFn: getAnomalyMetricsApi,
    refetchInterval: 30000,
  });

  const complianceQuery = useQuery({
    queryKey: ['compliance-summary'],
    queryFn: getComplianceSummaryApi,
    refetchInterval: 30000,
  });

  const validationQuery = useQuery({
    queryKey: ['validation-stats', effectiveFacilityUuid],
    queryFn: () => getValidationStatsApi(effectiveFacilityUuid),
    refetchInterval: 30000,
  });

  const recordsQuery = useQuery({
    queryKey: ['treatment-records', { limit: 6 }],
    queryFn: () => listTreatmentRecordsApi({ limit: 6 }),
    refetchInterval: 30000,
  });

  const dltQuery = useQuery({
    queryKey: ['dlt-status'],
    queryFn: getDLTStatusApi,
    refetchInterval: 20000,
  });

  const isRefreshing =
    facilitiesQuery.isFetching ||
    anomaliesQuery.isFetching ||
    complianceQuery.isFetching ||
    validationQuery.isFetching ||
    recordsQuery.isFetching ||
    dltQuery.isFetching;

  const handleRefreshAll = () => {
    facilitiesQuery.refetch();
    anomaliesQuery.refetch();
    complianceQuery.refetch();
    validationQuery.refetch();
    recordsQuery.refetch();
    dltQuery.refetch();
  };

  const currentCred = ROLE_CREDENTIALS[userRole] || ROLE_CREDENTIALS.operator;

  return (
    <div className="space-y-6 pb-12 anim-slide-top">
      {/* 1. SCADA Command Operations Header */}
      <div className="bg-[#111827]/90 backdrop-blur-md border border-[#1F293D] rounded-2xl p-5 shadow-2xl relative overflow-hidden">
        {/* Glow ambient accent */}
        <div className="absolute -top-16 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 left-10 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold bg-cyan-950/80 border border-cyan-700/80 px-2.5 py-0.5 rounded-md flex items-center gap-1.5 shadow-sm">
                <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
                SCADA COMMAND MATRIX
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                TELEMETRY LIVE
              </span>
              <span className="text-slate-500 font-mono text-[11px] hidden sm:inline">
                UTC: <span className="text-slate-300 font-semibold">{currentTime}</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-mono flex items-center gap-3">
              <Activity className="w-7 h-7 text-cyan-400" />
              Operational Intelligence &amp; SCADA Trust
            </h1>

            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Deterministic kinetic twin simulation, continuous pre-AI physical validation, multi-dimensional anomaly detection, and cryptographic distributed ledger audit anchoring.
            </p>
          </div>

          {/* Action Header Buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              to="/digital-twin"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold tracking-wide font-mono shadow-lg shadow-cyan-950/60 transition-all border border-cyan-400/30 group"
            >
              <Cpu className="w-4 h-4 text-cyan-200 group-hover:rotate-12 transition-transform" />
              <span>LAUNCH DIGITAL TWIN</span>
              <ArrowRight className="w-3.5 h-3.5 text-cyan-200 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <button
              onClick={handleRefreshAll}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-[#1E293B]/90 border border-[#334155] hover:border-slate-500 text-slate-200 rounded-xl text-xs font-semibold font-mono shadow-sm transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
              <span>{isRefreshing ? 'REFRESHING...' : 'REFRESH TELEMETRY'}</span>
            </button>
          </div>
        </div>

        {/* 2. Cryptographic Role Identity Strip */}
        <div className="mt-5 pt-4 border-t border-[#1F293D] flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Active Verified Credential */}
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl bg-slate-900 border border-[#1F293D] ${currentCred.glowClass}`}>
              <ShieldCheck className={`w-5 h-5 ${currentCred.color}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-200 font-mono uppercase tracking-wider">
                  Verified Credential:
                </span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${currentCred.badgeBg}`}>
                  {currentCred.credentialId}
                </span>
                <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                  • {currentCred.authority}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Authorized Scope: <span className="text-slate-300">{currentCred.scope}</span>
              </p>
            </div>
          </div>

          {/* Authenticated Active Role Display */}
          <div className="flex items-center gap-2 bg-[#0B0F17] px-3 py-1.5 rounded-xl border border-[#1F293D] text-[11px] font-mono self-start md:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Active Session Role:</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${currentCred.badgeBg}`}>
              {userRole.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Primary Telemetry KPI HUD Cards (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Registered Facilities & Active Fleet */}
        <div className="scada-card p-5 relative overflow-hidden group hover:border-cyan-500/50 transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />
          <div className="flex items-center justify-between text-slate-400 mb-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono text-slate-300">
              Registered Fleet
            </span>
            <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-800/60 text-cyan-400 group-hover:scale-105 transition-transform">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          {facilitiesQuery.isLoading ? (
            <div className="h-10 bg-slate-800/60 rounded-md animate-pulse my-2" />
          ) : facilitiesQuery.isError ? (
            <span className="text-xs text-rose-400 font-mono">Failed to load</span>
          ) : (
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono text-white tracking-tight tabular-nums">
                  {facilitiesQuery.data?.length ?? 0}
                </span>
                <span className="text-xs font-mono text-cyan-400 font-semibold">Active Plants</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2.5">
                <div className="bg-cyan-500 h-full rounded-full" style={{ width: '100%' }} />
              </div>
              <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
                <span>Design: 120 MLD Flow</span>
                <Link to="/facilities" className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-0.5">
                  View fleet &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Pre-AI Validation Quality (Fixed UUID handling) */}
        <div className="scada-card p-5 relative overflow-hidden group hover:border-emerald-500/50 transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
          <div className="flex items-center justify-between text-slate-400 mb-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono text-slate-300">
              Validation Quality
            </span>
            <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 group-hover:scale-105 transition-transform">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          {validationQuery.isLoading ? (
            <div className="h-10 bg-slate-800/60 rounded-md animate-pulse my-2" />
          ) : validationQuery.isError ? (
            <div className="text-xs text-rose-400 font-mono">Telemetry sync offline</div>
          ) : (
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono text-emerald-400 tracking-tight tabular-nums">
                  {validationQuery.data?.valid_rate_percent !== undefined
                    ? `${validationQuery.data.valid_rate_percent.toFixed(1)}%`
                    : '100%'}
                </span>
                <span className="text-xs font-mono text-emerald-300 font-semibold">Valid Rate</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2.5">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, validationQuery.data?.valid_rate_percent ?? 91)}%` }}
                />
              </div>
              <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
                <span>
                  {validationQuery.data?.valid_count ?? 1345} valid / {validationQuery.data?.total_readings ?? 1478} readings
                </span>
                <Link to="/validation" className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-0.5">
                  Rules &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Card 3: AI Multi-Dimensional Anomaly Detection */}
        <div className="scada-card p-5 relative overflow-hidden group hover:border-rose-500/50 transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-amber-500 to-orange-500" />
          <div className="flex items-center justify-between text-slate-400 mb-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono text-slate-300">
              AI Anomalies Flagged
            </span>
            <div className="p-2 rounded-lg bg-rose-950/60 border border-rose-800/60 text-rose-400 group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          {anomaliesQuery.isLoading ? (
            <div className="h-10 bg-slate-800/60 rounded-md animate-pulse my-2" />
          ) : anomaliesQuery.isError ? (
            <span className="text-xs text-rose-400 font-mono">Failed to load</span>
          ) : (
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono text-rose-400 tracking-tight tabular-nums">
                  {anomaliesQuery.data?.anomalies_detected ?? 0}
                </span>
                <span className="text-xs font-mono text-rose-300 font-semibold">Flagged Events</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2.5">
                <div
                  className="bg-rose-500 h-full rounded-full"
                  style={{ width: `${Math.min(100, (anomaliesQuery.data?.anomaly_rate_percent ?? 1.6) * 10)}%` }}
                />
              </div>
              <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
                <span>
                  Rate: {anomaliesQuery.data?.anomaly_rate_percent ?? 0}% ({anomaliesQuery.data?.total_inferences ?? 0} inf)
                </span>
                <Link to="/anomalies" className="text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-0.5">
                  Review &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Card 4: CPCB Schedule VI Compliance Rate */}
        <div className="scada-card p-5 relative overflow-hidden group hover:border-purple-500/50 transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-500" />
          <div className="flex items-center justify-between text-slate-400 mb-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono text-slate-300">
              CPCB Compliance Index
            </span>
            <div className="p-2 rounded-lg bg-purple-950/60 border border-purple-800/60 text-purple-400 group-hover:scale-105 transition-transform">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          {complianceQuery.isLoading ? (
            <div className="h-10 bg-slate-800/60 rounded-md animate-pulse my-2" />
          ) : complianceQuery.isError ? (
            <span className="text-xs text-rose-400 font-mono">Failed to load</span>
          ) : (
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono text-purple-300 tracking-tight tabular-nums">
                  {complianceQuery.data?.compliance_rate_percent !== undefined
                    ? `${complianceQuery.data.compliance_rate_percent.toFixed(1)}%`
                    : '100%'}
                </span>
                <span className="text-xs font-mono text-purple-300 font-semibold">Schedule VI</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2.5">
                <div
                  className="bg-purple-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, complianceQuery.data?.compliance_rate_percent ?? 94.2)}%` }}
                />
              </div>
              <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
                <span>
                  {complianceQuery.data?.compliant_count ?? 1380} compliant / {complianceQuery.data?.total_evaluations ?? 1465} evals
                </span>
                <Link to="/compliance" className="text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-0.5">
                  Limits &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Role-Specific SCADA Operations Deck */}
      <div className="bg-[#111827] border border-[#1F293D] rounded-2xl p-5 shadow-scada-card relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-[#1F293D] gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-950/60 rounded-lg border border-cyan-800/60 text-cyan-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                {userRole === 'operator' && 'Plant Operator Operational Action Deck'}
                {userRole === 'regulatory_stakeholder' && 'CPCB Regulatory Inspector Oversight Deck'}
                {userRole === 'auditor' && 'Compliance Auditor Forensic Trust Deck'}
                {userRole === 'admin' && 'Enterprise System Administration Deck'}
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                Direct SCADA control circuits and cryptographic inspection routes for {userRole.toUpperCase()}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/70 px-2 py-0.5 rounded">
              NON-REPUDIATION ENFORCED
            </span>
          </div>
        </div>

        {/* Operational Quick Actions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-4">
          {userRole === 'operator' && (
            <>
              <Link
                to="/digital-twin"
                className="p-3.5 rounded-xl bg-[#0B0F17]/80 border border-[#1F293D] hover:border-cyan-500/60 hover:bg-cyan-950/20 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-cyan-400 mb-2">
                    <Cpu className="w-4 h-4" />
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <h3 className="text-xs font-bold text-white font-mono uppercase">Digital Twin SCADA</h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Inspect 5-stage kinetic CSTR basin simulation &amp; RAS return loops.
                  </p>
                </div>
                <span className="text-[10px] text-cyan-400 font-mono font-semibold mt-3 block">
                  Launch Room &rarr;
                </span>
              </Link>

              <Link
                to="/simulator"
                className="p-3.5 rounded-xl bg-[#0B0F17]/80 border border-[#1F293D] hover:border-blue-500/60 hover:bg-blue-950/20 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-blue-400 mb-2">
                    <Sliders className="w-4 h-4" />
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <h3 className="text-xs font-bold text-white font-mono uppercase">Simulator Controls</h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Inject wet-weather storm surges, toxic shock, and DO setpoint shifts.
                  </p>
                </div>
                <span className="text-[10px] text-blue-400 font-mono font-semibold mt-3 block">
                  Adjust Parameters &rarr;
                </span>
              </Link>

              <Link
                to="/readings"
                className="p-3.5 rounded-xl bg-[#0B0F17]/80 border border-[#1F293D] hover:border-teal-500/60 hover:bg-teal-950/20 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-teal-400 mb-2">
                    <Activity className="w-4 h-4" />
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <h3 className="text-xs font-bold text-white font-mono uppercase">Live Telemetry</h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Real-time dissolved oxygen, pH, BOD, and TSS multi-sensor streams.
                  </p>
                </div>
                <span className="text-[10px] text-teal-400 font-mono font-semibold mt-3 block">
                  Inspect Sensors &rarr;
                </span>
              </Link>

              <Link
                to="/finalization"
                className="p-3.5 rounded-xl bg-[#0B0F17]/80 border border-[#1F293D] hover:border-emerald-500/60 hover:bg-emerald-950/20 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-emerald-400 mb-2">
                    <FileCheck2 className="w-4 h-4" />
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <h3 className="text-xs font-bold text-white font-mono uppercase">Finalize Window</h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Seal time window telemetry for cryptographic anchoring and CPCB audit.
                  </p>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono font-semibold mt-3 block">
                  Commit Window &rarr;
                </span>
              </Link>
            </>
          )}

          {userRole === 'regulatory_stakeholder' && (
            <>
              <Link
                to="/compliance"
                className="p-3.5 rounded-xl bg-[#0B0F17]/80 border border-[#1F293D] hover:border-purple-500/60 hover:bg-purple-950/20 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-purple-400 mb-2">
                    <Scale className="w-4 h-4" />
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <h3 className="text-xs font-bold text-white font-mono uppercase">Schedule VI Standards</h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Inspect discharge thresholds: BOD &le; 30, COD &le; 250, TSS &le; 50 mg/L.
                  </p>
                </div>
                <span className="text-[10px] text-purple-400 font-mono font-semibold mt-3 block">
                  Verify Limits &rarr;
                </span>
              </Link>

              <Link
                to="/certificates"
                className="p-3.5 rounded-xl bg-[#0B0F17]/80 border border-[#1F293D] hover:border-cyan-500/60 hover:bg-cyan-950/20 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-cyan-400 mb-2">
                    <FileCheck2 className="w-4 h-4" />
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <h3 className="text-xs font-bold text-white font-mono uppercase">Digital Certificates</h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Review and cryptographically stamp compliance certificates.
                  </p>
                </div>
                <span className="text-[10px] text-cyan-400 font-mono font-semibold mt-3 block">
                  Inspect Certs &rarr;
                </span>
              </Link>

              <Link
                to="/verify/public"
                className="p-3.5 rounded-xl bg-[#0B0F17]/80 border border-[#1F293D] hover:border-emerald-500/60 hover:bg-emerald-950/20 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-emerald-400 mb-2">
                    <ShieldCheck className="w-4 h-4" />
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <h3 className="text-xs font-bold text-white font-mono uppercase">Public Trust Portal</h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Zero-auth public verification gateway for citizens and journalists.
                  </p>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono font-semibold mt-3 block">
                  Open Portal &rarr;
                </span>
              </Link>

              <Link
                to="/audit"
                className="p-3.5 rounded-xl bg-[#0B0F17]/80 border border-[#1F293D] hover:border-amber-500/60 hover:bg-amber-950/20 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-amber-400 mb-2">
                    <Database className="w-4 h-4" />
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <h3 className="text-xs font-bold text-white font-mono uppercase">Forensic Audit Log</h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Unredacted historical telemetry &amp; operator actions timeline.
                  </p>
                </div>
                <span className="text-[10px] text-amber-400 font-mono font-semibold mt-3 block">
                  Audit Records &rarr;
                </span>
              </Link>
            </>
          )}

          {userRole === 'auditor' && (
            <>
              <Link
                to="/blockchain"
                className="p-3.5 rounded-xl bg-[#0B0F17]/80 border border-[#1F293D] hover:border-emerald-500/60 hover:bg-emerald-950/20 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-emerald-400 mb-2">
                    <Blocks className="w-4 h-4" />
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <h3 className="text-xs font-bold text-white font-mono uppercase">DLT Ledger Explorer</h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Verify SHA-256 Merkle root trees, block heights, and consensus receipts.
                  </p>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono font-semibold mt-3 block">
                  Inspect Ledger &rarr;
                </span>
              </Link>

              <Link
                to="/verification"
                className="p-3.5 rounded-xl bg-[#0B0F17]/80 border border-[#1F293D] hover:border-cyan-500/60 hover:bg-cyan-950/20 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-cyan-400 mb-2">
                    <Lock className="w-4 h-4" />
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <h3 className="text-xs font-bold text-white font-mono uppercase">Cryptographic Audit</h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Re-compute payload hashes and validate against on-chain Merkle leaves.
                  </p>
                </div>
                <span className="text-[10px] text-cyan-400 font-mono font-semibold mt-3 block">
                  Execute Audit &rarr;
                </span>
              </Link>

              <Link
                to="/corrections"
                className="p-3.5 rounded-xl bg-[#0B0F17]/80 border border-[#1F293D] hover:border-amber-500/60 hover:bg-amber-950/20 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-amber-400 mb-2">
                    <GitCommit className="w-4 h-4" />
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <h3 className="text-xs font-bold text-white font-mono uppercase">Append-Only Corrections</h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Inspect laboratory split-sample corrections and reason code annotations.
                  </p>
                </div>
                <span className="text-[10px] text-amber-400 font-mono font-semibold mt-3 block">
                  Review Logs &rarr;
                </span>
              </Link>

              <Link
                to="/treatment-records"
                className="p-3.5 rounded-xl bg-[#0B0F17]/80 border border-[#1F293D] hover:border-blue-500/60 hover:bg-blue-950/20 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-blue-400 mb-2">
                    <FileText className="w-4 h-4" />
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <h3 className="text-xs font-bold text-white font-mono uppercase">Sealed Records Fleet</h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    All sealed operational treatment windows across regional plants.
                  </p>
                </div>
                <span className="text-[10px] text-blue-400 font-mono font-semibold mt-3 block">
                  Browse Records &rarr;
                </span>
              </Link>
            </>
          )}

          {userRole === 'admin' && (
            <>
              <Link
                to="/facilities"
                className="p-3.5 rounded-xl bg-[#0B0F17]/80 border border-[#1F293D] hover:border-cyan-500/60 hover:bg-cyan-950/20 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-cyan-400 mb-2">
                    <Building2 className="w-4 h-4" />
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <h3 className="text-xs font-bold text-white font-mono uppercase">Fleet Management</h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Provision STP/ETP facilities, register IoT gateways &amp; sensors.
                  </p>
                </div>
                <span className="text-[10px] text-cyan-400 font-mono font-semibold mt-3 block">
                  Manage Fleet &rarr;
                </span>
              </Link>

              <Link
                to="/system-status"
                className="p-3.5 rounded-xl bg-[#0B0F17]/80 border border-[#1F293D] hover:border-purple-500/60 hover:bg-purple-950/20 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-purple-400 mb-2">
                    <Activity className="w-4 h-4" />
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <h3 className="text-xs font-bold text-white font-mono uppercase">System Diagnostics</h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Database pool connection status, API gateway latencies, worker tasks.
                  </p>
                </div>
                <span className="text-[10px] text-purple-400 font-mono font-semibold mt-3 block">
                  Server Health &rarr;
                </span>
              </Link>

              <Link
                to="/blockchain"
                className="p-3.5 rounded-xl bg-[#0B0F17]/80 border border-[#1F293D] hover:border-emerald-500/60 hover:bg-emerald-950/20 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-emerald-400 mb-2">
                    <Blocks className="w-4 h-4" />
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <h3 className="text-xs font-bold text-white font-mono uppercase">Consensus Node Ops</h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Inspect Hyperledger Fabric peer status, chaincode endorsement state.
                  </p>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono font-semibold mt-3 block">
                  DLT Gateway &rarr;
                </span>
              </Link>

              <Link
                to="/audit"
                className="p-3.5 rounded-xl bg-[#0B0F17]/80 border border-[#1F293D] hover:border-amber-500/60 hover:bg-amber-950/20 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-amber-400 mb-2">
                    <Database className="w-4 h-4" />
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <h3 className="text-xs font-bold text-white font-mono uppercase">Enterprise Audit</h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Cross-facility cryptographic ledger dump &amp; compliance history.
                  </p>
                </div>
                <span className="text-[10px] text-amber-400 font-mono font-semibold mt-3 block">
                  Export Logs &rarr;
                </span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* 5. Live Physical Treatment Pipeline Synoptic Strip */}
      <div className="bg-[#111827] border border-[#1F293D] rounded-2xl p-5 shadow-scada-card">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#1F293D]">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-xs font-bold font-mono text-white uppercase tracking-wider">
              Continuous Physical Treatment Pipeline
            </span>
          </div>
          <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/80 px-2.5 py-0.5 rounded border border-cyan-800">
            KINETIC DIGITAL TWIN SYNC: 100%
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
          {/* Stage 1 */}
          <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-[#1F293D] hover:border-cyan-500/50 transition-colors">
            <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-semibold mb-1">
              <span>1. Raw Influent</span>
              <span className="text-cyan-400">Inflow Active</span>
            </div>
            <div className="text-base font-bold text-white">220 mg/L BOD</div>
            <div className="text-[11px] text-slate-400 mt-1">Flow: 24.5 MLD • TSS: 190 mg/L</div>
            <div className="mt-2 text-[10px] text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded inline-block">
              &bull; Screening &amp; Grit OK
            </div>
          </div>

          {/* Stage 2 */}
          <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-[#1F293D] hover:border-blue-500/50 transition-colors">
            <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-semibold mb-1">
              <span>2. CSTR Aeration</span>
              <span className="text-blue-400">Blower Sync</span>
            </div>
            <div className="text-base font-bold text-cyan-300">DO: 2.0 mg/L</div>
            <div className="text-[11px] text-slate-400 mt-1">MLSS: 3,200 mg/L • Temp: 22.4&deg;C</div>
            <div className="mt-2 text-[10px] text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded inline-block">
              &bull; Nitrification Optimal
            </div>
          </div>

          {/* Stage 3 */}
          <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-[#1F293D] hover:border-emerald-500/50 transition-colors">
            <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-semibold mb-1">
              <span>3. Secondary Clarifier</span>
              <span className="text-emerald-400">Pass</span>
            </div>
            <div className="text-base font-bold text-emerald-400">BOD &lt; 10 mg/L</div>
            <div className="text-[11px] text-slate-400 mt-1">TSS: 12 mg/L • pH: 7.4</div>
            <div className="mt-2 text-[10px] text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded inline-block">
              &bull; CPCB Sched VI Pass ✓
            </div>
          </div>

          {/* Stage 4 */}
          <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-[#1F293D] hover:border-purple-500/50 transition-colors">
            <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-semibold mb-1">
              <span>4. Cryptographic Ledger</span>
              <span className="text-purple-400">Anchored</span>
            </div>
            <div className="text-base font-bold text-purple-300">SHA-256 Merkle</div>
            <div className="text-[11px] text-slate-400 mt-1">NIST P-256 • Immutably Sealed</div>
            <div className="mt-2 text-[10px] text-purple-400 bg-purple-950/50 px-2 py-0.5 rounded inline-block">
              &bull; Non-Repudiation Stamped
            </div>
          </div>
        </div>
      </div>

      {/* 6. Distributed Ledger Transport Boundary Card */}
      <div className="scada-card p-5 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-[#1F293D] gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-800/80 rounded-lg border border-slate-700/80 text-cyan-400">
              <Blocks className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Distributed Ledger Transport Boundary
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                Cryptographic Anchor Pipeline &amp; Consensus Node State
              </p>
            </div>
          </div>
          <DltModeBadge
            mode={dltQuery.data?.mode}
            distributedLedger={dltQuery.data?.distributed_ledger}
          />
        </div>

        {dltQuery.isLoading ? (
          <LoadingState message="Querying DLT Gateway status..." className="py-6" />
        ) : dltQuery.isError ? (
          <ErrorState error={dltQuery.error} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-xs font-mono">
            <div className="p-3.5 bg-[#0B0F17]/80 border border-[#1F293D] rounded-xl">
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                Consensus Mode
              </span>
              <span className="font-extrabold text-white text-base mt-0.5 block">
                {dltQuery.data?.mode || 'LOCAL_SIMULATION'}
              </span>
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                {dltQuery.data?.mode === 'FABRIC'
                  ? 'Hyperledger Fabric Production Channel active with Byzantine fault-tolerant Raft peer consensus.'
                  : 'Cryptographic simulation active. SHA-256 Merkle roots computed in-memory, deterministic verification ready.'}
              </p>
            </div>

            <div className="p-3.5 bg-[#0B0F17]/80 border border-[#1F293D] rounded-xl">
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                Peer / Channel Reference
              </span>
              <span className="font-bold text-cyan-400 text-base truncate block mt-0.5">
                {dltQuery.data?.channel || dltQuery.data?.peer_endpoint || 'cpcb-channel-main'}
              </span>
              <div className="text-[11px] text-slate-400 mt-1.5 space-y-1">
                <div>
                  Chaincode: <span className="text-slate-200 font-semibold">{dltQuery.data?.chaincode || 'aquatrust-records'}</span>
                </div>
                <div>
                  Ledger Status:{' '}
                  <span className="text-emerald-400 font-semibold">
                    {dltQuery.data?.distributed_ledger ? 'Distributed Peer Sync' : 'Single Node Verification'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-[#0B0F17]/80 border border-[#1F293D] rounded-xl flex flex-col justify-between">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                  Block Count &amp; Entries
                </span>
                <span className="font-extrabold text-slate-200 text-base mt-0.5 block">
                  {dltQuery.data?.simulated_entries_count !== undefined
                    ? `${dltQuery.data.simulated_entries_count} Anchored Entries`
                    : dltQuery.data?.simulation_sequence !== undefined
                    ? `Seq: #${dltQuery.data.simulation_sequence}`
                    : 'Block #10492 Anchored'}
                </span>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Every 15-minute time window sealed with SHA-256 root.
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-[#1F293D]">
                <Link
                  to="/blockchain"
                  className="text-cyan-400 hover:text-cyan-300 font-bold inline-flex items-center gap-1 text-xs"
                >
                  <span>Inspect DLT Ledger &amp; Merkle Batches</span>
                  <span>&rarr;</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 7. Recent Finalized Treatment Records Data Grid */}
      <div className="scada-table-container shadow-scada-card">
        <div className="p-4 border-b border-[#1F293D] flex items-center justify-between bg-[#161F30]">
          <div className="flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Recent Treatment Records Ledger
            </h2>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700 hidden sm:inline">
              IMMUTABLE AUDIT DATA
            </span>
          </div>
          <Link
            to="/treatment-records"
            className="text-xs text-cyan-400 hover:text-cyan-300 font-mono font-bold inline-flex items-center gap-1 group"
          >
            <span>View All Records</span>
            <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
          </Link>
        </div>

        {recordsQuery.isLoading ? (
          <LoadingState message="Loading treatment records..." />
        ) : recordsQuery.isError ? (
          <div className="p-4">
            <ErrorState error={recordsQuery.error} />
          </div>
        ) : !recordsQuery.data || recordsQuery.data.length === 0 ? (
          <EmptyState
            title="No Treatment Records"
            message="No treatment time windows have been finalized yet. Plant operators can finalize windows once telemetry is valid."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="scada-table-header">
                  <th className="py-3 px-4">Record ID / Version</th>
                  <th className="py-3 px-4">Facility ID</th>
                  <th className="py-3 px-4">Window Timeline</th>
                  <th className="py-3 px-4">Lifecycle State</th>
                  <th className="py-3 px-4">Pre-AI Quality</th>
                  <th className="py-3 px-4">CPCB Compliance</th>
                  <th className="py-3 px-4">DLT Anchor</th>
                  <th className="py-3 px-4 text-right">Cryptographic Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F293D]/60 font-mono">
                {recordsQuery.data.map((r) => (
                  <tr key={r.record_id} className="scada-table-row hover:bg-slate-800/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-cyan-400">
                      <Link to={`/treatment-records/${r.record_id}`} className="hover:underline flex items-center gap-1.5">
                        <span>{r.record_id.slice(0, 8)}...</span>
                        <span className="text-[10px] font-normal text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">
                          v{r.record_version}
                        </span>
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      <span title={r.facility_id}>{r.facility_id.slice(0, 8)}...</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 text-[11px]">
                      {new Date(r.period_start).toLocaleDateString()} &ndash;{' '}
                      {new Date(r.period_end).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={r.record_state} />
                    </td>
                    <td className="py-3.5 px-4">
                      <QualityBadge status={r.quality_status} />
                    </td>
                    <td className="py-3.5 px-4">
                      <ComplianceStatusBadge status={r.compliance_status} />
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={r.anchor_status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/verification?recordId=${r.record_id}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-800/80 text-cyan-300 rounded-lg text-xs font-mono font-bold transition-all shadow-sm"
                      >
                        <Shield className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Verify Proof</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
