# Incremento 1 (base funcional)

## Endpoints implementados

### Participación (público)
- `POST /api/public/participation/start`
  - Body: `{ "surveyId": "...", "cedula": "..." }`
  - Valida cédula localmente, deriva hash HMAC-SHA256, verifica duplicado por encuesta (A1) y emite `participationId` opaco.
  - No almacena cédula en texto plano. Respuestas 201/400/404/409.

### Registro de respuestas (desacoplado)
- `POST /api/submissions`
  - Body: `{ "participationId": "...", "surveyVersionId": "...", "channel": "PUBLIC"|"ENUMERATOR", "answers": [{ "questionId": "...", "value": ... }], "sectorId"?: "...", "startedAt"?: "ISO" }`
  - `channel=ENUMERATOR` requiere sesión autenticada con permiso `submissions:capture` y registra `enumeratorId` desde la sesión.
  - Crea `SurveySubmission` + `Answer` solo con `participationId` (sin cédula/PII directa), valida correspondencia encuesta/versión, impide reuso y marca participación como usada.

### Autenticación
- `POST /api/auth/login` `{ "email", "password" }` → cookie de sesión.
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Operación del encuestador
- `GET /api/enumerator/submissions` (requiere `submissions:view_own_status`): lista estado/actividad propia sin contenido de respuestas.

## RBAC base (`src/server/rbac.ts`)
- `SUPERADMIN`, `CAMPAIGN_ADMIN`, `ANALYST`, `ENUMERATOR` con permisos definidos por rol (gestión, captura, analítica/exportación, auditoría, etc.).

## Auditoría (`src/server/audit.ts`)
- Registro en `AuditLog` para eventos como `auth.login`, `auth.logout`, `submission.create`.

## Seed
- `prisma/seed.js`: territorios de Pichincha/Mejía (parroquias + sectores ficticios), usuarios de prueba por rol, campaña, encuesta publicada, versión y preguntas de ejemplo.
- Ejecutar: `npm run prisma:seed` (requiere dependencias instaladas y DB accesible).

Credenciales de prueba (solo desarrollo): `Admin123!` para `superadmin@electoral.local`, `admincampana@electoral.local`, `analista@electoral.local`, `encuestador@electoral.local`.