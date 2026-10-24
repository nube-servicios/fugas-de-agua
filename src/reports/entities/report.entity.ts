import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** Valores permitidos para la severidad de un reporte de fuga. */
export const SEVERIDADES_PERMITIDAS = ['low', 'medium', 'high'] as const;
export type Severidad = (typeof SEVERIDADES_PERMITIDAS)[number];

@Entity({ name: 'WATER_REPORT' })
@Check('CHK_WATER_REPORT_SEVERITY', `"severity" IN ('low', 'medium', 'high')`)
@Index('IDX_WATER_REPORT_CREATED_AT', ['createdAt'])
export class Report {
  @PrimaryGeneratedColumn('increment', { name: 'id' })
  id: number;

  /** Direccion o referencia de la via publica donde esta la fuga. */
  @Column({ name: 'address', type: 'varchar', length: 255 })
  address: string;

  /** Descripcion libre del ciudadano sobre la fuga. */
  @Column({ name: 'description', type: 'varchar', length: 500 })
  description: string;

  /** Severidad: low | medium | high (validada tambien por CHECK en la BD). */
  @Column({ name: 'severity', type: 'varchar', length: 10 })
  severity: Severidad;

  /** Telefono de contacto del ciudadano que reporta. */
  @Column({ name: 'reporterPhone', type: 'varchar', length: 20 })
  reporterPhone: string;

  /** Indica si la cuadrilla ya atendio la fuga. */
  @Column({ name: 'isResolved', type: 'boolean', default: false })
  isResolved: boolean;

  /** URL publica de la foto de la fuga en S3. NULL en reportes anteriores a las fotos. */
  @Column({ name: 'photoUrl', type: 'varchar', length: 1024, nullable: true })
  photoUrl: string | null;

  /** URL de la foto de la reparacion. Opcional; aun no hay flujo que la asigne. */
  @Column({ name: 'repairPhotoUrl', type: 'varchar', length: 1024, nullable: true })
  repairPhotoUrl: string | null;

  /** Fecha de creacion asignada automaticamente por la base de datos. */
  @CreateDateColumn({
    name: 'createdAt',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;
}
