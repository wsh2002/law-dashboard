import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const configDir = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 必须用配置文件所在目录，否则从仓库根目录运行 vite 时读不到 law-dashboard/.env，代理无法注入 Authorization
  const env = loadEnv(mode, configDir, '')
  const zhipuKey = env.ZHIPU_API_KEY ?? env.VITE_ZHIPU_API_KEY ?? ''
  const deepseekKey = env.DEEPSEEK_API_KEY ?? env.VITE_DEEPSEEK_API_KEY ?? ''
  const doubaoKey = env.DOUBAO_API_KEY ?? env.VITE_DOUBAO_API_KEY ?? ''
  const dashscopeKey = env.DASHSCOPE_API_KEY ?? env.VITE_DASHSCOPE_API_KEY ?? ''
  /** 官方方舟 chat/completions 的 model 一般为接入点 ID（ep- 开头），不是 doubao-seed-2.0-pro 这种展示名 */
  const doubaoModelInject = (env.DOUBAO_ENDPOINT_ID ?? env.VITE_DOUBAO_MODEL ?? '').trim()

  return {
  root: configDir,
  envDir: configDir,
  base: '/',
  resolve: {
    alias: {
      '@': path.join(configDir, 'src'),
    },
  },
  define: {
    __LAW_DOUBAO_MODEL__: JSON.stringify(doubaoModelInject),
  },
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react-is') || (id.includes('/react/') && !id.includes('react-'))) return 'react-vendor';
            if (id.includes('recharts') || id.includes('d3-')) return 'recharts';
            if (id.includes('framer-motion')) return 'framer-motion';
            if (id.includes('xlsx') || id.includes('sheetjs')) return 'xlsx';
            if (id.includes('date-fns')) return 'date-fns';
            if (id.includes('react-markdown') || id.includes('remark') || id.includes('rehype') || id.includes('unified') || id.includes('micromark') || id.includes('mdast') || id.includes('hast')) return 'markdown';
            if (id.includes('react-wordcloud')) return 'wordcloud';
            if (id.includes('lucide-react')) return 'icons';
            if (id.includes('@supabase')) return 'supabase';
            if (id.includes('radix-ui') || id.includes('@radix')) return 'radix-ui';
          }
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
      },
      '/api/zhipu': {
        target: 'https://open.bigmodel.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/zhipu/, '/api/paas/v4'),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            if (zhipuKey) {
              proxyReq.setHeader('Authorization', `Bearer ${zhipuKey}`)
            }
          })
        },
      },
      '/api/deepseek': {
        target: 'https://api.deepseek.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/deepseek/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            if (deepseekKey) {
              proxyReq.setHeader('Authorization', `Bearer ${deepseekKey}`)
            }
          })
        },
      },
      '/api/doubao': {
        target: 'https://ark.cn-beijing.volces.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/doubao/, '/api/v3'),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            if (doubaoKey) {
              proxyReq.setHeader('Authorization', `Bearer ${doubaoKey}`)
            }
          })
        },
      },
      '/api/qwen': {
        target: 'https://dashscope.aliyuncs.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/qwen/, '/compatible-mode/v1'),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            if (dashscopeKey) {
              proxyReq.setHeader('Authorization', `Bearer ${dashscopeKey}`)
            }
          })
        },
      },
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'recharts', 'framer-motion', 'lucide-react'],
    exclude: ['xlsx']
  }
  }
})
