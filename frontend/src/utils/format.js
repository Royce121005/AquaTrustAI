export function formatTimestamp(isoString) {
  if (!isoString) return '\u2014'
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return isoString
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDate(isoString) {
  if (!isoString) return '\u2014'
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return isoString
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
