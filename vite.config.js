import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
  ],

  resolve: {
    alias: {
      // Alias the satellite.js package name to our local pure-JS shim.
      // This completely bypasses satellite.js/wasm/** which causes WASM/
      // pthreads build failures in Vite 8 / rolldown.
      'satellite.js': resolve('./src/utils/satelliteShim.js'),
    },
  },

  worker: {
    format: 'es',
  },
})
