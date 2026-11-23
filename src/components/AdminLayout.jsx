import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { KeyRound, LayoutDashboard, Laptop, LogOut, Package, Receipt, Store, Users, Menu, X } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { BRAND } from '../lib/format'
import { cx } from './ui'
import Logo from './Logo'
import ChangePasswordModal from './ChangePasswordModal'

const NAV = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/laptops', label: 'Laptops', icon: Laptop },
  { to: '/admin/stocks', label: 'Inventory', icon: Package },
  { to: '/admin/orders', label: 'Orders', icon: Receipt },
  { to: '/admin/users', label: 'Users', icon: Users },
]
const item = 'nav-item'

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const [pwOpen, setPwOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const nav = <>
    <div className="px-5 pb-5 pt-6">
      <Link to="/admin" className="flex items-center gap-3 text-lg font-bold tracking-tight text-white"><Logo /> <span>{BRAND}</span></Link>
      <p className="mt-1 pl-10 text-[10px] font-semibold uppercase tracking-[.16em] text-slate-400">Management console</p>
    </div>
    <p className="px-5 pb-2 text-[10px] font-semibold uppercase tracking-[.16em] text-slate-500">Workspace</p>
    <nav aria-label="Admin" className="flex flex-col gap-1 px-3">
      {NAV.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} onClick={()=>setMobileOpen(false)} className={({isActive})=>cx(item,isActive?'active':'text-slate-300')}><Icon size={18}/>{label}</NavLink>)}
    </nav>
    <div className="mt-auto flex flex-col gap-1 border-t border-white/10 px-3 py-4">
      <Link to="/" className={`${item} text-slate-300`}><Store size={18}/>Storefront</Link>
      <button onClick={()=>setPwOpen(true)} className={`${item} text-slate-300`}><KeyRound size={18}/>Change password</button>
      <button onClick={logout} className={`${item} text-slate-300`}><LogOut size={18}/>Sign out</button>
      <div className="mt-3 flex items-center gap-3 rounded-xl bg-white/5 p-3">
        <div className="flex size-9 items-center justify-center rounded-full bg-indigo-500/30 font-semibold text-white">{user?.name?.[0]?.toUpperCase()||'A'}</div>
        <div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{user?.name}</p><p className="text-xs text-slate-400">Administrator</p></div>
      </div>
    </div>
  </>
  return <div className="min-h-screen md:flex">
    <aside className="hidden w-[250px] shrink-0 flex-col bg-[#151d32] md:flex md:sticky md:top-0 md:h-screen">{nav}</aside>
    <div className="min-w-0 flex-1">
      <div className="flex items-center justify-between border-b border-line bg-white px-4 py-3 md:hidden">
        <Link to="/admin" className="flex items-center gap-2 font-bold"><Logo/>{BRAND}</Link><button onClick={()=>setMobileOpen(v=>!v)} aria-label={mobileOpen?"Close menu":"Open menu"} aria-expanded={mobileOpen} className="rounded-lg border border-line p-2">{mobileOpen?<X size={18}/>:<Menu size={18}/>}</button>
      </div>
      {mobileOpen && <div className="fixed inset-0 z-40 flex md:hidden"><div className="absolute inset-0 bg-black/40" onClick={()=>setMobileOpen(false)}/><aside className="relative flex w-[270px] flex-col bg-[#151d32]">{nav}</aside></div>}
      <main className="admin-main"><Outlet/></main>
    </div>
    {pwOpen && <ChangePasswordModal onClose={()=>setPwOpen(false)}/>}
  </div>
}
