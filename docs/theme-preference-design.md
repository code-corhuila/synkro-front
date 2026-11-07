# Theme preference — Light, Dark or System (HU-FE-11)

Status: design written **before** tests and code. Results are recorded in
[`theme-preference-verification.md`](theme-preference-verification.md).

## Before this change

`src/theme/tokens.css` defined the light palette on `:root` and the dark one inside
`@media (prefers-color-scheme: dark)`. `src/index.css` repeated the media query for the focus ring, and
the Sales and Products portals had their own `prefers-color-scheme` rules (sunken fields, trend chart,
focus rings). Result: the operating system was the only switch, and nothing could override it.

## Decision

| Topic | Decision |
|---|---|
| Source of truth | `<html data-theme="light|dark">` (the **resolved** theme) and `data-theme-preference` (the choice). The dark token block is `:root[data-theme='dark']`; the light block stays on `:root`. Palettes stay in `tokens.css`, owned by the Host. |
| Why an attribute | A media query cannot be overridden by a person's choice. One attribute lets the Host's tokens **and** the portals' dark-only rules follow the same decision. `prefers-color-scheme` is read in exactly one place (see System). |
| Options | Claro (`light`), Oscuro (`dark`), Sistema (`system`). |
| Initial preference | `system` when there is no stored value or it is not one of the three. |
| Persistence | `localStorage["synkro.theme-preference"]`, only the three literal values. Not in `sessionStorage`: auth state lives there and is cleared on logout; the theme must survive logout/login and a closed tab. Nothing else is written or read; session, tokens and refresh handling are untouched. |
| System | The Host resolves `prefers-color-scheme: dark` with `matchMedia` and listens to its `change` event **only while the preference is System**; the listener is removed when another option is chosen and on cleanup, and never registered twice. |
| No flash | `public/theme-init.js`, a classic (non-module, non-deferred) script in `<head>` before the app bundle, reads the key and sets `data-theme` before first paint. It mirrors `themePreference.ts`; a test runs it. It never throws. |
| Blocked / invalid storage | Reads and writes are wrapped. A throwing `localStorage` or an invalid value falls back to System; a failed write keeps the choice **for the session** (in-memory state + attribute). The app stays fully operable. |
| Selector placement | One shared component, `src/shared/ui/ThemeSelector.tsx`, used in the login screen (above the Auth form, also when its remote is down) and in the Shell header. |
| Selector semantics | `role="radiogroup"` named "Tema" with three native radios (Claro, Oscuro, Sistema): selected state (`checked`), Tab into the group and arrow keys to change, no custom key handling. Focus uses the shared `:focus-visible` ring. |
| Focus ring | Dark ring colour moves from a media query to `:root[data-theme='dark'] :focus-visible`; same tokens, same 3:1 test. |
| `color-scheme` | `light` / `dark` per `data-theme`, so native controls and scrollbars follow the choice. |
| Portals | Dark-only rules in Sales and Products change from `@media (prefers-color-scheme: dark)` to `:root[data-theme='dark'] <selector>`. They still define no colour or token. Auth (React) and Customers (Angular) have no theme-specific rules: they only consume tokens, so no change. |

## Out of scope

No new tokens or palette changes, no server-side preference, no change to authentication, routes,
the dashboard layout or its titles.

## Tests (written first)

- `themePreference.test.ts`: default, restore, invalid values, blocked storage, failing write, device
  changes, explicit choice against the device, subscribers, listener cleanup.
- `ThemeSelector.test.tsx`: accessible name, selected state, mouse and keyboard, shared state.
- `themeInit.test.ts`: the head script and its position in `index.html`.
- `themeSession.test.tsx`: selector on login and in the Shell; the choice survives sign-in/out and is the
  only key written.
- Existing token/focus/contrast tests now read the dark block from `:root[data-theme='dark']`.
- Portals: their style contracts forbid `prefers-color-scheme` and require the host selector.
