import 'dotenv/config';
import * as env from 'env-var';

/**
 * Configuracion centralizada de variables de entorno.
 * Si falta una variable obligatoria, la aplicacion falla al arrancar (fail fast).
 */
export const envs = {
  // ----- Servidor -----
  puerto: env.get('PORT').default('3000').asPortNumber(),

  // ----- Base de datos PostgreSQL -----
  baseDeDatos: {
    host: env.get('DB_HOST').required().asString(),
    puerto: env.get('DB_PORT').default('5432').asPortNumber(),
    usuario: env.get('DB_USERNAME').required().asString(),
    contrasena: env.get('DB_PASSWORD').required().asString(),
    nombre: env.get('DB_NAME').required().asString(),
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
};
