export const BRAND = 'ThaStore'
const CURRENCY = 'USD'

export const money = (n) =>
  n == null ? '-' : new Intl.NumberFormat('en-US', { style: 'currency', currency: CURRENCY }).format(n)

// Spring serialises LocalDateTime as an ISO string (no timezone) - or as [y,m,d,h,mi,s] if
// WRITE_DATES_AS_TIMESTAMPS is enabled. Handle both.
export function toDate(v) {
  if (!v) return null
  if (Array.isArray(v)) { const [y, mo, d, h = 0, mi = 0, s = 0] = v; return new Date(y, mo - 1, d, h, mi, s) }
  const dt = new Date(v)
  return Number.isNaN(dt.getTime()) ? null : dt
}
export const fmtDate = (v) => {
  const d = toDate(v)
  return d ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
}
export const fmtDateTime = (v) => {
  const d = toDate(v)
  return d ? d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'
}

// The API now returns `stock_id`; older builds returned `stockId`. Accept both.
export const stockIdOf = (s) => s.stock_id ?? s.stockId ?? s.StockId ?? s.id

// Order status: one place for the label and badge colour (was exported from Dashboard.jsx).
export const STATUS_LABEL = { PENDING: 'Pending', SUCCESS: 'Completed', FAILED: 'Cancelled' }
export const STATUS_TONE = { PENDING: 'warn', SUCCESS: 'ok', FAILED: 'bad' }
// Mirrors OrderStatus.canTransitionTo on the backend, so the UI only offers moves the server accepts.
export const NEXT_STATUSES = { PENDING: ['SUCCESS', 'FAILED'], SUCCESS: ['FAILED'], FAILED: [] }

// Same rules as the backend DTOs (UserDto / ChangePasswordDto).
export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 72

// Photo rules, same as the backend (LaptopImageService). The server re-checks everything: this is only to fail fast.
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const IMAGE_MAX_BYTES = 2 * 1024 * 1024
export function imageProblem(file) {
  if (!IMAGE_TYPES.includes(file.type)) return 'Use a JPG, PNG or WebP image.'
  if (file.size > IMAGE_MAX_BYTES) return `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The maximum is 2 MB.`
  return null
}
