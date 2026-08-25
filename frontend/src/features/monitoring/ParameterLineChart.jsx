import {
  CartesianGrid,
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

export default function ParameterLineChart({ points, unit, label }) {
  const { settings } = useSettings()

  if (!points || points.length === 0) return null

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={points} margin={{ top: 10, right: 16, bottom: 4, left: 4 }}>
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
          minTickGap={48}
        />
        <YAxis
          width={56}
          domain={['auto', 'auto']}
          stroke="#94a3b8"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          label={{
            value: unit,
            angle: -90,
            position: 'insideLeft',
            style: { textAnchor: 'middle', fill: '#64748b', fontSize: 11 },
          }}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value) => [`${value} ${unit}`, label]}
          labelFormatter={(timestamp) => formatTimestamp(timestamp)}
        />
        <Line
          type="monotone"
          dataKey="value"
          name={label}
          stroke="#0284c7"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          isAnimationActive={settings.chartAnimations}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
