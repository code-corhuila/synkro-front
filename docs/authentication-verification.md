# HU-FE-08 — evidencia de implementación

Fecha: 12 de octubre de 2026. Issue: code-corhuila/synkro-docs#248.
Ramas autorizadas: `feat/host-authentication-lifecycle` y
`feat/auth-login-portal`. Los SHAs finales y CI exacta se entregan con el reporte
de publicación; este documento describe las comprobaciones locales del código.

## Revisiones

Host develop: `1d4683366e53597dadd16d0f5ddb6e62ad0a52d0`.
Auth develop/checkpoint: `d478fba7344f3a778da4f122dd5aefe481a1d32a`,
comprobado sin aplicación ejecutable. Referencias documentales actuales:
`61056c93e6e0783a9199bf56778e9494739bc458`. Se inspeccionaron issue, authentication,
OpenAPI/shared, frontend, ADR-006/008/011, diseño/tokens/navegación, testing,
Git, DoR/DoD y contratos existentes. Checkout local de docs era anterior;
se usó la revisión remota actual.

Auth API real: `04ae6ab92daf474fb5c38ae37842d1690e7584b0`;
Gateway: `24a4ab157bb000e152e5e4567f16deb3ebadcf05`;
Auth DB: `5e481dba156db6f2febb00427efba637002d9a0c`.
Products: `b3780d9d8cb9fe28f59ec687393c42c93cfff339`;
Sales HU-VEN-12: `8685cde6ccc02e46719968f150d2e495101944d9`.
Durante la tarea Sales avanzó a `c89448c04f5351b1ab8bc1ddf3f01b0529366311`;
se revisó el diff de navegación (sin cambios en los contratos shell) y se
reconstruyó esta revisión con Docker/guard compilado satisfactorios. El navegador
certifica el snapshot servido en la primera composición; no se atribuye una
segunda corrida de navegador a la revisión nueva.
Se comprobaron status/remotes/develop/branches/PRs abiertos antes de crear
ramas; no había PR abierto en Host/Auth/Sales. No se editaron referencias.

## TDD observado y límites

Contrato de capacidad escrito antes de implementar el formulario. Los tests
del núcleo se escribieron primero, pero su primera ejecución falló en el entorno
(EPERM al preparar caché), antes de ejecutar assertions. No se atribuye una fase
roja funcional retrospectiva a ese primer núcleo: es una desviación del requisito
estricto de TDD que debe quedar visible para revisión.

Fases rojas funcionales observadas antes de sus correcciones:

| Etapa | Rojo observado | Verde posterior |
|---|---|---|
| Transporte Auth | 3 tests fallidos: operación interna/Retry-After inexistentes | authTransport, 3 pasan |
| Formulario | 8 tests fallidos contra stub vacío, además de import faltante inicial | Login, 8 pasan |
| Ruta pública | no aparece el heading remoto distintivo | AuthLogin pasa |
| Delivery interno | configuración Auth ausente | authDeployment pasa |
| Barrera y carreras | trabajo protegido podía cruzar reemplazo; endpoints de credenciales públicos | sessionGateRace, 4 pasan |
| Login terminado | logout entre commit y continuación podía navegar | facade, 2 pasan |
| Indeterminación visible | role alert ausente tras recuperación perdida | AuthLogin pasa |
| Retorno solicitado | esperado /products, recibido /dashboard | regresión pasa y navegador conserva query |
| Recuperación de remoto | fallos reales de símbolo runtime y URL síncrona | mismo navegador recupera formulario sin reload |

Los tests se conservan en ambos repositorios. No se crean commits rojos
retrospectivos. Una corrida global simultánea con otras compilaciones agotó el
timeout de 5s de un test previo; repetir con `--maxWorkers=2` dio suite completa
verde sin aumentar timeout ni reducir umbrales.

## Tiers de verificación

- Unit/controlado: Host 46 archivos, 331 pasan, 3 TODO preexistentes. Statements
  94,75 %, branches 90,50 %, functions 91,72 %, lines 95,69 %. Núcleo auth
  94,28 %, session 94,73 %, apiClient 95,38 %, api 88,88 %; umbrales individuales
  85 % y global 70 %. Auth 9 pasan; statements 93,22 %, formulario 96,49 %.
- Calidad local: lint, TypeScript/build, guard de producción y configuración
  Compose pasan en ambos. Test Python de composición existente pasa en Host.
- Compilado: imágenes reales Node22/nginx, remoteEntry, JS y CSS Auth por Host
  HTTP 200; remote-to-shell carga authentication y React del Host. No basta el
  mock de importación de la suite. Products y Sales se construyeron sin editar.
- Navegador: formulario público, teclado en pruebas UI, rechazo genérico con
  contraseña vacía, login real, destino `/products?page=2`, refresh tras reload,
  logout, reload anónimo; remoto parado muestra fallback y recupera con botón
  sin reload. Products/Sales muestran sus pantallas y errores de servicio.
- Servicios reales: PostgreSQL tmpfs, migraciones Flyway y CLI oficial de
  inicialización Auth sobre usuario sintético desechable. Auth/Gateway reales,
  login 401/200, refresh 200, logout 200. No se usó perfil mock ni entorno
  persistente. Los servicios de negocio Products/Sales no se levantaron:
  sus peticiones dan 503 y esto no certifica flujos de negocio.

403/429, reloj/rotación perdida y carreras están verificados de forma controlada;
no se atribuyen al navegador ni a servicios reales. Decodificación JWT solo
programa el cliente; validación efectiva sigue siendo del backend.

## Matriz issue #248

Los IDs siguen el issue; testing-strategy tiene además FE-SESSION-01…07.

| ID | Resultado local | Evidencia |
|---|---|---|
| FE-AUTH-01 | PASS | ruta pública, AuthLogin test y navegador compilado |
| FE-AUTH-02 | PASS | pair válido, facade, retorno con query y Auth real |
| FE-AUTH-03 | PASS | Login/UI 401, transporte sin refresh; navegador rechazo |
| FE-AUTH-04 | PASS controlado | red/5xx normalizados y retry explícito |
| FE-AUTH-05 | PASS controlado | Retry-After segundos/fecha y deadline UI |
| FE-AUTH-06 | PASS | facade sin tokens, spy storage, guard de bundle |
| FE-AUTH-07 | PASS controlado | >60/<=60, timer/focus/request, una renovación |
| FE-AUTH-08 | PASS | recovery con/sin refresh; reload real |
| FE-AUTH-09 | PASS controlado | pérdida/timeout/5xx sin repetir rotación |
| FE-AUTH-10 | PASS controlado | protectedLifecycle: una petición, cero replay |
| FE-AUTH-11 | PASS controlado | 403 conserva identidad y error FORBIDDEN para UI existente |
| FE-AUTH-12 | PASS | logout real y tests late login/refresh/protected/reemplazo |
| FE-AUTH-13 | PASS | URLs externas/ambiguas/rol denegado rechazadas |
| FE-AUTH-14 | PASS | RemoteBoundary previo, caída/recuperación Auth compilado |
| FE-AUTH-15 | PASS real | assets 200 y navegador Auth/Gateway/DB desechables |
| FE-AUTH-16 | PASS interfaces | exports anteriores; Products/Sales compilados y montados; Angular sin cambios |
| FE-AUTH-17 | PASS | producción sin dev identity/keys/credenciales; guards y Docker |
| FE-AUTH-18 | LOCAL PASS; CI por SHA al publicar | suites/cobertura/lint/build y CODEOWNERS sin cambios |

No se declara aceptación documental completa: revisión/publicación de la política
y aprobación de integración quedan separadas. El cumplimiento histórico de TDD
tiene la salvedad explícita anterior.

## Recursos temporales

Proyecto exclusivo `synkro-fe08-disposable`, red privada del proyecto, puerto
loopback 5188 del Host; ningún puerto del portal. Base tmpfs sin volumen duradero,
claves y contraseña sintéticas fuera de los contextos de build. La limpieza se
registra al finalizar; nunca hacer prune global ni tocar recursos de otros trabajos.
Limpieza ejecutada: contenedores/red del proyecto, DB tmpfs y seis tags de
imágenes exclusivos eliminados; reconstrucción adicional Sales eliminada también.
Claves/contraseña y checkouts temporales se retiraron tras guardar evidencia
sanitizada. Cero refresh activos antes de destruir DB; seis registros inactivos.
