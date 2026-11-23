import { useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { ordersApi } from '../../api/endpoints'
import { useFetch } from '../../hooks/useFetch'
import { useToast } from '../../components/Toast'
import { Badge, Button, ConfirmDialog, Empty, ErrorState, Input, PageHeader, Select, Skeleton, Table, Td, Th, cx } from '../../components/ui'
import { NEXT_STATUSES, STATUS_LABEL, STATUS_TONE, fmtDateTime, money, toDate } from '../../lib/format'

const STATUSES = ['PENDING', 'SUCCESS', 'FAILED']

export default function Orders() {
  const { data, loading, error, reload } = useFetch(ordersApi.list, [])
  const toast = useToast()
  const [filter, setFilter] = useState('ALL')
  const [q, setQ] = useState('')
  const [updating, setUpdating] = useState(null) // order id being changed
  const [failing, setFailing] = useState(null)   // order about to be marked cancelled (needs confirmation)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  const orders = useMemo(() => {
    const term = q.trim().toLowerCase().replace(/^#/, '')
    return [...(data ?? [])]
      .sort((a, b) => (toDate(b.created_at) ?? 0) - (toDate(a.created_at) ?? 0))
      .filter((o) => filter === 'ALL' || o.status === filter)
      .filter((o) => !term || String(o.order_id) === term || o.customer_name?.toLowerCase().includes(term))
  }, [data, filter, q])

  async function changeStatus(order, status) {
    setUpdating(order.order_id)
    try {
      await ordersApi.setStatus(order.order_id, status)
      toast.success(`Order #${order.order_id} marked ${STATUS_LABEL[status].toLowerCase()}`)
      await reload()
    } catch (e) { toast.error(e.message); reload() } finally { setUpdating(null); setFailing(null); setBusy(false) }
  }

  function onSelect(order, status) {
    if (status === order.status) return
    // Cancelling gives the units back to stock and cannot be reversed: confirm first.
    if (status === 'FAILED') setFailing(order); else changeStatus(order, status)
  }

  async function confirmDelete() {
    setBusy(true)
    try {
      await ordersApi.remove(deleting.order_id)
      toast.success('Order deleted')
      setDeleting(null)
      reload()
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  return (
    <>
      <PageHeader title="Orders"
        description="Stock is reserved when an order is placed. Cancelling an order, or deleting a pending one, returns its units to stock automatically." />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
          {['ALL', ...STATUSES].map((s) => (
            <button key={s} onClick={() => setFilter(s)} aria-pressed={filter === s}
              className={cx('rounded-lg border px-3 py-1.5 text-sm font-medium', filter === s ? 'border-bios-deep bg-bios text-white' : 'border-line bg-panel hover:bg-chassis')}>
              {s === 'ALL' ? 'All' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        <div className="w-full max-w-xs"><Input type="search" placeholder="Order # or customer" aria-label="Search orders" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>

      {loading && !data ? <div className="space-y-2" aria-busy="true">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>
        : error ? <ErrorState error={error} onRetry={reload} />
        : orders.length === 0 ? <Empty title={filter === 'ALL' && !q ? 'No orders yet' : 'No orders match'} />
        : (
        <Table>
          <thead><tr><Th>Order</Th><Th>Customer</Th><Th>Placed</Th><Th>Items</Th><Th className="text-right">Total</Th><Th>Status</Th><Th><span className="sr-only">Actions</span></Th></tr></thead>
          <tbody>
            {orders.map((o) => {
              const next = NEXT_STATUSES[o.status] ?? []
              return (
                <tr key={o.order_id}>
                  <Td className="font-semibold">#{o.order_id}</Td>
                  <Td>{o.customer_name ?? <span className="text-ink-soft">-</span>}</Td>
                  <Td className="whitespace-nowrap">{fmtDateTime(o.created_at)}</Td>
                  <Td>
                    <ul className="space-y-0.5">
                      {(o.items ?? []).map((i, idx) => <li key={idx}>{i.purchase_amount} x {i.model ?? `Laptop #${i.laptop_id}`}</li>)}
                    </ul>
                  </Td>
                  <Td className="text-right tabular-nums">{money(o.total_price)}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status] ?? o.status}</Badge>
                      {/* Only moves the server accepts are offered (PENDING -> completed/cancelled, completed -> cancelled) */}
                      {next.length > 0 && (
                        <Select aria-label={`Change status of order ${o.order_id}`} className="w-auto py-1" value={o.status}
                          disabled={updating === o.order_id} onChange={(e) => onSelect(o, e.target.value)}>
                          <option value={o.status}>{STATUS_LABEL[o.status]}</option>
                          {next.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                        </Select>
                      )}
                    </div>
                  </Td>
                  <Td><div className="flex justify-end"><Button variant="ghost" size="sm" aria-label={`Delete order ${o.order_id}`} onClick={() => setDeleting(o)}><Trash2 size={16} className="text-bad" /></Button></div></Td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      )}

      {failing && <ConfirmDialog title="Cancel order" confirmLabel="Cancel order" loading={busy}
        onConfirm={() => { setBusy(true); changeStatus(failing, 'FAILED') }} onClose={() => setFailing(null)}
        message={<>Cancel order #{failing.order_id}? Its units go back into stock and the order cannot be re-opened.</>} />}
      {deleting && <ConfirmDialog title="Delete order" loading={busy} onConfirm={confirmDelete} onClose={() => setDeleting(null)}
        message={<>Delete order #{deleting.order_id}? This cannot be undone.{deleting.status === 'PENDING' ? ' Its reserved units return to stock.' : ' Units from completed or cancelled orders are not changed.'}</>} />}
    </>
  )
}
