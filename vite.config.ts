import { fileURLToPath } from 'node:url'
import federation from '@originjs/vite-plugin-federation'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { federationConfig } from './src/federation.config'

// https://vite.dev/config/
// defineConfig comes from vitest/config so the `test` block is typed.
export default defineConfig({
  plugins: [
    react(),
    federation(federationConfig),
  ],
  // Remotes fetch the host entry from this port, so it cannot float.
  preview: { port: 5173, strictPort: true },
  build: {
    target: 'esnext',
    modulePreload: false,
    cssCodeSplit: false,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
    // Vite resolves every string-literal import() at transform time, even
    // one that is never called, so remote specifiers need a target here.
    alias: [
      {
        find: /^(authPortal|productsPortal|salesPortal)\/.*$/,
        replacement: fileURLToPath(new URL('./src/remotes/__stubs__/remote.tsx', import.meta.url)),
      },
    ],
  },
})
