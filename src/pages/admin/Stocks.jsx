import { useMemo, useState } from 'react'
import { Plus, SlidersHorizontal, Trash2 } from 'lucide-react'
import { laptopsApi, stocksApi } from '../../api/endpoints'
import { useFetch } from '../../hooks/useFetch'
import { useToast } from '../../components/Toast'
import { Button, ConfirmDialog, Empty, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Skeleton, Table, Td, Th } from '../../components/ui'
import { fmtDateTime, stockIdOf } from '../../lib/format'

function AddStock({ laptops, onClose, onSaved }) {
  const toast = useToast()
  const [laptopId, setLaptopId] = useState(laptops[0]?.id ?? '')
  const [qty, setQty] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await stocksApi.create(Number(laptopId), Number(qty))
      toast.success('Stock batch added')
      onSaved()
    } catch (err) { setError(err.message); setBusy(false) }
  }

  return (
    <Modal title="Add stock batch" onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Laptop">
          <Select value={laptopId} onChange={(e) => setLaptopId(e.target.value)} required>
            {laptops.map((l) => <option key={l.id} value={l.id}>{l.model}</option>)}
          </Select>
        </Field>
        <Field label="Quantity received"><Input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} required /></Field>
        <FormError>{error}</FormError>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="plain" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={busy} disabled={!laptops.length}>Add batch</Button>
        </div>
      </form>
    </Modal>
  )
}

function AdjustStock({ stock, model, onClose, onSaved }) {
  const toast = useToast()
  const [op, setOp] = useState(1) // 1 = add, 2 = remove (StockService.updateStock)
  const [qty, setQty] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const n = Number(qty) || 0
  const result = op === 1 ? stock.stock_quantity + n : stock.stock_quantity - n

  async function submit(e) {
    e.preventDefault()
    if (result < 0) return setError('You cannot remove more than the batch holds.')
    setBusy(true)
    try {
      await stocksApi.adjust(stockIdOf(stock), op, n)
      toast.success('Stock updated')
      onSaved()
    } catch (err) { setError(err.message); setBusy(false) }
  }

  return (
    <Modal title={`Adjust stock: ${model}`} onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm text-ink-soft">This batch currently holds <strong className="text-ink">{stock.stock_quantity}</strong> units.</p>
        <fieldset className="flex gap-4 text-sm">
          <legend className="sr-only">Operation</legend>
          <label className="flex items-center gap-2"><input type="radio" name="op" checked={op === 1} onChange={() => setOp(1)} className="accent-[#1e2e8a]" /> Add units</label>
          <label className="flex items-center gap-2"><input type="radio" name="op" checked={op === 2} onChange={() => setOp(2)} className="accent-[#1e2e8a]" /> Remove units</label>
        </fieldset>
        <Field label="Quantity" hint={n > 0 ? `Batch will hold ${result} units.` : undefined}>
          <Input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} required />
        </Field>
        <FormError>{error}</FormError>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="plain" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={busy}>Update stock</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Stocks() {
  const { data, loading, error, reload } = useFetch(async () => {
    const [stocks, laptops] = await Promise.all([stocksApi.list(), laptopsApi.list()])
    return { stocks, laptops }
  }, [])
  const toast = useToast()
  const [filter, setFilter] = useState('')
  const [adding, setAdding] = useState(false)
  const [adjusting, setAdjusting] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  // Stock rows only carry laptop_id, so join to the laptop list to show a model name.
  const names = useMemo(() => Object.fromEntries((data?.laptops ?? []).map((l) => [l.id, l.model])), [data])
  const rows = (data?.stocks ?? []).filter((s) => !filter || String(s.laptop_id) === filter)

  async function confirmDelete() {
    setBusy(true)
    try {
      await stocksApi.remove(stockIdOf(deleting))
      toast.success('Stock batch deleted')
      setDeleting(null)
      reload()
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  return (
    <>
      <PageHeader title="Stock" description="Each row is one batch of units. Orders take from the oldest batch first."
        actions={<Button onClick={() => setAdding(true)}><Plus size={16} aria-hidden /> Add stock batch</Button>} />

      {loading && !data ? <div className="space-y-2" aria-busy="true">{[0,1,2,3,4].map((i) => <Skeleton key={i} className="h-12" />)}</div> : error ? <ErrorState error={error} onRetry={reload} /> : (
        <>
          <div className="mb-4 max-w-xs">
            <Select aria-label="Filter by laptop" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="">All laptops</option>
              {data.laptops.map((l) => <option key={l.id} value={l.id}>{l.model}</option>)}
            </Select>
          </div>
          {rows.length === 0 ? <Empty title="No stock batches">Add a batch when new units arrive.</Empty> : (
            <Table>
              <thead><tr><Th>Batch</Th><Th>Laptop</Th><Th className="text-right">Quantity</Th><Th>Added</Th><Th>Last changed</Th><Th><span className="sr-only">Actions</span></Th></tr></thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={stockIdOf(s)}>
                    <Td>#{stockIdOf(s)}</Td>
                    <Td className="font-semibold">{names[s.laptop_id] ?? `Laptop #${s.laptop_id}`}</Td>
                    <Td className="text-right tabular-nums">{s.stock_quantity}</Td>
                    <Td>{fmtDateTime(s.created_date)}</Td>
                    <Td>{fmtDateTime(s.updated_date)}</Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" aria-label="Adjust quantity" onClick={() => setAdjusting(s)}><SlidersHorizontal size={16} /></Button>
                        <Button variant="ghost" size="sm" aria-label="Delete batch" onClick={() => setDeleting(s)}><Trash2 size={16} className="text-bad" /></Button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </>
      )}

      {adding && <AddStock laptops={data?.laptops ?? []} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); reload() }} />}
      {adjusting && <AdjustStock stock={adjusting} model={names[adjusting.laptop_id] ?? `Laptop #${adjusting.laptop_id}`} onClose={() => setAdjusting(null)} onSaved={() => { setAdjusting(null); reload() }} />}
      {deleting && <ConfirmDialog title="Delete stock batch" loading={busy} onConfirm={confirmDelete} onClose={() => setDeleting(null)}
        message={<>Delete batch #{stockIdOf(deleting)} ({deleting.stock_quantity} units of {names[deleting.laptop_id]})? Those units will no longer be sellable.</>} />}
    </>
  )
}
