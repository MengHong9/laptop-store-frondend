// Tokens + the resolved user live in localStorage so a page refresh keeps you signed in.
// Trade-off: any XSS bug could read localStorage. The backend returns tokens in the JSON
// body (not an httpOnly cookie), so this is the practical option here.
const TOKENS = 'ls.tokens'
const USER = 'ls.user'

const read = (k) => { try { return JSON.parse(localStorage.getItem(k)) } catch { return null } }

export const getTokens = () => read(TOKENS) || {}
export const setTokens = (t) => localStorage.setItem(TOKENS, JSON.stringify(t))
export const getSession = () => (getTokens().accessToken ? read(USER) : null)
export const saveSession = (u) => localStorage.setItem(USER, JSON.stringify(u))
export const clearSession = () => { localStorage.removeItem(TOKENS); localStorage.removeItem(USER) }
