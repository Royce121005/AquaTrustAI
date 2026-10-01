import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Droplets,
  Lock,
  User,
  ShieldCheck,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  Activity,
  Cpu,
  Database,
  Building2,
} from 'lucide-react'
import useAuth from '../../hooks/useAuth.js'
import { ROLES, ROLE_METADATA } from '../../context/authContext.js'

const DEMO_PERSONAS = [
  {
    role: ROLES.OPERATOR,
    username: 'operator',
    password: 'operator123',
    title: 'Plant Operator',
    badgeTone: 'info',
    icon: Activity,
    description: 'Process telemetry, alarm ACK & setpoints',
    scope: 'Hebbal STP (60 MLD)',
  },
  {
    role: ROLES.AUDITOR,
    username: 'auditor',
    password: 'auditor123',
    title: 'Independent Auditor',
    badgeTone: 'warning',
    icon: Database,
    description: 'Time-Travel forensic audit & DLT verification',
    scope: 'Multi-Facility Audit Scope',
  },
  {
    role: ROLES.REGULATOR,
    username: 'regulator',
    password: 'regulator123',
    title: 'CPCB Regulator',
    badgeTone: 'success',
    icon: Building2,
    description: 'Statutory compliance & Form V returns',
    scope: 'National Regulatory Jurisdiction',
  },
  {
    role: ROLES.ADMIN,
    username: 'admin',
    password: 'admin123',
    title: 'System Administrator',
    badgeTone: 'danger',
    icon: Cpu,
    description: 'Full administrative access & system governance',
    scope: 'Enterprise Root Admin',
  },
]

export default function LoginPage() {
  const { login, homeRoute } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)

  const fromRoute = location.state?.from?.pathname

  const handleLogin = async (userToLogin, passToLogin) => {
    const u = userToLogin ?? username
    const p = passToLogin ?? password

    if (!u || !p) {
      setErrorMessage('Please enter both username and password.')
      return
    }

    setErrorMessage(null)
    setIsLoading(true)

    try {
      const loggedInUser = await login(u, p)
      const targetRoute =
        fromRoute && fromRoute !== '/login'
          ? fromRoute
          : loggedInUser?.role === ROLES.AUDITOR
          ? '/auditor'
          : loggedInUser?.role === ROLES.REGULATOR
          ? '/regulator'
          : '/dashboard'

      navigate(targetRoute, { replace: true })
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        'Authentication failed. Please verify your credentials.'
      setErrorMessage(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setIsLoading(false)
    }
  }

  const handlePersonaSelect = (persona) => {
    setUsername(persona.username)
    setPassword(persona.password)
    handleLogin(persona.username, persona.password)
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 text-slate-100 items-center justify-center p-4 selection:bg-sky-500 selection:text-white">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Branding & SCADA Intelligence Column */}
        <div className="lg:col-span-5 space-y-6 hidden lg:block">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-400/30 shadow-lg">
              <Droplets className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">AquaTrust AI</h1>
              <span className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider">
                Industrial SCADA & DLT Verification
              </span>
            </div>
          </div>

          <div className="space-y-3 text-xs text-slate-300">
            <p className="leading-relaxed">
              Continuous 1-second telemetry ingestion, AI anomaly detection, and cryptographic RFC 8785 Merkle batch anchoring for wastewater treatment plants.
            </p>
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2 text-slate-300">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>CPCB OCEMS & Water Act (1974) Compliant</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Hyperledger Fabric Immutable DLT Proofs</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>ISA-18.2 Process Alarm Annunciation</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">Target Facility:</span>
              <span className="font-semibold text-sky-300">Hebbal STP-01 (60 MLD)</span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">Telemetry Stream:</span>
              <span className="font-semibold text-emerald-400">1-Second Active Ingestion</span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">Security Standard:</span>
              <span className="font-semibold text-sky-400">21 CFR Part 11 / ISO 27001</span>
            </div>
          </div>
        </div>

        {/* Right Authentication & Persona Card */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 text-slate-900 dark:text-white">
          
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center gap-2 lg:hidden justify-center sm:justify-start mb-2">
              <Droplets className="h-6 w-6 text-sky-600" />
              <span className="text-lg font-bold text-slate-900 dark:text-white">AquaTrust AI</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Sign In to SCADA Workspace
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter your enterprise credentials or select a quick-fill demo persona below.
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold">Authentication Error</span>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleLogin()
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Username / User ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. operator, auditor, regulator, admin"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 py-2 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:border-sky-500 focus:outline-hidden focus:ring-1 focus:ring-sky-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter security password"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-10 py-2 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:border-sky-500 focus:outline-hidden focus:ring-1 focus:ring-sky-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 py-2.5 text-xs font-bold text-white shadow-md shadow-sky-600/20 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Quick-Fill Demo Personas Grid */}
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Quick Demo Personas (1-Click Sign In)
              </span>
              <span className="text-[10px] text-slate-400">Pre-configured roles</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEMO_PERSONAS.map((p) => {
                const Icon = p.icon
                return (
                  <button
                    key={p.username}
                    type="button"
                    onClick={() => handlePersonaSelect(p)}
                    className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:border-sky-400 dark:hover:border-sky-500 hover:bg-sky-50/50 dark:hover:bg-slate-800 transition-all text-left group cursor-pointer"
                  >
                    <div className="mt-0.5 rounded-lg p-1.5 bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 group-hover:text-sky-500 shadow-xs shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-white truncate">
                          {p.title}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {p.username}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {p.description}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
