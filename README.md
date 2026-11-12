# ELECTORAL DATA

Sistema web para crear, publicar, administrar y analizar encuestas de opinión ciudadana e intención de voto (Ecuador).  
**Piloto inicial:** Cantón Mejía, Provincia de Pichincha.

## Modelo de datos y privacidad

- **Modelo:** CONFIDENCIAL O SEUDONIMIZADO (no anónimo).
- El participante ingresa **obligatoriamente su número de cédula ecuatoriana** antes de responder.
- Validación local: 10 dígitos y dígito verificador. **No** acredita nacionalidad, identidad ni habilitación electoral.
- Control de duplicados mediante **derivado criptográfico protegido** (sin cédula en texto plano).
- **Separación estricta** entre dominio de identificación/participación y dominio de respuestas políticas.
- Las respuestas se vinculan solo a un **identificador interno de participación** (`participation_id`), sin relación directa cédula ↔ preferencia de voto.
- Unicidad de participación **por encuesta** (configuración A1 aprobada).

## Stack

- Next.js + TypeScript + Tailwind CSS
- PostgreSQL + Prisma ORM
- Docker Compose (desarrollo local)
- Git

## Estructura inicial

- `prisma/schema.prisma`: esquema con dominios separados (`ParticipantIdentity`/`Participation` vs `SurveySubmission`/`Answer`).
- `src/modules/participation/`: validación local de cédula y derivación protegida.
- `src/app/`: base de aplicación Next.js (App Router).
- `docker-compose.yml`: servicio PostgreSQL para desarrollo local.

## Desarrollo local (Fedora)

1. Copiar variables de entorno:
   ```bash
   cp .env.example .env
   ```
   Ajustar `PARTICIPATION_HASH_SECRET` y `PARTICIPATION_HASH_SALT` con valores seguros.

2. Levantar base de datos:
   ```bash
   docker compose up -d db
   ```

3. Instalar dependencias:
   ```bash
   npm install
   ```

4. Generar cliente y aplicar migraciones (cuando corresponda):
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

5. Iniciar aplicación:
   ```bash
   npm run dev
   ```

> Nota: no recopilar información real de intención de voto hasta completar las revisiones legales y operativas correspondientes. No asumir cumplimiento normativo automático. No implementar integraciones con fuentes oficiales (p. ej. CNE) sin autorización y viabilidad legal/técnica.