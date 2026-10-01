// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ROLES, ROLE_METADATA } from '../context/authContext.js'
import AuthProvider from '../context/AuthProvider.jsx'
import useAuth from '../hooks/useAuth.js'
import ProtectedRoute from '../components/auth/ProtectedRoute.jsx'
import LoginPage from '../pages/auth/LoginPage.jsx'
import apiClient, { getStoredToken, clearStoredTokens } from '../services/apiClient.js'

describe('Auth Context & Metadata Definitions', () => {
  it('defines all required enterprise roles including ADMIN', () => {
    expect(ROLES.OPERATOR).toBe('operator')
    expect(ROLES.AUDITOR).toBe('auditor')
    expect(ROLES.REGULATOR).toBe('regulatory_stakeholder')
    expect(ROLES.ADMIN).toBe('admin')
  })

  it('provides complete metadata for ADMIN and standard roles', () => {
    expect(ROLE_METADATA[ROLES.ADMIN]).toBeDefined()
    expect(ROLE_METADATA[ROLES.ADMIN].label).toBe('System Administrator')
    expect(ROLE_METADATA[ROLES.ADMIN].badgeTone).toBe('danger')
    expect(ROLE_METADATA[ROLES.ADMIN].scope).toContain('Enterprise Root')

    expect(ROLE_METADATA[ROLES.OPERATOR].label).toBe('Plant Operator')
    expect(ROLE_METADATA[ROLES.AUDITOR].label).toBe('Independent Auditor')
    expect(ROLE_METADATA[ROLES.REGULATOR].label).toBe('Environmental Regulator (CPCB)')
  })
})

describe('ApiClient Interceptors & Storage Utilities', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  it('retrieves stored token from localStorage or sessionStorage', () => {
    expect(getStoredToken()).toBeNull()

    window.localStorage.setItem('aquatrust-token', 'mock_jwt_local')
    expect(getStoredToken()).toBe('mock_jwt_local')

    window.sessionStorage.setItem('aquatrust-token', 'mock_jwt_session')
    expect(getStoredToken()).toBe('mock_jwt_session')
  })

  it('clears stored tokens correctly', () => {
    window.localStorage.setItem('aquatrust-token', 'token1')
    window.sessionStorage.setItem('aquatrust-token', 'token2')
    window.localStorage.setItem('aquatrust-auth-user', '{"name":"user"}')

    clearStoredTokens()

    expect(window.localStorage.getItem('aquatrust-token')).toBeNull()
    expect(window.sessionStorage.getItem('aquatrust-token')).toBeNull()
    expect(window.localStorage.getItem('aquatrust-auth-user')).toBeNull()
  })

  it('attaches Bearer token in request interceptor', async () => {
    window.localStorage.setItem('aquatrust-token', 'test-token-123')
    const config = { headers: {} }

    const requestInterceptor = apiClient.interceptors.request.handlers[0]
    const updatedConfig = await requestInterceptor.fulfilled(config)

    expect(updatedConfig.headers.Authorization).toBe('Bearer test-token-123')
  })

  it('handles 401 response: clears tokens and dispatches custom event', async () => {
    window.localStorage.setItem('aquatrust-token', 'test-token-123')
    const eventSpy = vi.fn()
    window.addEventListener('aquatrust:auth:unauthorized', eventSpy)

    const responseInterceptor = apiClient.interceptors.response.handlers[0]
    const mock401Error = {
      response: {
        status: 401,
        data: { detail: 'Token expired' },
      },
    }

    await expect(responseInterceptor.rejected(mock401Error)).rejects.toBeDefined()

    expect(window.localStorage.getItem('aquatrust-token')).toBeNull()
    expect(eventSpy).toHaveBeenCalled()

    window.removeEventListener('aquatrust:auth:unauthorized', eventSpy)
  })

  it('handles 403 response: dispatches forbidden custom event', async () => {
    const eventSpy = vi.fn()
    window.addEventListener('aquatrust:auth:forbidden', eventSpy)

    const responseInterceptor = apiClient.interceptors.response.handlers[0]
    const mock403Error = {
      response: {
        status: 403,
        data: { detail: 'Insufficient permissions' },
      },
    }

    await expect(responseInterceptor.rejected(mock403Error)).rejects.toBeDefined()
    expect(eventSpy).toHaveBeenCalled()

    window.removeEventListener('aquatrust:auth:forbidden', eventSpy)
  })
})

function TestConsumer() {
  const { currentRole, setRole, login, logout, permissions, homeRoute, isAuthenticated, user } = useAuth()
  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'AUTHENTICATED' : 'ANONYMOUS'}</div>
      <div data-testid="current-role">{currentRole}</div>
      <div data-testid="home-route">{homeRoute}</div>
      <div data-testid="can-manage-users">{permissions.canManageUsers ? 'YES' : 'NO'}</div>
      <div data-testid="user-info">{user ? user.username : 'NO_USER'}</div>
      <button type="button" onClick={() => setRole(ROLES.ADMIN)}>Set Admin</button>
      <button type="button" onClick={() => login('operator', 'operator123')}>Login Operator</button>
      <button type="button" onClick={() => login('admin', 'admin123')}>Login Admin</button>
      <button type="button" onClick={logout}>Logout</button>
    </div>
  )
}

describe('AuthProvider & Permissions', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('provides default role and permissions', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )

    expect(screen.getByTestId('current-role').textContent).toBe(ROLES.AUDITOR)
    expect(screen.getByTestId('home-route').textContent).toBe('/auditor')
  })

  it('updates permissions when role is changed to ADMIN', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )

    expect(screen.getByTestId('can-manage-users').textContent).toBe('NO')

    fireEvent.click(screen.getByText('Set Admin'))

    expect(screen.getByTestId('current-role').textContent).toBe(ROLES.ADMIN)
    expect(screen.getByTestId('can-manage-users').textContent).toBe('YES')
  })

  it('handles login and logout lifecycle', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: {
        access_token: 'mock_jwt_token',
        token_type: 'bearer',
        user_id: 'usr_001',
        username: 'operator',
        role: ROLES.OPERATOR,
        facility_id: 'FAC-001',
      },
    })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )

    await act(async () => {
      fireEvent.click(screen.getByText('Login Operator'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe('AUTHENTICATED')
      expect(screen.getByTestId('current-role').textContent).toBe(ROLES.OPERATOR)
      expect(screen.getByTestId('user-info').textContent).toBe('operator')
    })

    await act(async () => {
      fireEvent.click(screen.getByText('Logout'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe('ANONYMOUS')
      expect(screen.getByTestId('user-info').textContent).toBe('NO_USER')
    })
  })
})

describe('ProtectedRoute Component', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('redirects to /login when unauthenticated', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/protected']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<div>Login Page Target</div>} />
            <Route
              path="/protected"
              element={
                <ProtectedRoute>
                  <div>Secret Content</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(container.textContent).toContain('Login Page Target')
      expect(container.textContent).not.toContain('Secret Content')
    })
  })

  it('renders content when user is authenticated with allowed role', async () => {
    window.localStorage.setItem('aquatrust-token', 'mock_token')
    window.localStorage.setItem('aquatrust-auth-role-v1', ROLES.OPERATOR)

    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: {
        sub: 'operator',
        user_id: 'u1',
        username: 'operator',
        role: ROLES.OPERATOR,
        facility_id: 'FAC-01',
      },
    })

    const { container } = render(
      <MemoryRouter initialEntries={['/operator-area']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/operator-area"
              element={
                <ProtectedRoute allowedRoles={[ROLES.OPERATOR, ROLES.ADMIN]}>
                  <div>Operator Console Content</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(container.textContent).toContain('Operator Console Content')
    })
  })

  it('renders UnauthorizedState when user lacks required role', async () => {
    window.localStorage.setItem('aquatrust-token', 'mock_token')
    window.localStorage.setItem('aquatrust-auth-role-v1', ROLES.OPERATOR)

    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: {
        sub: 'operator',
        user_id: 'u1',
        username: 'operator',
        role: ROLES.OPERATOR,
        facility_id: 'FAC-01',
      },
    })

    const { container } = render(
      <MemoryRouter initialEntries={['/admin-only']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/admin-only"
              element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                  <div>Admin Secret Content</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(container.textContent).not.toContain('Admin Secret Content')
      expect(container.textContent).toMatch(/Access Restricted: Role Authorization Required/i)
    })
  })
})

describe('LoginPage Component & Demo Personas', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders SCADA login form and quick-fill demo buttons', () => {
    const { container } = render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(container.textContent).toContain('Sign In to SCADA Workspace')
    expect(container.querySelector('input[type="text"]')).toBeTruthy()
    expect(container.querySelector('input[type="password"]')).toBeTruthy()

    // 4 Demo Personas
    expect(container.textContent).toContain('Plant Operator')
    expect(container.textContent).toContain('Independent Auditor')
    expect(container.textContent).toContain('CPCB Regulator')
    expect(container.textContent).toContain('System Administrator')
  })

  it('allows one-click login via demo persona card', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: {
        access_token: 'mock_jwt_auditor',
        token_type: 'bearer',
        user_id: 'usr_auditor_1',
        username: 'auditor',
        role: ROLES.AUDITOR,
        facility_id: null,
      },
    })

    const { container } = render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auditor" element={<div>Auditor Destination Workspace</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    const auditorButton = screen.getByText('Independent Auditor').closest('button')
    expect(auditorButton).not.toBeNull()

    await act(async () => {
      fireEvent.click(auditorButton)
    })

    await waitFor(() => {
      expect(container.textContent).toContain('Auditor Destination Workspace')
    })
  })
})
