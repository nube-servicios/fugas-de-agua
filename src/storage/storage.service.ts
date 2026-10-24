import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { envs } from '../config/envs';

/** Archivo minimo que necesita el servicio (compatible con Express.Multer.File). */
export interface ArchivoSubido {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

/** Extension que se usa en la clave de S3 segun el Content-Type. */
const EXTENSIONES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly bucket = envs.s3.bucket;
  private readonly urlBase: string;

  constructor(private readonly cliente: S3Client) {
    // Sin URL publica configurada se usa la URL virtual-hosted del bucket.
    this.urlBase = (
      envs.s3.urlPublica || `https://${this.bucket}.s3.${envs.s3.region}.amazonaws.com`
    ).replace(/\/+$/, '');
  }

  /**
   * Sube el archivo a S3 bajo `folder/` con un nombre unico y devuelve su URL publica.
   * El Content-Type se toma del archivo ya validado por el pipe de fotografias.
   */
  async uploadFile(file: ArchivoSubido, folder: string): Promise<string> {
    const carpeta = folder.replace(/^\/+|\/+$/g, '');
    const clave = `${carpeta}/${randomUUID()}${EXTENSIONES[file.mimetype] ?? ''}`;

    try {
      await this.cliente.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: clave,
          Body: file.buffer,
          ContentType: file.mimetype,
          ContentLength: file.size,
          // El nombre es unico e inmutable: se puede cachear sin riesgo.
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
    } catch (error) {
      this.logger.error(`No se pudo subir ${clave} a S3: ${(error as Error).message}`);
      throw new ServiceUnavailableException(
        'No se pudo guardar la fotografía. Intenta de nuevo más tarde.',
      );
    }

    this.logger.log(`Archivo subido a s3://${this.bucket}/${clave}`);
    return `${this.urlBase}/${clave}`;
  }

  /**
   * Borra un archivo a partir de la URL que devolvio uploadFile.
   * No lanza excepcion: se usa como limpieza y solo deja constancia en el log.
   */
  async deleteFile(url: string): Promise<void> {
    if (!url.startsWith(`${this.urlBase}/`)) {
      this.logger.warn(`URL ajena al bucket, no se borra: ${url}`);
      return;
    }

    const clave = url.slice(this.urlBase.length + 1);

    try {
      await this.cliente.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: clave }));
      this.logger.log(`Archivo eliminado de s3://${this.bucket}/${clave}`);
    } catch (error) {
      this.logger.error(
        `No se pudo borrar s3://${this.bucket}/${clave}; queda huerfano: ${(error as Error).message}`,
      );
    }
  }
}
