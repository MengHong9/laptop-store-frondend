import axios from 'axios'
import { getTokens, setTokens } from '../auth/storage'
import { isExpired } from '../auth/jwt'

const baseURL = import.meta.env.VITE_API_BASE_URL || ''

// Every backend reply is wrapped: { code, message, description, data, timestamp }.
// ApiError flattens the failure into one shape so every page can simply show `error.message`
// and forms can show `error.fieldErrors.<field>` next to the right input.
// image_url from the API is a relative path (/api/v1/laptops/3/image?v=...). With a separate API origin it needs the base URL.
export const assetUrl = (path) => (path ? baseURL + path : path)

export class ApiError extends Error {
  constructor(status, message, { fieldErrors, reason, network } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors || null
    this.reason = reason || null   // e.g. TOKEN_EXPIRED (see CustomAuthenticationEntryPoint)
    this.network = !!network
  }
}

// Used only when the server gave no usable `description` (proxy errors, HTML error pages, ...).
const FALLBACK = {
  400: 'The request was not valid. Please check what you entered.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to do that.',
  404: 'We could not find what you were looking for.',
  405: 'That action is not supported.',
  409: 'That conflicts with existing data. Please refresh and try again.',
  413: 'That request is too large.',
  422: 'That could not be completed.',
  429: 'Too many requests. Please wait a moment and try again.',
  502: 'The server is temporarily unavailable. Please try again shortly.',
  503: 'The server is temporarily unavailable. Please try again shortly.',
  504: 'The server took too long to respond. Please try again.',
}

export function toApiError(err) {
  if (err instanceof ApiError) return err
  if (axios.isCancel?.(err)) return new ApiError(0, 'Request cancelled.', { network: true })
  if (!err.response) {
    const timeout = err.code === 'ECONNABORTED'
    return new ApiError(0, timeout
      ? 'The server took too long to respond. Please try again.'
      : 'Cannot reach the server. Check your internet connection and try again.', { network: true })
  }
  const { status, data } = err.response
  const body = data && typeof data === 'object' ? data : {}

  // Validation errors arrive as data: { fieldName: "message" } (GlobalException.handleValidation)
  if (status === 400 && body.data && typeof body.data === 'object' && !Array.isArray(body.data)) {
    const fieldErrors = body.data
    return new ApiError(status, Object.values(fieldErrors).join('. '), { fieldErrors })
  }
  const message = body.description || FALLBACK[status]
    || (status >= 500 ? 'Something went wrong on our side. Please try again later.' : `Request failed (${status}).`)
  return new ApiError(status, message, { reason: body.data?.reason })
}

export const http = axios.create({ baseURL, timeout: 20000 })
// A second instance WITHOUT interceptors, used only for /refresh so it can never loop.
const bare = axios.create({ baseURL, timeout: 20000 })

const isAuthUrl = (url = '') => url.includes('/api/v1/auth/')

// ---- Single-flight refresh --------------------------------------------------
// The backend ROTATES refresh tokens: using one revokes it. If two requests expire at the same
// moment and both called /refresh with the same token, the second would fail and the user would be
// logged out. So all callers within this tab share ONE in-flight promise.
let inflight = null
export function refreshAccessToken() {
  if (!inflight) {
    const { refreshToken } = getTokens()
    if (!refreshToken) return Promise.reject(new ApiError(401, 'Your session has expired. Please sign in again.'))
    inflight = bare
      .post('/api/v1/auth/refresh', { refresh_token: refreshToken })
      .then((res) => {
        const d = res.data.data
        setTokens({ accessToken: d.access_token, refreshToken: d.refresh_token })
        return d.access_token
      })
      .catch((e) => { throw toApiError(e) })
      .finally(() => { inflight = null })
  }
  return inflight
}

const expireSession = () => window.dispatchEvent(new Event('auth:expired'))

// A refresh only means "the session is over" when the SERVER rejected it (401/403/404).
// A network blip or a 5xx must not log the user out - they can simply retry.
const sessionIsOver = (e) => !e.network && [400, 401, 403, 404].includes(e.status)

// ---- Request: attach the Bearer token (refresh first if it is about to expire) ----
http.interceptors.request.use(async (config) => {
  if (isAuthUrl(config.url)) return config
  let { accessToken } = getTokens()
  if (accessToken && isExpired(accessToken, 30)) {
    try { accessToken = await refreshAccessToken() }
    catch (e) { if (sessionIsOver(e)) expireSession(); throw e }
  }
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

// ---- Response: unwrap the envelope; on 401 refresh once and retry ----
http.interceptors.response.use(
  (res) => res.data?.data ?? null,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && original && !original._retried && !isAuthUrl(original.url)) {
      original._retried = true
      try {
        const token = await refreshAccessToken()
        original.headers.Authorization = `Bearer ${token}`
        return http(original)
      } catch (e) {
        if (sessionIsOver(e)) expireSession()
        throw e
      }
    }
    throw toApiError(err)
  }
)
