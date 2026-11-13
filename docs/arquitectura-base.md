# Arquitectura base (resumen de implementación inicial)

## Dominios separados en base de datos

1. **Identificación y participación (protegido)**
   - `ParticipantIdentity`: almacena `identityHash` (derivado protegido de la cédula) por encuesta. **Nunca** la cédula en texto plano.
   - Restricción `@@unique([surveyId, identityHash])` para unicidad por encuesta (A1).
   - `Participation`: emite `id` interno opaco (`participation_id`) usado por el dominio de respuestas.

2. **Respuestas políticas (sensible)**
   - `SurveySubmission`: metadatos del envío (canal, encuestador si aplica, territorio, calidad) vinculados a `participationId`.
   - `Answer`: valores de respuesta/intención de voto vinculados a la submission/pregunta, **sin PII directa**.

3. **Operación y catálogos**
   - Territorio (provincia/cantón/parroquia/sector), campañas, usuarios/RBAC, encuestas versionadas, figuras políticas, auditoría y contenidos de privacidad.

## Principios aplicados
- Validación local de cédula (10 dígitos + verificador) sin presentarla como acreditación oficial.
- Derivación HMAC con secreto de servidor (`PARTICIPATION_HASH_SECRET`, `PARTICIPATION_HASH_SALT`).
- Canal público y encuestador comparten constructor y estructura común de respuestas.
- Exportación/analítica por defecto agregada (controles a implementar en módulos `analytics`/`exports`).

## Pendiente en siguientes iteraciones
- Autenticación/RBAC y auditoría operativa.
- UI de portal público y captura por encuestador con flujo de cédula → participación → encuesta.
- Constructor de encuestas y lógica condicional básica (A3).
- Catálogos territoriales y carga manual/CSV (A4).
- Dashboard, exportaciones con umbrales k (A2) y controles de acceso.