const rawBaseUrl = import.meta.env.VITE_API_BASE_URL ?? ''

export const API_BASE_URL = typeof rawBaseUrl === 'string' ? rawBaseUrl.trim().replace(/\/+$/, '') : ''

export const USE_API =
  String(import.meta.env.VITE_USE_API ?? 'false').trim().toLowerCase() === 'true'

export const IS_DEV = Boolean(import.meta.env.DEV)

if (IS_DEV && USE_API && !API_BASE_URL) {
  console.warn(
    '[config] VITE_USE_API=true but VITE_API_BASE_URL is not set. ' +
      'API-backed services will reject with a "not wired yet" error until the FastAPI contract arrives.',
  )
}
