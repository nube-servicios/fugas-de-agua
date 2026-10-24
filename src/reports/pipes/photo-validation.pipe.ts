import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

/** Tipos de imagen aceptados: los que cualquier cliente de correo puede mostrar. */
export const TIPOS_FOTO_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'] as const;

/**
 * Detecta el tipo real de la imagen por sus primeros bytes ("numeros magicos").
 * El Content-Type que manda el cliente se puede falsificar; el contenido no.
 */
export function detectarTipoImagen(buffer: Buffer): string | null {
  if (!buffer || buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';

  const firmaPng = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (firmaPng.every((byte, i) => buffer[i] === byte)) return 'image/png';

  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }

  return null;
}

/**
 * Valida la fotografia de POST /reports: obligatoria y con contenido de imagen real.
 * El tamano maximo lo corta antes multer (limits.fileSize) para no cargarlo entero.
 */
@Injectable()
export class PhotoValidationPipe implements PipeTransform {
  transform(file: Express.Multer.File | undefined): Express.Multer.File {
    if (!file) {
      throw new BadRequestException(
        'La fotografía de la fuga es obligatoria (campo "photo").',
      );
    }

    const tipoReal = detectarTipoImagen(file.buffer);

    if (!tipoReal || !TIPOS_FOTO_PERMITIDOS.includes(tipoReal as never)) {
      throw new BadRequestException(
        `La fotografía debe ser una imagen ${TIPOS_FOTO_PERMITIDOS.map((t) => t.split('/')[1]).join(', ')}.`,
      );
    }

    // A partir de aqui el Content-Type es el detectado, no el que dijo el cliente.
    file.mimetype = tipoReal;
    return file;
  }
}
