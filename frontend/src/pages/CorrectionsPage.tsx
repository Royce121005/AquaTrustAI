import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { listTreatmentRecordsApi } from '../api/treatmentRecords';
import { GitCommit, Search, ArrowRight, Layers, ShieldCheck } from 'lucide-react';

export const CorrectionsPage: React.FC = () => {
  const [recordIdInput, setRecordIdInput] = useState<string>('');
  const navigate = useNavigate();

  const { data: treatmentRecords, isLoading } = useQuery({
    queryKey: ['treatment-records', { limit: 20 }],
    queryFn: () => listTreatmentRecordsApi({ limit: 20 }),
  });

  const handleGo = (e: React.FormEvent) => {
    e.preventDefault();
    if (recordIdInput.trim()) {
      navigate(`/corrections/${recordIdInput.trim()}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-[#1F293D] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0EA5E9]/10 border border-[#0EA5E9]/30 flex items-center justify-center text-[#0EA5E9]">
              <GitCommit className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Append-Only Correction Lineage Portal
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Audit immutable treatment record lineage, inspect version DAG trees, or propose regulatory corrections.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#111827] border border-[#1F293D] text-[10px] font-mono uppercase tracking-widest text-slate-300">
            <ShieldCheck className="w-3 h-3 text-[#10B981]" />
            IMMUTABLE LEDGER LINEAGE
          </span>
        </div>
      </div>

      {/* UUID Search Form */}
      <div className="bg-[#111827] border border-[#1F293D] rounded-xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-[#0EA5E9]" />
            Lookup Lineage Graph by Record UUID
          </h2>
          <span className="text-[10px] font-mono text-slate-500">RFC 4122 Canonical UUID</span>
        </div>
        <form onSubmit={handleGo} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            required
            value={recordIdInput}
            onChange={(e) => setRecordIdInput(e.target.value)}
            placeholder="Paste Treatment Record UUID (e.g. 123e4567-e89b-12d3-a456-426614174000)..."
            className="flex-1 bg-[#0B0F17] border border-[#1F293D] rounded-lg px-4 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#0EA5E9] focus:border-[#0EA5E9] transition-all"
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(14,165,233,0.3)] transition-all flex items-center justify-center gap-2 shrink-0"
          >
            <Search className="w-3.5 h-3.5" />
            Inspect Lineage Graph
          </button>
        </form>
      </div>

      {/* Available Records List */}
      <div className="bg-[#111827] border border-[#1F293D] rounded-xl shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1F293D] flex items-center justify-between bg-[#161F30]/60">
          <h2 className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-[#0EA5E9]" />
            Recent Treatment Records Available for Lineage Audit
          </h2>
          <span className="text-[10px] font-mono text-slate-400">
            {treatmentRecords?.length ?? 0} Records Loaded
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs font-mono text-slate-400">
            <div className="w-6 h-6 border-2 border-[#0EA5E9] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading Treatment Records...
          </div>
        ) : (
          <div className="divide-y divide-[#1F293D] font-mono text-xs">
            {treatmentRecords?.map((r) => (
              <div
                key={r.record_id}
                className="p-4 hover:bg-[#161F30] flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#0EA5E9] select-all">
                      {r.record_id}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#0B0F17] border border-[#1F293D] text-[10px] text-slate-300 font-bold">
                      v{r.record_version}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      r.record_state === 'FINALIZED'
                        ? 'bg-[#10B981]/10 text-emerald-400 border border-[#10B981]/30'
                        : r.record_state === 'SUPERSEDED'
                        ? 'bg-[#F59E0B]/10 text-amber-400 border border-[#F59E0B]/30'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      {r.record_state}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 font-sans">
                    Window: {new Date(r.period_start).toLocaleDateString()} –{' '}
                    {new Date(r.period_end).toLocaleDateString()} • Facility: <span className="font-mono text-slate-300">{r.facility_id}</span>
                  </div>
                </div>
                <Link
                  to={`/corrections/${r.record_id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B0F17] border border-[#1F293D] text-xs font-semibold text-[#0EA5E9] hover:bg-[#0EA5E9]/10 hover:border-[#0EA5E9]/40 transition-colors shrink-0"
                >
                  <span>Inspect Lineage</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
