# HU-FE-09 — proposed updates for `synkro-docs`

`synkro-docs` is a separate repository and was not part of this delivery's PRs. These are the exact
changes its documents need once the Host and Sales PRs are merged; they describe what the code in
these PRs does, nothing beyond it.

## `12-ux-ui/navigation-map.md`

- Route table: `/dashboard` → owner Host, component `Dashboard`, "role link cards + Sales summary
  module (`salesPortal/DashboardSummary`) for ADMIN/SALESPERSON". Add `/sales/reports`,
  `/sales/reports/daily`, `/sales/reports/monthly`, `/sales/reports/top-products` owned by the Sales
  portal under the Host `/sales/*` prefix, access ADMIN and SALESPERSON (INVENTORY denied by the Host
  guard before mounting).
- "Dashboard ownership": replace the placeholder text. Cards come from the access matrix
  (`canAccess`); Users and Service tokens are not offered. The summary is the Sales portal's
  (newest daily group, newest monthly group, top three products); no profit, user or stock totals.
- "Reports — no screen" row: the three endpoints now have screens in the Sales portal.
- Login failure: the Host renders one recovery panel (retry + "Ir al inicio") only when the Auth
  remote cannot be loaded; a healthy login has no extra controls. "Ir al inicio" is a client-side
  route to `/dashboard` and follows the guards.

## `12-ux-ui/wireframes.md`

- "Screen: Dashboard (Summary)": delivered content as above; keep the historical sketch labelled
  as such.
- New screens: Reporte diario / mensual / productos más vendidos (filters Desde/Hasta as inclusive UTC
  days, table, pagination naming the group — días, meses, productos —, four states).
- "Production Login": add the remote-outage panel.

## Traceability (FR/NFR → HU → test → code)

| Requirement | Test | Code |
|---|---|---|
| FR-008 daily/monthly reports | Sales `reportsApi.test`, `useReport.test`, `ReportsPage.test`, `reportRoutes.test` | `sales/pages/ReportsPage.tsx`, `sales/api/reportsApi.ts` |
| FR-009 top products | Sales `ReportsPage.test` (top-products), `DashboardSummary.test` | `ReportTable.tsx`, `useProductNames` |
| FR-010 role scope | Sales `ReportsPage.test` (roles), `DashboardSummary.test`; Host `dashboardLinks.test`, `Dashboard.test` | `canReadReports`, `dashboardLinksFor` |
| NFR-004 / NFR-006 accessibility, states | Host `AuthLogin.recovery.test`, `accessRegion.test`, `buttonStyles.test`, `focusRing.test`; Sales state tests | `RemoteBoundary`, `ButtonLink`, report states |
| FE09-04/05/06 login | Host `AuthLogin.recovery.test`, `accessRegion.test`, `NotFound.test` | `remotes/AuthLogin.tsx`, `core/errors/RemoteBoundary.tsx` |
