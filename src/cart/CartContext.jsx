import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const KEY = 'ls.cart'
const CartCtx = createContext(null)
export const useCart = () => useContext(CartCtx)

// The cart stores ONLY { id, qty }. Price and stock always come fresh from GET /laptops
// (see Cart page), so a stale cart can never charge an old price or exceed real stock.
export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) || [] } catch { return [] }
  })
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(items)), [items])

  // AuthContext fires this on sign-out / expired session so the next person on this browser starts with an empty cart.
  useEffect(() => {
    const reset = () => setItems([])
    window.addEventListener('auth:logout', reset)
    return () => window.removeEventListener('auth:logout', reset)
  }, [])

  const add = useCallback((id, max) => {
    setItems((prev) => {
      const found = prev.find((i) => i.id === id)
      if (!found) return max > 0 ? [...prev, { id, qty: 1 }] : prev
      return prev.map((i) => (i.id === id ? { ...i, qty: Math.min(i.qty + 1, max) } : i))
    })
  }, [])
  const setQty = useCallback((id, qty) => setItems((p) => p.map((i) => (i.id === id ? { ...i, qty } : i))), [])
  const remove = useCallback((id) => setItems((p) => p.filter((i) => i.id !== id)), [])
  const clear = useCallback(() => setItems([]), [])

  const value = useMemo(
    () => ({ items, add, setQty, remove, clear, count: items.reduce((n, i) => n + i.qty, 0) }),
    [items, add, setQty, remove, clear]
  )
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>
}
