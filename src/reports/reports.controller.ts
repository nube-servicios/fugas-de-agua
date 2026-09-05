import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { Report } from './entities/report.entity';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /** POST /reports - registra una fuga y notifica a mantenimiento. */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async crear(@Body() createReportDto: CreateReportDto): Promise<Report> {
    return this.reportsService.crearReporte(createReportDto);
  }

  /** GET /reports - lista los reportes del mas reciente al mas antiguo. */
  @Get()
  async listar(): Promise<Report[]> {
    return this.reportsService.obtenerReportes();
  }
}
