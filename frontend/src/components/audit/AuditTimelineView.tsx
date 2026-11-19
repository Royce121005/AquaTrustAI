/**
 * AquaTrust AI — Audit Timeline View
 * Interactive chronological audit trail visualizer categorized by lifecycle domain.
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Clock,
  Filter,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  TrendingUp,
  Cpu,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { getAuditTimelineApi, AuditTimelineItem } from '../../api/audit';

interface AuditTimelineViewProps {
  facilityId?: string;
}

const CATEGORIES = [
  'ALL',
  'TELEMETRY',
  'ANOMALY',
  'PREDICTION',
  'RECOMMENDATION',
  'COMPLIANCE',
  'CORRECTION',
  'FINALIZATION',
  'CALIBRATION',
];

export const AuditTimelineView: React.FC<AuditTimelineViewProps> = ({ facilityId }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['audit-timeline', facilityId, selectedCategory],
    queryFn: () =>
      getAuditTimelineApi({
        facility_id: facilityId,
        category: selectedCategory === 'ALL' ? undefined : selectedCategory,
        limit: 50,
      }),
    refetchInterval: 15000,
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'ANOMALY':
        return <AlertTriangle className="h-4 w-4 text-amber-400" />;
      case 'PREDICTION':
        return <TrendingUp className="h-4 w-4 text-indigo-400" />;
      case 'RECOMMENDATION':
        return <Sparkles className="h-4 w-4 text-sky-400" />;
      case 'COMPLIANCE':
        return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
      case 'FINALIZATION':
        return <FileCheck className="h-4 w-4 text-violet-400" />;
      case 'CORRECTION':
        return <RotateCcw className="h-4 w-4 text-rose-400" />;
      case 'CALIBRATION':
        return <Cpu className="h-4 w-4 text-cyan-400" />;
      default:
        return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-white">Centralized Lifecycle Audit Trail</h3>
          <p className="text-xs text-slate-400">
            Immutable domain events across Telemetry, AI, Compliance, and DLT Finalizations
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                selectedCategory === cat
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse py-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 bg-slate-800/40 rounded-lg" />
          ))}
        </div>
      ) : !data || data.timeline.length === 0 ? (
        <p className="text-xs text-slate-400 italic text-center py-8">
          No audit events recorded for the selected filter criteria.
        </p>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
          {data.timeline.map((item) => (
            <div key={item.audit_log_id} className="relative group">
              {/* Timeline marker */}
              <div className="absolute -left-6 top-1.5 p-1 bg-slate-900 border border-slate-700 rounded-full shadow-sm group-hover:border-sky-500 transition">
                {getCategoryIcon(item.category)}
              </div>

              <div className="bg-slate-800/40 hover:bg-slate-800/70 border border-slate-800 hover:border-slate-700 rounded-lg p-3 transition">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded">
                      {item.category}
                    </span>
                    <span className="text-xs font-semibold text-slate-200">{item.action}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(item.timestamp).toLocaleTimeString()} ·{' '}
                    {new Date(item.timestamp).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-xs text-slate-300 mt-1">{item.summary}</p>

                <div className="flex items-center space-x-3 text-[10px] text-slate-500 mt-2 pt-1 border-t border-slate-800/60">
                  <span>Actor: {item.actor_role ?? 'system'}</span>
                  <span>Outcome: {item.outcome}</span>
                  {item.resource_id && <span>Resource: {item.resource_id.slice(0, 8)}...</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
