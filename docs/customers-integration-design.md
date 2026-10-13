# Customers integration — HU-CLI-04

Owner Jordan Ramirez Gallego (`JordanRG420`); issue code-corhuila/synkro-docs#249.
Design sources: synkro-docs `61056c93e6e0783a9199bf56778e9494739bc458`, ADR-011,
frontend stack, Customers OpenAPI/shared schemas, navigation/wireframes/tokens,
testing, DoR/DoD and Git conventions. Portal docs/design.md records the detailed
pre-implementation review. Starting Host develop is
`a1fecc671ada1384dcaeeec5f59dff3c13a35e26`; remote correction
`24d5368` on codex/sales-upstream-timeout remains a separate unmerged change.

The exact v1 type is mirrored in src/shell/shell-contract.ts. customersContract
adapts the existing protected client; no authentication/session lifecycle change.
React ref injects shellContract as a property after the loader's whenDefined wait.
On React location changes it reassigns the contract to synchronize Angular's
owned inner route. Browser history remains Host-owned. Asynchronous bootstrap
failures use the standard DOM portal-error event and reach RemoteBoundary.
The import and registration share a deadline; explicit retry uses a fresh entry
query after failures, avoiding the browser's cached failed ESM URL.

Same-origin deployment input VITE_CUSTOMERS_PORTAL_ENTRY defaults to
/remotes/customers/remoteEntry.js. Lazy DNS proxy strips /remotes/customers/ and
forwards to synkro-customers-portal:80, preserving the portal cache policy.
The Host's index fallback handles /customers/* refresh. No infrastructure pins
or accepted ADRs are changed. Assets must be retained across releases for open
tabs; infrastructure owns the eventual release archive/retention mechanism.

New focused tests cover contract property, adapter options/identity, recovery,
bounded loading and deployment. Existing Auth/Products/Sales route/authentication
tests and coverage thresholds remain. Supplemental adapter assertions were added
after property implementation; do not claim a historical red for them.
