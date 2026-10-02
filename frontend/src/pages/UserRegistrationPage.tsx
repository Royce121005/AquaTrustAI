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
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-brand-600" />
          Register Authoritative System User
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Admin boundary: creates cryptographically hashed user credentials under predefined RBAC roles.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Username (Unique identifier)
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. operator_lucknow"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-800 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Corporate / Regulatory Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. operator@aquatrust.internal"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-800 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Initial Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-800 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Display Name (Optional)
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Plant Lead Operator"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              RBAC Role Assignment
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-800 focus:ring-1 focus:ring-brand-500"
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
            className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
          >
            <UserPlus className="w-4 h-4" />
            {registerMutation.isPending ? 'Registering User...' : 'Register User in Database'}
          </button>
        </form>

        {registerMutation.isError && <ErrorState error={registerMutation.error} />}

        {registerMutation.data && (
          <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-lg text-xs font-mono text-emerald-950 space-y-1">
            <div className="font-bold flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              User Account Successfully Created
            </div>
            <div>Username: {registerMutation.data.username}</div>
            <div>User ID: {registerMutation.data.user_id}</div>
            <div>Role: {registerMutation.data.role}</div>
            <div>Status: {registerMutation.data.status}</div>
          </div>
        )}
      </div>
    </div>
  );
};
