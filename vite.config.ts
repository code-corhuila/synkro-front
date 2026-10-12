import { fileURLToPath } from 'node:url'
import federation from '@originjs/vite-plugin-federation'
import react from '@vitejs/plugin-react'
import { loadEnv, type Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
import { federationConfig } from './src/federation.config.ts'
import { resolveCssPlaceholders } from './src/federation.cssPlaceholder.ts'

// Runs after the federation plugin has had its turn at the entry chunk.
const resolveCssPlaceholdersPlugin: Plugin = {
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
}

const federationPlugins = (mode: string) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return [federation({ ...federationConfig, remotes: { ...federationConfig.remotes,
    productsPortal: env.VITE_PRODUCTS_PORTAL_ENTRY || federationConfig.remotes.productsPortal,
  } }), resolveCssPlaceholdersPlugin]
}

// https://vite.dev/config/
// defineConfig comes from vitest/config so the `test` block is typed.
export default defineConfig(({ mode }) => ({
  // Under Vitest (mode "test") the federation plugin would rewrite the portal
  // imports into http URLs before the alias below applies, so the tests would
  // reach for the network. They alias the remotes to a stub instead.
  plugins: [react(), ...(mode === 'test' ? [] : federationPlugins(mode))],
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
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test-setup.ts', 'src/**/*.d.ts', 'src/**/__stubs__/**'],
      reporter: ['text', 'lcov'],
      // Frontend floor from the team's testing strategy: 70% of statements.
      thresholds: { statements: 70 },
    },
    // Vite resolves every string-literal import() at transform time, even
    // one that is never called, so remote specifiers need a target here.
    alias: [
      {
        find: /^(authPortal|productsPortal|salesPortal)\/.*$/,
        replacement: fileURLToPath(new URL('./src/remotes/__stubs__/remote.tsx', import.meta.url)),
      },
    ],
  },
}))
