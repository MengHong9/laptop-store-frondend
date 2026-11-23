import { Link } from 'react-router-dom'
import { btn } from '../components/ui'

export default function NotFound() {
  return (
    <div className="mx-auto mt-24 max-w-md px-6 text-center">
      <p className="display text-6xl text-bios">404</p>
      <h1 className="mt-2 text-2xl">Page not found</h1>
      <p className="mt-2 text-sm text-ink-soft">That address does not exist, or the page has moved.</p>
      <Link to="/" className={btn('key', 'md', 'mt-6')}>Back to the store</Link>
    </div>
  )
}
