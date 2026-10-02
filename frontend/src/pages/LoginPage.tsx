import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { ApiClientError } from '../api/client';
import { getHealthApi } from '../api/health';
import { ArrowRight, AlertCircle, Droplets } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('operator');
  const [password, setPassword] = useState('operator123');
  const [activeRole, setActiveRole] = useState<'operator' | 'admin' | 'auditor' | 'regulator'>('operator');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  // Live backend health query for the indicator on bottom left
  const { data: healthData, isSuccess: isHealthSuccess } = useQuery({
    queryKey: ['login-health'],
    queryFn: getHealthApi,
    refetchInterval: 15000,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      await login({ username, password });
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.status === 401) {
          setErrorMsg('Authentication failed: Invalid username or password.');
        } else if (err.status === 403) {
          setErrorMsg('Access denied: Account is suspended or inactive.');
        } else {
          setErrorMsg(err.message || 'Login failed. Please verify backend connection.');
        }
      } else {
        setErrorMsg('Network error: Unable to communicate with backend server.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleSelect = (role: 'operator' | 'admin' | 'auditor' | 'regulator', u: string, p: string) => {
    setActiveRole(role);
    setUsername(u);
    setPassword(p);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-[#060e1b] text-slate-100 flex flex-col justify-between selection:bg-sky-500 selection:text-slate-950">
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 max-w-7xl mx-auto w-full px-6 py-8 lg:px-12 items-center gap-12">
        {/* Left Column: Hero & Branding */}
        <div className="flex flex-col justify-between h-full py-4 lg:py-8">
          {/* Top Brand Logo */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-sky-500 flex items-center justify-center text-slate-950 shadow-md shadow-sky-500/20 font-black shrink-0">
              <Droplets className="w-7 h-7 text-slate-950 fill-current" />
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                IWM-BTS
              </div>
              <p className="text-sm sm:text-base text-slate-300 mt-0.5 font-medium">
                Intelligent Wastewater Monitoring &amp; Blockchain Traceability System
              </p>
            </div>
          </div>

          {/* Centered Hero Statement */}
          <div className="my-auto py-12 lg:py-0 max-w-xl">
            <div className="text-xs font-mono font-semibold uppercase tracking-[0.25em] text-sky-400 mb-4">
              Water Data • Provenance • Trust
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.12]">
              Clarity for every<br />drop of data.
            </h1>
            <p className="text-slate-400 text-sm sm:text-base mt-6 leading-relaxed max-w-md">
              Environmental intelligence grounded in real measurements, accountable analysis and verifiable records.
            </p>
          </div>

          {/* Bottom Live Health Status */}
          <div className="flex items-center gap-2 pt-6">
            <span
              className={`w-2 h-2 rounded-full ${
                isHealthSuccess ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span className="text-xs font-mono text-slate-300">
              API reachable
            </span>
            <span className="text-xs font-mono text-slate-500">
              {isHealthSuccess ? 'connected' : 'connecting...'}
            </span>
          </div>
        </div>

        {/* Right Column: Login Card */}
        <div className="flex flex-col items-center justify-center w-full">
          <div className="w-full max-w-md bg-[#0a1526]/85 border border-blue-900/40 rounded-2xl p-7 sm:p-9 shadow-2xl backdrop-blur-md">
            {/* Card Header */}
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-sky-400 font-bold">
                Secure Workspace
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1.5">
                Welcome back
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Sign in with your IWM-BTS account.
              </p>
            </div>

            {/* Role Demo Prefill Box - All 4 roles in one line */}
            <div className="bg-[#071120] border border-blue-950/90 rounded-xl p-4 mt-6">
              <label className="block text-xs font-medium text-slate-300 mb-2.5">
                Select role to prefill demo credentials:
              </label>
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => handleRoleSelect('operator', 'operator', 'operator123')}
                  className={`py-1.5 px-2 rounded-md text-xs font-medium border text-center transition-all truncate ${
                    activeRole === 'operator'
                      ? 'border-sky-500 bg-sky-950/70 text-sky-200'
                      : 'border-blue-900/60 bg-blue-950/40 hover:bg-blue-900/50 hover:border-blue-700 text-slate-300'
                  }`}
                >
                  Operator
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleSelect('admin', 'admin', 'admin123')}
                  className={`py-1.5 px-2 rounded-md text-xs font-medium border text-center transition-all truncate ${
                    activeRole === 'admin'
                      ? 'border-sky-500 bg-sky-950/70 text-sky-200'
                      : 'border-blue-900/60 bg-blue-950/40 hover:bg-blue-900/50 hover:border-blue-700 text-slate-300'
                  }`}
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleSelect('auditor', 'auditor', 'auditor123')}
                  className={`py-1.5 px-2 rounded-md text-xs font-medium border text-center transition-all truncate ${
                    activeRole === 'auditor'
                      ? 'border-sky-500 bg-sky-950/70 text-sky-200'
                      : 'border-blue-900/60 bg-blue-950/40 hover:bg-blue-900/50 hover:border-blue-700 text-slate-300'
                  }`}
                >
                  Auditor
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleSelect('regulator', 'regulator', 'regulator123')}
                  className={`py-1.5 px-2 rounded-md text-xs font-medium border text-center transition-all truncate ${
                    activeRole === 'regulator'
                      ? 'border-sky-500 bg-sky-950/70 text-sky-200'
                      : 'border-blue-900/60 bg-blue-950/40 hover:bg-blue-900/50 hover:border-blue-700 text-slate-300'
                  }`}
                >
                  Regulator
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="mt-4 p-3 bg-red-950/60 border border-red-800 rounded-lg text-red-200 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">{errorMsg}</div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Username or Email
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="operator"
                  className="w-full px-3.5 py-2.5 bg-[#060d18] border border-blue-900/60 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 bg-[#060d18] border border-blue-900/60 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono transition-colors"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 active:scale-[0.99] disabled:opacity-50 mt-6 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign in</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Note under button */}
            <p className="text-[10px] text-slate-500 text-center mt-3.5 leading-relaxed">
              Access is authenticated by the project API. Credentials are not embedded in this frontend.
            </p>

            {/* Public Portal Link */}
            <div className="mt-5 pt-4 border-t border-blue-950/80 text-center">
              <Link
                to="/verify/public"
                className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
              >
                Public Trust Verification Portal (No login required) &rarr;
              </Link>
            </div>
          </div>

          {/* Bottom Card Footer */}
          <div className="text-[10px] font-mono tracking-[0.25em] text-slate-600 uppercase text-center mt-6">
            IWM-BTS • TRUSTED WATER INFRASTRUCTURE
          </div>
        </div>
      </div>
    </div>
  );
};
