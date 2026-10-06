import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
// defineConfig comes from vitest/config so the `test` block is typed.
export default defineConfig({
  plugins: [react()],
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
