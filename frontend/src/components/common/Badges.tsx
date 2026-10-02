import React from 'react';
import { UserRole, VerificationVerdict } from '../../types';
import { CheckCircle2, XCircle, AlertCircle, HelpCircle, Shield, Cpu, Activity, Clock } from 'lucide-react';

export const RoleBadge: React.FC<{ role: UserRole | string; className?: string }> = ({ role, className = '' }) => {
  const roleStyles: Record<string, { bg: string; text: string; label: string }> = {
    operator: { bg: 'bg-sky-100 border-sky-300', text: 'text-sky-800', label: 'OPERATOR' },
    auditor: { bg: 'bg-emerald-100 border-emerald-300', text: 'text-emerald-800', label: 'AUDITOR' },
    regulatory_stakeholder: { bg: 'bg-purple-100 border-purple-300', text: 'text-purple-800', label: 'REGULATOR' },
    admin: { bg: 'bg-slate-800 border-slate-700', text: 'text-slate-100', label: 'SYS_ADMIN' },
  };

  const style = roleStyles[role] || { bg: 'bg-slate-100 border-slate-300', text: 'text-slate-700', label: role.toUpperCase() };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${style.bg} ${style.text} ${className}`}
    >
      <Shield className="w-3 h-3" />
      {style.label}
    </span>
  );
};

export const QualityBadge: React.FC<{ status: string | null; className?: string }> = ({ status, className = '' }) => {
  const normalized = (status || 'unknown').toLowerCase();
  if (normalized === 'valid') {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-50 border border-emerald-200 text-emerald-700 ${className}`}>
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        VALID
      </span>
    );
  }
  if (normalized === 'suspect') {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-50 border border-amber-200 text-amber-700 ${className}`}>
        <AlertCircle className="w-3 h-3 text-amber-600" />
        SUSPECT
      </span>
    );
  }
  if (normalized === 'invalid') {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-rose-50 border border-rose-200 text-rose-700 ${className}`}>
        <XCircle className="w-3 h-3 text-rose-600" />
        INVALID
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 border border-slate-200 text-slate-600 ${className}`}>
      <HelpCircle className="w-3 h-3 text-slate-400" />
      {(status || 'PENDING').toUpperCase()}
    </span>
  );
};

export const AnomalyStatusBadge: React.FC<{
  status: string | null;
  score?: number | null;
  className?: string;
}> = ({ status, score, className = '' }) => {
  const norm = (status || 'unknown').toLowerCase();

  if (norm === 'normal') {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-50 border border-emerald-200 text-emerald-700 ${className}`}>
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        NORMAL {score !== undefined && score !== null ? `(${score.toFixed(3)})` : ''}
      </span>
    );
  }
  if (norm === 'anomalous') {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-rose-50 border border-rose-200 text-rose-700 ${className}`}>
        <AlertCircle className="w-3 h-3 text-rose-600" />
        ANOMALOUS {score !== undefined && score !== null ? `(${score.toFixed(3)})` : ''}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 border border-slate-200 text-slate-600 ${className}`}>
      <HelpCircle className="w-3 h-3 text-slate-400" />
      {norm === 'insufficient_data' ? 'INSUFFICIENT DATA' : (status || 'NOT INFERRED').toUpperCase()}
    </span>
  );
};

export const ComplianceStatusBadge: React.FC<{ status: string | null; className?: string }> = ({
  status,
  className = '',
}) => {
  const norm = (status || 'unknown').toLowerCase();
  if (norm === 'compliant') {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-50 border border-emerald-200 text-emerald-700 ${className}`}>
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        COMPLIANT
      </span>
    );
  }
  if (norm === 'non_compliant') {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-rose-50 border border-rose-200 text-rose-700 ${className}`}>
        <XCircle className="w-3 h-3 text-rose-600" />
        NON-COMPLIANT
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-50 border border-amber-200 text-amber-700 ${className}`}>
      <AlertCircle className="w-3 h-3 text-amber-600" />
      {(status || 'PENDING EVALUATION').toUpperCase()}
    </span>
  );
};

export const VerificationVerdictBadge: React.FC<{
  verdict: VerificationVerdict | string;
  className?: string;
}> = ({ verdict, className = '' }) => {
  if (verdict === 'VERIFIED') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-semibold bg-emerald-100 border border-emerald-300 text-emerald-800 shadow-sm ${className}`}>
        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        VERIFIED
      </span>
    );
  }

  // Any other verdict is a non-success state!
  const isDanger = ['TAMPER_DETECTED', 'SIGNATURE_INVALID', 'CERTIFICATE_INVALID', 'DLT_MISMATCH'].includes(verdict);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-semibold border shadow-sm ${
        isDanger
          ? 'bg-rose-100 border-rose-300 text-rose-800'
          : 'bg-amber-100 border-amber-300 text-amber-800'
      } ${className}`}
    >
      <AlertCircle className="w-4 h-4" />
      {verdict || 'VERIFICATION FAILED'}
    </span>
  );
};

export const DltModeBadge: React.FC<{
  mode?: string;
  distributedLedger?: boolean;
  className?: string;
}> = ({ mode = 'SIMULATION', distributedLedger = false, className = '' }) => {
  const isFabric = mode.toUpperCase() === 'FABRIC' && distributedLedger;

  if (isFabric) {
    return (
      <span
        title="Anchored to live Hyperledger Fabric production ledger network"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-medium bg-emerald-950/90 text-emerald-300 border border-emerald-700 ${className}`}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <Cpu className="w-3.5 h-3.5" />
        FABRIC
        <span className="text-[10px] text-emerald-400 font-normal ml-0.5">(Live DLT)</span>
      </span>
    );
  }

  return (
    <span
      title="Running in local simulation mode; not committed to a distributed blockchain network."
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-medium bg-amber-950/80 text-amber-300 border border-amber-700/80 ${className}`}
    >
      <span className="w-2 h-2 rounded-full bg-amber-400"></span>
      <Cpu className="w-3.5 h-3.5" />
      SIMULATION
      <span className="text-[10px] text-amber-400 font-normal ml-0.5">(Local Mock)</span>
    </span>
  );
};

export const BackendHealthBadge: React.FC<{
  status?: string;
  database?: string;
  className?: string;
}> = ({ status = 'unknown', database = 'unknown', className = '' }) => {
  const isHealthy = status === 'healthy' && database === 'connected';

  if (isHealthy) {
    return (
      <span
        title={`Backend status: ${status}, Database: ${database}`}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-800 ${className}`}
      >
        <Activity className="w-3 h-3 text-emerald-400" />
        API: OK
      </span>
    );
  }

  return (
    <span
      title={`Backend status: ${status}, Database: ${database}`}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-rose-950/80 text-rose-400 border border-rose-800 ${className}`}
    >
      <Activity className="w-3 h-3 text-rose-400" />
      API: {status.toUpperCase()}
    </span>
  );
};

export const StatusBadge: React.FC<{ status?: string | null; className?: string }> = ({ status, className = '' }) => {
  const norm = (status || 'unknown').toLowerCase();
  let color = 'bg-slate-100 text-slate-700 border-slate-300';
  if (['active', 'completed', 'confirmed', 'verified', 'finalized'].includes(norm)) {
    color = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (['pending', 'submitted', 'eligible_for_finalization'].includes(norm)) {
    color = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (['failed', 'rejected', 'superseded', 'invalid', 'tamper_detected'].includes(norm)) {
    color = 'bg-rose-50 text-rose-700 border-rose-200';
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium border ${color} ${className}`}>
      {(status || 'UNKNOWN').toUpperCase()}
    </span>
  );
};
