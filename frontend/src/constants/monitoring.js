// Centralized monitoring UI options.
// Parameter ids are aligned with the provisional monitoring service until a
// backend parameter-metadata endpoint exists.

export const PARAMETER_OPTIONS = [
  { id: 'temperature', label: 'Temperature' },
  { id: 'turbidity', label: 'Turbidity' },
  { id: 'conductivity', label: 'Conductivity' },
  { id: 'flow-rate', label: 'Flow rate' },
]

export const HISTORY_INTERVAL_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 60, label: '1 hour' },
  { value: 180, label: '3 hours' },
  { value: 360, label: '6 hours' },
  { value: 1440, label: '24 hours' },
]

export function getParameterLabel(parameterId) {
  return PARAMETER_OPTIONS.find((parameter) => parameter.id === parameterId)?.label ?? parameterId
}

export function defaultHistoryFilters() {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
  const toDateInputValue = (date) => date.toISOString().slice(0, 10)

  return {
    parameterId: PARAMETER_OPTIONS[0].id,
    from: toDateInputValue(weekAgo),
    to: toDateInputValue(now),
    intervalMinutes: 60,
  }
}
