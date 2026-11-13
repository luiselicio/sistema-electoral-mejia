# Guía de despliegue en producción (A9) — ELECTORAL DATA

> **Importante:** No recopilar información real de intención de voto hasta completar las revisiones legales y operativas correspondientes. Este documento es técnico y no sustituye validación jurídica.

## 1. Requisitos previos
- VPS Linux (recomendado) con Docker y Docker Compose Plugin instalados.
- Dominio configurado apuntando al VPS (registros DNS A/AAAA).
- Puertos 80/443 abiertos (HTTP/HTTPS) y 22 para administración segura.
- Acceso a un servicio de correo transaccional (para recuperación/notificaciones, cuando se integre).

## 2. Variables de entorno obligatorias
Crear `.env.production` (no versionar secretos). Variables mínimas:

| Variable | Descripción |
|---|---|
| `NODE_ENV` | `production` |
| `NEXT_PUBLIC_APP_URL` | URL pública, ej. `https://encuestas.ejemplo.ec` |
| `DATABASE_URL` | Cadena PostgreSQL (en compose puede derivarse de las vars de db) |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Credenciales de base de datos |
| `PARTICIPATION_HASH_SECRET` | **Secreto largo y aleatorio** para HMAC de cédulas (dominio protegido). Rotación requiere estrategia definida. |
| `PARTICIPATION_HASH_SALT` | Sal/complemento para derivación |
| `AUTH_SECRET` | Secreto largo y aleatorio para sesiones/tokens |
| `APP_DOMAIN` | Dominio para TLS automático (Caddy), ej. `encuestas.ejemplo.ec` |

**Buenas prácticas:** generar secretos con alta entropía, restringir permisos del archivo (`chmod 600`), y no reutilizar secretos entre entornos.

## 3. Persistencia y volúmenes
En `docker-compose.prod.yml` se definen volúmenes:
- `postgres_data` → `/var/lib/postgresql/data`: **persistencia de PostgreSQL** (obligatorio).
- `uploads_data` → `/app/public/uploads`: persistencia de imágenes/logos subidos (A5).
- `caddy_data`, `caddy_config`: certificados y estado de Caddy.

**Respaldos:** programar copias cifradas de `postgres_data` (dump + snapshot según política) y de `uploads_data`; probar restauración periódicamente. Definir retención acorde a política legal.

## 4. Imagen de aplicación y build
`docker-compose.prod.yml` referencia un `Dockerfile` de producción para la app. Antes del primer despliegue:
1. Definir/ajustar `Dockerfile` multi-stage (instalación, `prisma generate`, `next build`, runtime).
2. Ejecutar migraciones de forma controlada: `npx prisma migrate deploy` contra la BD de producción (en job/one-off).
3. **No ejecutar seed de desarrollo en producción.** Cargar catálogos reales solo por procesos autorizados y validados.

## 5. HTTPS y proxy inverso
- **Opción incluida (Caddy):** `docker/caddy/Caddyfile` con TLS automático (Let’s Encrypt) usando `APP_DOMAIN`.
- **Alternativa (Nginx):** terminar TLS con Nginx + Certbot y `proxy_pass` a `app:3000`; configurar cabeceras de seguridad (`Strict-Transport-Security`, `X-Content-Type-Options`, etc.).
- Forzar HTTPS y redirección HTTP→HTTPS.

## 6. Seguridad operativa mínima
- Firewall: exponer solo 80/443 (y SSH restringido).
- Actualizaciones del sistema y de imágenes base.
- Principio de mínimo privilegio en credenciales de BD y accesos.
- Monitoreo básico de disponibilidad y espacio en disco (volúmenes).
- Rate limiting aplicado en endpoints sensibles (participación/login) a nivel app; complementar en proxy/WAF si es posible.
- Verificar que `PARTICIPATION_HASH_SECRET` sea estable (cambiarlo invalida la capacidad de detectar duplicados históricos basados en el derivado).

## 7. Checklist de verificación jurídica previa a recolección real
Antes de activar recolección con ciudadanos reales, confirmar:
- [ ] Revisión jurídica completada (LOPDP y normativa aplicable; disposiciones electorales/CNE pertinentes a encuestas/publicación/difusión).
- [ ] Finalidad, base jurídica, aviso de privacidad y consentimiento (cuando corresponda) aprobados y configurados/versionados en el sistema.
- [ ] Políticas de conservación, minimización y procedimiento para derechos de titulares definidos.
- [ ] Medidas de seguridad validadas (separación de dominios, control de accesos, cifrado en tránsito/reposo, backups).
- [ ] Textos en interfaz: validación local de cédula **no** acredita nacionalidad/identidad/habilitación electoral; modelo **confidencial/seudonimizado**.
- [ ] Metodología y limitaciones (incl. anti-duplicados y validación local) documentadas.
- [ ] Autorización interna para el piloto y responsables designados.

## 8. Verificación técnica post-despliegue
- [ ] `https://APP_DOMAIN` accesible con certificado válido.
- [ ] Migraciones aplicadas y conexión a BD operativa.
- [ ] Login, RBAC y auditoría funcionando.
- [ ] Flujo de participación (cédula → derivado → participación) y registro desacoplado de respuestas.
- [ ] Exportaciones agregadas con supresión `k ≥ 10` y registro de auditoría.
- [ ] Persistencia verificada tras reinicio de contenedores.
- [ ] Backups y restauración probados.