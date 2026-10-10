// The host's Module Federation entry, served as /assets/remoteEntry.js
// (http://localhost:5173 locally). Remotes import `shell/apiClient` and
// `shell/session` from it; they never get their own client or session.
//
// @originjs/vite-plugin-federation has no `shareStrategy` option (that is
// Module Federation 2.0's runtime). It needs none here: each remote's
// remoteEntry.js is fetched only when its import() runs — on entering the
// portal's route — so a downed remote never blocks the host's startup.
import reactDomPackage from 'react-dom/package.json';
import reactPackage from 'react/package.json';

export const federationConfig = {
  name: 'host',
  filename: 'remoteEntry.js',
  exposes: {
    './apiClient': './src/shell/apiClient.ts',
    './session': './src/shell/session.ts',
  },
  // Remote URLs are placeholders until the real portals exist.
  remotes: {
    authPortal: 'http://localhost:5174/assets/remoteEntry.js',
    productsPortal: 'http://localhost:5175/assets/remoteEntry.js',
    salesPortal: 'http://localhost:5176/assets/remoteEntry.js',
  },
  // For this host the plugin leaves a shared module's version undefined and
  // registers it under the key "undefined". A portal asking for ^19.2.x then
  // finds no match, loads its own bundled React, and its hooks fail inside the
  // host's React DOM ("reading 'useState'"). The version is read from the
  // installed packages, so it follows package-lock.json and cannot drift.
  shared: {
    react: { version: reactPackage.version },
    'react-dom': { version: reactDomPackage.version },
  },
};
