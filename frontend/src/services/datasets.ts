import type { DatasetInfo, DatasetRow } from '../types';
import uciUrl from '../../../datasets/processed/DATASET_01_UCI_WATER_TREATMENT/uci_water_treatment_processed.csv?url';
import inletUrl from '../../../datasets/processed/DATASET_02_MELBOURNE_ETP_INLET/melbourne_inlet_processed.csv?url';
import outletUrl from '../../../datasets/processed/DATASET_03_MELBOURNE_ETP_OUTLET/melbourne_outlet_processed.csv?url';
import upUrl from '../../../datasets/processed/DATASET_04_CPCB_UP_STP/cpcb_up_stp_processed.csv?url';

export const catalog: DatasetInfo[] = [
  { id: 'uci', title: 'UCI Water Treatment', description: 'Historical multistage urban wastewater treatment observations.', url: uciUrl, source: 'UCI Water Treatment Plant dataset · processed AquaTrustAI portfolio' },
  { id: 'melbourne-inlet', title: 'Melbourne ETP · Influent', description: 'Influent measurements from Melbourne Water treatment operations.', url: inletUrl, source: 'Melbourne Water · inlet series · processed AquaTrustAI portfolio' },
  { id: 'melbourne-outlet', title: 'Melbourne ETP · Final effluent', description: 'Outlet measurements from Melbourne Water treatment operations.', url: outletUrl, source: 'Melbourne Water · outlet series · processed AquaTrustAI portfolio' },
  { id: 'up-stp', title: 'CPCB UP STP bulletin', description: 'Facility-level STP observations with source-reported status.', url: upUrl, source: 'CPCB Uttar Pradesh STP bulletin · processed AquaTrustAI portfolio' },
];

export function parseCsv(text: string): DatasetRow[] {
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(cell); cell = ''; }
    else if (char === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += char;
  }
  if (cell.length || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
  const headers = (rows.shift() || []).map((header) => header.trim());
  return rows.filter((line) => line.some((value) => value.trim() !== '')).map((line) => Object.fromEntries(headers.map((header, index) => [header, (line[index] ?? '').trim()])));
}
export const isMissing = (value: string | undefined) => !value || ['?', 'na', 'nan', 'null', 'none'].includes(value.trim().toLowerCase());
export function profileRows(rows: DatasetRow[]) {
  const columns = Object.keys(rows[0] || {});
  const missing: Record<string, number> = {};
  for (const column of columns) missing[column] = rows.reduce((count, row) => count + Number(isMissing(row[column])), 0);
  const serialized = new Set<string>(); let duplicates = 0;
  for (const row of rows) { const key = JSON.stringify(row); if (serialized.has(key)) duplicates++; else serialized.add(key); }
  const dateColumn = columns.find((column) => /timestamp|datetime|date|time/i.test(column));
  const dates = dateColumn ? rows.map((row) => row[dateColumn] || '').filter((value) => !isMissing(value)).sort() : [];
  const siteColumn = columns.find((column) => /facility_id|stp_name|site|plant/i.test(column));
  const sites = siteColumn ? [...new Set(rows.map((row) => row[siteColumn] || '').filter((value) => !isMissing(value)))] : [];
  const numeric = columns.filter((column) => { const values = rows.map((row) => row[column]).filter((value) => !isMissing(value)); return values.length > 0 && values.every((value) => Number.isFinite(Number(value))); });
  return { rowCount: rows.length, columns, missing, duplicates, dateColumn, dateMin: dates[0], dateMax: dates.at(-1), siteColumn, sites, numeric };
}
export async function loadDataset(info: DatasetInfo): Promise<DatasetRow[]> { const response = await fetch(info.url); if (!response.ok) throw new Error(`Could not load ${info.title}`); return parseCsv(await response.text()); }

const parameterAliases: Record<string, { parameter: string; unit: string }> = {
  bod: { parameter: 'BOD', unit: 'mg/L' }, bod5: { parameter: 'BOD', unit: 'mg/L' }, bod_mg_l: { parameter: 'BOD', unit: 'mg/L' }, bod_mgl: { parameter: 'BOD', unit: 'mg/L' }, biochemical_oxygen_demand: { parameter: 'BOD', unit: 'mg/L' },
  cod: { parameter: 'COD', unit: 'mg/L' }, cod_mg_l: { parameter: 'COD', unit: 'mg/L' }, cod_mgl: { parameter: 'COD', unit: 'mg/L' }, chemical_oxygen_demand: { parameter: 'COD', unit: 'mg/L' },
  tss: { parameter: 'TSS', unit: 'mg/L' }, tss_mg_l: { parameter: 'TSS', unit: 'mg/L' }, tss_mgl: { parameter: 'TSS', unit: 'mg/L' }, ss: { parameter: 'TSS', unit: 'mg/L' }, suspended_solids: { parameter: 'TSS', unit: 'mg/L' },
  ph: { parameter: 'pH', unit: 'pH' }, nh4_n: { parameter: 'NH4-N', unit: 'mg/L' }, nh4_n_mg_l: { parameter: 'NH4-N', unit: 'mg/L' }, nh4_n_mgl: { parameter: 'NH4-N', unit: 'mg/L' }, ammonical_nitrogen: { parameter: 'NH4-N', unit: 'mg/L' }, ammonia_n: { parameter: 'NH4-N', unit: 'mg/L' },
};
const normalizeKey = (value: string) => value.toLowerCase().replace(/[ -]+/g, '_').replace(/[^a-z0-9_]/g, '');
export function detectUploadSchema(rows: DatasetRow[]) {
  const columns = Object.keys(rows[0] || {});
  const timestamp = columns.find((column) => /timestamp_utc/i.test(column)) || columns.find((column) => /timestamp|datetime|date|time/i.test(column));
  const site = columns.find((column) => /facility_id|stp_name|site|plant/i.test(column));
  const stageCol = columns.find((column) => /treatment_stage|stage|sample_type|effluent_type/i.test(column));
  const parameters: Record<string, { column: string; parameter: string; unit: string; stage: string }> = {};
  const uciStage: Record<string, string> = { e: 'inlet', p: 'primary_settler', d: 'secondary_aeration', s: 'final_effluent' };
  for (const column of columns) {
    const key = normalizeKey(column); let mapping = parameterAliases[key]; let stage = 'unspecified';
    const suffix = key.match(/^(ph|dbo|bod|dqo|cod|ss|tss)_([epds])$/);
    if (suffix) {
      const parameter = { ph: 'pH', dbo: 'BOD', bod: 'BOD', dqo: 'COD', cod: 'COD', ss: 'TSS', tss: 'TSS' }[suffix[1]];
      if (parameter) { mapping = { parameter, unit: parameter === 'pH' ? 'pH' : 'mg/L' }; stage = uciStage[suffix[2]]; }
    }
    if (mapping) parameters[`${mapping.parameter}:${column}`] = { column, ...mapping, stage };
  }
  return { columns, timestamp, site, stageCol, parameters, supported: Boolean(timestamp && Object.keys(parameters).length) };
}
export function rowsToReadings(rows: DatasetRow[], schema: ReturnType<typeof detectUploadSchema>, analysisId: string, sourceSite?: string) {
  if (!schema.timestamp) throw new Error('A timestamp/date column is required to import readings.');
  if (!Object.keys(schema.parameters).length) throw new Error('No supported water-quality fields were found (BOD, COD, TSS, pH or NH4-N).');
  return rows.filter((row) => !sourceSite || !schema.site || row[schema.site] === sourceSite).flatMap((row, rowIndex) => {
    const date = row[schema.timestamp!]; const observed = date && new Date(date);
    if (!observed || Number.isNaN(observed.valueOf())) return [];
    return Object.values(schema.parameters).flatMap(({ column, parameter, unit, stage }) => {
      const raw = row[column]; if (isMissing(raw) || !Number.isFinite(Number(raw))) return [];
      const sourceTime = observed.toISOString();
      const stageText = schema.stageCol ? row[schema.stageCol]?.toLowerCase() : '';
      const mappedStage = stage !== 'unspecified' ? stage : stageText.includes('inlet') || stageText.includes('influent') ? 'inlet' : stageText.includes('final') || stageText.includes('outlet') || stageText.includes('effluent') ? 'final_effluent' : stageText.includes('secondary') || stageText.includes('aeration') ? 'secondary_aeration' : 'unspecified';
      return [{ observed_at: sourceTime, treatment_stage: mappedStage, parameter, value: Number(raw), unit, source: 'dataset_import', provenance: { analysis_id: analysisId, original_filename: 'user_upload', source_site: schema.site ? row[schema.site] : undefined, source_column: column, source_row: rowIndex + 2, source_timestamp: row[schema.timestamp!] } }];
    });
  });
}
