import { useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw, TriangleAlert, FileCheck2 } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import Button from '../../components/ui/Button.jsx'
import Table from '../../components/ui/Table.jsx'
import useAsyncData from '../../hooks/useAsyncData.js'
import { getReports } from '../../services/compliance.js'
import { formatDate } from '../../utils/format.js'
import CpcbCertificateModal from './CpcbCertificateModal.jsx'

const STATUS_TONES = {
  final: 'success',
  submitted: 'info',
  draft: 'neutral',
}

export default function ReportsTable() {
  const { status, data, error, reload } = useAsyncData(getReports)
  const [selectedReport, setSelectedReport] = useState(null)

  const columns = [
    { key: 'title', header: 'Report', className: 'font-medium text-slate-800' },
    {
      key: 'period',
      header: 'Period',
      render: (row) => `${row.periodStart} \u2192 ${row.periodEnd}`,
      className: 'text-slate-600',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge tone={STATUS_TONES[row.status] ?? 'neutral'} label={row.status} />,
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (row) => formatDate(row.createdAt),
      className: 'text-slate-600',
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'sr-only',
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setSelectedReport(row)}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200 transition-colors hover:bg-emerald-50"
          >
            <FileCheck2 className="h-3 w-3" />
            CPCB Return
          </button>
          <Link
            to={`/compliance/reports/${row.id}`}
            className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-200 transition-colors hover:bg-sky-50"
          >
            View
          </Link>
        </div>
      ),
      className: 'text-right',
    },
  ]

  return (
    <>
      <Card
        title="Compliance & Regulatory Reports"
        subtitle="Audited discharge statements adhering to CPCB Form V and OCEMS norms"
        actions={
          <Button variant="ghost" size="sm" onClick={reload}>
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        }
      >
        {status === 'loading' && (
          <div className="py-10">
            <Spinner size="lg" label="Loading reports…" />
          </div>
        )}

        {status === 'error' && (
          <EmptyState
            icon={TriangleAlert}
            title="Could not load reports"
            description={error?.message ?? 'Something went wrong while loading reports.'}
            action={<Button onClick={reload}>Try again</Button>}
          />
        )}

        {status === 'success' && (data === null || data.length === 0) && (
          <EmptyState title="No reports yet" description="Generated reports will appear here." />
        )}

        {status === 'success' && data !== null && data.length > 0 && (
          <Table columns={columns} rows={data} getRowKey={(row) => row.id} />
        )}
      </Card>

      <CpcbCertificateModal
        isOpen={Boolean(selectedReport)}
        onClose={() => setSelectedReport(null)}
        report={selectedReport}
      />
    </>
  )
}
