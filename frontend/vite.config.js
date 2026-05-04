import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  server: {
    host: '0.0.0.0', // aceita conexões externas
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

    proxy: {
      '/api': {
        target: 'http://192.168.2.71:5002',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://192.168.2.71:5002',
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
