import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig(({ mode }) => {
  const projectEnv = loadEnv(mode, resolve(__dirname, '..'), '')
  const demoEmail = projectEnv.DEMO_EMAIL || ''
  const demoPassword = projectEnv.DEMO_PASSWORD || ''
  return {
  plugins: [react()],
  define: {
    'import.meta.env.VITE_ENABLE_DEMO_CREDENTIAL_AUTOFILL': JSON.stringify(Boolean(demoEmail && demoPassword) ? 'true' : 'false'),
    'import.meta.env.VITE_DEMO_EMAIL': JSON.stringify(demoEmail),
    'import.meta.env.VITE_DEMO_PASSWORD': JSON.stringify(demoPassword),
  },
  server: {
    proxy: {
      '/api': `http://127.0.0.1:${process.env.BACKEND_PORT || process.env.PORT}`
    }
  }
  }
})
