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

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and adjust `VITE_API_BASE_URL` if the gateway is not on
`http://localhost:8000`.

## Running the tests

```bash
npm test
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
3. Open `http://localhost:5173/login`, sign in with a development token, click **Products**: the
   portal's screen renders inside the host layout and shows `Signed in as <sub>`.
4. In the Network tab, `:5173/assets/remoteEntry.js` and `:5175/assets/remoteEntry.js` both load
   (200, `Access-Control-Allow-Origin` echoing the other origin) and only one `react` chunk is
   fetched, from `:5173`.
5. A request made through `shell/apiClient` reaches the gateway with `Authorization`,
   `X-Correlation-Id` and `Content-Type`. `sessionStorage` holds only the host's
   `synkro_dev_token`; `localStorage` is empty.
6. Stop the portal and reload `/products`: the "not available right now" notice shows and the menu
   keeps working.
