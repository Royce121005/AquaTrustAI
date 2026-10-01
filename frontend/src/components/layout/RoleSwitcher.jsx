import { Shield, UserCheck, LogOut, User } from 'lucide-react'
import useAuth from '../../hooks/useAuth.js'

export default function RoleSwitcher() {
  const { currentRole, setRole, availableRoles, roleMetadata, user, logout } = useAuth()
  const activeMeta = roleMetadata[currentRole]

  return (
    <div className="flex items-center gap-3">
      {/* Active User Name / Badge */}
      {user?.username && (
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
          <User className="h-3.5 w-3.5 text-slate-500" />
          <span className="font-semibold text-slate-900 dark:text-white">{user.username}</span>
        </div>
      )}

      {/* Role Switcher Selector */}
      <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs">
        <Shield className="h-3.5 w-3.5 text-sky-600" />
        <span className="font-semibold text-slate-700 dark:text-slate-300">Role:</span>
        <select
          value={currentRole}
          onChange={(e) => setRole(e.target.value)}
          className="cursor-pointer rounded border-0 bg-transparent font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-sky-500"
        >
          {Object.entries(availableRoles).map(([key, roleValue]) => (
            <option key={key} value={roleValue} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
              {roleMetadata[roleValue]?.label || roleValue}
            </option>
          ))}
        </select>
      </div>

      {/* Scope Badge */}
      <div className="hidden items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 xl:flex">
        <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
        <span>{activeMeta?.scope}</span>
      </div>

      {/* Logout Button */}
      <button
        type="button"
        onClick={logout}
        title="Sign Out of Session"
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:text-rose-900 dark:text-rose-400 dark:hover:text-rose-300 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer"
      >
        <LogOut className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Logout</span>
      </button>
    </div>
  )
}
