import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authApi, meApi } from '../api/endpoints'
import { clearSession, getSession, getTokens, saveSession, setTokens } from './storage'
import { decodeJwt } from './jwt'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

// Login/register answer with { access_token, refresh_token, user }, so we know the role immediately.
// Fallbacks keep the app usable against an older backend: JWT `role` claim, then GET /me.
async function resolveUser(data) {
  if (data.user) return data.user
  const claims = decodeJwt(data.access_token)
  const role = (claims?.role || '').replace('ROLE_', '')
  if (role) return { id: null, name: claims.sub, email: null, role }
  return meApi.get()
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getSession) // lazy init: restores the session on page refresh

  const signIn = useCallback(async (data) => {
    // Tokens first: a /me fallback request reads the access token from storage.
    setTokens({ accessToken: data.access_token, refreshToken: data.refresh_token })
    try {
      const u = await resolveUser(data)
      saveSession(u)
      setUser(u)
      return u
    } catch (e) {
      clearSession()
      throw e
    }
  }, [])

  const login = useCallback(async (username, password) => {
    try {
      return await signIn(await authApi.login(username, password))
    } catch (e) {
      // The server now answers 401 "Invalid username or password." itself.
      throw e
    }
  }, [signIn])

  const register = useCallback(async (body) => signIn(await authApi.register(body)), [signIn])

  // Called after the password was changed: the backend revoked every other session and sent new tokens.
  const replaceTokens = useCallback((data) => {
    if (data?.access_token) setTokens({ accessToken: data.access_token, refreshToken: data.refresh_token })
  }, [])

  const logout = useCallback(() => {
    const { refreshToken } = getTokens()
    // Tell the server to revoke the refresh token (fire and forget), then clear the browser state.
    if (refreshToken) authApi.logout(refreshToken).catch(() => {})
    clearSession()
    setUser(null)
    window.dispatchEvent(new Event('auth:logout')) // CartProvider listens: do not leave one user's cart for the next
  }, [])

  // Refresh failed for good (expired / revoked): nothing to revoke any more, just leave.
  const expire = useCallback(() => {
    clearSession()
    setUser(null)
    window.dispatchEvent(new Event('auth:logout'))
    sessionStorage.setItem('ls.notice', 'Your session expired. Please sign in again.') // shown once by the Login page
  }, [])

  useEffect(() => {
    window.addEventListener('auth:expired', expire)
    return () => window.removeEventListener('auth:expired', expire)
  }, [expire])

  // On start-up, re-read who we are. If an admin changed this user's role (or deleted them) while the
  // tab was closed, the cached role would be wrong. Errors are ignored here: the interceptor handles 401.
  useEffect(() => {
    if (!getTokens().accessToken) return
    meApi.get().then((fresh) => { saveSession(fresh); setUser(fresh) }).catch(() => {})
  }, [])

  const value = useMemo(
    () => ({ user, isAdmin: user?.role === 'ADMIN', login, register, logout, replaceTokens }),
    [user, login, register, logout, replaceTokens]
  )
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}
