// Data-access layer for bangalore_clean.csv (bundled under /public/data/).
//
// Dataset facts (verified against the file):
// - 1,382 daily records, 2019-11-01 .. 2023-08-13, no calendar gaps, no duplicate dates.
// - City-level columns: State, City/Town, Sewage Generation, Installed Capacity,
//   Operational Capacity, Temperature (Avg/Max/Min), Date.
// - Nine STPs, each with avg_COD, avg_BOD, avg_pH, avg_TSS, avg_Ammonical_Nitrogen,
//   avg_Total_Nitrogen, Installed_Capacity_MLD and Treatment Facility columns.
// - Header quirks handled via normalised matching ("Hebbal STP_avg_Ph",
//   "Nagasandra STP_ avg_Total_Nitrogen" — irregular case and spacing).
//
// Missing/invalid cells are mapped to null and never replaced with substitute numbers.

import { loadBundledCsv, normalizeHeader, toNumberOrNull } from '../utils/csv.js'
import { isSensorExcludedFromCompliance } from '../lib/calibration/calibrationStore.js'


export const BANGALORE_DATASET_FILE = 'bangalore_clean.csv'
export const BANGALORE_DATA_SOURCE_LABEL = 'bangalore_clean.csv (historical STP dataset)'

// STP display names, exactly as prefixed in the dataset columns
// ("… STP_avg_COD", "… STP_Treatment Facility").
const STP_NAMES = [
  'Nagasandra STP',
  'Madiwala STP',
  'Hebbal STP',
  'Yelahanka STP',
  'Jakkur STP',
  'Rajacanal STP',
  'K.R. Puram STP',
  'Cubbon Park STP',
  'Lalbagh STP',
]

// parameter id -> tolerant list of column suffix fragments used by the dataset
const PARAMETER_SUFFIXES = {
  cod: ['avg_cod'],
  bod: ['avg_bod'],
  ph: ['avg_ph'],
  tss: ['avg_tss'],
  'ammonical-nitrogen': ['avg_ammonical_nitrogen'],
  'total-nitrogen': ['avg_total_nitrogen'],
}

const CITY_COLUMNS = {
  temperature: 'temperature(avg)',
  temperatureMax: 'maxtemperature',
  temperatureMin: 'mintemperature',
  sewageGeneration: 'sewage_generation_mld',
  installedCapacity: 'installed_capacity_mld',
  operationalCapacity: 'operational_capacity_mld',
}

function slugifyStp(name) {
  return (
    String(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      // Keep ids free of the redundant "st-p" suffix carried by display names.
      .replace(/-?st-?p$/, '')
  )
}

/** Convert a dataset date string ("2019-11-01") to UTC-midnight ISO so that
 * timezone offsets can never shift the displayed calendar day. */
function toUtcIsoDate(dateString) {
  const trimmed = String(dateString ?? '').trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed)
  if (!match) return null
  return `${match[1]}-${match[2]}-${match[3]}T00:00:00.000Z`
}

function buildDataset() {
  return loadBundledCsv(BANGALORE_DATASET_FILE).then(({ header, rows }) => {
    // Normalised header -> column index (whitespace/case-insensitive lookup).
    // Note: normalisation strips ALL whitespace, so "Nagasandra STP_avg_COD"
    // becomes "nagasandrastp_avg_cod".
    const columnIndex = new Map()
    header.forEach((name, index) => {
      const key = normalizeHeader(name)
      if (!columnIndex.has(key)) columnIndex.set(key, index)
    })

    const resolveColumn = (...fragments) => {
      const key = fragments.filter(Boolean).join('_')
      return columnIndex.has(key) ? columnIndex.get(key) : null
    }

    const stps = STP_NAMES.map((name) => {
      // Idempotent "…stp" prefix whether or not the display name carries it.
      const prefix = `${normalizeHeader(name).replace(/stp$/, '')}stp`
      const columns = {}
      Object.entries(PARAMETER_SUFFIXES).forEach(([parameterId, suffixes]) => {
        columns[parameterId] = resolveColumn(prefix, suffixes[0])
      })
      columns.installedCapacity = resolveColumn(prefix, 'installed_capacity_mld')
      columns.treatmentFacility = columnIndex.has(`${prefix}_treatmentfacility`)
        ? columnIndex.get(`${prefix}_treatmentfacility`)
        : null

      if (columns.cod === null || columns.bod === null || columns.ph === null || columns.tss === null) {
        throw new Error(`bangalore_clean.csv: could not locate parameter columns for "${name}".`)
      }

      return { name, id: slugifyStp(name), columns }
    })

    const cityIdx = {
      date: columnIndex.get('date'),
      temperature: columnIndex.get('temperature(avg)') ?? null,
      temperatureMax: columnIndex.get('maxtemperature') ?? null,
      temperatureMin: columnIndex.get('mintemperature') ?? null,
      sewageGeneration: columnIndex.get(CITY_COLUMNS.sewageGeneration),
      installedCapacity: columnIndex.get(CITY_COLUMNS.installedCapacity),
      operationalCapacity: columnIndex.get(CITY_COLUMNS.operationalCapacity),
    }

    if (cityIdx.date === undefined || cityIdx.date === null) {
      throw new Error('bangalore_clean.csv: "Date" column not found.')
    }

    /** @type {Array<{timestamp:string, values:Object<string,(number|null)>}>} */
    const records = []
    /** Per-STP metadata taken from the first non-empty cell. */
    const stpMeta = new Map(
      stps.map((stp) => [stp.id, { id: stp.id, name: stp.name, installedCapacityMld: null, treatmentFacility: null }]),
    )

    rows.forEach((row) => {
      const timestamp = toUtcIsoDate(row[cityIdx.date])
      if (!timestamp) return

      const values = {}
      stps.forEach((stp) => {
        const perParameter = {}
        Object.entries(PARAMETER_SUFFIXES).forEach(([parameterId]) => {
          perParameter[parameterId] =
            stp.columns[parameterId] === null ? null : toNumberOrNull(row[stp.columns[parameterId]])
        })
        values[stp.id] = perParameter

        const meta = stpMeta.get(stp.id)
        if (meta.installedCapacityMld === null && stp.columns.installedCapacity !== null) {
          meta.installedCapacityMld = toNumberOrNull(row[stp.columns.installedCapacity])
        }
        if (meta.treatmentFacility === null && stp.columns.treatmentFacility !== null) {
          const raw = String(row[stp.columns.treatmentFacility] ?? '').trim()
          meta.treatmentFacility = raw === '' ? null : raw.replace(/\s+/g, ' ')
        }
      })

      records.push({
        timestamp,
        values,
        city: {
          temperatureAvgC: cityIdx.temperature === null ? null : toNumberOrNull(row[cityIdx.temperature]),
          temperatureMaxC: cityIdx.temperatureMax === null ? null : toNumberOrNull(row[cityIdx.temperatureMax]),
          temperatureMinC: cityIdx.temperatureMin === null ? null : toNumberOrNull(row[cityIdx.temperatureMin]),
          sewageGenerationMld: cityIdx.sewageGeneration == null ? null : toNumberOrNull(row[cityIdx.sewageGeneration]),
          installedCapacityMld: cityIdx.installedCapacity == null ? null : toNumberOrNull(row[cityIdx.installedCapacity]),
          operationalCapacityMld:
            cityIdx.operationalCapacity == null ? null : toNumberOrNull(row[cityIdx.operationalCapacity]),
        },
      })
    })

    if (records.length === 0) {
      throw new Error('bangalore_clean.csv: no usable rows were parsed.')
    }

    // Chronological order is guaranteed by construction (file is date-sorted),
    // but sort defensively so downstream code never depends on file order.
    records.sort((a, b) => (a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0))

    return { records, stpOptions: [...stpMeta.values()] }
  })
}

let datasetPromise = null

function getDataset() {
  if (!datasetPromise) datasetPromise = buildDataset()
  return datasetPromise
}

/**
 * Chart-ready chronological series for one STP parameter.
 * Points with missing values are kept with value:null so gaps stay visible.
 */
async function getSeriesPoints(stpId, parameterId) {
  const dataset = await getDataset()
  const meta = dataset.stpOptions.find((stp) => stp.id === stpId)
  if (!meta) {
    const available = dataset.stpOptions.map((stp) => stp.name).join(', ')
    throw new Error(`Unknown STP "${stpId}". Available STPs: ${available}`)
  }
  return dataset.records.map((record) => ({
    timestamp: record.timestamp,
    value:
      parameterId === 'temperature'
        ? record.city.temperatureAvgC
        : (record.values[stpId]?.[parameterId] ?? null),
  }))
}

export async function getBangaloreDatasetInfo() {
  const dataset = await getDataset()
  const first = dataset.records[0]
  const last = dataset.records[dataset.records.length - 1]
  return {
    sourceLabel: BANGALORE_DATA_SOURCE_LABEL,
    fileName: BANGALORE_DATASET_FILE,
    recordCount: dataset.records.length,
    startDate: first.timestamp,
    endDate: last.timestamp,
    interval: 'daily',
    stpCount: dataset.stpOptions.length,
  }
}

export async function getStpOptions() {
  const dataset = await getDataset()
  return dataset.stpOptions.map((stp) => ({ ...stp }))
}

export async function getCityCapacitySummary() {
  const dataset = await getDataset()
  // City-level capacities are constant across rows; read them from the newest record.
  const latest = dataset.records[dataset.records.length - 1].city
  return {
    sewageGenerationMld: latest.sewageGenerationMld,
    installedCapacityMld: latest.installedCapacityMld,
    operationalCapacityMld: latest.operationalCapacityMld,
    sourceLabel: BANGALORE_DATA_SOURCE_LABEL,
  }
}

export async function getStpParameterTrend({ stpId, parameterId }) {
  const dataset = await getDataset()
  const stp = dataset.stpOptions.find((item) => item.id === stpId)
  if (!stp) {
    const available = dataset.stpOptions.map((item) => item.name).join(', ')
    throw new Error(`Unknown STP "${stpId}". Available STPs: ${available}`)
  }
  const points = await getSeriesPoints(stpId, parameterId)
  return {
    stp: { id: stp.id, name: stp.name },
    points,
    sourceLabel: BANGALORE_DATA_SOURCE_LABEL,
  }
}

export async function getStpHistoricalData(filters = {}) {
  const { stpId, parameterId, from, to } = filters ?? {}
  const allPoints = await getSeriesPoints(stpId, parameterId)

  const fromIso = from ? toUtcIsoDate(from) : null
  const toIso = to ? toUtcIsoDate(to) : null
  const filtered = allPoints.filter((point) => {
    if (fromIso && point.timestamp < fromIso) return false
    if (toIso && point.timestamp > toIso) return false
    return true
  })

  return {
    points: filtered,
    pointCount: filtered.length,
    from: filtered[0]?.timestamp ?? null,
    to: filtered[filtered.length - 1]?.timestamp ?? null,
    sourceLabel: BANGALORE_DATA_SOURCE_LABEL,
  }
}

/**
 * Evaluate effluent readings against CPCB / NGT statutory standards for STPs:
 * - pH: 6.5 - 8.5
 * - BOD: <= 10.0 mg/L (Marginal: <= 20.0 mg/L)
 * - COD: <= 50.0 mg/L (Marginal: <= 100.0 mg/L)
 * - TSS: <= 20.0 mg/L (Marginal: <= 30.0 mg/L)
 * - Ammonical Nitrogen: <= 5.0 mg/L
 * - Total Nitrogen: <= 10.0 mg/L
 */
export function evaluateCpcbCompliance(readings = {}, options = {}) {
  const checks = []

  // Check if sensors are in calibration HOLD or FAILED
  const isPhExcluded = isSensorExcludedFromCompliance('AIT-501') || isSensorExcludedFromCompliance('AIT-202')
  const isBodExcluded = isSensorExcludedFromCompliance('AIT-502')
  const isCodExcluded = isSensorExcludedFromCompliance('AIT-503')
  const isTssExcluded = isSensorExcludedFromCompliance('AIT-504')

  if (typeof readings.ph === 'number') {
    const isPass = readings.ph >= 6.5 && readings.ph <= 8.5
    checks.push({
      param: 'pH',
      value: readings.ph,
      limit: '6.5 – 8.5',
      unit: '',
      status: isPass ? 'compliant' : 'exceeded',
      pass: isPass,
      excluded: isPhExcluded,
      exclusionReason: isPhExcluded ? 'Sensor under calibration HOLD' : null,
    })
  }

  if (typeof readings.bod === 'number') {
    const isPass = readings.bod <= 10.0
    const isMarginal = !isPass && readings.bod <= 20.0
    checks.push({
      param: 'BOD',
      value: readings.bod,
      limit: '≤ 10 mg/L',
      unit: 'mg/L',
      status: isPass ? 'compliant' : isMarginal ? 'marginal' : 'exceeded',
      pass: isPass,
      excluded: isBodExcluded,
      exclusionReason: isBodExcluded ? 'Sensor under calibration HOLD' : null,
    })
  }

  if (typeof readings.cod === 'number') {
    const isPass = readings.cod <= 50.0
    const isMarginal = !isPass && readings.cod <= 100.0
    checks.push({
      param: 'COD',
      value: readings.cod,
      limit: '≤ 50 mg/L',
      unit: 'mg/L',
      status: isPass ? 'compliant' : isMarginal ? 'marginal' : 'exceeded',
      pass: isPass,
      excluded: isCodExcluded,
      exclusionReason: isCodExcluded ? 'Sensor under calibration HOLD' : null,
    })
  }

  if (typeof readings.tss === 'number') {
    const isPass = readings.tss <= 20.0
    const isMarginal = !isPass && readings.tss <= 30.0
    checks.push({
      param: 'TSS',
      value: readings.tss,
      limit: '≤ 20 mg/L',
      unit: 'mg/L',
      status: isPass ? 'compliant' : isMarginal ? 'marginal' : 'exceeded',
      pass: isPass,
      excluded: isTssExcluded,
      exclusionReason: isTssExcluded ? 'Sensor under calibration HOLD' : null,
    })
  }

  if (typeof readings['ammonical-nitrogen'] === 'number') {
    const isPass = readings['ammonical-nitrogen'] <= 5.0
    checks.push({
      param: 'NH4-N',
      value: readings['ammonical-nitrogen'],
      limit: '≤ 5 mg/L',
      unit: 'mg/L',
      status: isPass ? 'compliant' : 'exceeded',
      pass: isPass,
      excluded: false,
    })
  }

  if (typeof readings['total-nitrogen'] === 'number') {
    const isPass = readings['total-nitrogen'] <= 10.0
    checks.push({
      param: 'Total N',
      value: readings['total-nitrogen'],
      limit: '≤ 10 mg/L',
      unit: 'mg/L',
      status: isPass ? 'compliant' : 'exceeded',
      pass: isPass,
      excluded: false,
    })
  }

  const activeChecks = checks.filter((c) => !c.excluded)
  const hasExceeded = activeChecks.some((c) => c.status === 'exceeded')
  const hasMarginal = activeChecks.some((c) => c.status === 'marginal')
  const overall = activeChecks.length === 0 ? 'compliant' : hasExceeded ? 'non_compliant' : hasMarginal ? 'marginal' : 'compliant'

  return { overall, checks, activeChecksCount: activeChecks.length }
}


/**
 * Snapshot for all 9 Bangalore STPs from the latest dataset record.
 */
export async function getAllStpSnapshots() {
  const dataset = await getDataset()
  const latestRecord = dataset.records[dataset.records.length - 1]

  const city = { ...latestRecord.city }
  delete city.temperatureMaxC
  delete city.temperatureMinC

  return dataset.stpOptions.map((stp) => {
    const perParameter = latestRecord.values[stp.id] ?? {}
    const readings = {
      ...perParameter,
      temperature: latestRecord.city.temperatureAvgC,
    }
    const compliance = evaluateCpcbCompliance(readings)

    return {
      id: stp.id,
      name: stp.name,
      installedCapacityMld: stp.installedCapacityMld,
      treatmentFacility: stp.treatmentFacility,
      recordedAt: latestRecord.timestamp,
      city: 'Bengaluru',
      cityStats: city,
      complianceStatus: compliance.overall,
      compliance,
      sourceLabel: BANGALORE_DATA_SOURCE_LABEL,
    }
  })
}

/**
 * Newest available record for an STP (or the whole city when stpId is omitted).
 * Returned values are labelled "latest available reading" upstream — they are
 * historical dataset values, NOT live sensor measurements.
 */
export async function getStpLatestSnapshot(stpId) {
  const dataset = await getDataset()
  const latestRecord = dataset.records[dataset.records.length - 1]

  const city = { ...latestRecord.city }
  delete city.temperatureMaxC
  delete city.temperatureMinC

  if (!stpId) {
    return { recordedAt: latestRecord.timestamp, city, readings: {}, sourceLabel: BANGALORE_DATA_SOURCE_LABEL }
  }

  const stp = dataset.stpOptions.find((item) => item.id === stpId)
  if (!stp) {
    const available = dataset.stpOptions.map((item) => item.name).join(', ')
    throw new Error(`Unknown STP "${stpId}". Available STPs: ${available}`)
  }

  const perParameter = latestRecord.values[stpId] ?? {}
  const readings = {
    ...perParameter,
    temperature: latestRecord.city.temperatureAvgC,
  }

  return {
    // Full STP metadata (id, name, installed capacity MLD, treatment facility).
    stp: { ...stp },
    recordedAt: latestRecord.timestamp,
    readings,
    city,
    compliance: evaluateCpcbCompliance(readings),
    sourceLabel: BANGALORE_DATA_SOURCE_LABEL,
  }
}

