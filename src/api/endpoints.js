import { http } from './client'

const V1 = '/api/v1'

export const authApi = {
  // AuthDto: { username, password }. "username" may be the user's name OR email.
  // Response: { access_token, refresh_token, user: { id, name, email, role } }
  login: (username, password) => http.post(`${V1}/auth/login`, { username, password }),
  // UserDto: { name, email, password }. `role` is not accepted any more: new accounts are always USER.
  register: (body) => http.post(`${V1}/auth/register`, body),
  // Revokes the refresh token on the server (best effort: the UI signs out even if this fails).
  logout: (refreshToken) => http.post(`${V1}/auth/logout`, { refresh_token: refreshToken }),
}

// "My account": works for every signed-in user (everything under /users is admin-only).
export const meApi = {
  get: () => http.get(`${V1}/me`),
  // Returns a fresh { access_token, refresh_token }: the backend revokes all other sessions.
  changePassword: (body) => http.patch(`${V1}/me/password`, body),
}

export const laptopsApi = {
  list: () => http.get(`${V1}/laptops`),
  create: (body) => http.post(`${V1}/laptops`, body),
  // The backend now does a PARTIAL update (only the fields you send change).
  update: (id, body) => http.put(`${V1}/laptops/${id}`, body),
  remove: (id) => http.delete(`${V1}/laptops/${id}`),
  // multipart/form-data with ONE part named "file" (JPG/PNG/WebP, max 2 MB). Do not set Content-Type yourself:
  // the browser must add the multipart boundary. Returns the updated laptop (with image_url).
  uploadImage: (id, file) => {
    const form = new FormData()
    form.append('file', file)
    return http.post(`${V1}/laptops/${id}/image`, form)
  },
  removeImage: (id) => http.delete(`${V1}/laptops/${id}/image`),
}

export const stocksApi = {
  list: () => http.get(`${V1}/stocks`),
  create: (laptopId, qty) => http.post(`${V1}/stocks`, { laptop_id: laptopId, stock_quantity: qty }),
  // operation_types: 1 = add, 2 = remove
  adjust: (id, op, qty) => http.put(`${V1}/stocks/${id}`, { operation_types: op, stock_quantity: qty }),
  remove: (id) => http.delete(`${V1}/stocks/${id}`),
}

export const ordersApi = {
  list: () => http.get(`${V1}/orders`),                 // admin: everyone's orders
  mine: () => http.get(`${V1}/orders/my`),              // any user: own orders
  create: (items) => http.post(`${V1}/orders`, { items }), // items: [{ laptop_id, amount }] -> returns the new order
  cancel: (id) => http.post(`${V1}/orders/${id}/cancel`),  // any user: own PENDING order
  setStatus: (id, status) => http.patch(`${V1}/orders/${id}`, { status }), // admin
  remove: (id) => http.delete(`${V1}/orders/${id}`),                       // admin
}

// Everything under /users is ADMIN-only on the backend (SecurityConfig).
export const usersApi = {
  list: () => http.get(`${V1}/users`),
  // body: { name?, email?, role?, password? } - only what you send is changed; password is BCrypt-encoded server side
  update: (id, body) => http.put(`${V1}/users/${id}`, body),
  remove: (id) => http.delete(`${V1}/users/${id}`),
}
