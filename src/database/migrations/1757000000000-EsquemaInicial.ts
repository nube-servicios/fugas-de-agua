import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migracion inicial: crea las tablas SYSTEM_USER y WATER_REPORT
 * con sus restricciones (unique, check) y valores por defecto.
 */
export class EsquemaInicial1757000000000 implements MigrationInterface {
  name = 'EsquemaInicial1757000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "SYSTEM_USER" (
        "id" SERIAL NOT NULL,
        "name" character varying(120) NOT NULL,
        "email" character varying(180) NOT NULL,
        "password" character varying(100) NOT NULL,
        "isNotificationEnabled" boolean NOT NULL DEFAULT true,
        CONSTRAINT "UQ_SYSTEM_USER_EMAIL" UNIQUE ("email"),
        CONSTRAINT "PK_SYSTEM_USER_ID" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "WATER_REPORT" (
        "id" SERIAL NOT NULL,
        "address" character varying(255) NOT NULL,
        "description" character varying(500) NOT NULL,
        "severity" character varying(10) NOT NULL,
        "reporterPhone" character varying(20) NOT NULL,
        "isResolved" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "CHK_WATER_REPORT_SEVERITY" CHECK ("severity" IN ('low', 'medium', 'high')),
        CONSTRAINT "PK_WATER_REPORT_ID" PRIMARY KEY ("id")
      )
    `);

    // Indice para el listado ordenado del mas reciente al mas antiguo
    await queryRunner.query(`
      CREATE INDEX "IDX_WATER_REPORT_CREATED_AT" ON "WATER_REPORT" ("createdAt" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_WATER_REPORT_CREATED_AT"`);
    await queryRunner.query(`DROP TABLE "WATER_REPORT"`);
    await queryRunner.query(`DROP TABLE "SYSTEM_USER"`);
  }
}
