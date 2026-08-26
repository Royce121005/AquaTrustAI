// Centralized monitoring UI options.
// These generic sensor parameters belong to the provisional sensor views
// (Sensors page, legacy demo trend feeds) and remain mock-backed until a live
// backend parameter feed exists. Historical STP parameters from
// bangalore_clean.csv are defined in constants/stpParameters.js.

export const PARAMETER_OPTIONS = [
  { id: 'temperature', label: 'Temperature' },
  { id: 'turbidity', label: 'Turbidity' },
  { id: 'conductivity', label: 'Conductivity' },
  { id: 'flow-rate', label: 'Flow rate' },
]

export function getParameterLabel(parameterId) {
  return PARAMETER_OPTIONS.find((parameter) => parameter.id === parameterId)?.label ?? parameterId
}
