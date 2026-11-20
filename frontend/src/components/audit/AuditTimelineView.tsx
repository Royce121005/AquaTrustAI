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
    <div className="bg-[#111827] border border-[#1F293D] rounded-xl p-5 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[#1F293D]">
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
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition ${
                selectedCategory === cat
                  ? 'bg-[#0EA5E9] text-white shadow-[0_0_10px_rgba(14,165,233,0.3)]'
                  : 'bg-[#0B0F17] text-slate-400 border border-[#1F293D] hover:text-white hover:border-[#0EA5E9]/40'
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
            <div key={i} className="h-14 bg-[#161F30]/60 rounded-lg border border-[#1F293D]" />
          ))}
        </div>
      ) : !data || data.timeline.length === 0 ? (
        <p className="text-xs text-slate-400 italic text-center py-8 font-mono">
          No audit events recorded for the selected filter criteria.
        </p>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#1F293D]">
          {data.timeline.map((item) => (
            <div key={item.audit_log_id} className="relative group">
              {/* Timeline marker */}
              <div className="absolute -left-6 top-1.5 p-1 bg-[#0B0F17] border border-[#1F293D] rounded-full shadow-sm group-hover:border-[#0EA5E9] transition">
                {getCategoryIcon(item.category)}
              </div>

              <div className="bg-[#161F30]/70 hover:bg-[#1E293B] border border-[#1F293D] hover:border-[#0EA5E9]/40 rounded-xl p-3.5 transition">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 bg-[#0B0F17] text-slate-300 border border-[#1F293D] rounded">
                      {item.category}
                    </span>
                    <span className="text-xs font-semibold text-white">{item.action}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(item.timestamp).toLocaleTimeString()} ·{' '}
                    {new Date(item.timestamp).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{item.summary}</p>

                <div className="flex items-center space-x-3 text-[10px] text-slate-400 font-mono mt-2 pt-2 border-t border-[#1F293D]">
                  <span>Actor: <strong className="text-slate-300">{item.actor_role ?? 'system'}</strong></span>
                  <span>Outcome: <strong className="text-emerald-400">{item.outcome}</strong></span>
                  {item.resource_id && <span>Resource: <strong className="text-[#0EA5E9]">{item.resource_id.slice(0, 8)}...</strong></span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
