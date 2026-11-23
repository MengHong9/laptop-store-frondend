// A JWT is three base64url parts: header.payload.signature. The payload is NOT encrypted,
// only signed, so the browser can read it (never trust it for security - the server does).
export function decodeJwt(token) {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(b64).split('').map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
    )
    return JSON.parse(json)
  } catch {
    return null
  }
}

// `exp` is in SECONDS (jjwt) - Date.now() is in milliseconds. `skew` refreshes slightly early.
export function isExpired(token, skewSeconds = 0) {
  const exp = decodeJwt(token)?.exp
  return !exp || exp * 1000 - skewSeconds * 1000 <= Date.now()
}
