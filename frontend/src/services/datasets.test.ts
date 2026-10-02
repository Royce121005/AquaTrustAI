import { describe, expect, it } from 'vitest';
import { detectUploadSchema, parseCsv, profileRows, rowsToReadings } from './datasets';

describe('dataset utilities', () => {
  it('parses quoted values, embedded commas and escaped quotes', () => {
    expect(parseCsv('site,value\n"Plant, A","says ""ok"""')[0]).toEqual({ site: 'Plant, A', value: 'says "ok"' });
  });
  it('profiles actual supplied rows without counting missing as numeric', () => {
    const rows = parseCsv('timestamp_utc,ph,site\n2024-01-01,7.1,A\n2024-01-02,?,A');
    expect(profileRows(rows)).toMatchObject({ rowCount: 2, duplicates: 0, sites: ['A'], numeric: ['ph'] });
    expect(profileRows(rows).missing.ph).toBe(1);
  });
  it('maps only recognized measured parameters and preserves dataset identity', () => {
    const rows = parseCsv('timestamp_utc,ph,BOD,COD,extra\n2024-01-01T00:00:00Z,7,2,20,x');
    const schema = detectUploadSchema(rows); const mapped = rowsToReadings(rows, schema, 'analysis-1');
    expect(mapped.map((reading) => reading.parameter)).toEqual(['pH', 'BOD', 'COD']);
    expect(mapped.every((reading) => reading.provenance.analysis_id === 'analysis-1')).toBe(true);
    expect(mapped.some((reading) => reading.parameter === 'extra')).toBe(false);
  });
  it('recognizes the repository Melbourne and UP measurement field names', () => {
    const melbourne = parseCsv('recorddate,bod_mg_l,cod_mg_l,nh4_n_mg_l,timestamp_utc,facility_id,measurement_stage\n2020-01-01,4,20,1,2020-01-01T00:00:00Z,site-a,final_effluent');
    const schema = detectUploadSchema(melbourne);
    expect(schema.timestamp).toBe('timestamp_utc');
    expect(Object.values(schema.parameters).map((entry) => entry.parameter)).toEqual(['BOD', 'COD', 'NH4-N']);
    expect(rowsToReadings(melbourne, schema, 'analysis-m').every((reading) => reading.treatment_stage === 'final_effluent')).toBe(true);
    const up = parseCsv('measurement_date,ph,bod_mg_l,cod_mg_l,tss_mg_l,timestamp_utc,facility_id,measurement_stage\n2023-11-02,7,5,30,10,2023-11-02T00:00:00Z,stp-1,final_effluent');
    expect(Object.values(detectUploadSchema(up).parameters).map((entry) => entry.parameter)).toEqual(['pH', 'BOD', 'COD', 'TSS']);
  });
  it('maps the documented UCI process-stage suffixes without collapsing them', () => {
    const uci = parseCsv('DATE,PH-E,DBO-E,DQO-E,SS-E,PH-S,DBO-S,DQO-S,SS-S,timestamp_utc,facility_id\n1990-01-01,7,20,50,4,7,3,10,2,1990-01-01T00:00:00Z,uci');
    const schema = detectUploadSchema(uci);
    expect(schema.timestamp).toBe('timestamp_utc');
    const mapped = rowsToReadings(uci, schema, 'analysis-u');
    expect(mapped.filter((reading) => reading.treatment_stage === 'inlet')).toHaveLength(4);
    expect(mapped.filter((reading) => reading.treatment_stage === 'final_effluent')).toHaveLength(4);
  });
});


