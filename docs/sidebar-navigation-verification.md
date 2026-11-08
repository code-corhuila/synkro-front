# Sidebar navigation — verification

Design: [`sidebar-navigation-design.md`](sidebar-navigation-design.md). Node v25.7.0 (the repo declares `>=22`).

## Automated (jsdom, fixtures)

`npx vitest run`: 58 files, 444 passed, 3 todo. `oxlint`, `tsc -b`, `npm run build` and
`npm run check:production-build` are clean. New: `Sidebar.test.tsx` (sections, `aria-current`, logo, collapse,
account menu, expiry, Esc/outside click, logout, drawer, `inert`, top bar). Updated: `Shell.test.tsx`
(grouped order, identity), the focus-ring tests (sidebar ring at 3:1) and the host style test's screen classes.

## Desktop and mobile browser (host dev server on port 5391, stopped afterwards; fixture session, no real services)

- [light, account menu](evidence/sidebar-navigation/sidebar-light-account-menu.jpg)
- [dark, account menu](evidence/sidebar-navigation/sidebar-dark-account-menu.jpg)
- [collapsed, light](evidence/sidebar-navigation/sidebar-collapsed-light.jpg)
- [mobile drawer, dark](evidence/sidebar-navigation/drawer-mobile-dark.jpg)

Observed: ADMIN menu in four sections; collapse and expand; account menu opens with focus on "Cerrar sesión";
drawer is `inert` while closed and opens from the top bar; Tab shows the sidebar focus ring (`rgb(240, 216, 204)`).
A bug found here and fixed: an open drawer left its dark backdrop over the page after widening the window; the
backdrop is now shown only below 768 px.

## Integrated completion — 2026-11-07

- Candidate `bb1f104` passed 445 tests with 3 preexisting TODO cases under Node 22.23.3.
  Lint, TypeScript/Vite and the production-build check passed.
- Private root `2f3dcf72d1142e3e872ae5d76c7992eb077ed42d` passed 32 real-browser checkpoints.
  Auth, Customers, Products, Sales and the dashboard were loaded inside the new Shell in both
  themes. All three human-role menus were checked against their real signed-in identities.
- Collapse/expand preserved the route and accessible labels. Arrow keys changed the theme.
  The narrow drawer returned focus on Escape and its backdrop stayed hidden after widening.
- Blocked localStorage allowed real login, theme changes and internal navigation. The real
  logout request returned the user to login while retaining the theme preference.
- The local PNG loaded and used object-fit contain. Desktop portal routes had no document overflow.
- Export and cleanup passed. The supplementary suite returned 0 and the runner returned the
  expected review-ready code 2. Release review and private CI remain separate.

## Scope limits

- Name, email and the open-alerts counter from the mockup need Auth/API decisions (see the design).
