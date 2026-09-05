import { IsIn, IsString, Length, Matches } from 'class-validator';
import { SEVERIDADES_PERMITIDAS, Severidad } from '../entities/report.entity';

/**
 * Datos que envia el ciudadano al reportar una fuga.
 * isResolved NO se incluye a proposito: marcar un reporte como atendido es
 * una accion de la cuadrilla, no del ciudadano. Con forbidNonWhitelisted
 * activo, mandarlo en el body devuelve 400.
 */
export class CreateReportDto {
  @IsString({ message: 'address debe ser texto.' })
  @Length(5, 255, { message: 'address debe tener entre 5 y 255 caracteres.' })
  address: string;

  @IsString({ message: 'description debe ser texto.' })
  @Length(10, 500, { message: 'description debe tener entre 10 y 500 caracteres.' })
  description: string;

  @IsIn(SEVERIDADES_PERMITIDAS, {
    message: `severity solo puede ser: ${SEVERIDADES_PERMITIDAS.join(', ')}.`,
  })
  severity: Severidad;

  @IsString({ message: 'reporterPhone debe ser texto.' })
  @Length(7, 20, { message: 'reporterPhone debe tener entre 7 y 20 caracteres.' })
  @Matches(/^[0-9+\-\s()]+$/, {
    message: 'reporterPhone solo admite numeros y los signos + - ( ) y espacios.',
  })
  reporterPhone: string;
}
