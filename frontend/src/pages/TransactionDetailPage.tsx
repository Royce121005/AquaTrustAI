import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getDLTTransactionApi } from '../api/dlt';
import { LoadingState, ErrorState } from '../components/common/States';
import { ArrowLeft, Blocks, Hash, Cpu, Layers } from 'lucide-react';

export const TransactionDetailPage: React.FC = () => {
  const { txId } = useParams<{ txId: string }>();

  const txQuery = useQuery({
    queryKey: ['dlt-transaction', txId],
    queryFn: () => getDLTTransactionApi(txId!),
    enabled: !!txId,
  });

  if (!txId) {
    return <ErrorState error={new Error('No transaction ID provided in URL path')} />;
  }

  if (txQuery.isLoading) {
    return <LoadingState message="Querying DLT ledger transaction payload..." />;
  }

  if (txQuery.isError) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link to="/blockchain" className="hover:text-brand-600 inline-flex items-center gap-1 font-medium">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to DLT Ledger
          </Link>
        </div>
        <ErrorState
          title="Transaction Not Found On Ledger"
          error={txQuery.error}
          onRetry={() => txQuery.refetch()}
        />
      </div>
    );
  }

  const tx = txQuery.data!;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link to="/blockchain" className="hover:text-[#0EA5E9] inline-flex items-center gap-1.5 font-medium transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to DLT Ledger
        </Link>
      </div>

      <div className="bg-[#111827] border border-[#1F293D] rounded-xl p-6 shadow-xl">
        <div className="flex items-center gap-3 pb-4 border-b border-[#1F293D]">
          <div className="p-3 bg-[#0B0F17] border border-[#1F293D] text-[#0EA5E9] rounded-xl shadow-[0_0_15px_rgba(14,165,233,0.15)]">
            <Blocks className="w-6 h-6 text-[#0EA5E9]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">
              DLT Ledger Transaction Detail
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-0.5 select-all">
              Tx ID: <span className="font-semibold text-[#0EA5E9]">{txId}</span>
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3 text-xs font-mono">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[11px] block uppercase font-semibold">
              Immutable Transaction Payload (Read-Only Ledger Proof):
            </span>
            <span className="text-[10px] text-slate-500 font-mono">JSON ENCODED</span>
          </div>
          <div className="p-4 bg-[#0B0F17] border border-[#1F293D] text-emerald-400 rounded-lg overflow-auto max-h-96 select-all">
            <pre className="text-[11px] leading-relaxed">{JSON.stringify(tx, null, 2)}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};
