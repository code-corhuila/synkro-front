# Sidebar navigation (mockup "Barra lateral", option 1)

Status: tests were written before the code. Results are in
[`sidebar-navigation-verification.md`](sidebar-navigation-verification.md).

This branch is stacked on `feat/theme-preference` (HU-FE-11): the top bar holds the shared theme selector.

## What changes

`Shell` stops being a header with a flat nav and becomes `Sidebar` + `Topbar` + the portal `Outlet`.
The access matrix stays in `navigation.ts`; routes, guards, session and logout are untouched.

| Piece | Decision |
|---|---|
| Menu | Same items and role filtering as before (`navItemsFor`), laid out by section in `copy.sections`: General, Comercial, Inventario, Administración. A section with nothing for the role is dropped; an item no section lists stays visible. |
| Order | Now grouped: ADMIN sees Panel, Clientes, Ventas, Productos, Alertas de stock, Usuarios, Tokens de servicio. |
| Current screen | `aria-current="page"` (NavLink), drawn as a filled pill. |
| Collapse | Desktop only; icons only. Labels stay in the accessibility tree (visually hidden), the button toggles "Contraer menú" / "Expandir menú" with `aria-expanded`. Not persisted. |
| Narrow screens (<768 px) | The sidebar is a drawer opened from the top bar; closes with Esc, the backdrop or any navigation. While closed it is `inert`, so it is out of the tab order and the accessibility tree. |
| Account | Card at the bottom opens a menu (`role="menu"`): avatar, name, role badge, "Tu sesión vence" (only when `expiresAt` is known) and "Cerrar sesión" (`authentication.logout()`). Esc or an outside click closes it and Esc returns focus to the trigger. |
| Identity | The session has no name or email, only `sub` and the role. The mockup's name and email are **not** invented: the account shows `sub`. Decision pending with Auth. |
| Alert counter | Not shown: it needs `GET /api/v1/stock-alerts?status=OPEN&limit=1`, an API call the Host does not make today. Pending. |
| Top bar | A non-heading breadcrumb ("Inicio / Sección"), the shared theme selector and the date in Spanish. Every screen keeps its single `h1`, so the dashboard title is not repeated. |
| Dashboard title | The `h1` reads "Panel de control"; the nav item keeps the short label "Panel" (`copy.navigation.dashboard`), since the sidebar row and the page heading answer different questions. |
| Logo | `public/synkro-logo.png` (the supplied Synkro Tech logo) on a light card in both themes. |
| Style | Tokens only (no new tokens, no literals). The sidebar is `--color-neutral-900` in both themes. Its focus ring is `--color-primary-100`, tested at 3:1 on that navy. |
| Layout | `#root` no longer caps the width when the shell is shown; the page area caps itself at 1126 px. The login keeps its previous layout. |

## Out of scope

Dashboard content, routes, guards and role rules retain their existing owners. The approved
dashboard heading is restored to "Panel de control" in the Host copy. Portals consume the shared theme.
