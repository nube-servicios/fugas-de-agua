import { IsEmail, IsString, Length } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @IsEmail({}, { message: 'email debe ser un correo valido.' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;

  @IsString({ message: 'password debe ser texto.' })
  @Length(8, 72, { message: 'password debe tener entre 8 y 72 caracteres.' })
  password: string;
}
