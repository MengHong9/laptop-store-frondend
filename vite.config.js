import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// WHY A PROXY: your Spring Security config has no CORS rules, so a browser page on
// :5173 calling :8080 directly would be blocked. In dev, Vite forwards every /api/*
// request to Spring Boot, so the browser only ever talks to its own origin (no CORS).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_PROXY_TARGET || 'http://127.0.0.1:8080'
  return {
    plugins: [react(), tailwindcss()],
    server: { port: 5173, proxy: { '/api': { target, changeOrigin: true } } },
    // `npm run preview` (test the production build locally) needs the same proxy
    preview: { port: 4173, proxy: { '/api': { target, changeOrigin: true } } },
  }
})
