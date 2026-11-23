import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Button, Field, FormError, Input, PasswordInput } from '../components/ui'
import AuthShell from './AuthShell'

export default function Login() {
  const { login } = useAuth()
  const [form, setForm] = useState({ username: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // AuthContext leaves a one-time message here when it had to sign you out ("session expired").
  useEffect(() => {
    const n = sessionStorage.getItem('ls.notice')
    if (n) { setNotice(n); sessionStorage.removeItem('ls.notice') }
  }, [])

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(form.username.trim(), form.password)
      // No navigate() here: <GuestOnly> sees the new user and redirects (back to where you came from).
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Sign in" subtitle="Use your username or email."
      footer={<>New here? <Link to="/register" className="font-semibold text-bios underline">Create an account</Link></>}
    >
      <form onSubmit={submit} className="space-y-4" noValidate={false}>
        {notice && <p role="status" className="rounded-lg border border-bios/30 bg-bios-soft px-3 py-2 text-sm text-bios-deep">{notice}</p>}
        <Field label="Username or email">
          <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoComplete="username" autoFocus required />
        </Field>
        <Field label="Password">
          <PasswordInput value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="current-password" required />
        </Field>
        <FormError>{error}</FormError>
        <Button type="submit" loading={busy} className="w-full">Sign in</Button>
      </form>
    </AuthShell>
  )
}
