import { Shield, UserCheck } from 'lucide-react'
import useAuth from '../../hooks/useAuth.js'

export default function RoleSwitcher() {
  const { currentRole, setRole, availableRoles, roleMetadata } = useAuth()
  const activeMeta = roleMetadata[currentRole]

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs">
        <Shield className="h-3.5 w-3.5 text-sky-600" />
        <span className="font-semibold text-slate-700">Role:</span>
        <select
          value={currentRole}
          onChange={(e) => setRole(e.target.value)}
          className="cursor-pointer rounded border-0 bg-transparent font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
        >
          {Object.entries(availableRoles).map(([key, roleValue]) => (
            <option key={key} value={roleValue}>
              {roleMetadata[roleValue]?.label || roleValue}
            </option>
          ))}
        </select>
      </div>
      <div className="hidden items-center gap-1.5 text-xs text-slate-500 xl:flex">
        <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
        <span>{activeMeta?.scope}</span>
      </div>
    </div>
  )
}
