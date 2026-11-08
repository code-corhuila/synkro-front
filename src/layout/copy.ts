// Every string the host shows to a person, in one place. The interface is in
// Spanish; routes, role keys and code identifiers stay in English.
export const copy = {
  navigation: {
    label: 'Principal',
    dashboard: 'Panel',
    customers: 'Clientes',
    products: 'Productos',
    stock: 'Existencias',
    stockAlerts: 'Alertas de stock',
    sales: 'Ventas',
    users: 'Usuarios',
    serviceTokens: 'Tokens de servicio',
  },
  sidebar: {
    homeLink: 'Ir al panel',
    logoAlt: 'Synkro Tech',
    collapse: 'Contraer menú',
    expand: 'Expandir menú',
    open: 'Abrir menú',
    accountMenu: (user: string) => `Menú de cuenta de ${user}`,
    accountLabel: 'Cuenta',
    sessionExpires: 'Tu sesión vence',
    logout: 'Cerrar sesión',
    breadcrumbRoot: 'Inicio',
  },
  // Menu sections, in display order. Each lists the paths it holds.
  sections: [
    { label: 'General', paths: ['/dashboard'] },
    { label: 'Comercial', paths: ['/customers', '/sales', '/stock'] },
    { label: 'Inventario', paths: ['/products', '/stock-alerts'] },
    { label: 'Administración', paths: ['/users', '/service-tokens'] },
  ] as ReadonlyArray<{ label: string; paths: readonly string[] }>,
  // How a role key is named to a person. A role with no entry shows its key.
  roles: {
    ADMIN: 'Administrador',
    SALESPERSON: 'Vendedor',
    INVENTORY: 'Inventario',
  } as Record<string, string>,
  dashboard: {
    title: 'Panel de control',
    signedInAs: (user: string) => `Sesión iniciada como ${user}.`,
    shortcutsLabel: 'Accesos del panel',
    shortcutsTitle: 'Accesos',
    summaryTitle: 'Ventas',
    summaryUnavailable: 'El resumen de ventas no está disponible en este momento.',
  },
  // Short line under each destination on the dashboard. Keys are the paths.
  shortcuts: {
    '/customers': { label: 'Clientes', description: 'Registra y consulta a tus clientes.' },
    '/products': { label: 'Productos', description: 'Gestiona el catálogo, las categorías y el stock.' },
    '/stock': { label: 'Existencias', description: 'Consulta las existencias disponibles para vender.' },
    '/stock-alerts': { label: 'Alertas de stock', description: 'Revisa los productos con stock bajo.' },
    '/sales': { label: 'Ventas', description: 'Registra ventas y consulta su historial.' },
    '/sales/reports/daily': { label: 'Reporte diario', description: 'Totales de ventas por día (UTC).' },
    '/sales/reports/monthly': { label: 'Reporte mensual', description: 'Totales de ventas por mes (UTC).' },
    '/sales/reports/top-products': { label: 'Productos más vendidos', description: 'Los productos con más unidades vendidas.' },
  } as Record<string, { label: string; description: string }>,
  notFound: {
    title: 'Página no encontrada',
    message: 'La ruta que buscas no existe o fue movida.',
    backToHome: 'Volver al panel',
  },
  signIn: {
    title: 'Iniciar sesión',
    unavailable: 'El inicio de sesión no está disponible en este entorno.',
  },
  portal: {
    loading: 'Cargando módulo…',
    unavailable: 'Este módulo no está disponible en este momento.',
    retry: 'Reintentar módulo',
  },
  // The recovery panel that replaces the login form when its remote fails to load.
  access: {
    unavailable: 'No pudimos cargar el acceso.',
    retry: 'Reintentar acceso',
    home: 'Ir al inicio',
    indeterminate: 'No pudimos recuperar la sesión. Inicia sesión de nuevo.',
  },
} as const;
