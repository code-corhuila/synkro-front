# Deployment

Detailed procedures and delivery notes moved from the repository README at
[source 0e59f5f](https://github.com/code-corhuila/synkro-front/blob/0e59f5f4d96959eac253c4769d964e22046a79e8/README.md).
Recorded execution results retain their original scope; moving them does not
constitute a new execution or certify a different revision.

Run commands from the repository root unless a step explicitly changes directory.

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

## Root composition delivery

The deployed Products remote is served through the host at
`http://localhost:5173/remotes/products/assets/remoteEntry.js`. Its container
publishes no host port and joins `platform`. Its Vite base is `/remotes/products/`;
the host proxies that prefix to the internal portal. Local Vite preview remains
a separate development command. The host build accepts `VITE_PRODUCTS_PORTAL_ENTRY`
for this route. Three other portal packages remain external dependencies.
Run `python3 tests/test_root_deploy.py` for deployment configuration checks.

## Root Sales integration

Compose builds the Sales entry from `VITE_SALES_PORTAL_ENTRY`, defaulting to `http://localhost:5173/remotes/sales/assets/remoteEntry.js`; Products retains its own entry. Both inputs reach Vite at build time. Nginx resolves the internal `synkro-sales-portal:80` on platform and proxies the complete `/remotes/sales/` subtree, removing only that prefix. Configure the Sales owning build with this same base. Keep `VITE_DEV_SIGN_IN=false` for deployed images.

The remote boundary remounts when portal identity changes. An unavailable Sales download leaves shell/navigation usable; navigating to Products loads it without reloading, and returning to Sales attempts a fresh load. This does not add automatic retry while staying on the failed route. The real navigation regression preserves the same shell element through failure, Products navigation and successful Sales return.
