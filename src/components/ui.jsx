import { cloneElement, isValidElement, useEffect, useId, useRef, useState } from 'react'
import { AlertTriangle, Eye, EyeOff, Loader2, X } from 'lucide-react'

export const cx = (...a) => a.filter(Boolean).join(' ')

/* ---------- Button: a keycap. The thick bottom edge disappears on press. ---------- */
const btnBase =
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold select-none ' +
  'transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none'
const btnVariants = {
  key: 'bg-bios text-white border border-bios hover:bg-bios-deep hover:shadow-md active:scale-[.98]',
  plain: 'bg-white text-ink border border-line hover:bg-chassis hover:border-slate-300 active:scale-[.98]',
  danger: 'bg-bad text-white border border-bad hover:bg-[#c4443b] active:scale-[.98]',
  ghost: 'text-ink hover:bg-chassis',
}
const btnSizes = { md: 'px-4 py-2 text-sm', sm: 'px-3 py-1.5 text-sm' }

export function Button({ variant = 'key', size = 'md', loading, disabled, className, children, type = 'button', ...rest }) {
  return (
    <button type={type} disabled={disabled || loading} className={cx(btnBase, btnVariants[variant], btnSizes[size], className)} {...rest}>
      {loading && <Loader2 size={16} className="animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

/* ---------- Form controls ---------- */
export const inputCls =
  'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/70 ' +
  'focus-visible:border-bios disabled:bg-chassis disabled:text-ink-soft aria-[invalid=true]:border-bad aria-[invalid=true]:bg-[#fffafa]'

// `error` is a message string (e.g. error.fieldErrors?.email from the API). The child input gets
// aria-invalid + aria-describedby automatically, so screen readers announce the problem too.
export function Field({ label, hint, error, children }) {
  const id = useId()
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined
  // Only inputs get the aria props (a plain <div> child, e.g. a radio group, is left alone).
  const child = isValidElement(children) && typeof children.type !== 'string'
    ? cloneElement(children, { 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })
    : children
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {child}
      {error
        ? <span id={`${id}-err`} role="alert" className="mt-1 block text-xs font-medium text-bad">{error}</span>
        : hint && <span id={`${id}-hint`} className="mt-1 block text-xs text-ink-soft">{hint}</span>}
    </label>
  )
}
export const Input = ({ className, ...p }) => <input className={cx(inputCls, className)} {...p} />
export const Select = ({ className, children, ...p }) => (
  <select className={cx(inputCls, 'pr-8', className)} {...p}>{children}</select>
)

// Password box with a show/hide toggle (used by login, register, change password, admin reset).
export function PasswordInput({ className, ...p }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input type={show ? 'text' : 'password'} className={cx(inputCls, 'pr-10', className)} {...p} />
      <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute inset-y-0 right-0 px-3 text-ink-soft hover:text-ink">
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}

/* ---------- Inline form error banner ---------- */
export const FormError = ({ children }) => children ? (
  <p role="alert" className="rounded-lg border border-bad/30 bg-[#fbeceb] px-3 py-2 text-sm text-[#8a2a24]">{children}</p>
) : null

/* ---------- Skeleton: grey placeholder shown while data loads ---------- */
export const Skeleton = ({ className }) => <div aria-hidden className={cx('animate-pulse rounded-lg bg-slate-200/70', className)} />

/* ---------- Modal ---------- */
export function Modal({ title, onClose, children, footer, size = 'md' }) {
  const box = useRef(null)
  // Keep the latest onClose in a ref so the effect runs ONCE. If it depended on onClose,
  // an inline arrow from the parent would re-run it each render and steal focus mid-typing.
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const previous = document.activeElement
    const onKey = (e) => {
      if (e.key === 'Escape') return closeRef.current()
      if (e.key !== 'Tab') return
      // Focus trap: Tab / Shift+Tab cycle inside the dialog instead of escaping to the page behind it.
      const f = [...box.current.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])')]
      if (!f.length) return
      const first = f[0], last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden' // background page must not scroll under the dialog
    ;(box.current.querySelector('input,select,textarea') || box.current).focus()
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; previous?.focus?.() }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/55 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={box} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}
        className={cx('max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-ink/10 bg-panel shadow-2xl sm:rounded-2xl',
          size === 'sm' ? 'sm:max-w-sm' : 'sm:max-w-lg')}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-lg">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 hover:bg-black/5"><X size={18} /></button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line bg-chassis/60 px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

export function ConfirmDialog({ title, message, confirmLabel = 'Delete', loading, onConfirm, onClose }) {
  return (
    <Modal
      title={title} onClose={onClose} size="sm"
      footer={<>
        <Button variant="plain" onClick={onClose}>Cancel</Button>
        <Button variant="danger" loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
      </>}
    >
      <p className="flex gap-3 text-sm"><AlertTriangle className="mt-0.5 shrink-0 text-bad" size={18} aria-hidden />{message}</p>
    </Modal>
  )
}

/* ---------- Small display pieces ---------- */
const badgeTones = {
  neutral: 'bg-chassis text-ink border-line',
  ok: 'bg-[#e1f3ea] text-[#0f5c39] border-[#a9d9c0]',
  warn: 'bg-[#fdf1c9] text-[#6b5000] border-[#ecd078]',
  bad: 'bg-[#f9e0de] text-[#8a2a24] border-[#e3aaa5]',
  bios: 'bg-bios-soft text-bios-deep border-[#b9c1ee]',
}
export const Badge = ({ tone = 'neutral', children }) => (
  <span className={cx('inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium', badgeTones[tone])}>{children}</span>
)

export const Spinner = ({ label = 'Loading' }) => (
  <div className="flex items-center justify-center gap-2 py-16 text-ink-soft" role="status">
    <Loader2 className="animate-spin" size={18} aria-hidden /> {label}
  </div>
)

export function ErrorState({ error, onRetry }) {
  return (
    <div role="alert" className="rounded-xl border border-bad/40 bg-[#fbeceb] p-6 text-center">
      <AlertTriangle className="mx-auto mb-2 text-bad" size={22} aria-hidden />
      <p className="font-medium text-[#8a2a24]">{error?.message || 'Something went wrong.'}</p>
      {onRetry && <Button variant="plain" size="sm" className="mt-3" onClick={onRetry}>Try again</Button>}
    </div>
  )
}

export const Empty = ({ title, children }) => (
  <div className="rounded-lg border border-dashed border-line bg-panel/60 px-6 py-12 text-center">
    <p className="font-semibold">{title}</p>
    {children && <div className="mt-1 text-sm text-ink-soft">{children}</div>}
  </div>
)

export const PageHeader = ({ title, description, actions }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 className="text-2xl sm:text-3xl">{title}</h1>
      {description && <p className="mt-1 max-w-prose text-sm text-ink-soft">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>
)

/* ---------- Table ---------- */
export const Table = ({ children }) => (
  <div className="overflow-x-auto rounded-lg border border-line bg-panel">
    <table className="w-full min-w-[640px] text-left text-sm">{children}</table>
  </div>
)
export const Th = ({ className, children }) => (
  <th scope="col" className={cx('border-b border-line bg-[#f8f9fc] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-soft', className)}>{children}</th>
)
export const Td = ({ className, children, ...p }) => (
  <td className={cx('border-b border-line/70 px-4 py-3 align-middle', className)} {...p}>{children}</td>
)

export function StockBadge({ qty }) {
  if (!qty) return <Badge tone="bad">Out of stock</Badge>
  if (qty <= 5) return <Badge tone="warn">Only {qty} left</Badge>
  return <Badge tone="ok">{qty} in stock</Badge>
}

/* Same keycap look for <Link>s: a <button> nested inside an <a> is invalid HTML. */
export const btn = (variant = 'key', size = 'md', extra) => cx(btnBase, btnVariants[variant], btnSizes[size], extra)
