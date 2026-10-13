# HU-CLI-04 — evidencia Host y preparación de revisión

Responsable Jordan Ramirez Gallego (`JordanRG420`), synkro-docs#249.
Rama `feat/customers-portal-integration`, destino propuesto `develop`.

Código ejecutado e imagen: `80211842ad444c7cc0100503506ab8f835ec0d7b`.
Develop incorporado: `0e4b8ac7768a1416bdf9513f78a21054e4c22e69`; merge normal
`a56e5ba9e849238c29e6a7e625fac029069d6163`, sin conflictos, rebase ni force-push.
La configuración Sales conserva resolución/conexión 2s y 504→502/no-store.
Customers agrega entrega de éxito con cache del portal y fallos 502/504→502/no-store.

Instalación desde lockfile, lint, 339 pruebas PASS/3 todo preexistentes, coverage
94,70 % statements, build con tipos y chequeo production-build PASS. Se conservan
los umbrales existentes y los controles Auth/Products/Sales. Root deploy: 2 PASS.
[CI del SHA de código: success](https://github.com/code-corhuila/synkro-front/actions/runs/38339772767).

Docker real construido y servido en aceptación de navegador; ID de imagen
`sha256:f335d86c4bf69091971d9e216a6338fded51c079e3c3546115a17d9ad256ed1f`.
Portal probado: `216e3793296e6315b5abb45cb402621ba1498563`.
Auth, Gateway y Customers API reales, PostgreSQL tmpfs propio, credenciales
efímeras, Chrome 154.0.8037.98. CRUD lógico, registro idempotente después de
respuesta perdida, permisos, deep links, refresh y Back/forward PASS.
Sales ausente con DNS caliente: 502 sin cache en 2,009s; Customers: 2,003s.
Host y assets Products permanecen disponibles; ambos recuperan assets.
Customers muestra aviso localizado y recupera con retry sin recargar el Host.
No se certifican las APIs ni el negocio Sales/Products. Recursos propios limpiados;
contenedores preexistentes conservados. Ningún error pageerror en el navegador.

La matriz CLI-UI-01…19, JSON con SHA/imagen de cada participante, capturas, fuentes,
limitaciones TDD y contrato operativo completo se entregan en
[synkro-customers-portal](https://github.com/code-corhuila/synkro-customers-portal/tree/feat/customers-management-portal/docs).
La evidencia es distinta de las suites con dobles del contrato.

PR preparado, no creado: **feat(customers): integrate protected portal and bounded asset delivery**.
Descripción: carga el custom element Customers bajo demanda e inyecta ShellContract
v1 por propiedad; mantiene sesión/transporte/navegación Host. Limita fallos
asincrónicos, ofrece recuperación explícita y entrega `/remotes/customers/` mediante
DNS lazy sin alterar los límites Sales. Validación: suites completas, build,
imagen y navegador real con caída/recuperación. Referir estos documentos y matriz.

Orden: revisar ambos repositorios; integrar el merge aprobado del Portal y publicar
su imagen/archivo de assets antes del merge aprobado del Host. Variable real
`VITE_CUSTOMERS_PORTAL_ENTRY=/remotes/customers/remoteEntry.js`, DNS
`synkro-customers-portal`, HTTP interno 80, red externa platform, sin puerto público.
HU-INF-02 seleccionará merges/pins. No se modificó infraestructura ni synkro-docs,
no se creó/fusionó PR, no se cerró issue ni se certificó toda la plataforma.
