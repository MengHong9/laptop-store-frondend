import { Link } from 'react-router-dom'
import { laptopsApi, ordersApi } from '../../api/endpoints'
import { useFetch } from '../../hooks/useFetch'
import { Badge, ErrorState, PageHeader, Skeleton, StockBadge, Table, Td, Th } from '../../components/ui'
import { STATUS_LABEL, STATUS_TONE, fmtDateTime, money, toDate } from '../../lib/format'

const LOW_STOCK = 5

export default function Dashboard() {
  // One request per resource, fired together: the page renders once, when both are back.
  const { data, loading, error, reload } = useFetch(async () => {
    const [laptops, orders] = await Promise.all([laptopsApi.list(), ordersApi.list()])
    return { laptops, orders }
  }, [])

  if (loading && !data) return (
    <div aria-busy="true"><Skeleton className="mb-6 h-10 w-56" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      <Skeleton className="mt-7 h-64" /></div>
  )
  if (error) return <ErrorState error={error} onRetry={reload} />

  const { laptops, orders } = data
  const units = laptops.reduce((n, l) => n + (l.total_stock ?? 0), 0)
  const revenue = orders.filter((o) => o.status === 'SUCCESS').reduce((s, o) => s + (o.total_price ?? 0), 0)
  const low = laptops.filter((l) => (l.total_stock ?? 0) <= LOW_STOCK).sort((a, b) => a.total_stock - b.total_stock)
  const recent = [...orders].sort((a, b) => (toDate(b.created_at) ?? 0) - (toDate(a.created_at) ?? 0)).slice(0, 6)
  const counts = { PENDING: 0, SUCCESS: 0, FAILED: 0 }
  orders.forEach((o) => { counts[o.status] = (counts[o.status] ?? 0) + 1 })

  const summary = [
    ['Laptop models', laptops.length],
    ['Units in stock', units],
    ['Orders', orders.length],
    ['Revenue (completed orders)', money(revenue)],
  ]

  return (
    <>
      <PageHeader title="Overview" description="A quick look at your store performance and operations." />

      {/* One ruled strip, like the header of a spec sheet, instead of four floating cards. */}
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summary.map(([label, value]) => (
          <div key={label} className="soft-panel p-5">
            <dt className="text-sm text-ink-soft">{label}</dt>
            <dd className="display mt-2 text-3xl tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section>
          <h2 className="mb-3 text-lg">Recent orders</h2>
          {recent.length === 0 ? <p className="soft-panel border-dashed p-6 text-sm text-ink-soft">No orders yet.</p> : (
            <Table>
              <thead><tr><Th>Order</Th><Th>Placed</Th><Th className="text-right">Total</Th><Th>Status</Th></tr></thead>
              <tbody>
                {recent.map((o) => (
                  <tr key={o.order_id}>
                    <Td className="font-medium">#{o.order_id}</Td>
                    <Td>{fmtDateTime(o.created_at)}</Td>
                    <Td className="text-right tabular-nums">{money(o.total_price)}</Td>
                    <Td><Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status] ?? o.status}</Badge></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          <Link to="/admin/orders" className="mt-2 inline-block text-sm font-semibold text-bios underline">All orders</Link>
        </section>

        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-lg">Orders by status</h2>
            <div className="soft-panel p-4">
              {orders.length > 0 && (
                <div className="mb-3 flex h-3 overflow-hidden rounded bg-chassis" role="img"
                  aria-label={`Pending ${counts.PENDING}, completed ${counts.SUCCESS}, cancelled ${counts.FAILED}`}>
                  <span style={{ width: `${(counts.SUCCESS / orders.length) * 100}%` }} className="bg-ok" />
                  <span style={{ width: `${(counts.PENDING / orders.length) * 100}%` }} className="bg-key" />
                  <span style={{ width: `${(counts.FAILED / orders.length) * 100}%` }} className="bg-bad" />
                </div>
              )}
              <ul className="space-y-1.5 text-sm">
                {Object.entries(counts).map(([s, n]) => (
                  <li key={s} className="flex items-center justify-between"><Badge tone={STATUS_TONE[s]}>{STATUS_LABEL[s] ?? s}</Badge><span className="tabular-nums">{n}</span></li>
                ))}
              </ul>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg">Low stock</h2>
            <div className="soft-panel">
              {low.length === 0 ? <p className="p-4 text-sm text-ink-soft">Every model has more than {LOW_STOCK} units.</p> : (
                <ul className="divide-y divide-line">
                  {low.slice(0, 6).map((l) => (
                    <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                      <span className="truncate font-medium">{l.model}</span><StockBadge qty={l.total_stock} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Link to="/admin/stocks" className="mt-2 inline-block text-sm font-semibold text-bios underline">Manage stock</Link>
          </section>
        </div>
      </div>
    </>
  )
}
