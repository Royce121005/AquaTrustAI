import { Navigate, useLocation, Link } from 'react-router-dom'
import { ShieldAlert, ArrowLeft, RefreshCw, KeyRound } from 'lucide-react'
import useAuth from '../../hooks/useAuth.js'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'

export function UnauthorizedState({ allowedRoles = [], currentRole }) {
  const { roleMetadata, homeRoute, logout } = useAuth()
  const activeRoleLabel = roleMetadata[currentRole]?.label || currentRole
  const requiredRolesLabels = allowedRoles
    .map((r) => roleMetadata[r]?.label || r)
    .join(', ')

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="max-w-lg border-amber-300 bg-white p-6 shadow-xl dark:border-amber-900/60 dark:bg-slate-900 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <h2 className="mt-4 text-lg font-bold tracking-tight text-slate-900 dark:text-white">
          Access Restricted: Role Authorization Required
        </h2>

        <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          Your active persona (<strong className="text-slate-800 dark:text-slate-200">{activeRoleLabel}</strong>) does not have authorization to access this workspace module.
        </p>

        <div className="my-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span>Required Role(s):</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{requiredRolesLabels}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span>Current Role:</span>
            <span className="font-semibold text-amber-600 dark:text-amber-400">{activeRoleLabel}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link to={homeRoute || '/dashboard'} className="w-full sm:w-auto">
            <Button variant="primary" className="w-full text-xs font-semibold">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Return to Authorized Workspace
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={logout}
            className="w-full sm:w-auto text-xs font-semibold text-slate-600"
          >
            <KeyRound className="mr-1.5 h-3.5 w-3.5" />
            Switch Account
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, isLoading, currentRole } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <RefreshCw className="h-4 w-4 animate-spin text-sky-600" />
          <span>Verifying SCADA Security Session...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(currentRole)) {
    return <UnauthorizedState allowedRoles={allowedRoles} currentRole={currentRole} />
  }

  return children ? children : null
}
