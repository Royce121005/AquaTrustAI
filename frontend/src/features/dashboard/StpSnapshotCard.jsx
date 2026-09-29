import { useCallback, useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import Button from '../../components/ui/Button.jsx'
import useAsyncData from '../../hooks/useAsyncData.js'
import { getStpOptions, getStpSnapshot } from '../../services/monitoring.js'
import { STP_PARAMETER_OPTIONS } from '../../constants/stpParameters.js'
import { formatUtcDate } from '../../utils/format.js'
import StpSelector from '../monitoring/StpSelector.jsx'

// Dataset-derived snapshot of the newest record per STP.
// Values are historical dataset readings — NOT live sensor measurements.
export default function StpSnapshotCard({ selectedStpId, onSelectStp }) {
  const [internalStpId, setInternalStpId] = useState('')
  const activeStpId = selectedStpId || internalStpId

  const handleSelect = (id) => {
    setInternalStpId(id)
    if (onSelectStp) onSelectStp(id)
  }

  const fetcher = useCallback(async () => {
    const options = await getStpOptions()
    const targetId =
      activeStpId && options.some((option) => option.id === activeStpId)
        ? activeStpId
        : (options[0]?.id ?? null)
    if (!targetId) {
      throw new Error('No STPs were found in the Bangalore dataset.')
    }
    const snapshot = await getStpSnapshot(targetId)
    return { options, snapshot }
  }, [activeStpId])

  const { status, data, error, reload } = useAsyncData(fetcher)

  return (
    <div id="single-stp-inspector">
      <Card
        title="Plant Deep Analyzer & Parameters"
        subtitle="Detailed laboratory telemetry & capacity metrics for selected facility · bangalore_clean.csv"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <StpSelector
              options={data?.options}
              value={data?.snapshot?.stp?.id ?? ''}
              onChange={handleSelect}
              disabled={status === 'loading'}
            />
            <StatusBadge tone="info" label="dataset-derived" dot={false} />
          </div>
        }
      >

      {status === 'loading' && (
        <div className="py-10">
          <Spinner size="lg" label="Loading dataset snapshot…" />
        </div>
      )}

      {status === 'error' && (
        <EmptyState
          icon={TriangleAlert}
          title="Could not load dataset readings"
          description={error?.message ?? 'Something went wrong while loading the dataset snapshot.'}
          action={<Button onClick={reload}>Try again</Button>}
        />
      )}

      {status === 'success' && data && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {STP_PARAMETER_OPTIONS.filter((parameter) => parameter.id !== 'temperature').map(
              (parameter) => {
                const raw = data.snapshot.readings[parameter.id]
                const display =
                  typeof raw === 'number'
                    ? raw.toFixed(parameter.decimals)
                    : '\u2014'
                return (
                  <div
                    key={parameter.id}
                    className="rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3"
                  >
                    <p className="text-xs font-medium text-slate-500">{parameter.label}</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-slate-800">
                      {display}
                      {typeof raw === 'number' && (
                        <span className="ml-1 text-xs font-normal text-slate-400">{parameter.unit}</span>
                      )}
                    </p>
                  </div>
                )
              },
            )}
          </div>

          <dl className="grid gap-x-6 gap-y-1 text-xs text-slate-500 sm:grid-cols-2">
            <div className="flex justify-between gap-3 sm:block">
              <dt className="sm:inline">Reading date:&nbsp;</dt>
              <dd className="font-medium text-slate-700 sm:inline">
                {formatUtcDate(data.snapshot.recordedAt)}
              </dd>
            </div>
            <div className="flex justify-between gap-3 sm:block">
              <dt className="sm:inline">Installed capacity (STP):&nbsp;</dt>
              <dd className="font-medium text-slate-700 sm:inline">
                {typeof data.snapshot.stp?.installedCapacityMld === 'number'
                  ? `${data.snapshot.stp.installedCapacityMld} MLD`
                  : '\u2014'}
              </dd>
            </div>
            <div className="flex justify-between gap-3 sm:block">
              <dt className="sm:inline">Treatment type:&nbsp;</dt>
              <dd className="font-medium text-slate-700 sm:inline">
                {data.snapshot.stp?.treatmentFacility ?? '\u2014'}
              </dd>
            </div>
            <div className="flex justify-between gap-3 sm:block">
              <dt className="sm:inline">City sewage generation:&nbsp;</dt>
              <dd className="font-medium text-slate-700 sm:inline">
                {typeof data.snapshot.city?.sewageGenerationMld === 'number'
                  ? `${data.snapshot.city.sewageGenerationMld} MLD`
                  : '\u2014'}
              </dd>
            </div>
            <div className="flex justify-between gap-3 sm:block">
              <dt className="sm:inline">City installed / operational capacity:&nbsp;</dt>
              <dd className="font-medium text-slate-700 sm:inline">
                {typeof data.snapshot.city?.installedCapacityMld === 'number'
                  ? `${data.snapshot.city.installedCapacityMld} / ${data.snapshot.city.operationalCapacityMld ?? '\u2014'} MLD`
                  : '\u2014'}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </Card>
    </div>
  )
}

