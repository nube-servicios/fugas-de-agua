import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

/** Capa de acceso a datos de los usuarios del sistema. */
@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repositorio: Repository<User>,
  ) {}

  /** Busca un usuario por correo. El hash NO se incluye. */
  async buscarPorCorreo(email: string): Promise<User | null> {
    return this.repositorio.findOne({ where: { email } });
  }

  /** Busca un usuario por correo incluyendo el hash (solo para login). */
  async buscarPorCorreoConPassword(email: string): Promise<User | null> {
    return this.repositorio.findOne({
      where: { email },
      select: ['id', 'name', 'email', 'password', 'isNotificationEnabled'],
    });
  }

  /** Inserta un usuario nuevo. Recibe el hash ya calculado. */
  async crear(datos: {
    name: string;
    email: string;
    passwordHash: string;
    isNotificationEnabled?: boolean;
  }): Promise<User> {
    const usuario = this.repositorio.create({
      name: datos.name,
      email: datos.email,
      password: datos.passwordHash,
      isNotificationEnabled: datos.isNotificationEnabled ?? true,
    });

    return this.repositorio.save(usuario);
  }
}
