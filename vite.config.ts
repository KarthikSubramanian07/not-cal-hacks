import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': r('./src'),
      '@shared': r('./shared'),
      '@server': r('./server'),
    },
  },
  server: {
    port: 5173,
    // `npm run dev` runs Vite next to `wrangler pages dev`. Vite owns the UI and
    // hot reload; wrangler owns the API and the D1 binding.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8788',
        changeOrigin: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    cssMinify: 'lightningcss',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('motion')) return 'motion'
          if (id.includes('react-router')) return 'router'
          if (id.includes('/react-dom/') || id.includes('/react/')) return 'react'
        },
      },
    },
  },
})
