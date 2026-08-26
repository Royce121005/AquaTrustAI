// Minimal RFC 4180 CSV parser.
// Handles quoted fields, escaped quotes ("") and newlines inside quotes.
// No dependencies are used on purpose: the project has no CSV library.

/**
 * Parse a full CSV string into an array of row arrays.
 * The header row is NOT skipped; callers handle it.
 * @param {string} text Raw CSV content
 * @returns {string[][]}
 */
export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

/**
 * Convert a raw CSV field to a finite number, or null when absent/invalid.
 * Missing values are preserved as null — never silently replaced with a
 * substitute number such as zero or a mean.
 * @param {string|undefined} value
 * @returns {number|null}
 */
export function toNumberOrNull(value) {
  if (value === undefined || value === null) return null
  const trimmed = String(value).trim()
  if (trimmed === '') return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Normalise a header cell for tolerant matching:
 * lowercase, all whitespace removed. Used because the Bangalore dataset has
 * inconsistent headers (e.g. "Hebbal STP_avg_Ph", "Nagasandra STP_ avg_Total_Nitrogen").
 * @param {string} header
 * @returns {string}
 */
export function normalizeHeader(header) {
  return String(header).toLowerCase().replace(/\s+/g, '')
}

/**
 * Fetch a bundled CSV from /public and parse it. Results are cached per path so
 * repeated service calls do not re-download the file.
 * @param {string} fileName File under the public data directory, e.g. "bangalore_clean.csv"
 * @returns {Promise<{header: string[], rows: string[][]}>}
 */
const csvCache = new Map()

export async function loadBundledCsv(fileName) {
  if (csvCache.has(fileName)) return csvCache.get(fileName)

  const url = `${import.meta.env.BASE_URL}data/${fileName}`
  const promise = fetch(url).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Dataset "${fileName}" could not be loaded (HTTP ${response.status}).`)
    }
    const text = await response.text()
    const [header = [], ...rows] = parseCsv(text)
    return { header, rows }
  })

  csvCache.set(fileName, promise)

  try {
    return await promise
  } catch (error) {
    // Do not cache failed loads — allow retries after e.g. a dev-server restart.
    csvCache.delete(fileName)
    throw error
  }
}
