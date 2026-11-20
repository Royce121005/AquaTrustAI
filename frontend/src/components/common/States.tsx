import React from 'react';
import { AlertTriangle, ShieldAlert, FileQuestion, RefreshCw, ServerCrash, Inbox, Activity } from 'lucide-react';
import { ApiClientError } from '../../api/client';

export const LoadingState: React.FC<{ message?: string; className?: string }> = ({
  message = 'Loading verified data...',
  className = 'p-12',
}) => (
  <div className={`flex flex-col items-center justify-center text-slate-400 ${className}`}>
    <div className="relative mb-4">
      <div className="w-9 h-9 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Activity className="w-3.5 h-3.5 text-cyan-400/60 animate-pulse" />
      </div>
    </div>
    <span className="text-xs uppercase tracking-wider font-mono text-cyan-400/80">{message}</span>
    <span className="text-[10px] text-slate-600 font-mono mt-1">Awaiting authoritative response</span>
  </div>
);

export const EmptyState: React.FC<{
  title?: string;
  message?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}> = ({
  title = 'No Records Found',
  message = 'There is currently no telemetry or operational data recorded for this selection.',
  action,
  icon,
}) => (
  <div className="flex flex-col items-center justify-center p-12 text-center bg-[#111827] border border-[#1F293D] rounded-xl shadow-scada-card">
    <div className="p-3.5 bg-slate-800/80 text-cyan-400 rounded-xl mb-3 border border-slate-700/60 shadow-inner">
      {icon || <Inbox className="w-6 h-6 text-slate-400" />}
    </div>
    <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide font-mono">{title}</h3>
    <p className="mt-1 text-xs text-slate-400 max-w-sm leading-relaxed">{message}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>
);

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry, title }) => {
  let status = 0;
  let code = 'ERROR';
  let message = 'An unexpected operational error occurred.';
  let requestId: string | undefined;
  let details: unknown;

  if (error instanceof ApiClientError) {
    status = error.status;
    code = error.errorCode;
    message = error.message;
    requestId = error.requestId;
    details = error.details;
  } else if (error instanceof Error) {
    message = error.message;
  }

  // Friendly human interpretations matching specifications
  let displayTitle = title || 'API Request Failed';
  if (status === 401) {
    displayTitle = 'Session Authentication Required';
    message = 'Your session is no longer valid or has expired.';
  } else if (status === 403) {
    displayTitle = 'Access Denied (403 Forbidden)';
    message = 'You are not authorized for this operation.';
  } else if (status === 404) {
    displayTitle = 'Resource Not Found (404)';
    message = 'Requested record was not found.';
  } else if (status === 422) {
    displayTitle = 'Validation / Finalization Policy Conflict (422)';
  } else if (status === 429) {
    displayTitle = 'Rate Limit Reached (429)';
    message = 'Too many requests. Please wait and retry.';
  } else if (status === 503) {
    displayTitle = 'Backend Service Unavailable (503)';
    message = 'Required backend service or ledger bridge is currently unavailable.';
  }

  return (
    <div className="p-5 bg-rose-950/40 border border-rose-800/80 rounded-xl text-rose-200 shadow-scada-card my-4 backdrop-blur-sm">
      <div className="flex items-start gap-3.5">
        <ServerCrash className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-200">{displayTitle}</h4>
            {status > 0 && (
              <span className="font-mono text-[11px] px-2 py-0.5 bg-rose-900/80 border border-rose-700/80 rounded text-rose-300 font-semibold">
                HTTP {status}
              </span>
            )}
            {code && code !== 'UNKNOWN_ERROR' && (
              <span className="font-mono text-[11px] px-2 py-0.5 bg-rose-950 border border-rose-700 rounded text-rose-300 font-semibold">
                {code}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-xs text-rose-300/90 leading-relaxed">{message}</p>

          {requestId && (
            <div className="mt-2.5 text-[11px] font-mono text-rose-400/80 flex items-center gap-1.5 bg-rose-950/60 border border-rose-900/60 px-2.5 py-1 rounded w-fit">
              <span className="text-rose-500">Correlation Request ID:</span>
              <span className="select-all font-semibold text-rose-200">{requestId}</span>
            </div>
          )}

          {details !== undefined && (
            <div className="mt-2.5 p-3 bg-slate-950/80 border border-rose-900/40 rounded-lg text-[11px] font-mono overflow-auto max-h-36 text-rose-300/80">
              <pre className="whitespace-pre-wrap">{typeof details === 'string' ? details : JSON.stringify(details, null, 2)}</pre>
            </div>
          )}

          {onRetry && (
            <div className="mt-3.5">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-900 hover:bg-rose-800 border border-rose-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Request
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ForbiddenState: React.FC<{
  title?: string;
  message?: string;
}> = ({
  title = 'Access Restricted',
  message = 'You do not have the required permissions to view this section.',
}) => (
  <div className="flex flex-col items-center justify-center p-12 text-center bg-[#111827] border border-[#1F293D] rounded-xl shadow-scada-card">
    <div className="p-3.5 bg-amber-950/60 border border-amber-800/70 text-amber-400 rounded-xl mb-3 shadow-inner">
      <ShieldAlert className="w-6 h-6" />
    </div>
    <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide font-mono">{title}</h3>
    <p className="mt-1 text-xs text-slate-400 max-w-md leading-relaxed">{message}</p>
    <div className="mt-4 text-[10px] text-amber-500/80 font-mono bg-amber-950/40 border border-amber-900/50 px-3 py-1 rounded-full">
      Backend authorization remains the authoritative boundary.
    </div>
  </div>
);

export const NotFoundState: React.FC<{
  title?: string;
  message?: string;
}> = ({
  title = 'Record Not Found',
  message = 'The requested entity does not exist or has not been finalized yet.',
}) => (
  <div className="flex flex-col items-center justify-center p-12 text-center bg-[#111827] border border-[#1F293D] rounded-xl shadow-scada-card">
    <div className="p-3.5 bg-slate-800/80 border border-slate-700/60 text-slate-400 rounded-xl mb-3 shadow-inner">
      <FileQuestion className="w-6 h-6" />
    </div>
    <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide font-mono">{title}</h3>
    <p className="mt-1 text-xs text-slate-400 max-w-sm leading-relaxed">{message}</p>
  </div>
);

export const BackendSupportRequiredState: React.FC<{
  feature: string;
  description?: string;
}> = ({
  feature,
  description = 'This capability is not exposed by the current backend REST API specification. Data is not fabricated.',
}) => (
  <div className="p-4 bg-slate-900/80 border border-[#1F293D] rounded-xl text-slate-300 shadow-sm">
    <div className="flex items-center gap-2">
      <AlertTriangle className="w-4 h-4 text-amber-400" />
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-200 font-mono">
        Backend Support Required: {feature}
      </span>
    </div>
    <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">{description}</p>
  </div>
);
