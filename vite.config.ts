import { fileURLToPath } from 'node:url'
import federation from '@originjs/vite-plugin-federation'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { federationConfig } from './src/federation.config'
import { resolveCssPlaceholders } from './src/federation.cssPlaceholder'

// https://vite.dev/config/
// defineConfig comes from vitest/config so the `test` block is typed.
export default defineConfig({
  plugins: [
    react(),
    federation(federationConfig),
    {
      // Runs after the federation plugin has had its turn at the entry chunk.
      name: 'synkro:resolve-federation-css-placeholders',
      generateBundle: {
        order: 'post',
        handler(_options, bundle) {
          for (const chunk of Object.values(bundle)) {
            if (chunk.type === 'chunk' && chunk.fileName === 'assets/remoteEntry.js') {
              chunk.code = resolveCssPlaceholders(chunk.code)
            }
          }
        },
      },
    },
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
