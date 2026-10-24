import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ReportsRepository } from './reports.repository';
import { CreateReportDto } from './dto/create-report.dto';
import { Report } from './entities/report.entity';
import { EmailService } from '../email/email.service';
import { generateReportTemplate } from './templates/report.template';
import { envs } from '../config/envs';
import { ArchivoSubido, StorageService } from '../storage/storage.service';

/** Carpeta del bucket donde se guardan las fotos de los reportes. */
const CARPETA_FOTOS = 'reports';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly reportsRepository: ReportsRepository,
    private readonly emailService: EmailService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Sube la foto a S3, guarda el reporte con su URL y despues notifica a la cuadrilla.
   * - Si falla S3: no se guarda nada (503).
   * - Si falla la BD: se borra la foto recien subida para no dejarla huerfana (500).
   * - Si falla el correo: el reporte ya quedo guardado y la peticion no se rompe.
   */
  async crearReporte(dto: CreateReportDto, foto: ArchivoSubido): Promise<Report> {
    const photoUrl = await this.storageService.uploadFile(foto, CARPETA_FOTOS);

    let reporte: Report;
    try {
      reporte = await this.reportsRepository.crear(dto, photoUrl);
    } catch (error) {
      this.logger.error(`No se pudo guardar el reporte: ${(error as Error).message}`);
      await this.storageService.deleteFile(photoUrl);
      throw new InternalServerErrorException(
        'No se pudo registrar el reporte. Intenta de nuevo más tarde.',
      );
    }

    const enviado = await this.emailService.sendEmail(
      envs.correoMantenimiento,
      `Nuevo reporte de fuga de agua #${reporte.id} - severidad ${reporte.severity}`,
      generateReportTemplate(dto, photoUrl),
    );

    if (!enviado) {
      this.logger.warn(
        `El reporte ${reporte.id} se guardo, pero no se pudo notificar a la cuadrilla.`,
      );
    }

    return reporte;
  }

  /** Listado de reportes ordenado del mas reciente al mas antiguo. */
  async obtenerReportes(): Promise<Report[]> {
    return this.reportsRepository.obtenerTodos();
  }
}
