import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { KeyRound, LayoutDashboard, LogOut, Receipt, ShoppingCart } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useCart } from '../cart/CartContext'
import { BRAND } from '../lib/format'
import { btn, cx } from './ui'
import Logo from './Logo'
import ChangePasswordModal from './ChangePasswordModal'

export default function StoreLayout() {
  const { user, isAdmin, logout } = useAuth()
  const { count } = useCart()
  const [pwOpen, setPwOpen] = useState(false)
  const link = ({ isActive }) => cx(btn('ghost', 'sm'), isActive && 'bg-bios-soft text-bios-deep')

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 sm:gap-4">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-ink"><Logo />{BRAND}</Link>

          <nav aria-label="Main" className="ml-2 hidden items-center gap-1 sm:flex">
            <NavLink to="/" end className={link}>Laptops</NavLink>
            <NavLink to="/orders" className={link}><Receipt size={16} aria-hidden />My orders</NavLink>
          </nav>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {isAdmin && <Link to="/admin" className={btn('plain', 'sm')}><LayoutDashboard size={16} /><span className="hidden sm:inline">Admin</span></Link>}
            <NavLink to="/orders" className={({ isActive }) => cx(btn('plain', 'sm'), 'sm:hidden', isActive && 'border-bios')} aria-label="My orders"><Receipt size={16} /></NavLink>
            <Link to="/cart" className={`${btn('plain', 'sm')} relative`} aria-label={`Cart, ${count} items`}>
              <ShoppingCart size={16} /><span className="hidden sm:inline">Cart</span>
              {count > 0 && <span className="ml-1 rounded-full bg-bios px-1.5 text-xs font-bold text-white">{count}</span>}
            </Link>
            <div className="hidden items-center gap-2 border-l border-line pl-3 md:flex">
              <span className="flex size-8 items-center justify-center rounded-full bg-bios-soft text-sm font-semibold text-bios">{user?.name?.[0]?.toUpperCase()}</span>
              <span className="max-w-32 truncate text-sm font-medium">{user?.name}</span>
            </div>
            <button onClick={() => setPwOpen(true)} className={btn('ghost', 'sm')} aria-label="Change password" title="Change password"><KeyRound size={16} /></button>
            <button onClick={logout} className={btn('ghost', 'sm')} aria-label="Sign out"><LogOut size={16} /><span className="hidden lg:inline">Sign out</span></button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 md:py-10"><Outlet /></main>
      {pwOpen && <ChangePasswordModal onClose={() => setPwOpen(false)} />}
    </div>
  )
}
