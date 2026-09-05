import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { User } from './entities/user.entity';

/** Usuario sin el hash de contrasena: es lo unico que sale de esta capa. */
export type UsuarioPublico = Omit<User, 'password'>;

const RONDAS_SALT = 10;
const MENSAJE_CREDENCIALES = 'Correo electrónico o contraseña inválidos.';

@Injectable()
export class AuthService {
  constructor(private readonly usersRepository: UsersRepository) {}

  /** Registra un usuario nuevo hasheando la contrasena con bcryptjs. */
  async registrar(dto: CreateUserDto): Promise<UsuarioPublico> {
    const existente = await this.usersRepository.buscarPorCorreo(dto.email);

    if (existente) {
      throw new ConflictException('El correo electrónico ya está registrado.');
    }

    const passwordHash = await bcrypt.hash(dto.password, RONDAS_SALT);

    const usuario = await this.usersRepository.crear({
      name: dto.name,
      email: dto.email,
      passwordHash,
      isNotificationEnabled: dto.isNotificationEnabled,
    });

    return this.sinPassword(usuario);
  }

  /** Valida credenciales. Nunca revela si fallo el correo o la contrasena. */
  async iniciarSesion(dto: LoginDto): Promise<UsuarioPublico> {
    const usuario = await this.usersRepository.buscarPorCorreoConPassword(dto.email);

    if (!usuario) {
      throw new BadRequestException(MENSAJE_CREDENCIALES);
    }

    const esValida = await bcrypt.compare(dto.password, usuario.password);

    if (!esValida) {
      throw new BadRequestException(MENSAJE_CREDENCIALES);
    }

    return this.sinPassword(usuario);
  }

  /** Quita el hash del objeto antes de devolverlo al cliente. */
  private sinPassword(usuario: User): UsuarioPublico {
    const { password, ...usuarioPublico } = usuario;
    return usuarioPublico;
  }
}
