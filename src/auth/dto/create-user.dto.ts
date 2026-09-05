import { IsBoolean, IsEmail, IsOptional, IsString, Length, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @IsString({ message: 'name debe ser texto.' })
  @Length(3, 120, { message: 'name debe tener entre 3 y 120 caracteres.' })
  name: string;

  @IsEmail({}, { message: 'email debe ser un correo valido.' })
  @Length(5, 180, { message: 'email debe tener entre 5 y 180 caracteres.' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;

  @IsString({ message: 'password debe ser texto.' })
  @Length(8, 72, { message: 'password debe tener entre 8 y 72 caracteres.' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'password debe incluir al menos una minuscula, una mayuscula y un numero.',
  })
  password: string;

  @IsOptional()
  @IsBoolean({ message: 'isNotificationEnabled debe ser booleano.' })
  isNotificationEnabled?: boolean;
}
