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
const MENSAJE_CORREO_DUPLICADO = 'El correo electrónico ya está registrado.';
/** Codigo de PostgreSQL para violacion de restriccion unique. */
const CODIGO_UNIQUE_VIOLATION = '23505';

@Injectable()
export class AuthService {
  constructor(private readonly usersRepository: UsersRepository) {}

  /** Registra un usuario nuevo hasheando la contrasena con bcryptjs. */
  async registrar(dto: CreateUserDto): Promise<UsuarioPublico> {
    const existente = await this.usersRepository.buscarPorCorreo(dto.email);

    if (existente) {
      throw new ConflictException(MENSAJE_CORREO_DUPLICADO);
    }

    const passwordHash = await bcrypt.hash(dto.password, RONDAS_SALT);

    try {
      const usuario = await this.usersRepository.crear({
        name: dto.name,
        email: dto.email,
        passwordHash,
        isNotificationEnabled: dto.isNotificationEnabled,
      });

      return this.sinPassword(usuario);
    } catch (error) {
      // Dos peticiones simultaneas pueden pasar la consulta previa y chocar
      // en el INSERT. La restriccion unique de la BD es la fuente de verdad.
      if ((error as { driverError?: { code?: string }; code?: string })?.driverError?.code === CODIGO_UNIQUE_VIOLATION ||
        (error as { code?: string })?.code === CODIGO_UNIQUE_VIOLATION) {
        throw new ConflictException(MENSAJE_CORREO_DUPLICADO);
      }

      throw error;
    }
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
