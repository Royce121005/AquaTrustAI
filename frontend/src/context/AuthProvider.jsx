import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext, ROLES, ROLE_METADATA } from './authContext.js'
import { loginApi, getCurrentUserApi } from '../services/api/auth.js'
import { clearStoredTokens, getStoredToken } from '../services/apiClient.js'

const ROLE_STORAGE_KEY = 'aquatrust-auth-role-v1'
const TOKEN_STORAGE_KEY = 'aquatrust-token'
const USER_STORAGE_KEY = 'aquatrust-auth-user'

// Pre-configured offline demo accounts fallback
const DEMO_CREDENTIALS = {
  operator: {
    password: 'operator123',
    user: {
      user_id: 'demo-user-operator-001',
      username: 'operator',
      role: ROLES.OPERATOR,
      facility_id: 'FAC-CPCB-001',
    },
  },
  auditor: {
    password: 'auditor123',
    user: {
      user_id: 'demo-user-auditor-001',
      username: 'auditor',
      role: ROLES.AUDITOR,
      facility_id: null,
    },
  },
  regulator: {
    password: 'regulator123',
    user: {
      user_id: 'demo-user-regulator-001',
      username: 'regulator',
      role: ROLES.REGULATOR,
      facility_id: null,
    },
  },
  admin: {
    password: 'admin123',
    user: {
      user_id: 'demo-user-admin-001',
      username: 'admin',
      role: ROLES.ADMIN,
      facility_id: null,
    },
  },
}

export default function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken())
  const [user, setUser] = useState(() => {
    try {
      const savedUser = window.localStorage.getItem(USER_STORAGE_KEY)
      return savedUser ? JSON.parse(savedUser) : null
    } catch {
      return null
    }
  })

  const [currentRole, setCurrentRole] = useState(() => {
    try {
      const savedUser = window.localStorage.getItem(USER_STORAGE_KEY)
      if (savedUser) {
        const parsed = JSON.parse(savedUser)
        if (parsed?.role && Object.values(ROLES).includes(parsed.role)) {
          return parsed.role
        }
      }
      const savedRole = window.localStorage.getItem(ROLE_STORAGE_KEY)
      if (savedRole && Object.values(ROLES).includes(savedRole)) {
        return savedRole
      }
    } catch {
      // Ignore
    }
    return ROLES.AUDITOR
  })

  const [isLoading, setIsLoading] = useState(() => {
    // If token exists, we will verify it asynchronously
    return Boolean(getStoredToken())
  })

  // Synchronize authentication status
  const isAuthenticated = Boolean(token || (typeof window !== 'undefined' && window.localStorage.getItem(ROLE_STORAGE_KEY)))

  // On mount: verify token against GET /api/v1/auth/me if token exists
  useEffect(() => {
    let isMounted = true
    const activeToken = getStoredToken()

    if (!activeToken) {
      setIsLoading(false)
      return
    }

    getCurrentUserApi()
      .then((profile) => {
        if (!isMounted) return
        setUser(profile)
        if (profile.role && Object.values(ROLES).includes(profile.role)) {
          setCurrentRole(profile.role)
          try {
            window.localStorage.setItem(ROLE_STORAGE_KEY, profile.role)
            window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile))
          } catch {}
        }
      })
      .catch((err) => {
        if (!isMounted) return
        // If explicitly unauthorized 401, invalidate
        if (err?.status === 401 || err?.statusCode === 401) {
          clearStoredTokens()
          try {
            window.localStorage.removeItem(ROLE_STORAGE_KEY)
          } catch {}
          setToken(null)
          setUser(null)
        }
        // In case of network errors (offline mode), retain existing local session
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  // Listen to 401 unauthorized events dispatched by apiClient
  useEffect(() => {
    const handleUnauthorized = () => {
      clearStoredTokens()
      try {
        window.localStorage.removeItem(ROLE_STORAGE_KEY)
      } catch {}
      setToken(null)
      setUser(null)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('aquatrust:auth:unauthorized', handleUnauthorized)
      return () => {
        window.removeEventListener('aquatrust:auth:unauthorized', handleUnauthorized)
      }
    }
  }, [])

  // Login handler
  const login = useCallback(async (username, password) => {
    setIsLoading(true)
    try {
      const response = await loginApi(username, password)
      const accessToken = response.access_token
      const sessionUser = {
        user_id: response.user_id,
        username: response.username,
        role: response.role,
        facility_id: response.facility_id,
      }

      setToken(accessToken)
      setUser(sessionUser)
      setCurrentRole(response.role)

      try {
        window.localStorage.setItem(TOKEN_STORAGE_KEY, accessToken)
        window.localStorage.setItem(ROLE_STORAGE_KEY, response.role)
        window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(sessionUser))
      } catch {}

      return sessionUser
    } catch (err) {
      // Offline Demo Fallback if API backend is unreachable (network/connection error)
      const normalizedErr = err || {}
      const isNetworkError = !normalizedErr.status && !normalizedErr.statusCode
      const demoAccount = DEMO_CREDENTIALS[username.toLowerCase().trim()]

      if (isNetworkError && demoAccount && demoAccount.password === password) {
        const mockToken = `demo_jwt_token_${username}_${Date.now()}`
        const sessionUser = demoAccount.user

        setToken(mockToken)
        setUser(sessionUser)
        setCurrentRole(sessionUser.role)

        try {
          window.localStorage.setItem(TOKEN_STORAGE_KEY, mockToken)
          window.localStorage.setItem(ROLE_STORAGE_KEY, sessionUser.role)
          window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(sessionUser))
        } catch {}

        return sessionUser
      }

      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Logout handler
  const logout = useCallback(() => {
    clearStoredTokens()
    try {
      window.localStorage.removeItem(ROLE_STORAGE_KEY)
      window.localStorage.removeItem(USER_STORAGE_KEY)
    } catch {}
    setToken(null)
    setUser(null)
  }, [])

  // Dynamic role switch handler (for development & demo personas)
  const setRole = useCallback((newRole) => {
    if (Object.values(ROLES).includes(newRole)) {
      setCurrentRole(newRole)
      try {
        window.localStorage.setItem(ROLE_STORAGE_KEY, newRole)
        setUser((prev) => (prev ? { ...prev, role: newRole } : { username: newRole, role: newRole }))
      } catch {}
    }
  }, [])

  const permissions = useMemo(() => {
    return {
      canAuthorizeCorrection:
        currentRole === ROLES.AUDITOR || currentRole === ROLES.REGULATOR || currentRole === ROLES.ADMIN,
      canRequestCorrection: true,
      canReconcileLedger:
        currentRole === ROLES.AUDITOR || currentRole === ROLES.REGULATOR || currentRole === ROLES.ADMIN,
      canIngestReadings: currentRole === ROLES.OPERATOR || currentRole === ROLES.ADMIN,
      canExportCertificates: true,
      canManageUsers: currentRole === ROLES.ADMIN,
      canConfigureSystem: currentRole === ROLES.ADMIN,
      isOperator: currentRole === ROLES.OPERATOR,
      isAuditor: currentRole === ROLES.AUDITOR,
      isRegulator: currentRole === ROLES.REGULATOR,
      isAdmin: currentRole === ROLES.ADMIN,
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
      token,
      user,
      currentRole,
      isAuthenticated,
      isLoading,
      login,
      logout,
      setRole,
      homeRoute,
      permissions,
      availableRoles: ROLES,
      roleMetadata: ROLE_METADATA,
    }),
    [token, user, currentRole, isAuthenticated, isLoading, login, logout, setRole, homeRoute, permissions],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
