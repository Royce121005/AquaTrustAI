import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { registerUserApi } from '../api/auth';
import { UserRole } from '../types';
import { ErrorState } from '../components/common/States';
import { UserPlus, CheckCircle2, Shield, User, Mail, Lock } from 'lucide-react';

export const UserRegistrationPage: React.FC = () => {
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [role, setRole] = useState<UserRole>('operator');
  const [displayName, setDisplayName] = useState<string>('');

  const registerMutation = useMutation({
    mutationFn: () =>
      registerUserApi({
        username,
        email,
        password,
        role,
        display_name: displayName || undefined,
      }),
    onSuccess: () => {
      setUsername('');
      setEmail('');
      setPassword('');
      setDisplayName('');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-[#1F293D] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0EA5E9]/10 border border-[#0EA5E9]/30 flex items-center justify-center text-[#0EA5E9]">
              <UserPlus className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Register Authoritative System User
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Admin boundary: creates cryptographically hashed user credentials under predefined RBAC roles.
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-[#111827] border border-[#1F293D] text-[10px] font-mono uppercase tracking-widest text-[#0EA5E9]">
          RBAC ADMIN
        </span>
      </div>

      <div className="bg-[#111827] border border-[#1F293D] rounded-xl p-6 shadow-xl space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Username (Unique identifier)
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. operator_lucknow"
              className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-lg px-3.5 py-2.5 font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#0EA5E9]"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Corporate / Regulatory Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. operator@aquatrust.internal"
              className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-lg px-3.5 py-2.5 font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#0EA5E9]"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Initial Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-lg px-3.5 py-2.5 font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#0EA5E9]"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Display Name (Optional)
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Plant Lead Operator"
              className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-lg px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#0EA5E9]"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              RBAC Role Assignment
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-lg px-3.5 py-2.5 font-mono text-white focus:outline-none focus:border-[#0EA5E9]"
            >
              <option value="operator">operator (Telemetry Ingestion & Finalization)</option>
              <option value="auditor">auditor (Verification, Compliance & Reconciliation)</option>
              <option value="regulatory_stakeholder">regulatory_stakeholder (Compliance & Audit)</option>
              <option value="admin">admin (Full Super-Role Administration)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={registerMutation.isPending}
            className="w-full py-2.5 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-lg font-bold uppercase tracking-wider text-xs shadow-[0_0_15px_rgba(14,165,233,0.3)] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
          >
            <UserPlus className="w-4 h-4" />
            {registerMutation.isPending ? 'Registering User...' : 'Register User in Database'}
          </button>
        </form>

        {registerMutation.isError && <ErrorState error={registerMutation.error} />}

        {registerMutation.data && (
          <div className="p-4 bg-[#10B981]/10 border border-[#10B981]/40 rounded-xl text-xs font-mono text-emerald-200 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 mb-1 text-emerald-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              User Account Successfully Created
            </div>
            <div>Username: <span className="text-white font-bold">{registerMutation.data.username}</span></div>
            <div>User ID: <span className="text-slate-300 select-all">{registerMutation.data.user_id}</span></div>
            <div>Role: <span className="text-[#0EA5E9]">{registerMutation.data.role}</span></div>
            <div>Status: <span className="text-emerald-400">{registerMutation.data.status}</span></div>
          </div>
        )}
      </div>
    </div>
  );
};
