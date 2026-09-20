```ts
import { fileURLToPath } from 'url'
import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBaseUrl = env.VITE_API_BASE_URL

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

      proxy: {
        '/auth': {
          target: apiBaseUrl,
          changeOrigin: true,
          secure: false,
        },

        '/vehicles': {
          target: apiBaseUrl,
          changeOrigin: true,
          secure: false,
        },

        '/incidents': {
          target: apiBaseUrl,
          changeOrigin: true,
          secure: false,
        },

        '/shipments': {
          target: apiBaseUrl,
          changeOrigin: true,
          secure: false,
        },

        '/roads': {
          target: apiBaseUrl,
          changeOrigin: true,
          secure: false,
        },

        '/routes': {
          target: apiBaseUrl,
          changeOrigin: true,
          secure: false,
        },

        '/alerts': {
          target: apiBaseUrl,
          changeOrigin: true,
          secure: false,
        },

        '/weather': {
          target: apiBaseUrl,
          changeOrigin: true,
          secure: false,
        },

        '/kpis': {
          target: apiBaseUrl,
          changeOrigin: true,
          secure: false,
        },

        '/snapshot': {
          target: apiBaseUrl,
          changeOrigin: true,
          secure: false,
        },

        '/demo': {
          target: apiBaseUrl,
          changeOrigin: true,
          secure: false,
        },

        '/api': {
          target: apiBaseUrl,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
```
