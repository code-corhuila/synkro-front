interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_DEV_SIGN_IN?: string
  readonly VITE_CUSTOMERS_PORTAL_ENTRY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
