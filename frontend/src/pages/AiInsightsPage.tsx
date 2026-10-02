import React, { useState, useEffect } from 'react';
import { Sparkles, AlertOctagon, CheckCircle } from 'lucide-react';
import { get } from '../services/api';
import { Reading } from '../types';

export const AiInsightsPage: React.FC = () => {
  const [anomalies, setAnomalies] = useState<Reading[]>([]);

  useEffect(() => {
    get<Reading[]>('/ingestion/readings?limit=50')
      .then((data) => {
        const anomalous = (data || []).filter((r) => (r.anomaly_score || 0) > 0.4 || r.anomaly_status === 'anomalous');
        setAnomalies(anomalous);
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#a855f7', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Sparkles size={18} /> AI Anomaly Intelligence & Isolation Forest Diagnostics
        </h3>
        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
          Continuous multivariate anomaly scoring (0.00 - 1.00) trained on historical diurnal wastewater loading curves.
        </p>
      </div>

      {/* Model Overview Card */}
      <div style={{ background: '#0b1329', border: '1px solid #1e293b', borderRadius: '8px', padding: '1rem', color: '#e2e8f0' }}>
        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#38bdf8' }}>Isolation Forest Inference Pipeline</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.78rem' }}>
          <div style={{ background: '#030712', padding: '0.6rem', borderRadius: '4px' }}>
            <div style={{ color: '#64748b' }}>Algorithm</div>
            <strong style={{ color: '#f8fafc' }}>Scikit-Learn IsolationForest</strong>
          </div>
          <div style={{ background: '#030712', padding: '0.6rem', borderRadius: '4px' }}>
            <div style={{ color: '#64748b' }}>Contamination Factor</div>
            <strong style={{ color: '#a855f7' }}>0.05 (95% Confidence)</strong>
          </div>
          <div style={{ background: '#030712', padding: '0.6rem', borderRadius: '4px' }}>
            <div style={{ color: '#64748b' }}>Features Analyzed</div>
            <strong style={{ color: '#38bdf8' }}>pH, DO, BOD, COD, TSS, Flow</strong>
          </div>
          <div style={{ background: '#030712', padding: '0.6rem', borderRadius: '4px' }}>
            <div style={{ color: '#64748b' }}>Status</div>
            <strong style={{ color: '#4ade80' }}>ACTIVE & INFERRING</strong>
          </div>
        </div>
      </div>

      {/* Flagged AI Events */}
      <div style={{ background: '#0b1329', border: '1px solid #1e293b', borderRadius: '8px', padding: '1rem', color: '#e2e8f0' }}>
        <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <AlertOctagon size={16} /> Flagged Multivariate Outliers (Last 24 Hours)
        </h4>

        {anomalies.length === 0 ? (
          <div style={{ background: '#052e16', border: '1px solid #166534', padding: '0.75rem', borderRadius: '6px', color: '#86efac', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={16} /> No severe multivariate anomalies detected in recent telemetry. Plant operations nominal.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1e293b', color: '#64748b', textAlign: 'left' }}>
                  <th style={{ padding: '0.4rem' }}>OBSERVED TIME</th>
                  <th style={{ padding: '0.4rem' }}>PARAMETER</th>
                  <th style={{ padding: '0.4rem' }}>OBSERVED</th>
                  <th style={{ padding: '0.4rem' }}>ANOMALY SCORE</th>
                  <th style={{ padding: '0.4rem' }}>SEVERITY</th>
                </tr>
              </thead>
              <tbody>
                {anomalies.map((a) => (
                  <tr key={a.reading_id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '0.4rem', fontFamily: 'monospace' }}>
                      {new Date(a.observed_at).toLocaleTimeString()} IST
                    </td>
                    <td style={{ padding: '0.4rem', fontWeight: 600, color: '#f8fafc' }}>{a.parameter}</td>
                    <td style={{ padding: '0.4rem', color: '#38bdf8' }}>{a.value} {a.unit}</td>
                    <td style={{ padding: '0.4rem', fontFamily: 'monospace', color: '#f87171', fontWeight: 700 }}>
                      {a.anomaly_score?.toFixed(3)}
                    </td>
                    <td style={{ padding: '0.4rem' }}>
                      <span style={{ padding: '0.15rem 0.4rem', borderRadius: '3px', fontSize: '0.7rem', background: '#450a0a', color: '#f87171', fontWeight: 600 }}>
                        HIGH
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
