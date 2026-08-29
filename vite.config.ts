import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 등 서브경로 배포를 위해 BASE_PATH 로 base 를 덮어쓸 수 있다.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/highlight.js')) return 'hljs'
        },
      },
    },
  },
})
