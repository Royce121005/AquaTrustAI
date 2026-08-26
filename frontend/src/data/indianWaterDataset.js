// Data-access layer for indian_water_clean.csv (bundled under /public/data/).
//
// Dataset facts (verified against the file):
// - 194 station-year records, years 2021-2023, 17 states, 11 water-body types.
// - Each row carries Min/Max ranges per parameter: Temperature, Dissolved oxygen,
//   pH, Conductivity (µmho/cm), BOD, NitrateN, Total Coliform, Fecal coliform.
// - Missing cells AND non-numeric sentinels ("BDL" = below detection limit,
//   "-" = not recorded, found in the Fecal coliform columns) are mapped to
//   null — never silently replaced with substitute numbers.
//
// Role: supporting water-quality/compliance reference data. It is NOT merged
// with the Bangalore STP dataset; the two describe different things.

import { loadBundledCsv, normalizeHeader, toNumberOrNull } from '../utils/csv.js'

export const INDIAN_WATER_DATASET_FILE = 'indian_water_clean.csv'
export const INDIAN_WATER_DATA_SOURCE_LABEL = 'indian_water_clean.csv (national water-quality monitoring dataset)'

// Column fragments -> normalized lookup keys. Conductivity unit is displayed as
// µmho/cm because the raw header contains a mojibake'd micro sign.
const FIELD_COLUMNS = {
  temperatureMinC: ['temperature(c)-min'],
  temperatureMaxC: ['temperature(c)-max'],
  dissolvedOxygenMin: ['dissolved-min'],
  dissolvedOxygenMax: ['dissolved-max'],
  phMin: ['ph-min'],
  phMax: ['ph-max'],
  conductivityMin: ['conductivity(¬µmho/cm)-min', 'conductivity(µmho/cm)-min', 'conductivity(μmho/cm)-min'],
  conductivityMax: ['conductivity(¬µmho/cm)-max', 'conductivity(µmho/cm)-max', 'conductivity(μmho/cm)-max'],
  bodMin: ['bod(mg/l)-min'],
  bodMax: ['bod(mg/l)-max'],
  nitrateNMin: ['nitraten(mg/l)-min'],
  nitrateNMax: ['nitraten(mg/l)-max'],
  totalColiformMin: ['totalcoliform(mpn/100ml)-min'],
  totalColiformMax: ['totalcoliform(mpn/100ml)-max'],
  fecalMin: ['fecal-min'],
  fecalMax: ['fecal-max'],
}

function pickRange(record, prefix) {
  return {
    min: record[`${prefix}Min`],
    max: record[`${prefix}Max`],
  }
}

function buildDataset() {
  return loadBundledCsv(INDIAN_WATER_DATASET_FILE).then(({ header, rows }) => {
    const columnIndex = new Map()
    header.forEach((name, index) => {
      const key = normalizeHeader(name)
      if (!columnIndex.has(key)) columnIndex.set(key, index)
    })

    // Resolve each field to a column index; several tolerated spellings for
    // conductivity because of the encoding-damaged header cell.
    const resolveField = (candidates) => {
      for (const candidate of candidates) {
        if (columnIndex.has(candidate)) return columnIndex.get(candidate)
      }
      return null
    }

    // The raw header is mojibake'd ("Conductivity (¬µmho/cm)"), so fall back to
    // a prefix/suffix match instead of relying on exact unit characters.
    const resolveConductivity = (bound) => {
      const direct = resolveField([
        `conductivity(\u00AC\u00B5mho/cm)-${bound}`,
        `conductivity(\u00B5mho/cm)-${bound}`,
        `conductivity(\u03BCmho/cm)-${bound}`,
      ])
      if (direct !== null) return direct
      for (const [key, index] of columnIndex.entries()) {
        if (key.startsWith('conductivity(') && key.endsWith(`-${bound}`)) return index
      }
      return null
    }

    const resolved = {}
    Object.entries(FIELD_COLUMNS).forEach(([field, candidates]) => {
      resolved[field] = field.startsWith('conductivity') ? null : resolveField(candidates)
    })
    resolved.conductivityMin = resolveConductivity('min')
    resolved.conductivityMax = resolveConductivity('max')

    const idx = {
      stnCode: columnIndex.get('stncode'),
      location: columnIndex.get('monitoringlocation'),
      year: columnIndex.get('year'),
      type: columnIndex.get('typewaterbody'),
      state: columnIndex.get('statename'),
    }

    const records = []
    const seenKeys = new Set()

    rows.forEach((row) => {
      const stnCode = String(row[idx.stnCode] ?? '').trim()
      const location = String(row[idx.location] ?? '').trim()
      const year = toNumberOrNull(row[idx.year])
      if (!stnCode || !location || year === null) return

      const dedupeKey = `${stnCode}|${location}|${year}`
      if (seenKeys.has(dedupeKey)) return
      seenKeys.add(dedupeKey)

      const flat = {}
      Object.entries(resolved).forEach(([field, index]) => {
        flat[field] = index === null ? null : toNumberOrNull(row[index])
      })

      records.push({
        id: dedupeKey,
        stnCode,
        location,
        year,
        waterBodyType: String(row[idx.type] ?? '').trim(),
        state: String(row[idx.state] ?? '').trim(),
        ranges: {
          temperatureC: pickRange(flat, 'temperature'),
          dissolvedOxygenMgPerL: pickRange(flat, 'dissolvedOxygen'),
          ph: pickRange(flat, 'ph'),
          conductivityUmhoPerCm: pickRange(flat, 'conductivity'),
          bodMgPerL: pickRange(flat, 'bod'),
          nitrateNMgPerL: pickRange(flat, 'nitrateN'),
          totalColiformMpnPer100ml: pickRange(flat, 'totalColiform'),
          fecalColiformMpnPer100ml: pickRange(flat, 'fecal'),
        },
      })
    })

    records.sort((a, b) => a.state.localeCompare(b.state) || a.location.localeCompare(b.location) || a.year - b.year)

    const uniqueSorted = (values) => [...new Set(values)].sort((a, b) => String(a).localeCompare(String(b)))

    return {
      records,
      meta: {
        states: uniqueSorted(records.map((record) => record.state)),
        years: uniqueSorted(records.map((record) => record.year)),
        waterBodyTypes: uniqueSorted(records.map((record) => record.waterBodyType)),
        totalCount: records.length,
      },
    }
  })
}

let datasetPromise = null

function getDataset() {
  if (!datasetPromise) datasetPromise = buildDataset()
  return datasetPromise
}

export async function getIndianWaterDatasetInfo() {
  const dataset = await getDataset()
  return {
    sourceLabel: INDIAN_WATER_DATA_SOURCE_LABEL,
    fileName: INDIAN_WATER_DATASET_FILE,
    recordCount: dataset.meta.totalCount,
    yearRange: [dataset.meta.years[0], dataset.meta.years[dataset.meta.years.length - 1]],
    stateCount: dataset.meta.states.length,
  }
}

/**
 * @param {{state?:string|null, year?:number|string|null, waterBodyType?:string|null}} filters
 */
export async function getWaterQualityRecords(filters = {}) {
  const dataset = await getDataset()
  const { state, year, waterBodyType } = filters ?? {}

  const filtered = dataset.records.filter((record) => {
    if (state && record.state !== state) return false
    if (year !== undefined && year !== null && year !== '' && Number(year) !== record.year) return false
    if (waterBodyType && record.waterBodyType !== waterBodyType) return false
    return true
  })

  return {
    records: filtered,
    meta: dataset.meta,
    sourceLabel: INDIAN_WATER_DATA_SOURCE_LABEL,
  }
}
