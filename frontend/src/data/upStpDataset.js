// Data-access layer for cpcb_up_stp_clean.csv (bundled under /public/data/).
// Represents CPCB official monitoring dataset for Uttar Pradesh river basin STPs.

import { loadBundledCsv, normalizeHeader, toNumberOrNull } from '../utils/csv.js'
import { evaluateCpcbCompliance } from './bangaloreDataset.js'

export const UP_STP_DATASET_FILE = 'cpcb_up_stp_clean.csv'
export const UP_STP_DATA_SOURCE_LABEL = 'cpcb_up_stp_clean.csv (CPCB UP Ganga/Yamuna Basin Dataset)'

let upDatasetPromise = null

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function getUpStpDataset() {
  if (upDatasetPromise) return upDatasetPromise

  upDatasetPromise = loadBundledCsv(UP_STP_DATASET_FILE).then(({ header, rows }) => {
    const colIndex = new Map()
    header.forEach((name, index) => {
      colIndex.set(normalizeHeader(name), index)
    })

    const getVal = (row, colName) => {
      const idx = colIndex.get(normalizeHeader(colName))
      return idx !== undefined && idx < row.length ? row[idx] : null
    }

    const records = rows.map((row, i) => {
      const name = String(getVal(row, 'stp_name') || `STP #${i + 1}`).trim()
      const facilityId = String(getVal(row, 'facility_id') || `UP_STP_${i + 1}`).trim()
      const city = String(getVal(row, 'city_town_district') || 'Uttar Pradesh').trim()
      const technology = String(getVal(row, 'technology_process') || 'ASP').trim()
      const installedCapacity = toNumberOrNull(getVal(row, 'installed_capacity_mld'))
      const utilizedCapacity = toNumberOrNull(getVal(row, 'utilized_capacity_mld'))
      const river = String(getVal(row, 'receiving_water_body') || getVal(row, 'river_catchment') || '').trim()
      const rawCompliance = String(getVal(row, 'compliance_status') || '').trim()

      const ph = toNumberOrNull(getVal(row, 'ph'))
      const bod = toNumberOrNull(getVal(row, 'bod_mg_l'))
      const cod = toNumberOrNull(getVal(row, 'cod_mg_l'))
      const tss = toNumberOrNull(getVal(row, 'tss_mg_l'))
      const totalColiform = toNumberOrNull(getVal(row, 'total_coliform_mpn_100ml'))
      const fecalColiform = toNumberOrNull(getVal(row, 'fecal_coliform_mpn_100ml'))
      const measurementDate = String(getVal(row, 'measurement_date') || getVal(row, 'timestamp_utc') || '').trim()

      const readings = {
        ph,
        bod,
        cod,
        tss,
        totalColiform,
        fecalColiform,
      }

      const compliance = evaluateCpcbCompliance(readings)
      // If dataset has an official achieving verdict, align
      const finalComplianceStatus = rawCompliance.toLowerCase().includes('not')
        ? 'non_compliant'
        : rawCompliance.toLowerCase().includes('achieving')
          ? 'compliant'
          : compliance.overall

      return {
        id: slugify(facilityId || name),
        facilityId,
        name,
        city,
        state: 'Uttar Pradesh',
        installedCapacityMld: installedCapacity,
        utilizedCapacityMld: utilizedCapacity,
        treatmentFacility: technology,
        receivingWaterBody: river,
        complianceStatus: finalComplianceStatus,
        compliance,
        readings,
        recordedAt: measurementDate,
        sourceLabel: UP_STP_DATA_SOURCE_LABEL,
      }
    })

    return records
  })

  return upDatasetPromise
}
