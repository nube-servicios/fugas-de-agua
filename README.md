# API de Reportes de Fugas de Agua

API REST municipal que permite a los ciudadanos reportar fugas de agua en la vía
pública y notifica automáticamente por correo a la cuadrilla de mantenimiento.

## Stack

- **NestJS 11** + TypeScript
- **PostgreSQL** con **TypeORM** (`synchronize: false`, esquema por migraciones)
- **dotenv + env-var** para configuración (`src/config/envs.ts`)
- **bcryptjs** para el hash de contraseñas
- **nodemailer** para el envío de correos
- **class-validator / class-transformer** con `ValidationPipe` global (`whitelist: true`)

## Estructura

```
src/
├── main.ts                     # Bootstrap + ValidationPipe global
├── app.module.ts               # Módulo raíz
├── config/
│   └── envs.ts                 # Variables de entorno centralizadas
├── database/
│   ├── data-source.ts          # DataSource compartido (Nest + CLI de TypeORM)
│   └── migrations/             # Migraciones versionadas
├── email/
│   ├── email.module.ts
│   └── email.service.ts        # sendEmail(to, subject, template)
├── reports/
│   ├── reports.controller.ts   # controller
│   ├── reports.service.ts      # service (lógica de negocio)
│   ├── reports.repository.ts   # repository (único que habla con TypeORM)
│   ├── dto/create-report.dto.ts
│   ├── entities/report.entity.ts
│   └── templates/report.template.ts
└── auth/
    ├── auth.controller.ts
    ├── auth.service.ts
    ├── users.repository.ts
    ├── dto/{create-user.dto.ts, login.dto.ts}
    └── entities/user.entity.ts
```

Cada módulo sigue el flujo **controller → service → repository**.

## Instalación

```bash
npm install
cp .env.example .env   # y edita los valores
```

### Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto del servidor | `3000` |
| `DB_HOST` | Host de PostgreSQL | `localhost` |
| `DB_PORT` | Puerto de PostgreSQL | `5432` |
| `DB_USERNAME` | Usuario de la BD | `postgres` |
| `DB_PASSWORD` | Contraseña de la BD | `postgres` |
| `DB_NAME` | Nombre de la BD | `api_agua` |
| `MAIL_HOST` | Host SMTP | `smtp.gmail.com` |
| `MAIL_PORT` | Puerto SMTP | `587` |
| `MAIL_SECURE` | TLS directo (`true` para el puerto 465) | `false` |
| `MAIL_USER` | Usuario SMTP | `usuario@example.com` |
| `MAIL_PASSWORD` | Contraseña de aplicación de Gmail (no la del correo) | `xxxx xxxx xxxx xxxx` |
| `MAIL_FROM` | Remitente mostrado | `Municipio <no-reply@example.com>` |
| `MAINTENANCE_EMAIL` | Correo de la cuadrilla que recibe los reportes | `cuadrilla@example.com` |

Todas son obligatorias salvo `PORT` (default `3000`) y `MAIL_SECURE` (default `false`).
Si falta alguna, la aplicación falla al arrancar con un mensaje claro.

## Base de datos

Instalación de PostgreSQL en macOS con Homebrew:

```bash
brew install postgresql@16
brew services start postgresql@16
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
createuser -s postgres
psql -d postgres -c "ALTER USER postgres WITH PASSWORD 'postgres';"
createdb -O postgres api_agua
```

Ejecutar las migraciones (crea `SYSTEM_USER` y `WATER_REPORT`):

```bash
npm run migration:run     # aplica las migraciones pendientes
npm run migration:show    # lista el estado de las migraciones
npm run migration:revert  # revierte la última migración
```

La migración inicial crea:

- `SYSTEM_USER` con `UQ_SYSTEM_USER_EMAIL` (unique en `email`) y default `true` en `isNotificationEnabled`.
- `WATER_REPORT` con `CHK_WATER_REPORT_SEVERITY` (`low | medium | high`), default `false` en `isResolved` y `CURRENT_TIMESTAMP` en `createdAt`.
- Índice `IDX_WATER_REPORT_CREATED_AT` para el listado descendente.

## Ejecución

```bash
npm run start:dev    # desarrollo con recarga
npm run build        # compila a dist/
npm run start:prod   # producción (requiere build previo)
```

## Endpoints

### POST /reports

Registra una fuga y luego notifica por correo a `MAINTENANCE_EMAIL`.

```bash
curl -X POST http://localhost:3000/reports \
  -H "Content-Type: application/json" \
  -d '{
    "address": "Blvd. Adolfo López Mateos 1500, León, Gto.",
    "description": "Fuga constante en la banqueta, el agua llega hasta la esquina.",
    "severity": "high",
    "reporterPhone": "4771234567"
  }'
```

Respuesta `201`:

```json
{
  "id": 1,
  "address": "Blvd. Adolfo López Mateos 1500, León, Gto.",
  "description": "Fuga constante en la banqueta, el agua llega hasta la esquina.",
  "severity": "high",
  "reporterPhone": "4771234567",
  "isResolved": false,
  "createdAt": "2026-09-05T18:20:31.412Z"
}
```

Si el envío del correo falla, el reporte **ya quedó guardado**: se registra un
warning en el log y la petición responde `201` de todas formas.

### GET /reports

Devuelve todos los reportes del más reciente al más antiguo.

```bash
curl http://localhost:3000/reports
```

### POST /auth/register

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Diego Gael Tierra",
    "email": "diego@example.com",
    "password": "Municipio2026"
  }'
```

Respuesta `201` (sin contraseña):

```json
{
  "id": 1,
  "name": "Diego Gael Tierra",
  "email": "diego@example.com",
  "isNotificationEnabled": true
}
```

Si el correo ya existe responde `409 Conflict`.

### POST /auth/login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "email": "diego@example.com", "password": "Municipio2026" }'
```

Respuesta `200` con el usuario sin contraseña. Con credenciales inválidas
responde `400 Bad Request`:

```json
{
  "message": "Correo electrónico o contraseña inválidos.",
  "error": "Bad Request",
  "statusCode": 400
}
```

## Notas de seguridad

- Las contraseñas se guardan solo como hash bcrypt (10 rondas). La columna
  `password` está marcada con `select: false`, así que no sale en los `find()`.
- El `ValidationPipe` global usa `whitelist: true` y `forbidNonWhitelisted: true`:
  cualquier propiedad no declarada en el DTO se rechaza.
- `POST /reports` no acepta `isResolved`: todo reporte nace sin atender y solo la
  cuadrilla debería poder cambiar ese estado.
- El registro traduce la violación de la restricción unique (código `23505`) a
  `409 Conflict`, así dos peticiones simultáneas con el mismo correo no producen un 500.
- El mensaje de login es idéntico para correo inexistente y contraseña incorrecta
  (no permite enumerar usuarios).
- La plantilla del correo escapa `& < > " ' /` en todos los valores dinámicos
  para evitar inyección de HTML.
- `.env` está en `.gitignore`; usa `.env.example` como plantilla.
