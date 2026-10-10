# synkro-front

> Front-end shell: packages the domain UIs

Part of the **SynkroTech SAS Sales Management System** — organization `code-corhuila`.
Governance and documentation live in [`synkro-docs`](https://github.com/code-corhuila/synkro-docs).

## Branching

Three permanent branches. **None of them accepts a direct commit** — you enter through a child
branch and leave through a Pull Request.

```
develop  <--PR--  feat/... fix/... chore/...
qa       <--PR--  qa/...
main     <--PR--  release/...  hotfix/...
```

Promotion happens **by re-application** (`git cherry-pick -x`), never by merging one permanent
branch into another: `merge develop -> qa` and `merge qa -> main` do not exist in this model.

`main` requires **1 approval from `ariel5253`**. On `develop` and `qa` the team sets its own review
rule.

Full policy: `00-governance/branching-policy.md` in `synkro-docs`.

## Running locally

Node 22 (`.nvmrc`; `nvm use`).

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and adjust `VITE_API_BASE_URL` if the gateway is not on
`http://localhost:8000`.

## Running the tests

```bash
npm test            # the tests
npm run coverage    # the tests with coverage; fails below the 70% statements floor
npm run lint
```

## Modules exposed to remotes

The host's federation entry is `http://localhost:5173/assets/remoteEntry.js` (`vite preview`
pins port 5173). It exposes exactly two modules, which remotes import as `shell/apiClient` and
`shell/session`:

| Module | Source | Contract |
|---|---|---|
| `./apiClient` | `src/shell/apiClient.ts` | `apiClient.request<T>(path, options)` — a facade over the single client in `src/core/http/api.ts` (gateway address, `Authorization`, `X-Correlation-Id`, timeout, 401 closes the session). Options are listed below |
| `./session` | `src/shell/session.ts` | `session.user()` → `{ sub, role }` or `null`. The token is never reachable from it |

`@originjs/vite-plugin-federation` rewrites the `__v__css__…` placeholders in the entry only when
they are wrapped in `'` or `"`, and Vite 8's minifier writes template literals, so the entry shipped
a bare string and every exposed module threw `e.forEach is not a function`. `vite.config.ts` fixes
the host's own entry (`src/federation.cssPlaceholder.ts`). A remote built with the same toolchain
needs the same treatment.

### One React in the page

The host and every React portal share a single React. The host registers `react` and
`react-dom` in the federation shared scope under their **installed version**
(`federationConfig.shared` in `src/federation.config.ts`, read from `node_modules`). Left to
itself the plugin registers them under the key `undefined`: a portal asking for `^19.2.x` then finds
no match, falls back to its own bundled React, and any hook fails inside the host's React DOM with
`Cannot read properties of null (reading 'useState')`.

**Rule for portals:** declare a React range the host's React satisfies (`^19.2.x` today; see
`package.json`). There is exactly one React in the page, the host's.

To check it in the browser, on a build served with `preview`:

- In the console, `Object.keys(globalThis.__federation_shared__.default.react)` and the same for
  `'react-dom'` list the real version (for example `['19.3.0']`), never `'undefined'`.
- The Network tab shows a single React chunk, served by `:5173`, and none from the portal's origin.

`npm test` builds the host and checks the registered versions against the installed ones and
against the range a portal declares, with the plugin's own range check. It does not mount a portal
that uses hooks: that needs a browser, which this repository does not carry (Playwright is not a
dependency), so it stays in the manual check below.

### Request options of `shell/apiClient`

```ts
apiClient.request<T>(path, {
  method?: string,                 // default 'GET'
  body?: unknown,                  // sent as JSON; only undefined means no body
  headers?: Record<string, string>,
  query?: Record<string, string | number | boolean | null | undefined>,
  idempotencyKey?: string,         // sent as the Idempotency-Key header
  signal?: AbortSignal,            // the caller's cancellation
})
```

- **`query`** is appended to the path as `?a=1&b=x`, keys in insertion order, keys and values
  URL-encoded. `undefined` and `null` are skipped, and booleans become `true` or `false`. A path
  that already has a `?` gets `&`. JavaScript orders integer-like keys (`'2'`) before the others
  before the client sees the object, so insertion order holds only for the other keys.
- **`idempotencyKey`** is sent as `Idempotency-Key`. The client never generates a key: the caller
  owns it and reuses the same value on retry. Without a key, no header is sent.
- **`signal`**: when the caller aborts, the promise rejects with an `ApiClientError` whose `status`
  is `0` and whose `body.error` is `'CANCELLED'` (message `'Request cancelled'`). A caller abort
  never calls `onUnauthorized` and never touches the session. A signal that is already aborted
  rejects without sending anything. The client's own 10-second timeout still rejects with
  `'TIMEOUT'`, so the two errors can be told apart.
- **`headers`** can set or replace any header except `Authorization` and `X-Correlation-Id`,
  which the client owns. Header names are compared case-insensitively, so `content-type` replaces
  `Content-Type`. An `idempotencyKey` takes precedence over an `Idempotency-Key` in `headers`.

Errors raised with `status` `0`: `TIMEOUT`, `CANCELLED` and `NETWORK_ERROR`. Failed responses keep
the common error envelope.

### Checking it end to end

Remotes only work from builds served with `preview`, not from the dev server. Playwright is not a
dependency of this repo, so the check is manual:

1. Build and serve the portal (`synkro-products-portal`) on `:5175`, with a build whose
   `remoteEntry.js` has no `__v__css__` left (see above).
2. Build and serve the host on `:5173`, with the development sign-in on and the gateway running:
   `VITE_DEV_SIGN_IN=true VITE_API_BASE_URL=http://localhost:8000 npm run build && npm run preview`.
3. Open `http://localhost:5173/login`, sign in with a development token as INVENTORY, click
   **Productos**: the portal's screen renders inside the host layout, with no `reading 'useState'`
   error.
4. In the Network tab, `:5173/assets/remoteEntry.js` and `:5175/assets/remoteEntry.js` both load
   (200, `Access-Control-Allow-Origin` echoing the other origin) and only one `react` chunk is
   fetched, from `:5173`.
5. A request made through `shell/apiClient` reaches the gateway with `Authorization`,
   `X-Correlation-Id` and `Content-Type`. `sessionStorage` holds only the host's
   `synkro_dev_token`; `localStorage` is empty.
6. Stop the portal and reload `/products`: the notice "Este módulo no está disponible en este
   momento." shows and the menu keeps working.
7. As INVENTORY open `/sales` and `/stock`: each lands on `/dashboard`, and the Network tab shows no
   request for the sales or stock code. As SALESPERSON, `/stock` opens and `/products` redirects.
8. Open `/does-not-exist`: the 404 screen shows inside the shell. Signed out, it goes to `/login`.

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

## The development sign-in

A pasted token becomes a session. It exists only for Local/Development: it is registered only when
`VITE_DEV_SIGN_IN` is `"true"`, and `synkro-auth-portal` replaces it. **Builds for `qa` and `main` must
have it off.**

With it off, the sign-in code, its strings and the `synkro_dev_token` key (under which a session
survives a reload) are not in the bundle, and the session lives in memory.
`npm run check:production-build` fails if any of them is: run it after `npm run build`. CI runs it on
the build job, and the Dockerfile on the image build. The sign-in's CSS stays in the style bundle.

## Deployment

`deploy/` holds the image of this repository's host alone; the composition of the whole system lives
in `synkro-infra`.

```bash
docker compose --env-file .env -f deploy/compose.yml up --build   # http://localhost:5173
```

- **`deploy/Dockerfile`**: Node 22, `npm ci`, build, then nginx. Build arguments:
  `VITE_API_BASE_URL` and `VITE_DEV_SIGN_IN`, which **defaults to `false`**. With it off, the image
  build runs the production-build check. `.env` is never committed and never enters the build context.
- **`deploy/nginx.conf`**: falls back to `index.html` for deep links; `assets/remoteEntry.js` is
  `no-store`; hashed files under `assets/` are cached for a year as `immutable`; `index.html` is
  `no-cache`; text responses are gzipped. `assets/` also answers `Access-Control-Allow-Origin: *`:
  portals are served from other origins and import the host's entry and chunks, and these are public
  static files. Narrow it to the portals' origins if the team wants that.

## Continuous integration

`.github/workflows/ci.yml` runs on pushes and pull requests to `develop`, `qa` and `main`, on Node 22
with `npm ci`: the common-files check, `lint` (`npm run lint`), `build` (`npm run build`, then
`npm run check:production-build`) and `test` (`npm run coverage`, which enforces the 70% statements
floor from `testing-strategy.md`).
