import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { CheckCircle2, X, XCircle } from 'lucide-react'
import { cx } from './ui'

const ToastCtx = createContext(null)
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const push = useCallback((type, message) => {
    const id = crypto.randomUUID()
    // Same message twice in a row (e.g. a double click) shows once instead of stacking.
    setToasts((t) => (t.some((x) => x.message === message && x.type === type) ? t : [...t.slice(-3), { id, type, message }]))
    setTimeout(() => dismiss(id), type === 'error' ? 8000 : 3500)
  }, [dismiss])

  const api = useMemo(() => ({ success: (m) => push('success', m), error: (m) => push('error', m) }), [push])

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((t) => (
          // errors are announced assertively, successes politely
          <div key={t.id} role={t.type === 'error' ? 'alert' : 'status'}
            className={cx('pointer-events-auto flex items-start gap-2 rounded-xl border bg-panel px-4 py-3 text-sm shadow-lg',
              t.type === 'error' ? 'border-bad' : 'border-ok')}>
            {t.type === 'error'
              ? <XCircle size={18} className="mt-0.5 shrink-0 text-bad" aria-hidden />
              : <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-ok" aria-hidden />}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="-mr-1 rounded p-0.5 text-ink-soft hover:bg-black/5"><X size={14} /></button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
