// Run with: npm test   (starts a tiny mock backend that speaks the same envelope as the Spring API)
import http from 'node:http'
import { createServer } from 'vite'
import assert from 'node:assert/strict'

// --- mock backend that speaks the same envelope as the Spring API ---
let refreshCalls = 0, mode = 'ok'
const env = (code, description, data) => JSON.stringify({ code: String(code), message: code < 300 ? 'success' : 'fail', description, data })
const server = http.createServer((req, res) => {
  let body = ''; req.on('data', (c) => body += c); req.on('end', () => {
    const send = (st, d, data) => { res.writeHead(st, { 'content-type': 'application/json' }); res.end(env(st, d, data)) }
    const auth = req.headers.authorization
    if (req.url === '/api/v1/auth/login') return send(401, 'Invalid username or password.')
    if (req.url === '/api/v1/auth/register') return send(400, 'Validation failed', { name: 'username must be between 3 and 30 characters', email: 'invalid email format' })
    if (req.url === '/api/v1/auth/refresh') {
      refreshCalls++
      if (mode === 'refresh-dead') return send(401, 'Your session is no longer valid. Please sign in again.')
      return setTimeout(() => send(200, 'ok', { access_token: fresh, refresh_token: 'r2' }), 50)
    }
    if (req.url === '/api/v1/laptops/5/image' && req.method === 'POST') {
      const ct = req.headers['content-type'] || ''
      return send(200, 'ok', { multipart: ct.startsWith('multipart/form-data; boundary='), hasFilePart: body.includes('name="file"'), hasBytes: body.includes('FAKEPNG'), image_url: '/api/v1/laptops/5/image?v=x.png' })
    }
    if (req.url === '/api/v1/laptops/5/image' && req.method === 'DELETE') return send(200, 'ok', { id: 5 })
    if (req.url === '/api/v1/boom') return send(500, 'Something went wrong on our side. Please try again later.')
    if (req.url === '/api/v1/html502') { res.writeHead(502, { 'content-type': 'text/html' }); return res.end('<html>bad gateway</html>') }
    if (req.url === '/api/v1/laptops') return auth === `Bearer ${fresh}` ? send(200, 'ok', [{ id: 1 }]) : send(401, 'expired', { reason: 'TOKEN_EXPIRED' })
    send(404, 'nope')
  })
})
const jwt = (exp) => 'h.' + Buffer.from(JSON.stringify({ sub: 'x', exp })).toString('base64url') + '.s'
const fresh = jwt(Math.floor(Date.now() / 1000) + 3600)
const stale = jwt(Math.floor(Date.now() / 1000) - 3600)
await new Promise((r) => server.listen(0, r))
process.env.VITE_API_BASE_URL = `http://127.0.0.1:${server.address().port}`

// --- browser globals the client touches ---
const store = new Map()
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) }
const events = []
globalThis.window = new EventTarget()
window.dispatchEvent = ((orig) => (e) => { events.push(e.type); return orig.call(window, e) })(window.dispatchEvent)
globalThis.Event ??= class extends globalThis.Event {}

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { http: api, ApiError } = await vite.ssrLoadModule('/src/api/client.js')
const { authApi, laptopsApi } = await vite.ssrLoadModule('/src/api/endpoints.js')
let n = 0; const ok = (name) => console.log(`ok ${++n} - ${name}`)

// 1. wrong password -> readable message, status kept
await assert.rejects(authApi.login('a', 'b'), (e) => e instanceof ApiError && e.status === 401 && e.message === 'Invalid username or password.'); ok('login 401 -> friendly message')

// 2. validation errors -> fieldErrors map
await assert.rejects(authApi.register({}), (e) => e.status === 400 && e.fieldErrors.name && e.fieldErrors.email && e.message.includes('. ')); ok('400 validation -> fieldErrors')

// 3. 500 and a non-JSON 502 never show raw server text
await assert.rejects(api.get('/api/v1/boom'), (e) => e.status === 500 && !/exception|sql/i.test(e.message)); ok('500 -> safe message')
await assert.rejects(api.get('/api/v1/html502'), (e) => e.status === 502 && /unavailable/i.test(e.message)); ok('502 html body -> fallback message')

// 4. expired access token + 2 parallel requests -> exactly ONE refresh, both succeed
localStorage.setItem('ls.tokens', JSON.stringify({ accessToken: stale, refreshToken: 'r1' }))
const [a, b] = await Promise.all([laptopsApi.list(), laptopsApi.list()])
assert.deepEqual(a, [{ id: 1 }]); assert.deepEqual(b, [{ id: 1 }]); assert.equal(refreshCalls, 1)
assert.equal(JSON.parse(localStorage.getItem('ls.tokens')).refreshToken, 'r2'); ok('single-flight refresh (1 call for 2 requests), rotated token stored')

// 5. refresh rejected by server -> session ends
localStorage.setItem('ls.tokens', JSON.stringify({ accessToken: stale, refreshToken: 'dead' })); mode = 'refresh-dead'; events.length = 0
await assert.rejects(laptopsApi.list(), (e) => e.status === 401)
assert.ok(events.includes('auth:expired')); ok('refresh rejected -> auth:expired fired')

// 5b. photo upload: real multipart body with a part called "file" (the backend reads @RequestParam("file"))
localStorage.setItem('ls.tokens', JSON.stringify({ accessToken: fresh, refreshToken: 'r2' }))
const up = await laptopsApi.uploadImage(5, new File([Buffer.from('\x89PNG FAKEPNG')], 'photo.png', { type: 'image/png' }))
assert.equal(up.multipart, true); assert.equal(up.hasFilePart, true); assert.equal(up.hasBytes, true); ok('uploadImage sends multipart/form-data with part "file"')
assert.deepEqual(await laptopsApi.removeImage(5), { id: 5 }); ok('removeImage -> DELETE /laptops/5/image')

// 5c. client-side photo rules mirror the server (fail fast before uploading)
const { imageProblem } = await vite.ssrLoadModule('/src/lib/format.js')
assert.equal(imageProblem({ type: 'image/png', size: 1000 }), null)
assert.match(imageProblem({ type: 'image/svg+xml', size: 1000 }), /JPG, PNG or WebP/)
assert.match(imageProblem({ type: 'image/jpeg', size: 3 * 1024 * 1024 }), /maximum is 2 MB/); ok('imageProblem: svg rejected, >2 MB rejected, png accepted')

// 6. server unreachable -> network error, session NOT ended
events.length = 0; mode = 'ok'; server.close()
localStorage.setItem('ls.tokens', JSON.stringify({ accessToken: fresh, refreshToken: 'r2' }))
await assert.rejects(laptopsApi.list(), (e) => e.network === true && /Cannot reach/.test(e.message))
assert.ok(!events.includes('auth:expired')); ok('network down -> friendly error, user stays signed in')

await vite.close(); console.log('ALL PASSED'); process.exit(0)
