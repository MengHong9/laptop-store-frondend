import { useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus, Pencil, Plus, Trash2 } from 'lucide-react'
import { laptopsApi } from '../../api/endpoints'
import { useFetch } from '../../hooks/useFetch'
import { useToast } from '../../components/Toast'
import { Button, ConfirmDialog, Empty, ErrorState, Field, FormError, Input, Modal, PageHeader, Skeleton, StockBadge, Table, Td, Th } from '../../components/ui'
import LaptopImage from '../../components/LaptopImage'
import { assetUrl } from '../../api/client'
import { imageProblem, money } from '../../lib/format'

const blank = { model: '', cpu: '', ram: '', storage: '', gpu: '', price: '' }

function LaptopForm({ laptop, onClose, onSaved }) {
  const toast = useToast()
  const [f, setF] = useState(laptop ? { ...blank, ...laptop, gpu: laptop.gpu ?? '' } : blank)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fe, setFe] = useState({}) // field errors from the API, shown under each input
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  // ---- photo: chosen file + preview. A photo is uploaded AFTER the laptop is saved (it needs the laptop id). ----
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [removeImage, setRemoveImage] = useState(false)
  const picker = useRef(null)
  useEffect(() => {
    if (!file) { setPreview(null); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url) // free the browser memory when the file changes or the dialog closes
  }, [file])

  function pick(e) {
    const chosen = e.target.files?.[0]
    if (!chosen) return
    const problem = imageProblem(chosen)
    if (problem) { setFe((p) => ({ ...p, image: problem })); e.target.value = ''; return }
    setFe((p) => ({ ...p, image: undefined }))
    setFile(chosen); setRemoveImage(false)
  }

  const currentImage = !removeImage && laptop?.image_url ? assetUrl(laptop.image_url) : null
  const shownImage = preview || currentImage

  async function submit(e) {
    e.preventDefault()
    setError(''); setFe({})
    const price = Number(f.price)
    if (!(price > 0)) return setFe({ price: 'Price must be greater than 0.' })
    // Sending the whole form is fine: the backend only changes non-blank fields (an empty GPU clears it).
    const body = { model: f.model.trim(), cpu: f.cpu.trim(), ram: f.ram.trim(), storage: f.storage.trim(), gpu: f.gpu.trim() || null, price }
    setBusy(true)
    try {
      const saved = laptop ? await laptopsApi.update(laptop.id, body) : await laptopsApi.create(body)
      const id = laptop?.id ?? saved?.id
      try {
        if (file) await laptopsApi.uploadImage(id, file)
        else if (removeImage && laptop?.image_url) await laptopsApi.removeImage(id)
      } catch (imgErr) {
        // The laptop itself IS saved: say so, so the admin only retries the photo instead of creating a duplicate.
        toast.error(`${laptop ? 'Laptop updated' : 'Laptop added'}, but the photo failed: ${imgErr.message} Edit the laptop to try again.`)
        return onSaved()
      }
      toast.success(laptop ? 'Laptop updated' : 'Laptop added')
      onSaved()
    } catch (err) {
      if (err.fieldErrors) setFe(err.fieldErrors); else setError(err.message)
      setBusy(false)
    }
  }

  return (
    <Modal title={laptop ? 'Edit laptop' : 'Add laptop'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Model" error={fe.model}><Input value={f.model} onChange={set('model')} required /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="CPU" error={fe.cpu}><Input value={f.cpu} onChange={set('cpu')} required /></Field>
          <Field label="GPU" hint="Optional" error={fe.gpu}><Input value={f.gpu} onChange={set('gpu')} /></Field>
          <Field label="RAM" error={fe.ram}><Input value={f.ram} onChange={set('ram')} placeholder="16 GB" required /></Field>
          <Field label="Storage" error={fe.storage}><Input value={f.storage} onChange={set('storage')} placeholder="512 GB SSD" required /></Field>
        </div>
        <Field label="Price" error={fe.price}><Input type="number" step="0.01" min="0.01" value={f.price} onChange={set('price')} required /></Field>

        <div>
          <span className="mb-1 block text-sm font-medium">Photo <span className="font-normal text-ink-soft">(optional)</span></span>
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-line bg-chassis/50 p-3">
            <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-white">
              {shownImage
                ? <img src={shownImage} alt="Laptop photo preview" className="h-full w-full object-contain" />
                : <ImagePlus size={24} className="text-ink-soft" aria-hidden />}
            </div>
            <div className="min-w-0 flex-1 space-y-2 text-sm">
              <input ref={picker} type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} className="sr-only" aria-label="Choose a photo" />
              <div className="flex flex-wrap gap-2">
                <Button variant="plain" size="sm" onClick={() => picker.current?.click()}>{shownImage ? 'Replace photo' : 'Choose photo'}</Button>
                {(file || currentImage) && (
                  <Button variant="ghost" size="sm" onClick={() => { setFile(null); setRemoveImage(Boolean(laptop?.image_url)); if (picker.current) picker.current.value = '' }}>Remove</Button>
                )}
              </div>
              <p className="text-xs text-ink-soft">{file ? file.name : 'JPG, PNG or WebP, up to 2 MB.'}</p>
            </div>
          </div>
          {fe.image && <p role="alert" className="mt-1 text-xs font-medium text-bad">{fe.image}</p>}
        </div>
        <FormError>{error}</FormError>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="plain" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={busy}>{laptop ? 'Save changes' : 'Add laptop'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Laptops() {
  const { data, loading, error, reload } = useFetch(laptopsApi.list, [])
  const toast = useToast()
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState(undefined) // undefined = closed, null = new, object = edit
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  const rows = useMemo(() => (data ?? []).filter((l) => l.model.toLowerCase().includes(q.trim().toLowerCase())), [data, q])

  async function confirmDelete() {
    setBusy(true)
    try {
      await laptopsApi.remove(deleting.id)
      toast.success('Laptop deleted')
      setDeleting(null)
      reload()
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  return (
    <>
      <PageHeader title="Laptops" description="The catalog customers see in the store."
        actions={<Button onClick={() => setEditing(null)}><Plus size={16} aria-hidden /> Add laptop</Button>} />
      <div className="mb-4 max-w-xs"><Input type="search" placeholder="Filter by model" aria-label="Filter by model" value={q} onChange={(e) => setQ(e.target.value)} /></div>

      {loading && !data ? <div className="space-y-2" aria-busy="true">{[0,1,2,3,4].map((i) => <Skeleton key={i} className="h-12" />)}</div> : error ? <ErrorState error={error} onRetry={reload} /> : rows.length === 0 ? (
        <Empty title={data.length ? 'No model matches that filter' : 'No laptops yet'}>{!data.length && 'Add the first one to start selling.'}</Empty>
      ) : (
        <Table>
          <thead><tr><Th><span className="sr-only">Photo</span></Th><Th>Model</Th><Th>CPU</Th><Th>RAM</Th><Th>Storage</Th><Th>GPU</Th><Th className="text-right">Price</Th><Th>Stock</Th><Th><span className="sr-only">Actions</span></Th></tr></thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id}>
                <Td><LaptopImage laptop={l} className="h-10 w-14 rounded border border-line bg-white object-contain" artClassName="h-10 w-14 rounded bg-chassis p-0.5" /></Td>
                <Td className="font-semibold">{l.model}</Td><Td>{l.cpu}</Td><Td>{l.ram}</Td><Td>{l.storage}</Td><Td>{l.gpu || '-'}</Td>
                <Td className="text-right tabular-nums">{money(l.price)}</Td>
                <Td><StockBadge qty={l.total_stock} /></Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" aria-label={`Edit ${l.model}`} onClick={() => setEditing(l)}><Pencil size={16} /></Button>
                    <Button variant="ghost" size="sm" aria-label={`Delete ${l.model}`} onClick={() => setDeleting(l)}><Trash2 size={16} className="text-bad" /></Button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {editing !== undefined && <LaptopForm laptop={editing} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); reload() }} />}
      {deleting && (
        <ConfirmDialog title="Delete laptop" loading={busy} onConfirm={confirmDelete} onClose={() => setDeleting(null)}
          message={<>Delete <strong>{deleting.model}</strong>? Its stock records are deleted with it. Past orders keep their line items, name and price.</>} />
      )}
    </>
  )
}
