// Metadata for water-quality parameters available in bangalore_clean.csv.
// These are the historical STP laboratory/monitoring parameters — distinct from
// the provisional sensor parameters in constants/monitoring.js, which stay
// mock-backed until a live backend exists.

export const STP_PARAMETER_OPTIONS = [
  { id: 'cod', label: 'COD', unit: 'mg/L', decimals: 2 },
  { id: 'bod', label: 'BOD', unit: 'mg/L', decimals: 2 },
  { id: 'ph', label: 'pH', unit: 'pH', decimals: 2 },
  { id: 'tss', label: 'TSS', unit: 'mg/L', decimals: 2 },
  { id: 'ammonical-nitrogen', label: 'Ammonical Nitrogen', unit: 'mg/L', decimals: 3 },
  { id: 'total-nitrogen', label: 'Total Nitrogen', unit: 'mg/L', decimals: 3 },
  { id: 'temperature', label: 'Temperature (ambient)', unit: '\u00B0C', decimals: 1 },
]

export const DEFAULT_STP_PARAMETER = 'cod'

// Primary ML targets agreed with the AI/ML member (COD first).
export const ML_TARGET_PARAMETERS = ['cod', 'bod', 'tss', 'ph']

export function getStpParameter(parameterId) {
  return STP_PARAMETER_OPTIONS.find((parameter) => parameter.id === parameterId)
}

export function getStpParameterLabel(parameterId) {
  return getStpParameter(parameterId)?.label ?? parameterId
}

export function isStpParameter(parameterId) {
  return STP_PARAMETER_OPTIONS.some((parameter) => parameter.id === parameterId)
}

// Default filters for the historical-data view. Empty from/to means "full
// dataset range" — the dataset's own bounds are used, never fabricated dates.
export function defaultStpHistoryFilters() {
  return {
    stpId: '',
    parameterId: DEFAULT_STP_PARAMETER,
    from: '',
    to: '',
  }
}
