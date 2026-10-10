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
  // How a role key is named to a person. A role with no entry shows its key.
  roles: {
    ADMIN: 'Administrador',
    SALESPERSON: 'Vendedor',
    INVENTORY: 'Inventario',
  } as Record<string, string>,
  dashboard: {
    title: 'Panel',
    signedInAs: (user: string) => `Sesión iniciada como ${user}.`,
  },
  notFound: {
    title: 'Página no encontrada',
    message: 'La ruta que buscas no existe o fue movida.',
    backToHome: 'Volver al panel',
  },
  signIn: {
    title: 'Iniciar sesión',
    unavailable: 'El inicio de sesión no está disponible en este entorno.',
    devOnly: 'Esta pantalla solo existe en compilaciones de desarrollo.',
    tokenLabel: 'Token de desarrollo',
    submit: 'Ingresar',
    invalidToken: 'Ese token de desarrollo no es válido.',
  },
  portal: {
    loading: 'Cargando módulo…',
    unavailable: 'Este módulo no está disponible en este momento.',
  },
} as const;
