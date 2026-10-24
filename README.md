# AguaFix · API de Reportes de Fugas de Agua

API REST municipal para que los ciudadanos reporten fugas de agua en la vía
pública **con una fotografía**. La foto se guarda en **Amazon S3**, el reporte en
**PostgreSQL** y la cuadrilla de mantenimiento recibe un **correo con la foto**.
La API se distribuye como imagen Docker publicada automáticamente en Docker Hub
mediante **GitHub Actions**.

> Segunda entrega. Todo lo del primer parcial (reportes, registro/login, correo,
> migraciones) sigue funcionando.

## Stack

- **NestJS 11** + TypeScript
- **PostgreSQL** con **TypeORM** (`synchronize: false`, esquema solo por migraciones)
- **@aws-sdk/client-s3** para las fotografías
- **nodemailer** para el correo · **bcryptjs** para contraseñas
- **dotenv + env-var** (`src/config/envs.ts`) · **class-validator** con `ValidationPipe` global
- **Docker** (`node:22-alpine`) + **GitHub Actions** → Docker Hub

## Estructura

```
src/
├── main.ts                       # Bootstrap, ValidationPipe, CORS opcional y frontend estático
├── config/envs.ts                # Variables de entorno centralizadas
├── database/
│   ├── data-source.ts            # DataSource (Nest + CLI de TypeORM)
│   └── migrations/
│       ├── 1757000000000-EsquemaInicial.ts      # primer parcial (no se modifica)
│       └── 1761300000000-FotografiasReporte.ts  # NUEVA: photoUrl + repairPhotoUrl
├── storage/
│   ├── storage.module.ts         # StorageModule (exporta StorageService)
│   └── storage.service.ts        # uploadFile(file, folder): Promise<string>, deleteFile(url)
├── email/                        # EmailService.sendEmail(to, subject, template)
├── reports/
│   ├── reports.controller.ts     # POST multipart / GET
│   ├── reports.service.ts        # S3 → BD → correo, con limpieza si falla la BD
│   ├── reports.repository.ts
│   ├── pipes/photo-validation.pipe.ts   # foto obligatoria + tipo real por contenido
│   ├── dto/create-report.dto.ts
│   ├── entities/report.entity.ts
│   └── templates/report.template.ts     # generateReportTemplate(dto, photoUrl)
└── auth/                         # registro y login (primer parcial)
frontend/                         # interfaz web de demostración (HTML/CSS/JS)
test/reports.test.js              # pruebas unitarias con mocks (node:test)
postman/                          # colección de Postman
docs/                             # políticas de S3/IAM de ejemplo
Dockerfile · .dockerignore · compose.yaml · .github/workflows/docker-publish.yml
```

## Instalación local

Requisitos: Node 22+, PostgreSQL 16, una cuenta de AWS con un bucket S3 y una
cuenta SMTP (Gmail con contraseña de aplicación).

```bash
npm install
cp .env.example .env   # y llena los valores
```

### Variables de entorno

| Variable | Obligatoria | Descripción | Ejemplo |
|---|---|---|---|
| `PORT` | no | Puerto de la API | `3000` |
| `CORS_ORIGINS` | no | Orígenes extra permitidos (coma) | `http://localhost:5500` |
| `DB_HOST` / `DB_PORT` | sí / no | Host y puerto de PostgreSQL | `localhost` / `5432` |
| `DB_USERNAME` / `DB_PASSWORD` / `DB_NAME` | sí | Credenciales y nombre de la BD | `postgres` / … / `api_agua` |
| `DB_RUN_MIGRATIONS` | no | `true` = aplica migraciones al arrancar | `false` (compose usa `true`) |
| `MAIL_HOST` / `MAIL_PORT` / `MAIL_SECURE` | sí / sí / no | Servidor SMTP | `smtp.gmail.com` / `587` / `false` |
| `MAIL_USER` / `MAIL_PASSWORD` / `MAIL_FROM` | sí | Cuenta y remitente SMTP | — |
| `MAINTENANCE_EMAIL` | sí | Correo de la cuadrilla | `cuadrilla@example.com` |
| `AWS_REGION` | sí | Región del bucket | `us-east-1` |
| `AWS_S3_BUCKET` | sí | Nombre del bucket | `aguafix-fotos` |
| `AWS_S3_PUBLIC_URL` | no | URL base pública (CloudFront). Vacío = `https://<bucket>.s3.<region>.amazonaws.com` | — |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | depende | Solo si no usas perfil (`aws configure`) o rol. En Docker sí hacen falta | — |
| `PHOTO_MAX_SIZE_MB` | no | Tamaño máximo de la foto | `5` |
| `DOCKER_USER` | para compose | Usuario de Docker Hub | — |
| `API_PORT` | no | Puerto del host para el contenedor | `3000` |

Las credenciales de AWS **no** se leen en el código: el SDK usa su cadena
estándar de proveedores (variables `AWS_*`, perfil de `~/.aws` o rol de IAM).

## Configurar S3 (una sola vez)

1. Crea el bucket (o usa uno existente) en la región de `AWS_REGION`.
2. **Lectura pública solo de las fotos** (necesaria para que el correo y el
   frontend muestren la imagen):
   - En *Permissions → Block public access* desactiva únicamente
     *"Block public access … through new/any public bucket policies"*.
     Deja bloqueadas las ACL.
   - Pega `docs/s3-bucket-policy.json` en *Bucket policy* cambiando
     `NOMBRE-DEL-BUCKET`. Solo permite `s3:GetObject` sobre `reports/*`:
     el resto del bucket sigue privado y no se puede listar.
3. Usuario IAM de la API con **solo** `docs/iam-policy-api.json`
   (`PutObject` y `DeleteObject` sobre `reports/*`). Crea sus llaves de acceso y
   ponlas en `.env` o en `aws configure`.

Comprobación: después de un `POST /reports`, abre la `photoUrl` en una ventana
de incógnito; debe verse la imagen. Una URL fuera de `reports/` debe dar `403`.

## Base de datos y migraciones

```bash
npm run migration:show    # estado
npm run migration:run     # aplica pendientes
npm run migration:revert  # revierte la última
```

La migración nueva `FotografiasReporte1761300000000` solo hace
`ALTER TABLE "WATER_REPORT" ADD COLUMN "photoUrl"/"repairPhotoUrl" varchar(1024) NULL`.
La migración inicial no se tocó y `synchronize` sigue en `false`.

**Reportes anteriores sin foto:** se conservan tal cual; quedan con
`photoUrl = null` y `repairPhotoUrl = null`. Por eso la columna admite NULL: la
foto es obligatoria para los reportes **nuevos** y lo impone `POST /reports`
(400 si falta). `GET /reports` siempre devuelve ambas propiedades (`null` cuando
no hay foto) y el frontend muestra "Reporte anterior a las fotografías: sin foto".

`repairPhotoUrl` existe solo como campo opcional para la foto de la reparación;
no hay endpoint que lo asigne todavía y al crear un reporte siempre vale `null`.

## Ejecución local

```bash
npm run start:dev      # desarrollo
npm run build          # compila a dist/
npm run start:prod     # node dist/main
npm test               # pruebas unitarias con mocks (requiere build)
```

API en `http://localhost:3000` y frontend de demostración en la misma URL raíz.

## Endpoints

### POST /reports — `multipart/form-data`

| Campo | Tipo | Regla |
|---|---|---|
| `address` | texto | 5–255 caracteres |
| `description` | texto | 10–500 caracteres |
| `severity` | texto | `low`, `medium` o `high` |
| `reporterPhone` | texto | 7–20, solo dígitos `+ - ( )` y espacios |
| `photo` | archivo | **obligatorio**; JPG, PNG o WEBP; máx. `PHOTO_MAX_SIZE_MB` |

```bash
curl -X POST http://localhost:3000/reports \
  -F "address=Blvd. Adolfo López Mateos 1500, León, Gto." \
  -F "description=Fuga constante en la banqueta, el agua llega hasta la esquina." \
  -F "severity=high" \
  -F "reporterPhone=477 123 4567" \
  -F "photo=@fuga.jpg"
```

Respuesta `201`:

```json
{
  "id": 4,
  "address": "Blvd. Adolfo López Mateos 1500, León, Gto.",
  "description": "Fuga constante en la banqueta, el agua llega hasta la esquina.",
  "severity": "high",
  "reporterPhone": "477 123 4567",
  "photoUrl": "https://<bucket>.s3.<region>.amazonaws.com/reports/2f1c…-….jpg",
  "repairPhotoUrl": null,
  "isResolved": false,
  "createdAt": "2026-10-24T22:40:00.000Z"
}
```

Flujo y manejo de errores:

| Caso | Respuesta |
|---|---|
| Falta `photo` (o se manda JSON como en el primer parcial) | `400` "La fotografía de la fuga es obligatoria" |
| Archivo que no es imagen real (se revisan los bytes, no solo el Content-Type) | `400` |
| Foto mayor al límite | `413 Payload Too Large` |
| Campos internos (`isResolved`, `photoUrl`, `repairPhotoUrl`, `id`…) | `400` (`forbidNonWhitelisted`) |
| Falla S3 | `503`, no se guarda nada |
| Falla la BD | se **borra la foto** recién subida (sin huérfanos) y `500` |
| Falla el correo | el reporte ya quedó guardado: `201` + warning en el log |

La foto se sube con nombre único `reports/<uuid>.<ext>` y `Content-Type`
detectado del contenido.

### GET /reports

Lista del más reciente al más antiguo; cada reporte trae `photoUrl` y
`repairPhotoUrl` (`null` si no hay).

### POST /auth/register · POST /auth/login

Sin cambios respecto al primer parcial (ver colección de Postman).

## Correo a la cuadrilla

`generateReportTemplate(dto, photoUrl)` genera HTML con dirección, descripción,
severidad, teléfono y un `<img src="photoUrl">` (más un enlace por si el cliente
de correo bloquea imágenes). Los datos del ciudadano se escapan; la URL solo se
acepta si es `http(s)` y se escapa para el atributo. Gmail descarga la imagen
desde la URL pública, por eso el bucket debe permitir lectura de `reports/*`.

## Frontend (complemento)

`frontend/` es una interfaz web sencilla **solicitada como complemento**; el
enunciado del primer parcial no pide frontend y en esta Mac no se encontró un
enunciado que lo exija. La sirve la propia API en `/`:

- Formulario en español con vista previa y validación de tipo/tamaño.
- Envío real con `FormData` a `POST /reports`; mensajes de carga, éxito y error.
- Listado real de `GET /reports` con fotos; los reportes antiguos muestran "sin foto".
- Adaptable a celular y computadora. No contiene secretos.

Para servirlo desde otro origen: abre `index.html?api=http://localhost:3000` y
agrega ese origen a `CORS_ORIGINS`.

## Docker

### Imagen

```bash
docker build -t aguafix-api:local .
```

`Dockerfile` en 3 etapas sobre `node:22-alpine`: compila con `npm run build`,
instala solo dependencias de producción y arranca con `node dist/main` como
usuario `node`. `.dockerignore` excluye `.env*`, `compose.yaml`, `node_modules`,
`dist`, `.git`, llaves y credenciales.

### compose.yaml (API desde Docker Hub + PostgreSQL)

```bash
# en .env: DOCKER_USER=<tu usuario> y las credenciales de AWS
docker compose pull
docker compose up -d
docker compose logs -f api
```

- Conexión: la API usa `DB_HOST=db` (nombre del servicio).
- Orden de arranque: `depends_on` con `condition: service_healthy` + `pg_isready`.
- Migraciones: `DB_RUN_MIGRATIONS=true` las aplica al arrancar la API.
- Persistencia: volumen `pgdata`. `docker compose down` la conserva;
  `docker compose down -v` la **borra**.
- La BD no expone puerto al host (no choca con un PostgreSQL local en 5432).

### Arquitectura

La imagen se publica para `linux/amd64` y `linux/arm64`, así funciona igual en
Mac Apple Silicon (M1/M2/M3) que en Mac Intel o servidores x86.

## Publicación automática (GitHub Actions)

`.github/workflows/docker-publish.yml` corre en cada push a `main`:

1. `npm ci`, `npm run build`, `npm test`.
2. Login en Docker Hub con `secrets.DOCKER_USER` y `secrets.DOCKER_PASSWORD`.
3. Build multi-arquitectura y push de `<DOCKER_USER>/aguafix-api:latest`
   (y una etiqueta con el SHA del commit).
4. Descarga la imagen publicada y verifica que no tenga `.env` ni `compose.yaml`.

Configurar los secretos (una vez): GitHub → repositorio → *Settings → Secrets
and variables → Actions → New repository secret*:

- `DOCKER_USER`: tu usuario de Docker Hub.
- `DOCKER_PASSWORD`: un **Personal Access Token** de Docker Hub
  (*Account settings → Personal access tokens*, permiso *Read & Write*), no tu contraseña.

## Postman

Importa `postman/AguaFix.postman_collection.json`. En los requests con foto
abre *Body → form-data* y elige el archivo en `photo`. Incluye pruebas
automáticas de estado y de `photoUrl`.

## Seguridad

- Contraseñas solo como hash bcrypt; el hash nunca sale en respuestas.
- `whitelist` + `forbidNonWhitelisted`: el ciudadano no puede fijar
  `isResolved`, `photoUrl` ni `repairPhotoUrl`; además el repositorio copia solo
  campos explícitos.
- Tipo de imagen verificado por contenido; tamaño limitado antes de cargar todo
  el archivo; nombre de objeto generado por el servidor (sin rutas del cliente).
- Escape de HTML en el correo; URLs no `http(s)` descartadas.
- Bucket: lectura pública limitada a `reports/*`; la API solo puede escribir y
  borrar en `reports/*`.
- `.env` fuera de Git y de la imagen; sin credenciales en código, Dockerfile,
  workflow ni frontend.
