import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { usersApi } from '../../api/endpoints'
import { useAuth } from '../../auth/AuthContext'
import { useFetch } from '../../hooks/useFetch'
import { useToast } from '../../components/Toast'
import { Badge, Button, ConfirmDialog, Empty, ErrorState, Field, FormError, Input, Modal, PageHeader, PasswordInput, Select, Skeleton, Table, Td, Th } from '../../components/ui'
import { PASSWORD_MAX, PASSWORD_MIN, fmtDate } from '../../lib/format'

function EditUser({ target, isSelf, onClose, onSaved }) {
  const toast = useToast()
  const [f, setF] = useState({ name: target.name, email: target.email, role: target.role, password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fe, setFe] = useState({})
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setError(''); setFe({})
    if (f.password && (f.password.length < PASSWORD_MIN || f.password.length > PASSWORD_MAX)) return setFe({ password: `Use ${PASSWORD_MIN} to ${PASSWORD_MAX} characters.` })
    setBusy(true)
    try {
      // The backend changes only what is sent. A password is only sent when one was typed: the server
      // BCrypt-encodes it and signs that user out everywhere. (The old API stored it as plain text.)
      const body = { name: f.name.trim(), email: f.email.trim(), role: f.role }
      if (f.password) body.password = f.password
      await usersApi.update(target.id, body)
      toast.success(f.password ? 'User updated and signed out everywhere' : 'User updated')
      onSaved()
    } catch (err) {
      if (err.fieldErrors) setFe(err.fieldErrors); else setError(err.message)
      setBusy(false)
    }
  }

  return (
    <Modal title={`Edit ${target.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Username" hint={isSelf ? 'Locked for your own account: your session token is tied to this name.' : undefined} error={fe.name}>
          <Input value={f.name} onChange={set('name')} disabled={isSelf} required />
        </Field>
        <Field label="Email" error={fe.email}><Input type="email" value={f.email} onChange={set('email')} required /></Field>
        <Field label="Role" hint={isSelf ? 'Locked for your own account so you cannot remove your own admin access.' : undefined} error={fe.role}>
          <Select value={f.role} onChange={set('role')} disabled={isSelf}>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </Select>
        </Field>
        {!isSelf && (
          <Field label="Reset password" hint="Leave empty to keep the current password." error={fe.password}>
            <PasswordInput value={f.password} onChange={set('password')} autoComplete="new-password" placeholder="New password" />
          </Field>
        )}
        <FormError>{error}</FormError>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="plain" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={busy}>Save changes</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Users() {
  const { user: me } = useAuth()
  const { data, loading, error, reload } = useFetch(usersApi.list, [])
  const toast = useToast()
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  const term = q.trim().toLowerCase()
  const rows = (data ?? []).filter((u) => !term || u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term))
  const isSelf = (u) => u.id === me.id

  async function confirmDelete() {
    setBusy(true)
    try {
      await usersApi.remove(deleting.id)
      toast.success('User deleted')
      setDeleting(null)
      reload()
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  return (
    <>
      <PageHeader title="Users" description="Accounts that can sign in. New accounts are created from the register page." />
      <div className="mb-4 max-w-xs"><Input type="search" placeholder="Search name or email" aria-label="Search users" value={q} onChange={(e) => setQ(e.target.value)} /></div>

      {loading && !data ? <div className="space-y-2" aria-busy="true">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        : error ? <ErrorState error={error} onRetry={reload} /> : rows.length === 0 ? <Empty title="No users found" /> : (
        <Table>
          <thead><tr><Th>ID</Th><Th>Username</Th><Th>Email</Th><Th>Role</Th><Th>Joined</Th><Th><span className="sr-only">Actions</span></Th></tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <Td>#{u.id}</Td>
                <Td className="font-semibold">{u.name} {isSelf(u) && <span className="font-normal text-ink-soft">(you)</span>}</Td>
                <Td>{u.email}</Td>
                <Td><Badge tone={u.role === 'ADMIN' ? 'bios' : 'neutral'}>{u.role}</Badge></Td>
                <Td>{fmtDate(u.created_at)}</Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" aria-label={`Edit ${u.name}`} onClick={() => setEditing(u)}><Pencil size={16} /></Button>
                    <Button variant="ghost" size="sm" aria-label={`Delete ${u.name}`} disabled={isSelf(u)} onClick={() => setDeleting(u)}><Trash2 size={16} className="text-bad" /></Button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {editing && <EditUser target={editing} isSelf={isSelf(editing)} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />}
      {deleting && <ConfirmDialog title="Delete user" loading={busy} onConfirm={confirmDelete} onClose={() => setDeleting(null)}
        message={<>Delete <strong>{deleting.name}</strong>? They can no longer sign in. Their past orders stay in the order list without an owner.</>} />}
    </>
  )
}
