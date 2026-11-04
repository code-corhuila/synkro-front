# Dashboard, report entry points and login recovery — design (HU-FE-09)

Status: design written **before** tests and code. It claims no executed verification; results are
recorded in [`dashboard-and-login-verification.md`](dashboard-and-login-verification.md) when they
exist.

## Ownership (unchanged)

| Concern | Owner |
|---|---|
| Routes, guards (`RequireAuth`, `RequireRole`), navigation matrix, session, tokens, the single HTTP client | Host (`synkro-front`) |
| Report screens (daily, monthly, top products), money/UTC rules, dashboard summary tiles | Sales portal (`synkro-sales-portal`), mounted under `/sales/*` and exported as `salesPortal/DashboardSummary` |
| Login form | Auth portal (`authPortal/Login`); it does not own the failure/recovery controls |

The login recovery controls were **not** in the Auth portal: `src/remotes/AuthLogin.tsx` rendered a
native `<button>` and a bare `<Link>` after the remote unconditionally. The Auth portal needs no
change for FE-09.

## 1. Dashboard (`/dashboard`)

Replaces `DashboardPlaceholder`. Content, top to bottom:

1. `h1` "Panel" and the existing "Sesión iniciada como {sub}." line.
2. **Accesos** (`nav`, "Accesos del panel"): one link card per destination the role may open,
   derived from the same access matrix as the menu and the route guard (`canAccess`), so the
   dashboard can never offer a link the guard would bounce:

   | Role | Cards |
   |---|---|
   | ADMIN | Clientes, Productos, Alertas de stock, Ventas, Reporte diario, Reporte mensual, Productos más vendidos |
   | SALESPERSON | Clientes, Existencias, Ventas, Reporte diario, Reporte mensual, Productos más vendidos |
   | INVENTORY | Productos, Alertas de stock |

   Usuarios and Tokens de servicio are **not** cards: their screens are still the Auth portal's
   "no disponible" placeholder, and the dashboard promises no administration control. They remain
   in the menu, as today.
3. **Resumen de ventas** — only if `canAccess(role, '/sales')`. The Host lazily loads
   `salesPortal/DashboardSummary` inside a `RemoteBoundary`: the data, formatting and
   SALESPERSON-scoping are the Sales portal's. If the remote fails the cards above still work and
   the area shows the unavailable notice with a retry. INVENTORY never requests the module.

Not shown, because no API exposes them: total revenue across all time, profit, user counts, stock
totals. No hardcoded demo numbers (a source test scans the dashboard files).

States: the summary has loading / empty / error+retry / data per tile (Sales portal design). The
cards are static and always available.

## 2. Login access region

Healthy login: the page renders **only** the Auth form. No reload button, no "Ir al inicio".

Failure of the remote (asset/entry failure or render error) renders one recovery panel in the place
of the form — a card using the Host tokens, centred at login width — containing:

- the message "No pudimos cargar el acceso." (`role="alert"` is not used: the boundary already
  announces with `role="status"`; the retry button receives focus-visible styling like any control);
- **Reintentar acceso** — shared `Button` (primary). Remounts the loader once; the existing
  `createAuthLoader` resets the federation runtime with a fresh `?recovery=n` entry, so a recovered
  remote yields exactly one form (the boundary replaces its content; the page never keeps two);
- **Ir al inicio** — shared `ButtonLink` (secondary), a router `Link` to `/dashboard`.

Layout: actions in a flex row with `gap: var(--space-3)`, wrapping on narrow screens, inside the
panel, never as siblings of `<main>`'s content.

The same `RemoteBoundary` panel is used by every portal, so Products/Sales/Customers failures get
the same styled retry (label "Reintentar módulo"), instead of a native button.

### "Ir al inicio" and the guards

It is a client-side navigation to `/dashboard`, so:

- no document load: an in-memory session is never lost;
- unauthenticated or expired: `RequireAuth` redirects to `/login` (`replace`), `/login` is public so
  there is no loop, and no dashboard content or request is rendered for that visitor;
- valid session: `AuthLogin` already redirects a signed-in visitor to the destination, so the
  failure panel is never shown to them; the link lands on the dashboard.

Styling and the link never call `authentication.logout`/`clear` and never touch storage.

## 3. Shared components

- `shared/ui/ButtonLink.tsx`: a `Link` carrying the `button button--{variant}` classes of the shared
  `Button` (one visual definition). `Button.css` gains the properties a link needs
  (`display:inline-flex`, centring, `text-decoration:none`); focus uses the single global
  `:focus-visible` ring.
- `Notice` styling stays in `RemoteBoundary.css` (`portal-notice`), extended with an actions row.

## 4. Test plan (written first)

- `dashboardLinks`: per-role cards equal the guard's decision; no users/tokens; no sales paths for INVENTORY.
- `Dashboard`: links, summary loaded only for ADMIN/SALESPERSON, failure keeps the cards and retries,
  no invented metrics.
- `AuthLogin`: healthy = no recovery controls; failure → styled panel (shared classes, inside
  the panel), retry recovers a single form; "Ir al inicio" while signed out ends on `/login` with
  no dashboard content; a session appearing while the panel is shown is not cleared.
- Source/visual contracts: `AuthLogin.tsx`/`RemoteBoundary.tsx` contain no native `<button>`/`<a>`;
  CSS for the actions row uses tokens, wraps, and the focus ring remains the single shared rule.
- Existing tests that asserted the old orphan controls are updated; the guard/role/recovery tests
  are kept.

## 5. Browser evidence required

Healthy login and real remote outage, before/after the screenshot defect, at 375/768/1280 px,
keyboard-only traversal with visible focus, both colour schemes; dashboard and reports per role
against real API data. See the verification record for what was actually executed.
