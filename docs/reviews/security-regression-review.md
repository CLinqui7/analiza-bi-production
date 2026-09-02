# Security Regression Review

Fecha: 2026-08-07

## Veredicto

Estado: PASS para codigo local. No se detectan P0 abiertos en codigo revisado.

La correccion de acceso local conserva RBAC server-side: el selector DEMO solo aparece cuando el servidor permite demo local, crea cookies HttpOnly y usa `AuthorizationService` con scope real por rol. Preview/staging y produccion quedan bloqueados por ambiente.

## Evidencia Revisada

- `lib/security/environment.ts`
- `lib/auth/demo-admin.ts`
- `app/api/auth/demo-session/route.ts`
- `lib/server/authorization.ts`
- `lib/supabase/proxy.ts`
- `lib/security/authorization-policy.ts`
- `tests/sprint1-security-rbac.test.mjs`

## Hallazgos

| ID | Prioridad | Hallazgo | Estado |
| --- | --- | --- | --- |
| SEC-01 | P0 | Login DEMO no debe funcionar en staging ni produccion. | Cerrado por `APP_ENV`/`VERCEL_ENV` gates. |
| SEC-02 | P0 | Selector de rol no debe ser solo React/client-side. | Cerrado: sesion DEMO server-side con cookies HttpOnly. |
| SEC-03 | P0 | Viewer no debe abrir rutas administrativas por URL directa. | Cerrado por `requireProtectedPath` y tests. |
| SEC-04 | P1 | Gerente de sucursal debe quedar limitado a su sucursal. | Cerrado en scope DEMO y pruebas de importacion. |
| SEC-05 | P1 | Falta rotacion/verificacion real de credenciales historicas fuera del codigo. | Bloqueo manual de produccion. |

## Gate

Security Gate: PASS local. Production Gate queda pendiente de rotacion/verificacion de secretos y auditoria de ambiente desplegado.
