// The strings only the development sign-in shows. They live here, not in
// layout/copy.ts, so they leave the bundle with the sign-in when it is off:
// scripts/check-production-build.mjs looks for them in a production build.
export const devSignInCopy = {
  tokenLabel: 'Token de desarrollo',
  submit: 'Ingresar',
  invalidToken: 'Ese token de desarrollo no es válido.',
  devOnly: 'Esta pantalla solo existe en compilaciones de desarrollo.',
} as const;
