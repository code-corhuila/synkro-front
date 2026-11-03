// The Sales portal's dashboard summary, exposed as `salesPortal/DashboardSummary`.
// Loaded only for a role that may open /sales, inside its own RemoteBoundary.
export const loadSalesSummary = () => import('salesPortal/DashboardSummary');
