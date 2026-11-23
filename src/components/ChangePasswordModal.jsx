import { useState } from 'react'
import { meApi } from '../api/endpoints'
import { useAuth } from '../auth/AuthContext'
import { PASSWORD_MAX, PASSWORD_MIN } from '../lib/format'
import { Button, Field, FormError, Modal, PasswordInput } from './ui'
import { useToast } from './Toast'

// PATCH /api/v1/me/password - works for EVERY signed-in user (the old /users/change_password/{id} was
// admin-only, so normal customers could not change their password at all).
// The backend signs the account out everywhere else and returns a fresh token pair for this device.
export default function ChangePasswordModal({ onClose }) {
  const { replaceTokens } = useAuth()
  const toast = useToast()
  const [f, setF] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setError(''); setFieldErrors({})
    if (f.newPassword.length < PASSWORD_MIN || f.newPassword.length > PASSWORD_MAX) return setFieldErrors({ newPassword: `Use ${PASSWORD_MIN} to ${PASSWORD_MAX} characters.` })
    if (f.newPassword !== f.confirmPassword) return setFieldErrors({ confirmPassword: 'Does not match the new password.' })
    setBusy(true)
    try {
      replaceTokens(await meApi.changePassword(f))
      toast.success('Password changed. Other devices were signed out.')
      onClose()
    } catch (err) {
      if (err.fieldErrors) setFieldErrors(err.fieldErrors)
      else setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Change password" onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Current password" error={fieldErrors.oldPassword}><PasswordInput value={f.oldPassword} onChange={set('oldPassword')} required autoComplete="current-password" /></Field>
        <Field label="New password" hint={`${PASSWORD_MIN} to ${PASSWORD_MAX} characters`} error={fieldErrors.newPassword}><PasswordInput value={f.newPassword} onChange={set('newPassword')} required autoComplete="new-password" /></Field>
        <Field label="Confirm new password" error={fieldErrors.confirmPassword}><PasswordInput value={f.confirmPassword} onChange={set('confirmPassword')} required autoComplete="new-password" /></Field>
        <FormError>{error}</FormError>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="plain" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={busy}>Save password</Button>
        </div>
      </form>
    </Modal>
  )
}
