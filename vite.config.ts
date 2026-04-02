import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-is'],
          'recharts': ['recharts'],
          'framer-motion': ['framer-motion'],
          'xlsx': ['xlsx'],
          'date-fns': ['date-fns'],
          'markdown': ['react-markdown'],
          'wordcloud': ['react-wordcloud'],
          'icons': ['lucide-react']
        }
      }
    },
    cssCodeSplit: true,
    minify: 'esbuild'
  },
  server: {
    host: '0.0.0.0', // Listen on all local IPs
    port: 5173,      // Fixed port
    strictPort: true, // Fail if port is busy
    cors: true,       // Allow cross-origin requests (helpful for Safari/Mobile)
    hmr: {
      overlay: false
    },
    proxy: {
      '/api/douyin': {
        target: 'https://api.ake999.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/douyin/, '/api/dsp')
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'recharts', 'framer-motion', 'lucide-react'],
    exclude: ['xlsx']
  }
})
