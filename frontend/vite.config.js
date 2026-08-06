import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  server: {
    host: '0.0.0.0', // necessário para acesso pelo domínio interno
    port: 5173,
    strictPort: true,

    // IMPORTANTE: permite acesso pelo domínio
    allowedHosts: [
      'vimax.ad.digimaxdiagnostico.com.br'
    ],

    // necessário quando usa domínio (evita erro de websocket/HMR)
    hmr: {
      host: 'vimax.ad.digimaxdiagnostico.com.br',
      protocol: 'ws', // ou 'wss' se tiver https
      port: 5173
    },

    fs: {
      // Impede que o Vite sirva arquivos fora do projeto
      allow: ['..'],
      deny: ['.env', '.env.*', '*.key', '*.pem'],
    },
    proxy: {
      '/api': {
        target: 'http://192.168.2.70:5002',
        changeOrigin: true,
      },
      '/static': {
        target: 'http://192.168.2.70:5002',
        changeOrigin: true,
      },
    },
  },

  plugins: [
    react(),
    tailwindcss(),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
