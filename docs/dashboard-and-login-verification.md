# HU-FE-09 — verification record (Host)

Issue: `code-corhuila/synkro-docs#294`. Design: [`dashboard-and-login-design.md`](dashboard-and-login-design.md).
Date of the executions below: 2026-11-02 (local time, Windows 11, Node v25.7.0 — the repository asks
`>=22`).

## Revisions

| Repository | Base (`develop` = `origin/develop`) | Branch |
|---|---|---|
| `synkro-front` (Host) | `70a1b87b380e2ab5a9896fd5a9c13e8096b918c8` | `feat/dashboard-reports-and-login-actions` (PR head is the PR's final commit) |
| `synkro-sales-portal` | `d691eec160ba50ed417e5acbbe5d02496f2dea8d` | `feat/sales-reports-and-dashboard-summary` (own PR) |
| `synkro-auth-portal` | `02e71fcab39a98aa14a082c68957e750c35347c0` | **no change, no PR**: built unmodified from `develop` only to serve the real Login remote in the browser runs |

Ownership finding: the orphan "Volver a cargar el acceso" / "Ir al inicio" controls were rendered by
the Host (`src/remotes/AuthLogin.tsx`), not by the Auth portal, so the Auth portal needs no change.

## Test-first (RED then GREEN)

RED, before any implementation (`npx vitest run`):

- Host: `Tests 16 failed | 360 passed | 3 todo`, 6 files failing — `Dashboard`, `dashboardLinks` and
  `ButtonLink` could not import their modules; the new `AuthLogin.recovery` (9 behaviours) and
  `accessRegion` contracts failed; the updated `NotFound` expectation (no recovery control under a
  loading login) failed.
- Sales portal: 5 new files failed to import (`reportFormatting`, `reportsApi`, `useReport`,
  `ReportsPage`, `DashboardSummary`); `reportRoutes` (4 tests, `/sales/reports` was parsed as a sale
  id) and the federation-exposes assertion failed.

GREEN, after implementation, same commands:

- Host: `Test Files 53 passed (53)`, `Tests 397 passed | 3 todo (400)`; coverage statements 95.73 %
  (floors unchanged: 70 % global, 85 % on session/authentication/apiClient/api); `npm run lint`
  clean; `tsc -b` clean; `npm run build` and `npm run check:production-build` pass.
- Sales portal: see its verification record.

Existing assertions changed on purpose: `NotFound.test` (the old orphan button is gone),
`App.roleGuard.test` (a second `nav` now exists on the dashboard, so the menu is queried by name).

## Real browser run — what it was and what it was not

**Executed in the built-in browser** (real Host build with Module Federation, real Sales portal build,
real **unmodified** Auth portal build `02e71fc`), served with `vite preview` on ports 5174 (Host),
5176 (Sales), 5177 (Auth) behind a **mock gateway** on 5178 written for this session. The mock follows
the delivered OpenAPI contracts (auth login/refresh/logout, the three Sales reports with UTC-inclusive
filters, paging and ownership scope derived from the token `sub`, `GET /products/{id}`). Test users
and a throw-away password were generated for the run and are not recorded here.

**NOT executed:** a run against the real Sales API/Mongo/Auth/Gateway. `synkro-dev` (ports 5173/8000)
was only looked at, unauthenticated, to reproduce the "before" screenshot (view-only; no sign-in, no
interaction). The `HEAVY-DOCKER.lock` lease was held by HU-AUTH-15 during most of the work, and an
isolated real Sales stack (Mongo replica set, Sales DB v2.0.0 schema, RS256 tokens trusted by the API)
was not built. Consequently the acceptance item "compare displayed data with real API results for
ADMIN and an owner SALESPERSON" is **open**; what was compared is the UI against the mock's own
responses for the same token. Runbook for the real comparison: [Pending](#pending).

Observed results (all against the mock gateway):

| Check | Result |
|---|---|
| Healthy login | Only the Auth form; no reload button, no "Ir al inicio" |
| Auth remote stopped (process killed) | After the network failure the panel "No pudimos cargar el acceso." with styled **Reintentar acceso** and **Ir al inicio** inside one card |
| Retry after restoring the remote | Exactly one form, panel gone (done twice) |
| "Ir al inicio" signed out (keyboard Enter) | Stays on `/login`; no dashboard content; no loop; the login retries loading |
| Keyboard | Tab order: retry, then home; visible focus ring on both |
| Viewports | 375, 768, 1024 px: actions side by side, no horizontal page scroll |
| Colour schemes | Dark and light; measured contrast: message 6.19 / 4.53, primary 6.60 / 6.41, secondary 8.71 / 12.15 (dark / light), all ≥ 4.5 |
| ADMIN | Dashboard with 7 link cards and the three summary tiles; daily / monthly / top-products match the mock for the same token (page 1 rows, `meta.total`, cents) |
| UTC inclusive | `from=to=2026-10-01` returns that day only (includes the 00:00:00Z sale); `2026-09-30` keeps its 23:59:59Z sale; a Bogotá-evening sale counts on the next UTC day |
| Race | A slow first request (3 s) followed by a fast second filter: the slow answer arriving later did not replace the newer result |
| Reversed range | Explained in the form; the request is never sent |
| Error + retry | Forced 500: alert with trace reference and **Reintentar** recovered the table |
| SALESPERSON (seller one) | Only their own rows; "Tu contribución"; the other seller's days are absent |
| INVENTORY | Dashboard shows only Productos and Alertas de stock; opening `/sales/reports/daily` redirects to `/dashboard`; the mock log shows **no** report request (only the session refresh). Direct API call with an INVENTORY token returned 403 (checked with a script against the mock) |

Evidence (sanitized; no tokens or passwords visible): [`evidence/fe-09/`](evidence/fe-09/). `00` is the
user's reference; `01` is the same defect reproduced on the live `synkro-dev` Host before the change
(read-only); `02`–`05` are after; `06`–`11` are dashboard/reports per role and viewport.

## Known limits and pre-existing conditions

- `synkro-sales-portal` `develop` already fails one test
  (`registrationRecovery.test.tsx` — "almacenamiento bloqueado…") when run on Node v25.7.0; its
  `engines` is `>=22 <23` and Node 22 was not available here. It fails identically without these
  changes.
- The top-products screen asks `GET /api/v1/products/{id}` once per row (≤ 20 per page) to show
  product names; it is optional enrichment and falls back to the stored id.
- The header's "Cerrar sesión" is still a native button (outside FE-09).
- INF-06's frozen acceptance validates its own selection, not these changes.

## Pending

1. Under the shared lease, bring up an isolated real stack (Sales API + Mongo with the Sales DB
   v2.0.0 schema, an Auth key pair whose public key the API trusts, the Gateway) with `fe09-*` labels,
   seed sales for two sellers including the UTC boundary rows used above, and repeat the ADMIN /
   SALESPERSON / INVENTORY checks comparing the UI with direct API responses.
2. Update `synkro-docs` (`12-ux-ui/navigation-map.md`, `wireframes.md`, traceability):
   proposed text in [`fe-09-docs-for-synkro-docs.md`](fe-09-docs-for-synkro-docs.md).

## Cleanup

Servers started for the run (ports 5174/5176/5177/5178) were mine and are stopped at the end of the
session. No Docker resource was created or removed; nothing was pruned.
