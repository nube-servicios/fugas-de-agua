import { Injectable, Logger } from '@nestjs/common';
import { ReportsRepository } from './reports.repository';
import { CreateReportDto } from './dto/create-report.dto';
import { Report } from './entities/report.entity';
import { EmailService } from '../email/email.service';
import { generateReportTemplate } from './templates/report.template';
import { envs } from '../config/envs';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly reportsRepository: ReportsRepository,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Guarda el reporte y despues notifica por correo a la cuadrilla.
   * Si el correo falla, el reporte ya quedo guardado y la peticion no se rompe.
   */
  async crearReporte(dto: CreateReportDto): Promise<Report> {
    const reporte = await this.reportsRepository.crear(dto);

    const enviado = await this.emailService.sendEmail(
      envs.correoMantenimiento,
      `Nuevo reporte de fuga de agua #${reporte.id} - severidad ${reporte.severity}`,
      generateReportTemplate(dto),
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
