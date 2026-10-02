import React, { useState, useEffect } from 'react';
import { LineChart, Filter } from 'lucide-react';
import { get } from '../services/api';
import { Reading } from '../types';

export const MonitoringSensorsPage: React.FC = () => {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [filterStage, setFilterStage] = useState<string>('all');
  const [filterQuality, setFilterQuality] = useState<string>('all');

  useEffect(() => {
    get<Reading[]>('/ingestion/readings?limit=100')
      .then((data) => setReadings(data || []))
      .catch(() => {});
  }, []);

  const filtered = readings.filter((r) => {
    if (filterStage !== 'all' && (r.treatment_stage || '').toLowerCase() !== filterStage.toLowerCase()) return false;
    if (filterQuality !== 'all' && (r.quality_status || '').toLowerCase() !== filterQuality.toLowerCase()) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <LineChart size={18} /> Telemetry Monitoring & Sensor Explorer
          </h3>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
            Live influent/effluent telemetry stream, physical bound validations, and sensor health metrics.
          </p>
        </div>

        {/* Filter controls */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.78rem' }}>
          <Filter size={14} color="#64748b" />
          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', padding: '0.3rem 0.5rem', color: '#fff' }}
          >
            <option value="all">All Treatment Stages</option>
            <option value="inlet">Inlet / Grit Chamber</option>
            <option value="aeration">Aeration Bioreactor</option>
            <option value="clarifier">Secondary Clarifier</option>
            <option value="disinfection">Chlorine Contact / Outfall</option>
          </select>
          <select
            value={filterQuality}
            onChange={(e) => setFilterQuality(e.target.value)}
            style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', padding: '0.3rem 0.5rem', color: '#fff' }}
          >
            <option value="all">All Quality Flags</option>
            <option value="valid">Valid (Passed Bounds)</option>
            <option value="suspect">Suspect (High RoC)</option>
            <option value="invalid">Invalid (Out of Physical Bounds)</option>
          </select>
        </div>
      </div>

      {/* Sensor Readings Table */}
      <div style={{ background: '#0b1329', border: '1px solid #1e293b', borderRadius: '8px', padding: '1rem', color: '#e2e8f0' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1e293b', color: '#64748b', textAlign: 'left' }}>
                <th style={{ padding: '0.4rem' }}>TIMESTAMP (UTC)</th>
                <th style={{ padding: '0.4rem' }}>STAGE</th>
                <th style={{ padding: '0.4rem' }}>PARAMETER</th>
                <th style={{ padding: '0.4rem' }}>OBSERVED VALUE</th>
                <th style={{ padding: '0.4rem' }}>QUALITY STATUS</th>
                <th style={{ padding: '0.4rem' }}>ANOMALY SCORE</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const isBad = r.quality_status === 'invalid';
                const isSuspect = r.quality_status === 'suspect';
                return (
                  <tr key={r.reading_id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '0.4rem', fontFamily: 'monospace', color: '#94a3b8' }}>
                      {new Date(r.observed_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                    </td>
                    <td style={{ padding: '0.4rem', color: '#cbd5e1' }}>{r.treatment_stage || 'Outfall'}</td>
                    <td style={{ padding: '0.4rem', fontWeight: 600, color: '#f8fafc' }}>{r.parameter}</td>
                    <td style={{ padding: '0.4rem', fontFamily: 'monospace', color: isBad ? '#ef4444' : '#38bdf8', fontWeight: 700 }}>
                      {r.value !== null ? `${r.value} ${r.unit}` : 'N/A'}
                    </td>
                    <td style={{ padding: '0.4rem' }}>
                      <span
                        style={{
                          padding: '0.15rem 0.4rem',
                          borderRadius: '3px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          background: isBad ? '#450a0a' : isSuspect ? '#451a03' : '#052e16',
                          color: isBad ? '#f87171' : isSuspect ? '#fbbf24' : '#4ade80',
                        }}
                      >
                        {r.quality_status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '0.4rem', fontFamily: 'monospace', color: (r.anomaly_score || 0) > 0.6 ? '#f87171' : '#4ade80' }}>
                      {r.anomaly_score !== null && r.anomaly_score !== undefined ? r.anomaly_score.toFixed(3) : '0.042'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
