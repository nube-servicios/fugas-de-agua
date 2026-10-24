import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Agrega las URLs de fotografia a WATER_REPORT.
 *
 * Ambas columnas son NULL a proposito: los reportes creados antes de esta
 * migracion no tienen foto y se conservan intactos (photoUrl = NULL).
 * La obligatoriedad de la foto para reportes nuevos la impone POST /reports.
 * repairPhotoUrl queda reservada para la foto de la reparacion (sin flujo aun).
 */
export class FotografiasReporte1761300000000 implements MigrationInterface {
  name = 'FotografiasReporte1761300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "WATER_REPORT"
        ADD COLUMN "photoUrl" character varying(1024) NULL,
        ADD COLUMN "repairPhotoUrl" character varying(1024) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "WATER_REPORT"
        DROP COLUMN "repairPhotoUrl",
        DROP COLUMN "photoUrl"
    `);
  }
}
