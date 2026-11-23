import { BRAND } from '../lib/format'
import Logo from '../components/Logo'

// Shared frame for Login and Register: blue brand panel + form column.
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <section data-surface="dark" className="flex flex-col justify-between bg-bios p-8 text-white lg:p-12">
        <div className="display flex items-center gap-2 text-xl"><Logo size={32} /> {BRAND}</div>
        <div className="my-10 max-w-md lg:my-0">
          <h2 className="text-3xl leading-tight sm:text-4xl">Pick a laptop by what is inside it.</h2>
          <p className="mt-4 text-white/80">
            Compare CPU, RAM, storage and graphics side by side, see live stock, and place an order in a few clicks.
          </p>
        </div>
        <p className="hidden text-sm text-white/60 lg:block">Laptop store system</p>
      </section>
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl">{title}</h1>
          <p className="mb-6 mt-1 text-sm text-ink-soft">{subtitle}</p>
          {children}
          <p className="mt-6 text-sm text-ink-soft">{footer}</p>
        </div>
      </section>
    </div>
  )
}
