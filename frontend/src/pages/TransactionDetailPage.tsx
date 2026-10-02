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
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/blockchain" className="hover:text-brand-600 inline-flex items-center gap-1 font-medium">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to DLT Ledger
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="p-3 bg-slate-900 text-brand-400 rounded-lg">
            <Blocks className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              DLT Ledger Transaction Detail
            </h1>
            <p className="text-xs text-slate-500 font-mono mt-0.5 select-all">
              Tx ID: <span className="font-semibold text-slate-800">{txId}</span>
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4 text-xs font-mono">
          <span className="text-slate-500 text-[11px] block uppercase font-semibold">
            Immutable Transaction Payload (Read-Only Ledger Proof):
          </span>
          <div className="p-4 bg-slate-900 text-emerald-400 rounded-lg overflow-auto max-h-96">
            <pre>{JSON.stringify(tx, null, 2)}</pre>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
          Source: GET /dlt/transactions/{txId} (DLT Gateway authoritative ledger response)
        </div>
      </div>
    </div>
  );
};
