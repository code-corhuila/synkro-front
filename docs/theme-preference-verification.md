# Theme preference — verification (HU-FE-11)

Design: [`theme-preference-design.md`](theme-preference-design.md). Node v25.7.0 (repos declare `>=22`; no
other Node was installed). No Docker, no real backend.

## Automated (fixtures and jsdom)

| Repo | Command | Result |
|---|---|---|
| synkro-front | `npx vitest run` | 57 files, 426 passed, 3 todo (new: themePreference, ThemeSelector, themeInit, themeSession) |
| synkro-front | `npx oxlint`, `npx tsc -b`, `npm run build`, `npm run check:production-build` | clean; no dev sign-in in the build |
| synkro-products-portal | `npm test`, `oxlint`, `npm run build`, `npm run check:compiled` | 77 files, 1024 passed; clean |
| synkro-sales-portal | `npm test`, `oxlint`, `npm run build`, `npm run check:compiled` | 346 passed, 1 failed (`registrationRecovery.test.tsx`, blocked storage): **also fails on `origin/develop` without this change**; build and compiled check clean |

Red first: the three new host suites failed on the missing modules; the Products style test failed on
`prefers-color-scheme` before the CSS change.

## Desktop browser (host dev server, own port 5390, stopped afterwards; **fixture sign-in token, no real services**)

Observed in the in-app browser (800x600 pane):

- Login (production mode, Auth remote down → recovery panel) and dashboard, in light and dark:
  [login-light](evidence/theme-preference/login-light.jpg), [login-dark](evidence/theme-preference/login-dark.jpg),
  [dashboard-light](evidence/theme-preference/dashboard-light.jpg), [dashboard-dark](evidence/theme-preference/dashboard-dark.jpg).
- Device dark + choice Claro → light, and device light + choice Oscuro (keyboard: click Claro, ArrowRight) → dark.
- Focus ring visible on the focused radio in dark; arrow keys change the option.
- Reload keeps the choice; logout keeps it (only `synkro.theme-preference` in localStorage, session cleared).
- Stored `purple` → System. Sistema follows an emulated device change without reload.
- Titles "Panel" and "Ventas" are unchanged from the repository's current copy.

## Pending / limits

- **Portals not exercised in a browser.** Their remotes (Auth, Products, Sales, Customers) need the host on
  fixed port 5173 plus their own ports and real APIs; not run here. The Sales/Products changes are covered
  by their style contract tests and builds only. Auth (React) and Customers (Angular) were checked by
  source search only: no `prefers-color-scheme` rules, tokens only.
- Blocked `localStorage` verified in unit tests only, not in a browser with site data blocked.
- The dev sign-in screen (`VITE_DEV_SIGN_IN`) has no selector; it is replaced by the Auth portal in production.
- The task text names "Panel de control" and "Resumen de ventas"; the repository shows "Panel" (Host) and
  "Resumen de ventas" (Sales portal, exercised by its own tests). Neither was changed.
