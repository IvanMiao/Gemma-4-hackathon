import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022',
    sourcemap: true,
    // The WebGL scene is a separately lazy-loaded experience, not startup JavaScript.
    chunkSizeWarningLimit: 950,
  },
})
