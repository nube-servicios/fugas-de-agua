import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { envs } from '../config/envs';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transportador: Transporter;

  constructor() {
    this.transportador = nodemailer.createTransport({
      host: envs.correo.host,
      port: envs.correo.puerto,
      secure: envs.correo.seguro,
      auth: {
        user: envs.correo.usuario,
        pass: envs.correo.contrasena,
      },
    });
  }

  /**
   * Envia un correo en formato HTML.
   * Devuelve true si el envio fue aceptado por el servidor SMTP y false si fallo.
   * No lanza excepcion para no tumbar la operacion de negocio que lo invoco.
   */
  async sendEmail(to: string, subject: string, template: string): Promise<boolean> {
    try {
      await this.transportador.sendMail({
        from: envs.correo.remitente,
        to,
        subject,
        html: template,
      });

      this.logger.log(`Correo enviado a ${to} con asunto "${subject}"`);
      return true;
    } catch (error) {
      this.logger.error(
        `No se pudo enviar el correo a ${to}: ${(error as Error).message}`,
      );
      return false;
    }
  }
}
