import React, { useState } from 'react';
import { Sliders } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [refreshInterval, setRefreshInterval] = useState('2');
  const [audioAlarms, setAudioAlarms] = useState(true);
  const [temperatureUnit, setTemperatureUnit] = useState('C');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '680px' }}>
      <div>
        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Sliders size={18} /> Supervisory Console Display Preferences
        </h3>
        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
          Configure client telemetry poll intervals, audio annunciator behavior, and local units.
        </p>
      </div>

      <div style={{ background: '#0b1329', border: '1px solid #1e293b', borderRadius: '8px', padding: '1.25rem', color: '#e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
            Live Telemetry Refresh Interval (Seconds)
          </label>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(e.target.value)}
            style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', padding: '0.45rem', color: '#fff', fontSize: '0.8rem' }}
          >
            <option value="1">1 Second (High Resolution SCADA Stream)</option>
            <option value="2">2 Seconds (Standard Supervisory Stream)</option>
            <option value="5">5 Seconds (Bandwidth Conservative)</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={audioAlarms}
              onChange={(e) => setAudioAlarms(e.target.checked)}
              style={{ accentColor: '#0284c7' }}
            />
            <span>Enable ISA-18.2 Audible Klaxon on Unacknowledged High Outfall Alarms</span>
          </label>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
            Temperature Display Unit
          </label>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.82rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="temp"
                checked={temperatureUnit === 'C'}
                onChange={() => setTemperatureUnit('C')}
                style={{ accentColor: '#0284c7' }}
              />
              <span>Celsius (°C)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="temp"
                checked={temperatureUnit === 'F'}
                onChange={() => setTemperatureUnit('F')}
                style={{ accentColor: '#0284c7' }}
              />
              <span>Fahrenheit (°F)</span>
            </label>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #1e293b', paddingTop: '1rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem' }}>
          {saved && <span style={{ color: '#4ade80', fontSize: '0.75rem' }}>Preferences saved successfully.</span>}
          <button
            onClick={handleSave}
            style={{ padding: '0.45rem 1rem', background: '#0284c7', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
          >
            Save Console Settings
          </button>
        </div>
      </div>
    </div>
  );
};
