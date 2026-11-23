import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Cpu, HardDrive, MemoryStick, MonitorPlay, SlidersHorizontal } from 'lucide-react'
import { laptopsApi } from '../../api/endpoints'
import { useFetch } from '../../hooks/useFetch'
import { useCart } from '../../cart/CartContext'
import { useToast } from '../../components/Toast'
import { Button, Empty, ErrorState, Field, Input, PageHeader, Select, Skeleton, StockBadge, cx } from '../../components/ui'
import LaptopImage from '../../components/LaptopImage'
import { money, toDate } from '../../lib/format'

const SORTS = {
  newest: { label: 'Newest first', fn: (a, b) => (toDate(b.created_at) ?? 0) - (toDate(a.created_at) ?? 0) },
  low: { label: 'Price, low to high', fn: (a, b) => a.price - b.price },
  high: { label: 'Price, high to low', fn: (a, b) => b.price - a.price },
  name: { label: 'Model, A to Z', fn: (a, b) => a.model.localeCompare(b.model) },
}

const Spec = ({ icon: Icon, label, value }) =>
  value ? (
    <div className="flex items-center gap-2.5 text-sm">
      <Icon size={15} className="shrink-0 text-bios" aria-hidden />
      <dt className="sr-only">{label}</dt>
      <dd className="min-w-0 truncate">{value}</dd>
    </div>
  ) : null

function LaptopCard({ laptop: l, inCart, onAdd }) {
  const out = !l.total_stock
  const atMax = inCart >= l.total_stock
  return (
    <article className={cx('group flex flex-col rounded-2xl border border-line bg-panel transition duration-200 hover:-translate-y-0.5 hover:shadow-lg', out && 'opacity-80')}>
      <div className="relative flex h-44 items-center justify-center overflow-hidden border-b border-line bg-[#f7f8fc] p-4">
        <LaptopImage laptop={l}
          className={cx('h-full w-full object-contain transition-transform duration-300 group-hover:scale-105', out && 'grayscale')}
          artClassName={cx('h-24 w-auto transition-transform duration-300 group-hover:scale-105', out && 'grayscale')} />
        {!out && l.total_stock <= 5 && <span className="absolute left-3 top-3 rounded-full bg-[#fdf1c9] px-2 py-0.5 text-xs font-semibold text-[#6b5000]">Low stock</span>}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-base leading-snug">{l.model}</h3>
        <dl className="mb-4 mt-3 space-y-1.5">
          <Spec icon={Cpu} label="CPU" value={l.cpu} />
          <Spec icon={MemoryStick} label="RAM" value={l.ram} />
          <Spec icon={HardDrive} label="Storage" value={l.storage} />
          <Spec icon={MonitorPlay} label="GPU" value={l.gpu} />
        </dl>
        <div className="mt-auto">
          <div className="mb-3 flex items-end justify-between gap-2">
            <p className="display text-2xl">{money(l.price)}</p>
            <StockBadge qty={l.total_stock} />
          </div>
          <Button className="w-full" disabled={out || atMax} onClick={onAdd}>
            {out ? 'Out of stock' : atMax ? `All ${l.total_stock} in cart` : inCart ? `Add another (${inCart} in cart)` : 'Add to cart'}
          </Button>
        </div>
      </div>
    </article>
  )
}

const SkeletonGrid = () => (
  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading laptops">
    {Array.from({ length: 6 }, (_, i) => (
      <div key={i} className="rounded-2xl border border-line bg-panel">
        <Skeleton className="h-44 rounded-b-none" />
        <div className="space-y-3 p-5"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-2/3" /><Skeleton className="mt-6 h-10 w-full" /></div>
      </div>
    ))}
  </div>
)

export default function Catalog() {
  const { data, loading, error, reload } = useFetch(laptopsApi.list, [])
  const { items, add } = useCart()
  const toast = useToast()

  // Filters live in the URL (?q=&min=&max=&stock=1&sort=): a filtered view can be bookmarked, shared and
  // survives the back button. Defaults are omitted so the plain store URL stays clean.
  const [params, setParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false) // mobile only
  const q = params.get('q') ?? '', min = params.get('min') ?? '', max = params.get('max') ?? ''
  const inStock = params.get('stock') === '1'
  const sort = SORTS[params.get('sort')] ? params.get('sort') : 'newest'
  const setParam = (k, v) => setParams((p) => {
    const n = new URLSearchParams(p)
    if (!v || (k === 'sort' && v === 'newest')) n.delete(k); else n.set(k, v)
    return n
  }, { replace: true })

  // Filtering happens in the browser on the full list (the shop is small). /laptops/search exists
  // on the backend if the catalogue ever grows past a few hundred models.
  const visible = useMemo(() => {
    const term = q.trim().toLowerCase()
    return (data ?? [])
      .filter((l) => !term || [l.model, l.cpu, l.gpu, l.ram, l.storage].some((v) => v?.toLowerCase().includes(term)))
      .filter((l) => min === '' || l.price >= Number(min))
      .filter((l) => max === '' || l.price <= Number(max))
      .filter((l) => !inStock || l.total_stock > 0)
      .sort(SORTS[sort].fn)
  }, [data, q, min, max, inStock, sort])

  const qtyInCart = (id) => items.find((i) => i.id === id)?.qty ?? 0
  const filtered = Boolean(q || min || max || inStock)
  const priceRangeInvalid = min !== '' && max !== '' && Number(min) > Number(max)

  const filters = (
    <div className="space-y-4">
      <Field label="Search"><Input type="search" value={q} onChange={(e) => setParam('q', e.target.value)} placeholder="Model, CPU, GPU..." /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Min price"><Input type="number" min="0" value={min} onChange={(e) => setParam('min', e.target.value)} /></Field>
        <Field label="Max price" error={priceRangeInvalid ? 'Lower than min' : undefined}><Input type="number" min="0" value={max} onChange={(e) => setParam('max', e.target.value)} /></Field>
      </div>
      <Field label="Sort by">
        <Select value={sort} onChange={(e) => setParam('sort', e.target.value)}>
          {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
        </Select>
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={inStock} onChange={(e) => setParam('stock', e.target.checked ? '1' : '')} className="size-4 accent-[#1e2e8a]" />
        In stock only
      </label>
      {filtered && <Button variant="plain" size="sm" className="w-full" onClick={() => setParams({}, { replace: true })}>Clear filters</Button>}
    </div>
  )

  return (
    <>
      <PageHeader title="Laptops" description={data ? `${visible.length} of ${data.length} models` : 'Browse the current range.'}
        actions={<Button variant="plain" size="sm" className="lg:hidden" aria-expanded={showFilters} onClick={() => setShowFilters((v) => !v)}><SlidersHorizontal size={16} aria-hidden />Filters{filtered && ' (on)'}</Button>} />
      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside aria-label="Filters" className={cx('h-fit rounded-2xl border border-line bg-panel p-5 lg:sticky lg:top-24', showFilters ? 'block' : 'hidden lg:block')}>
          {filters}
        </aside>

        <section aria-live="polite">
          {loading && !data ? <SkeletonGrid />
            : error ? <ErrorState error={error} onRetry={reload} />
            : visible.length === 0 ? (
              <Empty title={data?.length ? 'No laptops match these filters' : 'No laptops yet'}>
                {data?.length ? 'Loosen the price range or clear the search.' : 'An admin can add laptops from the admin console.'}
              </Empty>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map((l) => (
                  <LaptopCard key={l.id} laptop={l} inCart={qtyInCart(l.id)}
                    onAdd={() => { add(l.id, l.total_stock); toast.success(`${l.model} added to cart`) }} />
                ))}
              </div>
            )}
        </section>
      </div>
    </>
  )
}
