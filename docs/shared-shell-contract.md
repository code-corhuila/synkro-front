# Shared shell contract

Detailed procedures and delivery notes moved from the repository README at
[source 0e59f5f](https://github.com/code-corhuila/synkro-front/blob/0e59f5f4d96959eac253c4769d964e22046a79e8/README.md).
Recorded execution results retain their original scope; moving them does not
constitute a new execution or certify a different revision.

Run commands from the repository root unless a step explicitly changes directory.

## Modules exposed to remotes

The host's federation entry is `http://localhost:5173/assets/remoteEntry.js` (`vite preview`
pins port 5173). It preserves two existing modules, which remotes import as `shell/apiClient` and
`shell/session`:

| Module | Source | Contract |
|---|---|---|
| `./apiClient` | `src/shell/apiClient.ts` | `apiClient.request<T>(path, options)` — a facade over the single client in `src/core/http/api.ts` (gateway address, `Authorization`, `X-Correlation-Id`, timeout, 401 closes the session). Options are listed below |
| `./session` | `src/shell/session.ts` | `session.user()` → `{ sub, role }` or `null`; `session.sessionId()` → opaque noncredential string or `null`; `session.subscribe(listener)` → idempotent unsubscribe. No tokens are exposed |

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
