import { DataSource, DataSourceOptions } from 'typeorm';
import { envs } from '../config/envs';
import { Report } from '../reports/entities/report.entity';
import { User } from '../auth/entities/user.entity';

/**
 * Opciones compartidas por Nest (TypeOrmModule) y por el CLI de TypeORM.
 * synchronize esta desactivado: el esquema se controla solo con migraciones.
 */
export const opcionesBaseDeDatos: DataSourceOptions = {
  type: 'postgres',
  host: envs.baseDeDatos.host,
  port: envs.baseDeDatos.puerto,
  username: envs.baseDeDatos.usuario,
  password: envs.baseDeDatos.contrasena,
  database: envs.baseDeDatos.nombre,
  entities: [Report, User],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  migrationsTableName: 'migrations_history',
  // En Docker se activa con DB_RUN_MIGRATIONS=true para no depender de ts-node.
  migrationsRun: envs.baseDeDatos.ejecutarMigraciones,
  synchronize: false,
  logging: ['error', 'warn', 'migration'],
};

/** DataSource usado por el CLI de TypeORM para correr las migraciones. */
const AppDataSource = new DataSource(opcionesBaseDeDatos);
export default AppDataSource;
