import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @IsEmail({}, { message: 'email debe ser un correo valido.' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;

  /**
   * En el login NO se validan longitud ni complejidad a proposito:
   * esas reglas solo aplican al registro. Aqui cualquier credencial mal
   * formada debe caer en el mismo mensaje generico del AuthService para
   * no filtrar la politica de contrasenas ni permitir enumerar usuarios.
   */
  @IsString({ message: 'password debe ser texto.' })
  @IsNotEmpty({ message: 'password es obligatorio.' })
  password: string;
}
