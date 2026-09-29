// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'
import React from 'react'
import { render, cleanup, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import fs from 'node:fs'
import path from 'node:path'
import App from '../App.jsx'
import AuthProvider from '../context/AuthProvider.jsx'
import SettingsProvider from '../context/SettingsProvider.jsx'
import { ROLES } from '../context/authContext.js'

// Setup robust jsdom environment and instant local static file serving
beforeAll(() => {
  window.scrollTo = vi.fn()
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  if (!window.matchMedia) {
    window.matchMedia = () => ({
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })
  }
  if (!document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen = vi.fn().mockResolvedValue(undefined)
  }
  if (!document.exitFullscreen) {
    document.exitFullscreen = vi.fn().mockResolvedValue(undefined)
  }

  // Intercept fetch for static public data files to resolve instantly from disk
  const origFetch = globalThis.fetch
  globalThis.fetch = async (url, options) => {
    if (typeof url === 'string' && (url.startsWith('/data/') || url.includes('/data/'))) {
      const fileName = url.split('/data/')[1]?.split('?')[0]
      if (fileName) {
        const filePath = path.resolve(__dirname, '../../public/data', fileName)
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8')
          return new Response(content, {
            status: 200,
            headers: { 'Content-Type': 'text/csv' },
          })
        }
      }
    }
    if (typeof url === 'string' && url.startsWith('/')) {
      return origFetch(`http://localhost:5173${url}`, options).catch(() => new Response('{}', { status: 200 }))
    }
    return origFetch ? origFetch(url, options) : new Response('{}', { status: 200 })
  }
})

afterEach(() => {
  cleanup()
})

const ROUTES_TO_TEST = [
  { route: '/dashboard', expectedHeading: /Dashboard/i },
  { route: '/process', expectedHeading: /Process/i },
  { route: '/monitoring', expectedHeading: /Monitoring/i },
  { route: '/monitoring/sensors', expectedHeading: /Sensors/i },
  { route: '/monitoring/history', expectedHeading: /Historical/i },
  { route: '/insights', expectedHeading: /Insights/i },
  { route: '/compliance', expectedHeading: /Compliance/i },
  { route: '/compliance/reports/RPT-2026-001', expectedHeading: /AquaTrust/i },
  { route: '/blockchain', expectedHeading: /Blockchain|Ledger/i },
  { route: '/blockchain/verify', expectedHeading: /Verification|Audit/i },
  { route: '/blockchain/transactions/tx_fabric_aquatrust_001', expectedHeading: /AquaTrust/i },
  { route: '/alarms', expectedHeading: /Alarm/i },
  { route: '/auditor', expectedHeading: /Auditor/i },
  { route: '/regulator', expectedHeading: /Regulator/i },
  { route: '/verify/AUD-001', expectedHeading: /Verification/i },
  { route: '/verify/REC-0001', expectedHeading: /Verification/i },
  { route: '/verify', expectedHeading: /Verification/i },
  { route: '/dashboard?demo=true', expectedHeading: /Dashboard/i },
  { route: '/process?demo=true', expectedHeading: /Process/i },
]

const ROLES_TO_TEST = [
  { role: ROLES.OPERATOR, label: 'Plant Operator' },
  { role: ROLES.AUDITOR, label: 'Independent Auditor' },
  { role: ROLES.REGULATOR, label: 'Environmental Regulator' },
]

describe('Route Smoke Tests (Permanent Regression Guard)', () => {
  for (const { role, label: roleLabel } of ROLES_TO_TEST) {
    describe(`Role: ${roleLabel}`, () => {
      for (const { route, expectedHeading } of ROUTES_TO_TEST) {
        it(`renders [${route}] without console errors and displays landmark heading`, async () => {
          window.localStorage.setItem('aquatrust-auth-role-v1', role)

          const consoleErrors = []
          const originalError = console.error
          console.error = (...args) => {
            const str = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')
            // Ignore Recharts SVG zero-dimension warnings in jsdom headless test environment
            if (!str.includes('The width(0) and height(0) of chart') && !str.includes('not wrapped in act')) {
              consoleErrors.push(str)
            }
            originalError(...args)
          }

          let container = null
          try {
            await act(async () => {
              const res = render(
                <MemoryRouter initialEntries={[route]}>
                  <SettingsProvider>
                    <AuthProvider>
                      <App />
                    </AuthProvider>
                  </SettingsProvider>
                </MemoryRouter>
              )
              container = res.container
            })

            // Allow microtasks and state to settle
            await act(async () => {
              await new Promise((r) => setTimeout(r, 20))
            })
          } finally {
            console.error = originalError
          }

          // Assert no fatal console errors
          expect(consoleErrors).toEqual([])

          // Assert landmark headings are present
          const headings = Array.from(container.querySelectorAll('h1, h2, h3, [role="heading"]'))
            .map((h) => h.textContent.trim())
            .filter(Boolean)

          expect(headings.length).toBeGreaterThan(0)
          const matched = headings.some((h) => expectedHeading.test(h))
          expect(matched).toBe(true)

          // Assert not blank and not 404
          const text = container.textContent || ''
          expect(text.trim().length).toBeGreaterThan(20)
          expect(text).not.toContain('Page not found')
        })
      }
    })
  }
})
