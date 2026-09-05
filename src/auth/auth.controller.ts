import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService, UsuarioPublico } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** POST /auth/register - crea un usuario. Responde sin la contrasena. */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async registrar(@Body() createUserDto: CreateUserDto): Promise<UsuarioPublico> {
    return this.authService.registrar(createUserDto);
  }

  /** POST /auth/login - valida credenciales. Responde sin la contrasena. */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async iniciarSesion(@Body() loginDto: LoginDto): Promise<UsuarioPublico> {
    return this.authService.iniciarSesion(loginDto);
  }
}
