import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity({ name: 'SYSTEM_USER' })
@Unique('UQ_SYSTEM_USER_EMAIL', ['email'])
export class User {
  @PrimaryGeneratedColumn('increment', { name: 'id' })
  id: number;

  @Column({ name: 'name', type: 'varchar', length: 120 })
  name: string;

  /** Correo unico, se guarda siempre en minusculas. */
  @Column({ name: 'email', type: 'varchar', length: 180 })
  email: string;

  /**
   * Hash bcrypt de la contrasena. Nunca se guarda ni se expone en texto plano.
   * select:false evita que salga por accidente en los find() de TypeORM.
   */
  @Column({ name: 'password', type: 'varchar', length: 100, select: false })
  password: string;

  /** Indica si el usuario desea recibir notificaciones por correo. */
  @Column({ name: 'isNotificationEnabled', type: 'boolean', default: true })
  isNotificationEnabled: boolean;
}
