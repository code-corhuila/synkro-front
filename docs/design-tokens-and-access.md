# Design tokens and access

Detailed procedures and delivery notes moved from the repository README at
[source 0e59f5f](https://github.com/code-corhuila/synkro-front/blob/0e59f5f4d96959eac253c4769d964e22046a79e8/README.md).
Recorded execution results retain their original scope; moving them does not
constitute a new execution or certify a different revision.

Run commands from the repository root unless a step explicitly changes directory.

## Design tokens

The host publishes the tokens of `12-ux-ui/design-system.md` (synkro-docs) as CSS custom properties
on `:root`, in `src/theme/tokens.css`. It is the only place they are defined. Portals read them and
never redefine them.

- Read a token with `var(--name)`, for example `color: var(--color-text-primary)`. This works in
  plain CSS, CSS Modules and Tailwind arbitrary values (`bg-[var(--color-primary-500)]`).
- The names are the contract. Do not rename a token or add one here; a new token starts as a change
  to the design system.
- Never redefine a token in a portal (`:root { --color-primary-500: … }`, or a copied palette). It
  forks the design in that portal alone.
- The dark theme is selected by the operating system (`prefers-color-scheme`). A portal does nothing
  for it: the same names resolve to the dark values.
- The host's own headings carry the type scale through `.heading` classes, not bare `h1`/`h2`/`p`/`code`
  rules, so a portal's own headings and text are not restyled. A portal inherits the canvas colour and
  font from `body`, and the focus ring: one global `:focus-visible` rule (`--color-primary-500`, and
  `--color-primary-300` in dark, where the red is a button fill and too dark to see). A portal can
  override it with a more specific rule.
- The host loads the fonts (`src/theme/fonts.ts`). A portal uses `var(--font-family-heading)`,
  `var(--font-family-sans)` or `var(--font-family-mono)` and imports no font.

Eight tokens have no dark value, so the dark theme inherits the light one. Use them only where the
light value is also right on a dark surface:
`--color-primary-50`, `--color-primary-100`, `--color-primary-900`, `--color-neutral-50`,
`--color-neutral-900`, `--color-success-500`, `--color-warning-500`, `--color-error-500`.

The design system also names `--color-bg-card-alt` and `--color-border` for the dark theme only.
They are not published yet, because the doc gives no light value for them.

## Who can open what

`src/layout/navigation.ts` holds the access matrix from `navigation-map.md`. It drives the menu and the
route guard, and nothing else lists who may open what. `canAccess(role, pathname)` matches by path
segment, ignoring case and a trailing slash (`/stock` does not open `/stock-alerts`;
`/products/12/edit` follows `/products`), and **fails closed**: a path or a role the matrix does not
list is denied, and only `/dashboard` is open to every signed-in user. A portal that owns a route
prefix needs a matrix entry for it, or nobody can open it (a test checks the registry against the
matrix).

`RequireRole` sits above each portal in `src/app/App.tsx`. A denied route redirects (replace) to the
role's default module, `/dashboard`, and the portal is never mounted, so its code is never requested.
There is no 403 screen, as the design system says. A route that does not exist shows the 404 screen
inside the shell; signed out, any unknown route goes to `/login`, so the host does not reveal which
routes exist.

## Interface language

Everything a person sees is in Spanish and lives in `src/layout/copy.ts`. The development sign-in's
own strings are in `src/core/auth/devSignInCopy.ts` so they leave the bundle with it. Routes, role keys
(`ADMIN`, `SALESPERSON`, `INVENTORY`) and code stay in English, `index.html` declares `lang="es"`, and
there is no i18n library.
