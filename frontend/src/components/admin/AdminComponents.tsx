import React, { useState } from 'react';
import { UserPlus, Building, KeyRound } from 'lucide-react';
import { post } from '../../services/api';

export const UserProvisioningModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('operator');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; err?: boolean } | null>(null);

  const handleCreate = async () => {
    if (!username || !email || !password) {
      setFeedback({ msg: 'Please complete all required fields.', err: true });
      return;
    }
    setLoading(true);
    try {
      await post('/auth/register', { username, email, password, role });
      setFeedback({ msg: `User account '${username}' registered with role '${role}'.`, err: false });
      setTimeout(() => onClose(), 2000);
    } catch (err: unknown) {
      setFeedback({ msg: err instanceof Error ? err.message : 'Registration failed.', err: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div style={{ background: '#0b1329', border: '1px solid #1e293b', borderRadius: '8px', maxWidth: '440px', width: '100%', padding: '1.25rem', color: '#e2e8f0' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#f43f5e', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <UserPlus size={18} /> Provision New System Account
        </h3>

        {feedback && (
          <div style={{ padding: '0.4rem 0.6rem', borderRadius: '4px', background: feedback.err ? '#450a0a' : '#064e3b', border: `1px solid ${feedback.err ? '#ef4444' : '#059669'}`, color: feedback.err ? '#fca5a5' : '#86efac', fontSize: '0.75rem', marginBottom: '0.75rem' }}>
            {feedback.msg}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.78rem' }}>
          <div>
            <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.2rem' }}>Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', padding: '0.4rem', color: '#fff' }} />
          </div>
          <div>
            <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.2rem' }}>Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', padding: '0.4rem', color: '#fff' }} />
          </div>
          <div>
            <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.2rem' }}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', padding: '0.4rem', color: '#fff' }} />
          </div>
          <div>
            <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.2rem' }}>Designated Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', padding: '0.4rem', color: '#fff' }}>
              <option value="operator">Plant Operator (Hebbal STP)</option>
              <option value="auditor">Compliance Auditor (Dual Control)</option>
              <option value="regulatory_stakeholder">CPCB Regulator (Fleet Surveillance)</option>
              <option value="admin">System Administrator</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button onClick={onClose} style={{ padding: '0.4rem 0.8rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#cbd5e1', fontSize: '0.78rem', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleCreate} disabled={loading} style={{ padding: '0.4rem 0.8rem', background: '#e11d48', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const FacilityRegistrationCard: React.FC<{ onCreated: () => void }> = ({ onCreated }) => {
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('60');
  const [type, setType] = useState('municipal_stp');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name) return;
    setLoading(true);
    try {
      await post('/facilities', {
        facility_name: name,
        facility_type: type,
        capacity: parseFloat(capacity),
        capacity_unit: 'MLD',
        location: { city: 'Bengaluru', state: 'Karnataka' },
      });
      setName('');
      onCreated();
    } catch {
      alert('Failed to register facility.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#0b1329', border: '1px solid #1e293b', borderRadius: '8px', padding: '1rem', color: '#e2e8f0' }}>
      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#f43f5e', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <Building size={16} /> Onboard Wastewater Treatment Plant (STP / ETP)
      </h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem', fontSize: '0.78rem' }}>
        <div>
          <label style={{ display: 'block', color: '#64748b', marginBottom: '0.2rem' }}>Facility Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bellandur STP" style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', padding: '0.35rem', color: '#fff' }} />
        </div>
        <div>
          <label style={{ display: 'block', color: '#64748b', marginBottom: '0.2rem' }}>Design Capacity (MLD)</label>
          <input value={capacity} onChange={(e) => setCapacity(e.target.value)} type="number" style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', padding: '0.35rem', color: '#fff' }} />
        </div>
        <div>
          <label style={{ display: 'block', color: '#64748b', marginBottom: '0.2rem' }}>Facility Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', padding: '0.35rem', color: '#fff' }}>
            <option value="municipal_stp">Municipal Sewage (STP)</option>
            <option value="etp">Industrial Effluent (ETP)</option>
          </select>
        </div>
      </div>
      <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={handleRegister} disabled={loading} style={{ padding: '0.35rem 0.8rem', background: '#e11d48', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
          {loading ? 'Registering...' : 'Register Facility'}
        </button>
      </div>
    </div>
  );
};

export const SigningKeyTable: React.FC = () => {
  const keys = [
    { id: 'key-ecdsa-p256-01', algo: 'ES256', curve: 'NIST P-256', status: 'ACTIVE', fingerprint: 'SHA256:7a9c3e...f82a' },
    { id: 'key-fabric-org1-ca', algo: 'ECDSA', curve: 'secp256r1', status: 'ACTIVE', fingerprint: 'SHA256:1e9509...5718' },
  ];

  return (
    <div style={{ background: '#0b1329', border: '1px solid #1e293b', borderRadius: '8px', padding: '1rem', color: '#e2e8f0' }}>
      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <KeyRound size={16} /> Cryptographic Authority Key Registry
      </h4>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #1e293b', color: '#64748b', textAlign: 'left' }}>
            <th style={{ padding: '0.4rem' }}>KEY IDENTIFIER</th>
            <th style={{ padding: '0.4rem' }}>ALGORITHM</th>
            <th style={{ padding: '0.4rem' }}>CURVE</th>
            <th style={{ padding: '0.4rem' }}>FINGERPRINT</th>
            <th style={{ padding: '0.4rem' }}>STATUS</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((k) => (
            <tr key={k.id} style={{ borderBottom: '1px solid #1e293b' }}>
              <td style={{ padding: '0.4rem', fontFamily: 'monospace', color: '#38bdf8' }}>{k.id}</td>
              <td style={{ padding: '0.4rem' }}>{k.algo}</td>
              <td style={{ padding: '0.4rem' }}>{k.curve}</td>
              <td style={{ padding: '0.4rem', fontFamily: 'monospace', color: '#94a3b8' }}>{k.fingerprint}</td>
              <td style={{ padding: '0.4rem' }}><span style={{ color: '#4ade80', fontWeight: 600 }}>{k.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
