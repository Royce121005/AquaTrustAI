import pkg from '../../../package.json'
import Card from '../../components/ui/Card.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'

export default function SystemInformation() {
  const rows = [
    { label: 'Application', value: 'AquaTrust AI' },
    { label: 'Environment', value: 'Demo frontend (provisional mock services)' },
    { label: 'Data sources', value: 'Mock service layer — FastAPI integration pending' },
    { label: 'AI models', value: 'Provisional stand-in outputs only' },
    { label: 'Frontend version', value: pkg.version },
    { label: 'Preference storage', value: 'Browser localStorage (this device only)' },
  ]

  return (
    <Card title="System information" subtitle="Read-only" actions={<StatusBadge tone="warning" label="provisional" dot={false} />}>
      <dl className="divide-y divide-slate-100">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
            <dt className="text-sm text-slate-500">{row.label}</dt>
            <dd className="min-w-0 truncate text-right text-sm font-medium text-slate-700">{row.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}
