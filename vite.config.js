import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: { target: 'esnext' },
  worker: { format: 'es' },
  resolve: { dedupe: ['@huggingface/transformers'] },
  optimizeDeps: { exclude: ['@huggingface/transformers'] }
})