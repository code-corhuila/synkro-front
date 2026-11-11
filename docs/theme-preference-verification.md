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

## Initial limits and integrated follow-up

- The initial dev-server checks above covered the Host with fixtures. The integrated follow-up below
  exercised Auth, Products, Sales and Customers and blocked storage with real services.
- The dev sign-in screen (`VITE_DEV_SIGN_IN`) has no selector; it is replaced by the Auth portal in production.
- The sidebar follow-up restores the approved heading "Panel de control"; the short navigation label
  remains "Panel", and Sales retains "Resumen de ventas".

## Integrated verification — 2026-11-07

The combined Host candidate `bb1f104` includes this theme branch and the sidebar, title and
focus corrections. It passed 445 tests with 3 preexisting TODO cases on Node 22.23.3.
Sales `36b4527` passed 348 tests. Products `3cd7ed1` passed 1,023 tests, then its 22 compiled-build
checks passed after building, covering the case initially skipped while dist was absent.
All three lint, TypeScript/build and production boundary checks passed.

Private acceptance root `2f3dcf72d1142e3e872ae5d76c7992eb077ed42d` passed 32 real-browser checkpoints
with the owned Gateway/Auth/Products/Sales/Customers/Workflow stack. Theme checks covered ADMIN,
SALESPERSON and INVENTORY, manual choice opposite to the device, both themes across the portals,
reload persistence, System emulation, native radio arrow keys, blocked localStorage with real
login/navigation and real logout preserving the preference. Live computed styles verified the
Sales/Products legacy fallback when data-theme is absent and its exclusion for explicit light.
Export and inner/outer cleanup passed. The supplementary runner's expected code is 2
(ready for review); its owning suite returned 0. Private CI and release approval remain separate.
