import { fileURLToPath } from 'url'
import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
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
    proxy: {
      '/auth': {
        target: 'https://1wcg1sk4-5000.inc1.devtunnels.ms',
        changeOrigin: true,
        secure: false,
      },
      '/vehicles': {
        target: 'https://1wcg1sk4-5000.inc1.devtunnels.ms',
        changeOrigin: true,
        secure: false,
      },
      '/incidents': {
        target: 'https://1wcg1sk4-5000.inc1.devtunnels.ms',
        changeOrigin: true,
        secure: false,
      },
      '/shipments': {
        target: 'https://1wcg1sk4-5000.inc1.devtunnels.ms',
        changeOrigin: true,
        secure: false,
      },
      '/roads': {
        target: 'https://1wcg1sk4-5000.inc1.devtunnels.ms',
        changeOrigin: true,
        secure: false,
      },
      '/routes': {
        target: 'https://1wcg1sk4-5000.inc1.devtunnels.ms',
        changeOrigin: true,
        secure: false,
      },
      '/alerts': {
        target: 'https://1wcg1sk4-5000.inc1.devtunnels.ms',
        changeOrigin: true,
        secure: false,
      },
      '/weather': {
        target: 'https://1wcg1sk4-5000.inc1.devtunnels.ms',
        changeOrigin: true,
        secure: false,
      },
      '/kpis': {
        target: 'https://1wcg1sk4-5000.inc1.devtunnels.ms',
        changeOrigin: true,
        secure: false,
      },
      '/snapshot': {
        target: 'https://1wcg1sk4-5000.inc1.devtunnels.ms',
        changeOrigin: true,
        secure: false,
      },
      '/demo': {
        target: 'https://1wcg1sk4-5000.inc1.devtunnels.ms',
        changeOrigin: true,
        secure: false,
      },
      '/api': {
        target: 'https://1wcg1sk4-5000.inc1.devtunnels.ms',
        changeOrigin: true,
        secure: false,
      }
    }
  },
})
