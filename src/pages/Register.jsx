import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { PASSWORD_MAX, PASSWORD_MIN } from '../lib/format'
import { Button, Field, FormError, Input, PasswordInput, cx } from '../components/ui'
import AuthShell from './AuthShell'

// Same rules as UserDto on the backend, so mistakes are caught before the request.
function validate(f) {
  const e = {}
  if (f.name.trim().length < 3 || f.name.trim().length > 30) e.name = 'Use 3 to 30 characters.'
  if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = 'Enter a valid email address.'
  else if (f.email.trim().length > 100) e.email = 'At most 100 characters.'
  if (f.password.length < PASSWORD_MIN || f.password.length > PASSWORD_MAX) e.password = `Use ${PASSWORD_MIN} to ${PASSWORD_MAX} characters.`
  if (f.password !== f.confirm) e.confirm = 'Passwords do not match.'
  return e
}

// 0-4 rough score, only to give feedback (the server enforces the real rule)
function strength(p) {
  let s = 0
  if (p.length >= PASSWORD_MIN) s++
  if (p.length >= 12) s++
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) s++
  return s
}
const LEVEL = [['Too short', 'bg-bad'], ['Weak', 'bg-bad'], ['Okay', 'bg-[#e0a800]'], ['Good', 'bg-ok'], ['Strong', 'bg-ok']]

export default function Register() {
  const { register } = useAuth()
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const score = f.password ? strength(f.password) : -1

  async function submit(e) {
    e.preventDefault()
    const problems = validate(f)
    setErrors(problems)
    if (Object.keys(problems).length) return
    setError('')
    setBusy(true)
    try {
      // `role` is not sent (and not accepted): new accounts are always USER.
      await register({ name: f.name.trim(), email: f.email.trim(), password: f.password })
    } catch (err) {
      // Server-side field errors (e.g. duplicate username) land next to the right input.
      if (err.fieldErrors) setErrors(err.fieldErrors); else setError(err.message)
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Create your account" subtitle="You will be signed in right after."
      footer={<>Already registered? <Link to="/login" className="font-semibold text-bios underline">Sign in</Link></>}
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Username" hint="3 to 30 characters" error={errors.name}><Input value={f.name} onChange={set('name')} autoComplete="username" required /></Field>
        <Field label="Email" error={errors.email}><Input type="email" value={f.email} onChange={set('email')} autoComplete="email" required /></Field>
        <div>
          <Field label="Password" hint={`${PASSWORD_MIN} to ${PASSWORD_MAX} characters`} error={errors.password}>
            <PasswordInput value={f.password} onChange={set('password')} autoComplete="new-password" required />
          </Field>
          {score >= 0 && (
            <div className="mt-2" aria-live="polite">
              <div className="flex gap-1" aria-hidden>
                {[0, 1, 2, 3].map((i) => <span key={i} className={cx('h-1 flex-1 rounded', i < Math.max(score, f.password.length < PASSWORD_MIN ? 0 : 1) ? LEVEL[score][1] : 'bg-line')} />)}
              </div>
              <p className="mt-1 text-xs text-ink-soft">Strength: {LEVEL[score][0]}</p>
            </div>
          )}
        </div>
        <Field label="Confirm password" error={errors.confirm}><PasswordInput value={f.confirm} onChange={set('confirm')} autoComplete="new-password" required /></Field>
        <FormError>{error}</FormError>
        <Button type="submit" loading={busy} className="w-full">Create account</Button>
      </form>
    </AuthShell>
  )
}
