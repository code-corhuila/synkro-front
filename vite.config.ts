import { fileURLToPath } from 'node:url'
import federation from '@originjs/vite-plugin-federation'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
// defineConfig comes from vitest/config so the `test` block is typed.
export default defineConfig({
  plugins: [
    react(),
    // @originjs/vite-plugin-federation has no `shareStrategy` option (that is
    // Module Federation 2.0's runtime). It needs none here: each remote's
    // remoteEntry.js is fetched only when its import() runs — on entering the
    // portal's route — so a downed remote never blocks the host's startup.
    // Remote URLs are placeholders until the real portals exist.
    federation({
      name: 'host',
      remotes: {
        authPortal: 'http://localhost:5174/assets/remoteEntry.js',
        productsPortal: 'http://localhost:5175/assets/remoteEntry.js',
        salesPortal: 'http://localhost:5176/assets/remoteEntry.js',
      },
      shared: ['react', 'react-dom'],
    }),
  ],
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
