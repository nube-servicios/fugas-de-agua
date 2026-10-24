import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { Report } from './entities/report.entity';
import { PhotoValidationPipe } from './pipes/photo-validation.pipe';
import { envs } from '../config/envs';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * POST /reports (multipart/form-data) - registra una fuga con su fotografia
   * (campo "photo") y notifica a mantenimiento.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('photo', {
      // En memoria: el archivo se manda directo a S3 y nunca toca el disco.
      storage: memoryStorage(),
      limits: {
        fileSize: Math.floor(envs.fotoTamanoMaximoMb * 1024 * 1024),
        files: 1,
        fields: 10,
      },
    }),
  )
  async crear(
    @Body() createReportDto: CreateReportDto,
    @UploadedFile(PhotoValidationPipe) photo: Express.Multer.File,
  ): Promise<Report> {
    return this.reportsService.crearReporte(createReportDto, photo);
  }

  /** GET /reports - lista los reportes del mas reciente al mas antiguo. */
  @Get()
  async listar(): Promise<Report[]> {
    return this.reportsService.obtenerReportes();
  }
}
