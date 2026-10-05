interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_DEV_SIGN_IN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
