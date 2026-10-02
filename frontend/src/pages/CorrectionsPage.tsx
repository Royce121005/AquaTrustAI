import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { listTreatmentRecordsApi } from '../api/treatmentRecords';
import { GitCommit, Search, ArrowRight, Layers } from 'lucide-react';

export const CorrectionsPage: React.FC = () => {
  const [recordIdInput, setRecordIdInput] = useState<string>('');
  const navigate = useNavigate();

  const { data: treatmentRecords } = useQuery({
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
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <GitCommit className="w-5 h-5 text-brand-600" />
          Append-Only Correction Lineage Portal
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Select or search an immutable treatment record to inspect its version provenance tree or propose regulatory corrections.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
          Lookup Provenance Chain by Record UUID
        </h2>
        <form onSubmit={handleGo} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            required
            value={recordIdInput}
            onChange={(e) => setRecordIdInput(e.target.value)}
            placeholder="Paste Treatment Record UUID..."
            className="flex-1 bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs font-mono text-slate-800 focus:ring-1 focus:ring-brand-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-1.5 shrink-0"
          >
            <Search className="w-3.5 h-3.5" />
            Inspect Lineage Graph
          </button>
        </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
            Recent Treatment Records Available for Lineage Audit
          </h2>
        </div>

        <div className="divide-y divide-slate-100 font-mono text-xs">
          {treatmentRecords?.map((r) => (
            <div
              key={r.record_id}
              className="p-4 hover:bg-slate-50 flex items-center justify-between transition-colors"
            >
              <div>
                <div className="font-semibold text-brand-700">
                  {r.record_id} (Version {r.record_version})
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 font-sans">
                  Window: {new Date(r.period_start).toLocaleDateString()} -{' '}
                  {new Date(r.period_end).toLocaleDateString()} • State: {r.record_state}
                </div>
              </div>
              <Link
                to={`/corrections/${r.record_id}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800 font-sans"
              >
                Inspect Lineage &rarr;
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
