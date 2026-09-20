import { fileURLToPath } from 'url'
import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const rawTarget =
    env.VITE_API_URL ||
    env.VITE_API_BACKEND_URL ||
    env.VITE_API_BASE_URL ||
    'https://bath-sevok-server-nlbg.onrender.com'
  const backendTarget = rawTarget.replace(/\/+$/, '')

  const proxyConfig = {
    target: backendTarget,
    changeOrigin: true,
    secure: false,
  }

  const apiProxy = {
    '/auth': proxyConfig,
    '/vehicles': proxyConfig,
    '/incidents': proxyConfig,
    '/shipments': proxyConfig,
    '/roads': proxyConfig,
    '/routes': proxyConfig,
    '/telemetry': proxyConfig,
    '/alerts': proxyConfig,
    '/weather': proxyConfig,
    '/kpis': proxyConfig,
    '/snapshot': proxyConfig,
    '/demo': proxyConfig,
    '/api': proxyConfig,
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      proxy: apiProxy,
    },
    preview: {
      port: 4173,
      proxy: apiProxy,
    },
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
                return 'vendor-react';
              }
              if (id.includes('leaflet')) {
                return 'vendor-leaflet';
              }
              if (id.includes('@tanstack') || id.includes('axios') || id.includes('zustand')) {
                return 'vendor-query';
              }
            }
          },
        },
      },
    },
  }
})
