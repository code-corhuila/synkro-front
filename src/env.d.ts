interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_DEV_SIGN_IN?: string
  readonly VITE_CUSTOMERS_PORTAL_ENTRY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Fontsource's exports map resolves these two bare paths to their .css files,
// so the paths carry no extension. TypeScript needs a declaration for them to
// accept the side-effect imports in src/theme/fonts.ts.
declare module '@fontsource/big-shoulders-display/latin-900'
declare module '@fontsource/jetbrains-mono/latin-400'
