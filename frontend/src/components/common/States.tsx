import React from 'react';
import { AlertTriangle, ShieldAlert, FileQuestion, RefreshCw, ServerCrash, Inbox } from 'lucide-react';
import { ApiClientError } from '../../api/client';

export const LoadingState: React.FC<{ message?: string; className?: string }> = ({
  message = 'Loading verified data...',
  className = 'p-12',
}) => (
  <div className={`flex flex-col items-center justify-center text-slate-500 ${className}`}>
    <div className="w-7 h-7 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mb-3"></div>
    <span className="text-xs uppercase tracking-wider font-mono text-slate-400">{message}</span>
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
  <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-slate-200 rounded-lg shadow-sm">
    <div className="p-3 bg-slate-100 text-slate-500 rounded-full mb-3">
      {icon || <Inbox className="w-6 h-6" />}
    </div>
    <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">{title}</h3>
    <p className="mt-1 text-xs text-slate-500 max-w-sm">{message}</p>
    {action && <div className="mt-4">{action}</div>}
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
    <div className="p-6 bg-red-50/70 border border-red-200 rounded-lg text-red-900 shadow-sm my-4">
      <div className="flex items-start gap-3">
        <ServerCrash className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold">{displayTitle}</h4>
            {status > 0 && (
              <span className="font-mono text-xs px-1.5 py-0.5 bg-red-200/60 rounded text-red-800">
                HTTP {status}
              </span>
            )}
            {code && code !== 'UNKNOWN_ERROR' && (
              <span className="font-mono text-xs px-1.5 py-0.5 bg-red-100 rounded text-red-700">
                {code}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-red-700">{message}</p>

          {requestId && (
            <div className="mt-2 text-[11px] font-mono text-red-500">
              Correlation Request ID: <span className="select-all">{requestId}</span>
            </div>
          )}

          {details !== undefined && (
            <div className="mt-2 p-2 bg-red-100/60 rounded text-[11px] font-mono overflow-auto max-h-32 text-red-800">
              <pre>{typeof details === 'string' ? details : JSON.stringify(details, null, 2)}</pre>
            </div>
          )}

          {onRetry && (
            <div className="mt-3">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors"
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
  <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-slate-200 rounded-lg shadow-sm">
    <div className="p-3 bg-amber-50 text-amber-600 rounded-full mb-3">
      <ShieldAlert className="w-6 h-6" />
    </div>
    <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">{title}</h3>
    <p className="mt-1 text-xs text-slate-600 max-w-md">{message}</p>
    <div className="mt-4 text-[11px] text-slate-400 font-mono">
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
  <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-slate-200 rounded-lg shadow-sm">
    <div className="p-3 bg-slate-100 text-slate-500 rounded-full mb-3">
      <FileQuestion className="w-6 h-6" />
    </div>
    <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">{title}</h3>
    <p className="mt-1 text-xs text-slate-500 max-w-sm">{message}</p>
  </div>
);

export const BackendSupportRequiredState: React.FC<{
  feature: string;
  description?: string;
}> = ({
  feature,
  description = 'This capability is not exposed by the current backend REST API specification. Data is not fabricated.',
}) => (
  <div className="p-4 bg-slate-100 border border-slate-300 rounded-lg text-slate-700">
    <div className="flex items-center gap-2">
      <AlertTriangle className="w-4 h-4 text-slate-500" />
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
        Backend Support Required: {feature}
      </span>
    </div>
    <p className="mt-1 text-xs text-slate-500">{description}</p>
  </div>
);
