import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatTimestamp } from '../../utils/format.js'
import { useSettings } from '../../hooks/useSettings.js'

const TOOLTIP_STYLE = {
  borderRadius: '0.75rem',
  border: '1px solid #e2e8f0',
  fontSize: '12px',
  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
}

export default function PredictionChart({ points, unit }) {
  const { settings } = useSettings()

  if (!points || points.length === 0) return null

  // The contract allows an optional observed value per point; render it only
  // when the backend actually supplies one.
  const hasActualValues = points.some((point) => typeof point.actualValue === 'number')

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={points} margin={{ top: 6, right: 16, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis
          dataKey="timestamp"
          tickFormatter={(timestamp) =>
            new Date(timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
          }
          stroke="#94a3b8"
          fontSize={11}
          tickLine={false}
          axisLine={{ stroke: '#cbd5e1' }}
          minTickGap={40}
        />
        <YAxis
          width={56}
          domain={['auto', 'auto']}
          stroke="#94a3b8"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          {...(unit
            ? {
                label: {
                  value: unit,
                  angle: -90,
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fill: '#64748b', fontSize: 11 },
                },
              }
            : {})}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value, name) => [unit ? `${value} ${unit}` : String(value), name]}
          labelFormatter={(timestamp) => formatTimestamp(timestamp)}
        />
        <Legend verticalAlign="top" height={32} iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
        {hasActualValues && (
          <Line
            type="monotone"
            dataKey="actualValue"
            name="Observed value"
            stroke="#0f766e"
            strokeWidth={1.5}
            dot={{ r: 2 }}
            connectNulls
            isAnimationActive={settings.chartAnimations}
          />
        )}
        <Line
          type="monotone"
          dataKey="predictedValue"
          name="Predicted value"
          stroke="#0284c7"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          isAnimationActive={settings.chartAnimations}
        />
        <Line
          type="monotone"
          dataKey="confidenceHigh"
          name="Interval upper bound"
          stroke="#94a3b8"
          strokeWidth={1.5}
          strokeDasharray="6 4"
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="confidenceLow"
          name="Interval lower bound"
          stroke="#94a3b8"
          strokeWidth={1.5}
          strokeDasharray="6 4"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
