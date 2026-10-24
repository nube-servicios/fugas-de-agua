import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from './entities/report.entity';
import { CreateReportDto } from './dto/create-report.dto';

/**
 * Capa de acceso a datos de los reportes.
 * Es la unica que conoce TypeORM; el service nunca habla directo con la BD.
 */
@Injectable()
export class ReportsRepository {
  constructor(
    @InjectRepository(Report)
    private readonly repositorio: Repository<Report>,
  ) {}

  /**
   * Inserta un nuevo reporte y devuelve la fila creada.
   * Solo se copian campos explicitos: nada que mande el ciudadano llega a
   * isResolved, photoUrl ni repairPhotoUrl.
   */
  async crear(dto: CreateReportDto, photoUrl: string): Promise<Report> {
    const reporte = this.repositorio.create({
      address: dto.address,
      description: dto.description,
      severity: dto.severity,
      reporterPhone: dto.reporterPhone,
      photoUrl,
      // La foto de reparacion la asignaria la cuadrilla; al crear siempre es null.
      repairPhotoUrl: null,
      // Todo reporte nace sin atender; solo la cuadrilla puede cambiarlo.
      isResolved: false,
    });

    return this.repositorio.save(reporte);
  }

  /**
   * Devuelve todos los reportes del mas reciente al mas antiguo.
   * photoUrl y repairPhotoUrl salen siempre: null cuando no hay foto.
   */
  async obtenerTodos(): Promise<Report[]> {
    return this.repositorio.find({
      order: { createdAt: 'DESC', id: 'DESC' },
    });
  }
}
