import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { GuestOnly, RequireAdmin, RequireAuth } from './auth/guards'
import StoreLayout from './components/StoreLayout'
import { Spinner } from './components/ui'
import Login from './pages/Login'
import Register from './pages/Register'
import NotFound from './pages/NotFound'
import Catalog from './pages/store/Catalog'
import Cart from './pages/store/Cart'
import MyOrders from './pages/store/MyOrders'

// The admin console is code-split: customers never download it. It loads the first time an admin opens it.
const AdminLayout = lazy(() => import('./components/AdminLayout'))
const Dashboard = lazy(() => import('./pages/admin/Dashboard'))
const Laptops = lazy(() => import('./pages/admin/Laptops'))
const Stocks = lazy(() => import('./pages/admin/Stocks'))
const Orders = lazy(() => import('./pages/admin/Orders'))
const Users = lazy(() => import('./pages/admin/Users'))

export default function App() {
  return (
    <Suspense fallback={<Spinner label="Loading" />}>
      <Routes>
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<StoreLayout />}>
            <Route index element={<Catalog />} />
            <Route path="cart" element={<Cart />} />
            <Route path="orders" element={<MyOrders />} />
          </Route>

          <Route element={<RequireAdmin />}>
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="laptops" element={<Laptops />} />
              <Route path="stocks" element={<Stocks />} />
              <Route path="orders" element={<Orders />} />
              <Route path="users" element={<Users />} />
            </Route>
          </Route>
        </Route>

        {/* A real 404 page instead of silently redirecting every typo to "/" */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
