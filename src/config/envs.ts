import 'dotenv/config';
import * as env from 'env-var';

/**
 * Configuracion centralizada de variables de entorno.
 * Si falta una variable obligatoria, la aplicacion falla al arrancar (fail fast).
 */
export const envs = {
  // ----- Servidor -----
  puerto: env.get('PORT').default('3000').asPortNumber(),

  /** Origenes extra permitidos por CORS, separados por comas. Vacio = solo mismo origen. */
  origenesCors: env.get('CORS_ORIGINS').default('').asArray(','),

  // ----- Base de datos PostgreSQL -----
  baseDeDatos: {
    host: env.get('DB_HOST').required().asString(),
    puerto: env.get('DB_PORT').default('5432').asPortNumber(),
    usuario: env.get('DB_USERNAME').required().asString(),
    contrasena: env.get('DB_PASSWORD').required().asString(),
    nombre: env.get('DB_NAME').required().asString(),
    /** true = TypeORM aplica las migraciones pendientes al arrancar (se usa en Docker). */
    ejecutarMigraciones: env.get('DB_RUN_MIGRATIONS').default('false').asBool(),
  },

  // ----- Servidor de correo SMTP -----
  correo: {
    host: env.get('MAIL_HOST').required().asString(),
    puerto: env.get('MAIL_PORT').required().asPortNumber(),
    seguro: env.get('MAIL_SECURE').default('false').asBool(),
    usuario: env.get('MAIL_USER').required().asString(),
    contrasena: env.get('MAIL_PASSWORD').required().asString(),
    remitente: env.get('MAIL_FROM').required().asString(),
  },

  // Correo de la cuadrilla de mantenimiento que recibe los reportes
  correoMantenimiento: env.get('MAINTENANCE_EMAIL').required().asEmailString(),

  // ----- Almacenamiento de fotografias en S3 -----
  // Las credenciales NO se leen aqui: el SDK usa su cadena estandar de proveedores
  // (AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY, AWS_PROFILE, rol de IAM, etc.).
  s3: {
    region: env.get('AWS_REGION').required().asString(),
    bucket: env.get('AWS_S3_BUCKET').required().asString(),
    /** URL base publica opcional (p. ej. CloudFront). Vacio = URL directa del bucket. */
    urlPublica: env.get('AWS_S3_PUBLIC_URL').default('').asString(),
  },

  /** Tamano maximo permitido para la fotografia, en MB. */
  fotoTamanoMaximoMb: env.get('PHOTO_MAX_SIZE_MB').default('5').asFloatPositive(),
};
