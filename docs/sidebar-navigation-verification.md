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

## Pending / limits

- Portals were not rendered inside the new shell in a browser (their remotes need the integrated deployment).
- SALESPERSON and INVENTORY menus are covered by tests, not looked at in the browser.
- Sign-out was not exercised against the real Auth API.
- Name, email and the open-alerts counter from the mockup need Auth/API decisions (see the design).
