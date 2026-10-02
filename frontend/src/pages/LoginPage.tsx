import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { post } from '../services/api';

export const LoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('operator');
  const [password, setPassword] = useState('operator123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await post<{
        access_token: string;
        token_type: string;
        user?: any;
        user_id?: string;
        username?: string;
        role?: string;
        facility_id?: string;
      }>('/auth/login', { username: identifier, password }, false);

      const userObj = data.user || {
        user_id: data.user_id || 'user-unknown',
        username: data.username || identifier,
        role: data.role || 'operator',
        facility_id: data.facility_id || null,
      };

      login(data.access_token, userObj);

      // Role-based destination redirect
      const role = (userObj.role || '').toLowerCase();
      if (role === 'operator') navigate('/dashboard');
      else if (role === 'auditor') navigate('/auditor');
      else if (role === 'regulator' || role === 'regulatory_stakeholder') navigate('/regulator');
      else if (role === 'admin') navigate('/admin');
      else navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setRoleDemo = (user: string, pass: string) => {
    setIdentifier(user);
    setPassword(pass);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ background: '#0b1329', border: '1px solid #1e293b', borderRadius: '10px', maxWidth: '420px', width: '100%', padding: '2rem', color: '#f8fafc' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'linear-gradient(135deg, #0284c7, #2563eb)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem', fontWeight: 800, fontSize: '18px' }}>
            AT
          </div>
          <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800 }}>AquaTrustAI Login</h2>
          <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
            Zero-Trust Water Quality & Compliance Ledger Portal
          </p>
        </div>

        {error && (
          <div style={{ background: '#450a0a', border: '1px solid #ef4444', borderRadius: '6px', padding: '0.5rem 0.75rem', color: '#fca5a5', fontSize: '0.75rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
              Username or Registered Email
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Username or email"
                required
                style={{ width: '100%', boxSizing: 'border-box', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '0.5rem 0.75rem', color: '#fff', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{ width: '100%', boxSizing: 'border-box', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '0.5rem 0.75rem', color: '#fff', fontSize: '0.85rem' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ marginTop: '0.5rem', background: '#0284c7', border: 'none', borderRadius: '6px', padding: '0.6rem', color: '#fff', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
          >
            {loading ? 'Authenticating...' : 'Sign In to Portal'}
          </button>
        </form>

        {/* Demo Fast-Switch Buttons */}
        <div style={{ marginTop: '1.5rem', borderTop: '1px solid #1e293b', paddingTop: '1rem' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.5rem', textAlign: 'center' }}>
            Quick-Fill Role Credentials (CPCB Demo):
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
            <button
              type="button"
              onClick={() => setRoleDemo('operator', 'operator123')}
              style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', padding: '0.3rem', color: '#38bdf8', fontSize: '0.72rem', cursor: 'pointer' }}
            >
              Operator
            </button>
            <button
              type="button"
              onClick={() => setRoleDemo('auditor', 'auditor123')}
              style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', padding: '0.3rem', color: '#a855f7', fontSize: '0.72rem', cursor: 'pointer' }}
            >
              Auditor
            </button>
            <button
              type="button"
              onClick={() => setRoleDemo('regulator', 'regulator123')}
              style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', padding: '0.3rem', color: '#4ade80', fontSize: '0.72rem', cursor: 'pointer' }}
            >
              Regulator
            </button>
            <button
              type="button"
              onClick={() => setRoleDemo('admin', 'admin123')}
              style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', padding: '0.3rem', color: '#f43f5e', fontSize: '0.72rem', cursor: 'pointer' }}
            >
              System Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
