import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(env.VITE_APP_VERSION || '2.0.0'),
    },
    server: {
      port: 3000,
      proxy: {
        '/api/revenuecat': {
          target: 'https://api.revenuecat.com',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/revenuecat/, ''),
          headers: { 'X-Platform': 'stripe' },
        },
        '/api/resend': {
          target: 'https://api.resend.com',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/resend/, ''),
        },
        '/api/apify': {
          target: 'https://api.apify.com',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/apify/, ''),
        },
        '/.netlify/functions': {
          target: 'http://localhost:8888',
          changeOrigin: true,
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-core':   ['react', 'react-dom'],
            'recharts':     ['recharts'],
            'lucide':       ['lucide-react'],
            'zustand':      ['zustand'],
            'utils':        ['clsx', 'date-fns', 'uuid', 'zod'],
          },
        },
      },
    },
  }
})
