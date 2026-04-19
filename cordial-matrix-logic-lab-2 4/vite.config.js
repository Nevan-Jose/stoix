import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const stoixTarget =
    (env.VITE_STOIX_API_ORIGIN || '').trim() ||
    `http://127.0.0.1:${env.STOIX_PORT || env.VITE_STOIX_PORT || '8787'}`

  const apiProxy = {
    '/api': {
      target: stoixTarget,
      changeOrigin: true,
    },
  }

  return {
    logLevel: 'error',
    server: {
      proxy: apiProxy,
    },
    preview: {
      proxy: apiProxy,
    },
    plugins: [
      base44({
        legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
        hmrNotifier: true,
        navigationNotifier: true,
        analyticsTracker: true,
        visualEditAgent: true
      }),
      react(),
    ],
  }
})
