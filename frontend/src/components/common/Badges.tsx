import React from 'react';
import { UserRole, VerificationVerdict } from '../../types';
import { CheckCircle2, XCircle, AlertCircle, HelpCircle, Shield, Cpu, Activity } from 'lucide-react';

export const RoleBadge: React.FC<{ role: UserRole | string; className?: string }> = ({ role, className = '' }) => {
  const roleStyles: Record<string, { bg: string; border: string; text: string; label: string; dot: string }> = {
    operator: {
      bg: 'bg-sky-950/60',
      border: 'border-sky-700/80',
      text: 'text-sky-300',
      label: 'OPERATOR',
      dot: 'bg-sky-400',
    },
    auditor: {
      bg: 'bg-emerald-950/60',
      border: 'border-emerald-700/80',
      text: 'text-emerald-300',
      label: 'AUDITOR',
      dot: 'bg-emerald-400',
    },
    regulatory_stakeholder: {
      bg: 'bg-purple-950/60',
      border: 'border-purple-700/80',
      text: 'text-purple-300',
      label: 'REGULATOR',
      dot: 'bg-purple-400',
    },
    admin: {
      bg: 'bg-slate-800/80',
      border: 'border-slate-600',
      text: 'text-slate-200',
      label: 'SYS_ADMIN',
      dot: 'bg-cyan-400',
    },
  };

  const style = roleStyles[role] || {
    bg: 'bg-slate-900',
    border: 'border-slate-700',
    text: 'text-slate-300',
    label: role.toUpperCase(),
    dot: 'bg-slate-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold tracking-wider border shadow-sm ${style.bg} ${style.border} ${style.text} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      <Shield className="w-3 h-3 opacity-75" />
      {style.label}
    </span>
  );
};

export const QualityBadge: React.FC<{ status: string | null; className?: string }> = ({ status, className = '' }) => {
  const normalized = (status || 'unknown').toLowerCase();
  if (normalized === 'valid') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-emerald-950/70 border border-emerald-700 text-emerald-300 shadow-sm ${className}`}>
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        VALID
      </span>
    );
  }
  if (normalized === 'suspect') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-amber-950/70 border border-amber-700 text-amber-300 shadow-sm ${className}`}>
        <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
        SUSPECT
      </span>
    );
  }
  if (normalized === 'invalid') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-rose-950/70 border border-rose-700 text-rose-300 shadow-sm ${className}`}>
        <XCircle className="w-3.5 h-3.5 text-rose-400" />
        INVALID
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-medium bg-slate-900 border border-slate-700 text-slate-400 ${className}`}>
      <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
      {(status || 'PENDING').toUpperCase()}
    </span>
  );
};

export const AnomalyStatusBadge: React.FC<{
  status: string | null;
  score?: number | string | null;
  className?: string;
}> = ({ status, score, className = '' }) => {
  const norm = (status || 'unknown').toLowerCase();
  const numScore =
    score !== undefined && score !== null && !isNaN(Number(score))
      ? Number(score)
      : null;

  if (norm === 'normal') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-emerald-950/70 border border-emerald-700 text-emerald-300 shadow-sm ${className}`}>
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        NORMAL {numScore !== null ? `(${numScore.toFixed(3)})` : ''}
      </span>
    );
  }
  if (norm === 'anomalous') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-rose-950/70 border border-rose-700 text-rose-300 shadow-sm shadow-rose-950/50 ${className}`}>
        <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
        ANOMALOUS {numScore !== null ? `(${numScore.toFixed(3)})` : ''}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-medium bg-slate-900 border border-slate-700 text-slate-400 ${className}`}>
      <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
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
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-emerald-950/70 border border-emerald-700 text-emerald-300 shadow-sm ${className}`}>
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        COMPLIANT
      </span>
    );
  }
  if (norm === 'non_compliant') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-rose-950/70 border border-rose-700 text-rose-300 shadow-sm ${className}`}>
        <XCircle className="w-3.5 h-3.5 text-rose-400" />
        NON-COMPLIANT
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-medium bg-amber-950/70 border border-amber-700 text-amber-300 shadow-sm ${className}`}>
      <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
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
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-semibold bg-emerald-950/80 border border-emerald-600 text-emerald-200 shadow-sm shadow-emerald-950/50 ${className}`}>
        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        VERIFIED
      </span>
    );
  }

  // Any other verdict is a non-success state
  const isDanger = ['TAMPER_DETECTED', 'SIGNATURE_INVALID', 'CERTIFICATE_INVALID', 'DLT_MISMATCH'].includes(verdict);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-semibold border shadow-sm ${
        isDanger
          ? 'bg-rose-950/80 border-rose-700 text-rose-200 shadow-rose-950/50'
          : 'bg-amber-950/80 border-amber-700 text-amber-200'
      } ${className}`}
    >
      <AlertCircle className="w-4 h-4 text-current" />
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
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-emerald-950/90 text-emerald-300 border border-emerald-600/80 shadow-sm ${className}`}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <Cpu className="w-3.5 h-3.5 text-emerald-400" />
        FABRIC
        <span className="text-[10px] text-emerald-400 font-normal ml-0.5">(Live DLT)</span>
      </span>
    );
  }

  return (
    <span
      title="Running in local simulation mode; not committed to a distributed blockchain network."
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-amber-950/80 text-amber-300 border border-amber-700/80 shadow-sm ${className}`}
    >
      <span className="w-2 h-2 rounded-full bg-amber-400"></span>
      <Cpu className="w-3.5 h-3.5 text-amber-400" />
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
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-700/80 shadow-sm ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        <Activity className="w-3 h-3 text-emerald-400" />
        API: OK
      </span>
    );
  }

  return (
    <span
      title={`Backend status: ${status}, Database: ${database}`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono bg-rose-950/80 text-rose-300 border border-rose-700/80 shadow-sm ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
      <Activity className="w-3 h-3 text-rose-400" />
      API: {status.toUpperCase()}
    </span>
  );
};

export const StatusBadge: React.FC<{ status?: string | null; className?: string }> = ({ status, className = '' }) => {
  const norm = (status || 'unknown').toLowerCase();
  let color = 'bg-slate-900 text-slate-300 border-slate-700';
  if (['active', 'completed', 'confirmed', 'verified', 'finalized'].includes(norm)) {
    color = 'bg-emerald-950/70 text-emerald-300 border-emerald-700';
  } else if (['pending', 'submitted', 'eligible_for_finalization'].includes(norm)) {
    color = 'bg-amber-950/70 text-amber-300 border-amber-700';
  } else if (['failed', 'rejected', 'superseded', 'invalid', 'tamper_detected'].includes(norm)) {
    color = 'bg-rose-950/70 text-rose-300 border-rose-700';
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${color} ${className}`}>
      {(status || 'UNKNOWN').toUpperCase()}
    </span>
  );
};
