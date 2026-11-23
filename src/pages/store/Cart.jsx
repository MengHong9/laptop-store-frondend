import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Minus, Plus, Trash2 } from 'lucide-react'
import { laptopsApi, ordersApi } from '../../api/endpoints'
import { useFetch } from '../../hooks/useFetch'
import { useCart } from '../../cart/CartContext'
import { useToast } from '../../components/Toast'
import { Badge, Button, Empty, ErrorState, PageHeader, Spinner, btn } from '../../components/ui'
import LaptopArt from '../../components/LaptopArt'
import LaptopImage from '../../components/LaptopImage'
import { money } from '../../lib/format'

export default function Cart() {
  const { items, setQty, remove, clear } = useCart()
  const toast = useToast()
  // Always price the cart from fresh server data, never from what was stored earlier.
  const { data: laptops, loading, error, reload } = useFetch(laptopsApi.list, [])
  const [placing, setPlacing] = useState(false)
  const [placed, setPlaced] = useState(null) // the order the server returned

  const byId = useMemo(() => Object.fromEntries((laptops ?? []).map((l) => [l.id, l])), [laptops])
  const lines = items.map((i) => ({ ...i, laptop: byId[i.id] }))
  const total = lines.reduce((sum, l) => sum + (l.laptop ? l.laptop.price * l.qty : 0), 0)
  const problem = (l) => !l.laptop ? 'No longer available' : l.laptop.total_stock === 0 ? 'Out of stock' : l.laptop.total_stock < l.qty ? `Only ${l.laptop.total_stock} in stock` : null
  const canOrder = lines.length > 0 && lines.every((l) => !problem(l))
  const hasProblems = lines.some((l) => problem(l))

  // One click repairs the cart: clamp to what is in stock, drop what can no longer be bought.
  function fixCart() {
    lines.forEach((l) => {
      const stock = l.laptop?.total_stock ?? 0
      if (stock === 0) remove(l.id)
      else if (l.qty > stock) setQty(l.id, stock)
    })
    toast.success('Cart updated to match what is in stock')
  }

  async function placeOrder() {
    setPlacing(true)
    try {
      // The server answers with the created order (id, status, total) - the API validates stock again,
      // so even if someone else bought the last unit a moment ago we get a clear error here.
      const order = await ordersApi.create(lines.map((l) => ({ laptop_id: l.id, amount: l.qty })))
      clear()
      setPlaced(order ?? {})
    } catch (e) {
      toast.error(e.message)
      reload() // show the fresh stock numbers so the cart problems become visible
    } finally {
      setPlacing(false)
    }
  }

  if (placed) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-line bg-panel p-8 text-center">
        <CheckCircle2 className="mx-auto text-ok" size={44} aria-hidden />
        <h1 className="mt-3 text-2xl">Order placed</h1>
        <p className="mt-2 text-sm text-ink-soft">
          {placed.order_id ? <>Order <strong className="text-ink">#{placed.order_id}</strong> for <strong className="text-ink">{money(placed.total_price)}</strong> is pending. </> : 'Your order is pending. '}
          Stock has been reserved for you.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link to="/orders" className={btn('key', 'md')}>View my orders</Link>
          <Link to="/" className={btn('plain', 'md')}>Keep shopping</Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <PageHeader title="Your cart" />
      {items.length === 0 ? (
        <Empty title="Your cart is empty">
          <Link to="/" className="font-semibold text-bios underline">Browse laptops</Link> to add some.
        </Empty>
      ) : loading && !laptops ? <Spinner label="Checking prices and stock" />
        : error ? <ErrorState error={error} onRetry={reload} />
        : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <ul className="divide-y divide-line rounded-2xl border border-line bg-panel">
              {lines.map((l) => {
                const issue = problem(l)
                const max = l.laptop?.total_stock ?? 0
                return (
                  <li key={l.id} className="flex flex-wrap items-center gap-4 p-4">
                    {l.laptop
                      ? <LaptopImage laptop={l.laptop} className="h-16 w-24 shrink-0 rounded bg-white object-contain" artClassName="h-16 w-24 shrink-0 rounded bg-chassis p-1" />
                      : <LaptopArt seed={l.id} className="h-16 w-24 shrink-0 rounded bg-chassis p-1" />}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{l.laptop?.model ?? `Laptop #${l.id}`}</p>
                      <p className="text-sm text-ink-soft">{l.laptop ? money(l.laptop.price) : '-'} each</p>
                      {issue && <div className="mt-1"><Badge tone="bad">{issue}</Badge></div>}
                    </div>
                    {l.laptop && (
                      <div className="flex items-center gap-1" role="group" aria-label="Quantity">
                        <Button variant="plain" size="sm" aria-label="Decrease quantity" disabled={l.qty <= 1} onClick={() => setQty(l.id, l.qty - 1)}><Minus size={14} /></Button>
                        <span className="w-8 text-center font-semibold tabular-nums" aria-live="polite">{l.qty}</span>
                        <Button variant="plain" size="sm" aria-label="Increase quantity" disabled={l.qty >= max} onClick={() => setQty(l.id, l.qty + 1)}><Plus size={14} /></Button>
                      </div>
                    )}
                    <p className="w-24 text-right font-semibold tabular-nums">{l.laptop ? money(l.laptop.price * l.qty) : '-'}</p>
                    <Button variant="ghost" size="sm" aria-label={`Remove ${l.laptop?.model ?? 'item'}`} onClick={() => remove(l.id)}><Trash2 size={16} /></Button>
                  </li>
                )
              })}
            </ul>

            <aside className="h-fit rounded-2xl border border-line bg-panel p-5 lg:sticky lg:top-24">
              <h2 className="text-lg">Order summary</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-ink-soft">Items</dt><dd>{lines.reduce((n, l) => n + l.qty, 0)}</dd></div>
                <div className="flex justify-between border-t border-line pt-3 text-base font-semibold"><dt>Total</dt><dd className="tabular-nums">{money(total)}</dd></div>
              </dl>
              <Button className="mt-5 w-full" disabled={!canOrder} loading={placing} onClick={placeOrder}>Place order</Button>
              {hasProblems && (
                <div className="mt-3 rounded-lg bg-[#fdf1c9]/60 p-3 text-xs text-[#6b5000]">
                  Some items are not available in the quantity you chose.
                  <button onClick={fixCart} className="mt-1 block font-semibold underline">Fix my cart automatically</button>
                </div>
              )}
              <button onClick={clear} className="mt-3 w-full text-center text-sm text-ink-soft underline hover:text-ink">Empty cart</button>
            </aside>
          </div>
        )}
    </>
  )
}
