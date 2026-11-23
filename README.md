# ThaStore frontend

React 19 + Tailwind CSS 4 + Vite client for the `laptop-store-system` Spring Boot backend.

## Quick start

```bash
# 1. Backend: start it (the single "prod" profile, port 8080; see the backend .env.example for the variables)

# 2. Make yourself an admin (new accounts are always USER; there is no seeded admin)
psql -h localhost -p 5433 -U postgres -d thaStore \
  -c "UPDATE users SET role='ADMIN' WHERE name='yourname';"

# 3. Frontend
npm install
npm run dev          # http://localhost:5173   (backend on port 8080)
```

Register on `/register` first, run the SQL, then **sign out and in** (or just reload: the app re-reads your role from `GET /api/v1/me` on start-up).

## How it connects to the backend

| Mode | What happens |
|---|---|
| `npm run dev` / `npm run preview` | Vite proxies `/api/*` to `http://localhost:8080` (`vite.config.js`). Same origin, so no CORS. |
| Other backend host in dev | Set `VITE_PROXY_TARGET` in `.env`. |
| Docker (`Dockerfile` + `nginx.conf`) | nginx serves the built site and proxies `/api` to the backend (`API_UPSTREAM`, default `http://app:8080`). Same origin again. From the backend folder: `docker compose --profile web up -d --build`. |
| Site and API on different origins | Set `VITE_API_BASE_URL` here **and** `CORS_ALLOWED_ORIGINS` on the backend. |

## What each role can do

| | USER | ADMIN |
|---|---|---|
| Browse, search, filter, sort laptops | yes | yes |
| Cart, place order | yes | yes |
| **My orders**, cancel own pending order | yes | yes |
| Change own password | yes | yes |
| Dashboard, laptops CRUD, stock, all orders, users | no | yes |

The backend enforces this (`SecurityConfig`); hiding buttons in React is only UX.

## Photos

Admins add a photo per laptop in **Admin -> Laptops -> Add / Edit** (JPG, PNG or WebP, up to 2 MB). The file is uploaded
right after the laptop is saved. `components/LaptopImage.jsx` shows it and falls back to the line illustration
(`LaptopArt`) when there is no photo or it fails to load. In Docker the photos are stored in the backend's `uploads_data` volume.

## Structure

```
src/
  api/client.js        axios + envelope unwrapping + ApiError + single-flight token refresh (read this first)
  api/endpoints.js     one function per backend endpoint
  auth/                AuthContext (login, role, logout), guards, jwt + storage helpers
  cart/                cart state (stores only id + qty; cleared on sign-out)
  components/          ui primitives (Field with error, Modal, Skeleton...), layouts, toast, ErrorBoundary
  pages/               Login, Register, NotFound, store/* (Catalog, Cart, MyOrders), admin/* (lazy-loaded)
  lib/format.js        money/date helpers, order status labels + allowed transitions, password rules
```

## Error handling (how a failure reaches the screen)

1. The backend always answers `{ code, message, description, data }`; `description` is a sentence safe to show.
2. `api/client.js` turns every failure into an `ApiError` with `status`, a readable `message`, and for validation
   errors a `fieldErrors` map (`{ email: "invalid email format" }`). Network failures, timeouts, 5xx and non-JSON
   proxy pages get a friendly fallback, never raw server text.
3. Forms put `fieldErrors.<name>` under the matching input (`<Field error={...}>`); everything else is shown
   as a banner (`<FormError>`) or a toast. Pages that load data show a skeleton, then `<ErrorState>` with a retry button.
4. A crash inside a component is caught by `<ErrorBoundary>` instead of a white screen.

## Auth design

- **Login returns the user.** `{ access_token, refresh_token, user: { id, name, email, role } }`, so no probing requests.
- **Refresh is single-flight.** The backend rotates refresh tokens (each use revokes it). All requests that expire together share one `/refresh` call.
- **Proactive + reactive refresh.** The client reads `exp` from the JWT and refreshes ~30 s early; a 401 also triggers one refresh + retry.
- **A network blip does not log you out.** Only a server-side rejection of the refresh token ends the session (you then see "session expired" on the login page).
- **Sign out revokes the refresh token** on the server (`POST /auth/logout`) and empties the cart.
- **Password change** (`PATCH /me/password`) signs every other device out and returns fresh tokens for this one.
- Tokens live in `localStorage`: readable by any XSS bug. The nginx config sets basic security headers; a stricter option would be httpOnly cookies, which needs backend changes.

## Customising

- Brand name and currency: `src/lib/format.js` (`BRAND`, `CURRENCY`).
- Colours and fonts: the `@theme` block in `src/index.css`.
