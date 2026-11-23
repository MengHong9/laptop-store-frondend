import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ordersApi } from '../../api/endpoints'
import { useFetch } from '../../hooks/useFetch'
import { useToast } from '../../components/Toast'
import { Badge, Button, ConfirmDialog, Empty, ErrorState, PageHeader, Skeleton, btn } from '../../components/ui'
import { STATUS_LABEL, STATUS_TONE, fmtDateTime, money, toDate } from '../../lib/format'

const HINT = {
  PENDING: 'Reserved for you. The store will confirm it soon.',
  SUCCESS: 'Completed.',
  FAILED: 'Cancelled. The items went back into stock.',
}

export default function MyOrders() {
  const { data, loading, error, reload } = useFetch(ordersApi.mine, [])
  const toast = useToast()
  const [cancelling, setCancelling] = useState(null)
  const [busy, setBusy] = useState(false)

  const orders = [...(data ?? [])].sort((a, b) => (toDate(b.created_at) ?? 0) - (toDate(a.created_at) ?? 0))

  async function confirmCancel() {
    setBusy(true)
    try {
      await ordersApi.cancel(cancelling.order_id)
      toast.success(`Order #${cancelling.order_id} cancelled`)
      setCancelling(null)
      reload()
    } catch (e) { toast.error(e.message); setCancelling(null); reload() } finally { setBusy(false) }
  }

  return (
    <>
      <PageHeader title="My orders" description="Everything you have ordered from the store." />
      {loading && !data ? (
        <div className="space-y-4" aria-busy="true">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-32" />)}</div>
      ) : error ? <ErrorState error={error} onRetry={reload} /> : orders.length === 0 ? (
        <Empty title="No orders yet"><Link to="/" className={btn('key', 'sm', 'mt-3')}>Start shopping</Link></Empty>
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => (
            <li key={o.order_id} className="rounded-2xl border border-line bg-panel">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
                <div>
                  <p className="font-semibold">Order #{o.order_id}</p>
                  <p className="text-xs text-ink-soft">{fmtDateTime(o.created_at)}</p>
                </div>
                <Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status] ?? o.status}</Badge>
              </div>
              <ul className="divide-y divide-line/70 px-5">
                {(o.items ?? []).map((i, idx) => (
                  <li key={idx} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="min-w-0 truncate">{i.purchase_amount} x {i.model ?? `Laptop #${i.laptop_id}`}</span>
                    <span className="tabular-nums text-ink-soft">{i.unit_price != null ? money(i.unit_price * i.purchase_amount) : '-'}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-chassis/50 px-5 py-3">
                <p className="text-xs text-ink-soft">{HINT[o.status]}</p>
                <div className="flex items-center gap-3">
                  <p className="font-semibold tabular-nums">Total {money(o.total_price)}</p>
                  {o.status === 'PENDING' && <Button variant="plain" size="sm" onClick={() => setCancelling(o)}>Cancel order</Button>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {cancelling && (
        <ConfirmDialog title="Cancel order" confirmLabel="Cancel order" loading={busy} onConfirm={confirmCancel} onClose={() => setCancelling(null)}
          message={<>Cancel order #{cancelling.order_id}? The items go back into stock and this cannot be undone.</>} />
      )}
    </>
  )
}
