import { useCallback, useMemo, useState } from 'react'
import { AuthContext, ROLES, ROLE_METADATA } from './authContext.js'

const STORAGE_KEY = 'aquatrust-auth-role-v1'

export default function AuthProvider({ children }) {
  const [currentRole, setCurrentRole] = useState(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved && Object.values(ROLES).includes(saved)) {
        return saved
      }
    } catch {
      // Fallback
    }
    return ROLES.AUDITOR // Default to Auditor for demonstration of DLT verification
  })

  const setRole = useCallback((newRole) => {
    if (Object.values(ROLES).includes(newRole)) {
      setCurrentRole(newRole)
      try {
        window.localStorage.setItem(STORAGE_KEY, newRole)
      } catch {
        // Ignore storage errors
      }
    }
  }, [])

  const permissions = useMemo(() => {
    return {
      canAuthorizeCorrection: currentRole === ROLES.AUDITOR || currentRole === ROLES.REGULATOR,
      canRequestCorrection: true,
      canReconcileLedger: currentRole === ROLES.AUDITOR || currentRole === ROLES.REGULATOR,
      canIngestReadings: currentRole === ROLES.OPERATOR,
      canExportCertificates: true,
      isOperator: currentRole === ROLES.OPERATOR,
      isAuditor: currentRole === ROLES.AUDITOR,
      isRegulator: currentRole === ROLES.REGULATOR,
      roleMetadata: ROLE_METADATA[currentRole] || ROLE_METADATA[ROLES.AUDITOR],
    }
  }, [currentRole])

  const homeRoute = useMemo(() => {
    if (currentRole === ROLES.AUDITOR) return '/auditor'
    if (currentRole === ROLES.REGULATOR) return '/regulator'
    return '/dashboard'
  }, [currentRole])

  const value = useMemo(
    () => ({
      currentRole,
      setRole,
      homeRoute,
      permissions,
      availableRoles: ROLES,
      roleMetadata: ROLE_METADATA,
    }),
    [currentRole, setRole, homeRoute, permissions],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
