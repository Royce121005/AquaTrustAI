import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiClientError } from '../api/client';
import {
  ArrowRight,
  AlertCircle,
  Droplets,
  ExternalLink,
  Lock,
} from 'lucide-react';

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
          setErrorMsg('Invalid username or password.');
        } else if (err.status === 403) {
          setErrorMsg('Account is suspended or inactive.');
        } else {
          setErrorMsg(err.message || 'Login failed. Please verify your connection.');
        }
      } else {
        setErrorMsg('Network error: Unable to reach the server.');
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
    <div className="min-h-screen bg-[#070B12] text-slate-100 flex flex-col justify-between selection:bg-[#0EA5E9] selection:text-white relative overflow-hidden bg-[url('/assets/facility_backdrop.jpg')] bg-cover bg-center bg-no-repeat">
      {/* High-Contrast Dual Layer Dark Backdrop Scrim */}
      {/* Layer 1: Global darkening so lights never overpower content */}
      <div className="absolute inset-0 bg-[#070B12]/80 pointer-events-none -z-10" />
      {/* Layer 2: Deep directional vignette for crystal-clear readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#070B12] via-[#070B12]/95 to-[#070B12]/60 pointer-events-none -z-10" />

      {/* Top Application Header */}
      <header className="w-full border-b border-slate-800/80 bg-[#070B12]/90 backdrop-blur-md px-6 lg:px-12 py-4 flex items-center justify-between z-20 anim-slide-top">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0EA5E9]/15 border border-[#0EA5E9]/30 flex items-center justify-center text-[#0EA5E9] shadow-sm shrink-0">
            <Droplets className="w-5 h-5 text-[#0EA5E9]" />
          </div>
          <div>
            <div className="text-lg font-bold tracking-tight text-white">
              AquaTrust AI
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Intelligent Wastewater Monitoring Platform
            </p>
          </div>
        </div>

        <Link
          to="/verify"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-200 transition-colors"
        >
          <span>Public Verification</span>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
        </Link>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 max-w-7xl mx-auto w-full px-6 py-8 lg:px-12 items-center gap-10 lg:gap-14 relative z-10">
        {/* Left Column: Hero Content contained in a high-contrast dark surface */}
        <div className="lg:col-span-7 flex flex-col justify-center anim-slide-left">
          <div className="bg-[#0B0F17]/90 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-7 sm:p-9 shadow-2xl">
            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Industrial Wastewater Intelligence.
              <span className="block text-[#0EA5E9] mt-1.5">Grounded in Trust.</span>
            </h1>

            {/* Description - 100% Visible & Legible */}
            <p className="text-slate-300 text-sm sm:text-base mt-4 leading-relaxed max-w-xl">
              Real-time SCADA telemetry, automated environmental compliance, and tamper-evident audit records for modern water treatment facilities.
            </p>

            {/* Clean 3-Metric Overview */}
            <div className="grid grid-cols-3 gap-3 my-6 pt-5 border-t border-slate-800/80">
              <div className="p-3 rounded-xl bg-[#111827]/80 border border-slate-800">
                <div className="text-[11px] text-slate-400">Flow Rate</div>
                <div className="text-xl sm:text-2xl font-bold text-white mt-0.5">24.5 <span className="text-xs font-normal text-slate-400">MLD</span></div>
                <div className="text-[10px] text-slate-500 mt-0.5">Continuous STP Inflow</div>
              </div>

              <div className="p-3 rounded-xl bg-[#111827]/80 border border-slate-800">
                <div className="text-[11px] text-slate-400">Efficiency</div>
                <div className="text-xl sm:text-2xl font-bold text-white mt-0.5">98.4<span className="text-xs font-normal text-slate-400">%</span></div>
                <div className="text-[10px] text-emerald-400 mt-0.5">BOD / COD Removal</div>
              </div>

              <div className="p-3 rounded-xl bg-[#111827]/80 border border-slate-800">
                <div className="text-[11px] text-slate-400">Audit Status</div>
                <div className="text-xl sm:text-2xl font-bold text-white mt-0.5">100<span className="text-xs font-normal text-slate-400">%</span></div>
                <div className="text-[10px] text-cyan-400 mt-0.5">Verified Records</div>
              </div>
            </div>

            {/* Synoptic Treatment Flow - Clean & Uncluttered */}
            <div className="pt-4 border-t border-slate-800/80">
              <div className="text-xs font-medium text-slate-400 mb-3 flex items-center justify-between">
                <span>Treatment Process Flow</span>
                <span className="text-[11px] text-emerald-400 font-mono">Live Monitoring</span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-lg bg-[#111827] border border-slate-800">
                  <div className="text-[10px] text-slate-400">1. Influent</div>
                  <div className="font-semibold text-white mt-0.5">220 mg/L</div>
                  <div className="text-[9px] text-slate-500 mt-0.5">Raw Inflow</div>
                </div>

                <div className="p-2.5 rounded-lg bg-[#111827] border border-[#0EA5E9]/30">
                  <div className="text-[10px] text-[#0EA5E9]">2. Aeration</div>
                  <div className="font-semibold text-cyan-200 mt-0.5">2.0 mg/L</div>
                  <div className="text-[9px] text-slate-400 mt-0.5">DO Basin</div>
                </div>

                <div className="p-2.5 rounded-lg bg-[#111827] border border-emerald-500/30">
                  <div className="text-[10px] text-emerald-400">3. Effluent</div>
                  <div className="font-semibold text-emerald-300 mt-0.5">&lt; 10 mg/L</div>
                  <div className="text-[9px] text-emerald-400/80 mt-0.5">Compliant ✓</div>
                </div>

                <div className="p-2.5 rounded-lg bg-[#111827] border border-indigo-500/30">
                  <div className="text-[10px] text-indigo-400">4. Ledger</div>
                  <div className="font-semibold text-indigo-200 mt-0.5">Anchored</div>
                  <div className="text-[9px] text-indigo-400/80 mt-0.5">Verified ✓</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Secure SCADA Gateway Terminal (Exact approved design) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center w-full anim-slide-right">
          <div className="w-full max-w-md bg-[#0F172A]/92 border border-cyan-500/30 rounded-2xl p-7 sm:p-9 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(14,165,233,0.15)] backdrop-blur-xl relative anim-border-glow overflow-hidden">
            {/* Top Accent Gradient Line */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#0EA5E9] to-transparent" />

            {/* Card Header & Security Badge */}
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#0EA5E9] font-bold">
                  SECURE SCADA GATEWAY
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">
                  Authorized Sign In
                </h2>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0EA5E9]/15 border border-[#0EA5E9]/35 text-[10px] font-mono text-[#0EA5E9] shrink-0 font-medium">
                <Lock className="w-3 h-3 text-[#0EA5E9]" />
                <span>TLS 1.3</span>
              </div>
            </div>

            {/* Role Demo Prefill Box with Professional Credential Tags */}
            <div className="bg-[#0B0F17]/90 border border-[#1F293D] rounded-xl p-3.5 mt-5">
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => handleRoleSelect('operator', 'operator', 'operator123')}
                  className={`py-1.5 px-2 rounded-lg text-xs border text-center transition-all truncate cursor-pointer ${
                    activeRole === 'operator'
                      ? 'border-[#0EA5E9] bg-[#0EA5E9]/20 text-[#0EA5E9] font-bold shadow-[0_0_12px_rgba(14,165,233,0.3)]'
                      : 'border-[#1F293D] bg-[#161F30] hover:bg-[#1E293B] hover:border-slate-600 text-slate-400'
                  }`}
                  title="Plant Operator — Physical STP SCADA controls"
                >
                  <div className="font-semibold">Operator</div>
                  <div className="text-[9px] opacity-75 font-mono">OPR-DEL</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleSelect('admin', 'admin', 'admin123')}
                  className={`py-1.5 px-2 rounded-lg text-xs border text-center transition-all truncate cursor-pointer ${
                    activeRole === 'admin'
                      ? 'border-[#0EA5E9] bg-[#0EA5E9]/20 text-[#0EA5E9] font-bold shadow-[0_0_12px_rgba(14,165,233,0.3)]'
                      : 'border-[#1F293D] bg-[#161F30] hover:bg-[#1E293B] hover:border-slate-600 text-slate-400'
                  }`}
                  title="System Administrator — Infrastructure & Users"
                >
                  <div className="font-semibold">Admin</div>
                  <div className="text-[9px] opacity-75 font-mono">SYS-SEC</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleSelect('auditor', 'auditor', 'auditor123')}
                  className={`py-1.5 px-2 rounded-lg text-xs border text-center transition-all truncate cursor-pointer ${
                    activeRole === 'auditor'
                      ? 'border-[#0EA5E9] bg-[#0EA5E9]/20 text-[#0EA5E9] font-bold shadow-[0_0_12px_rgba(14,165,233,0.3)]'
                      : 'border-[#1F293D] bg-[#161F30] hover:bg-[#1E293B] hover:border-slate-600 text-slate-400'
                  }`}
                  title="Compliance Auditor — Forensic Merkle Verification"
                >
                  <div className="font-semibold">Auditor</div>
                  <div className="text-[9px] opacity-75 font-mono">NABET</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleSelect('regulator', 'regulator', 'regulator123')}
                  className={`py-1.5 px-2 rounded-lg text-xs border text-center transition-all truncate cursor-pointer ${
                    activeRole === 'regulator'
                      ? 'border-[#0EA5E9] bg-[#0EA5E9]/20 text-[#0EA5E9] font-bold shadow-[0_0_12px_rgba(14,165,233,0.3)]'
                      : 'border-[#1F293D] bg-[#161F30] hover:bg-[#1E293B] hover:border-slate-600 text-slate-400'
                  }`}
                  title="Regulatory Inspector — CPCB Official Oversight"
                >
                  <div className="font-semibold">Regulator</div>
                  <div className="text-[9px] opacity-75 font-mono">CPCB-INSP</div>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="mt-4 p-3 bg-[#EF4444]/15 border border-[#EF4444]/40 rounded-xl text-rose-200 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">{errorMsg}</div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Official ID / License No. or Email
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. OPR-DEL-0842 or operator"
                  className="w-full px-3.5 py-2.5 bg-[#0B0F17] border border-[#1F293D] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0EA5E9] font-mono transition-colors focus:ring-1 focus:ring-[#0EA5E9]/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Security Key / Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 bg-[#0B0F17] border border-[#1F293D] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0EA5E9] font-mono transition-colors focus:ring-1 focus:ring-[#0EA5E9]/50"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(14,165,233,0.4)] active:scale-[0.99] disabled:opacity-50 mt-6 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Authenticating SCADA Session...</span>
                  </>
                ) : (
                  <>
                    <span>SIGN IN TO SCADA GATEWAY</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Public Portal Link */}
            <div className="mt-5 pt-4 border-t border-[#1F293D] text-center">
              <Link
                to="/verify"
                className="text-xs text-[#0EA5E9] hover:text-cyan-300 transition-colors inline-flex items-center gap-1.5 font-medium"
              >
                <span>Public Verification Portal</span>
                <span>&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Clean Footer */}
      <footer className="w-full border-t border-slate-800/80 bg-[#070B12]/90 backdrop-blur-md px-6 lg:px-12 py-3.5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2 z-20">
        <div>AquaTrust AI &bull; Water Quality Monitoring &amp; Traceability</div>
        <div>&copy; 2026 AquaTrust AI. All rights reserved.</div>
      </footer>
    </div>
  );
};
