import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/law-dashboard-v1/',
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0', // Listen on all local IPs
    port: 5173,      // Fixed port
    strictPort: true, // Fail if port is busy
    cors: true,       // Allow cross-origin requests (helpful for Safari/Mobile)
    proxy: {
      '/api/douyin': {
        target: 'https://api.ake999.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/douyin/, '/api/dsp')
      }
    }
  },
})
