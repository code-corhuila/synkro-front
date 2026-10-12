# HU-FE-08 — diseño y decisión de implementación

## Contrato acordado antes del remoto

El usuario aprobó explícitamente esta política el 12 de octubre de 2026 en la
solicitud de implementación. `shell/authentication` expone `login({email,
password}, {signal?, returnTo?})`, `logout()` y estado observable sin tokens.
Login devuelve `{user: {sub, role}, destination}` o un error normalizado
`{code, message, retryAt?}`. El Host valida el destino y ejecuta la navegación;
el remoto solo posee formulario y presentación. `/login` es pública y carga
`authPortal/Login`; `authPortal/App` conserva un punto de montaje separado.
No se implementan usuarios, registro ni recuperación de contraseña.

Un único transporte conserva query, correlación, idempotencia, cancelación,
timeout y errores. Las operaciones internas login/refresh/logout usan ese
transporte sin atravesar la barrera de renovación. No hay opción pública de
omitir autenticación. `shell/apiClient`, `shell/session` y ShellContract
conservan sus firmas y su identidad `{sub, role}`.

## Estados y coordinación

Estados: anónima, autenticando, recuperando, autenticada, renovando, e
indeterminada. Access en memoria; refresh exclusivamente en sessionStorage del
Host. Se valida TokenPair (`accessToken`, `refreshToken`, `tokenType`,
`expiresIn`) y claims reales RS256 (`sub`, `roles`, `permissions`, `iat`, `exp`,
`jti`). Decodificar sirve para presentación/programación, no verifica firmas.
No cambia la duración de Auth. Un par malformado o con <=60s restantes se
rechaza sin bucles de renovación.

Con >60s procede el trabajo protegido; con <=60s o sin access tras reload,
comparte una renovación. Timer, focus, visibility y petición comprueban la
misma barrera. Cancelar un consumidor no cancela la renovación compartida.
Reemplazo/logout incrementa generación, cancela timers y hace que resultados
antiguos sean cancelados antes de entregar datos o tocar identidad.

Login 401: «Correo o contraseña incorrectos», limpiar contraseña, sin reintento.
Red/5xx: disponibilidad y reintento explícito. 429: esperar Retry-After (segundos
o fecha HTTP). Refresh rechazado: terminar sesión; respuesta perdida/timeout,
red, malformada o fallo de servicio: eliminar credencial rotatoria, bloquear
trabajo y pedir login nuevo sin repetir. Protected 401 termina sesión sin
refresh/replay; 403 conserva sesión y entrega error de acceso. Logout envía el
refresh presentado con el access disponible y siempre elimina estado local;
no promete revocar JWT emitidos inmediatamente.

Destino: solo ruta absoluta local, normalizada y autorizada por la matriz
existente; rechazar esquemas, `//`, backslash, rutas codificadas ambiguas y
destinos ajenos al rol. Default aprobado: `/dashboard`. Recuperación pendiente
presenta espera, sin bucle login/guard.

## Handoff de decisión documental (no ADR aceptado)

Contexto: timers suspendidos, expiración y refresh de un solo uso. Alternativa
A: expiración exige login, sin renovación proactiva. Alternativa B aprobada por
el usuario: renovación del Host con margen de 60s, comprobaciones de frontera
y una operación compartida. Criterio dominante: un dueño de credenciales y
menos interrupciones sin repetir operaciones protegidas tras 401. Coste
aceptado: coordinación/pruebas adicionales, renovación temprana y login nuevo
si el resultado de rotación se pierde. Consecuencias: riesgo residual de XSS
en sessionStorage, sin coordinación entre pestañas, ni revocación inmediata
de JWT; backend sigue siendo autoridad. TD-010 requiere ratificación y
publicación documental independiente. No se asigna número ADR.

## Revisión y entrega coordinada

Referencias: synkro-docs `61056c93e6e0783a9199bf56778e9494739bc458`
(authentication, Auth OpenAPI/_shared, frontend, ADR-006/008/011, diseño,
navegación, estrategia de pruebas, Git, DoR/DoD). Host base y Auth Portal base
se registran en evidencia. Auth API actual
`04ae6ab92daf474fb5c38ae37842d1690e7584b0`; Gateway
`24a4ab157bb000e152e5e4567f16deb3ebadcf05` (login/refresh públicos, logout
protegido). HU-VEN-12 (#246) es el trabajo concurrente de Sales.

Orden: publicar artefacto interno Auth; desplegar Host que expone capacidad y
rutea assets; habilitar composición y ejecutar aceptación. No actualizar pins
de infraestructura aquí. Preparar PRs dependientes <=400 líneas de producción
por revisión, sin reescribir historia; revisión/publicación documental y merge
aprobado son cierres separados.
