# HU-FE-08 — operación y PRs preparados

## Configuración para infraestructura

Auth Portal y Host se construyen separadamente con Node 22 y `npm ci`.
Auth no publica puerto, usa HTTP interno en `platform` con alias
`synkro-auth-portal:80`. No recibe secretos ni configuración del Gateway.

| Paquete | Variable de build | Valor para entrega por Host |
|---|---|---|
| Auth | `VITE_BASE_PATH` | `/remotes/auth/` |
| Auth | `VITE_SHELL_ENTRY_URL` | `https://HOST/assets/remoteEntry.js` |
| Host | `VITE_AUTH_PORTAL_ENTRY` | `https://HOST/remotes/auth/assets/remoteEntry.js` |
| Host | `VITE_DEV_SIGN_IN` | `false` |
| Host | `VITE_API_BASE_URL` | vacío, API del mismo origen |

Sustituir HOST por el origen real aprobado, incluyendo esquema. Las variables
Vite se fijan al construir; cambiar variables del contenedor nginx no las cambia.
Nginx del Host resuelve `synkro-api-gateway:8000` para `/api/` y
`synkro-auth-portal:80` para `/remotes/auth/`, eliminando únicamente el segundo
prefijo. El Gateway debe estar en la misma red. El Host conserva fallback SPA
para `/login` profundo; remoteEntry tiene no-store y chunks/CSS tienen caché
immutable. Conservar assets de la versión anterior durante despliegues evita
romper pestañas abiertas. La recuperación de un remoto detenido usa reintento
explícito y una URL nueva del entry dentro del runtime OriginJS existente.

Si se decide API de otro origen, Gateway debe exponer `Retry-After` por CORS;
el Gateway inspeccionado no lo expone. La configuración entregada usa mismo
origen y no requiere modificar Gateway. No cambiar pins de infraestructura en
esta entrega. Configurar Products/Sales con sus bases actuales, sin alterar sus
contratos ni el ShellContract Angular.

Orden coordinado: preparar/publicar imagen interna Auth; integrar capacidad y
rutas del Host; desplegar ambos con orígenes concordantes; comprobar `/login`,
assets y login/refresh/logout real; después habilitar aceptación de integración.
Auth requiere el nuevo export del Host para operar. El Host sigue exportando
`shell/apiClient` y `shell/session` con las firmas previas.

## PRs hacia develop (preparados, no creados)

Responsable: Ángel (`AsolanoT`). Dependencia concurrente: HU-VEN-12,
synkro-docs#246. No usar el identificador HU-SALES-12 del texto histórico.

Auth — título: `feat(auth): deliver federated credential login portal`.
Descripción: entrega `/Login` accesible en español, consume exclusivamente
`shell/authentication`, evita doble envío, limpia contraseña y presenta rechazo,
indisponibilidad y espera por rate limit. Incluye paquete bloqueado, build
verificado, imagen interna y Compose sin puertos. Validación: 9 pruebas,
93,22 % statements, lint, TypeScript, guard, Docker y navegador contra Auth real.
Dependencia operativa: export authentication del Host antes de habilitar login.

Host — dividir revisión dependiente en dos PRs sin reescribir historia:

1. `feat(auth): own login and rotating session lifecycle` — commit de núcleo,
   transporte único, credenciales privadas, generación y capacidad sin tokens.
   Validación: reloj determinista, carreras, 401 sin replay, refresh perdido sin
   repetición, cancelación independiente y pruebas del contrato HTTP previo.
2. `feat(auth): compose public login and internal remote delivery` — commit
   de composición/deployment, depende del anterior y del artefacto Auth.
   Validación: suites completas, guards, Docker, assets reales, navegación,
   recarga, logout y caída/recuperación del remoto desde navegador.

La rama autorizada reúne commits revisables; cada PR dependiente debe comparar
solo su rango. Verificar el límite de 400 líneas de código sin tests antes de
crear PRs; lockfile y documentación se presentan como artefactos separados.
No se crearon PRs ni se integraron ramas permanentes.

## Cierre documental pendiente

Transferir el contexto, alternativas, criterio, coste y consecuencias de
[la decisión](authentication-design.md) a revisión/publicación documental.
La aprobación humana habilitó implementación proactiva; no existe una afirmación
de ADR aceptado ni un número nuevo. TD-010 y revisión documental siguen abiertos.
La revisión de código, integración aprobada y cierre de HU-INF-02 son independientes.
