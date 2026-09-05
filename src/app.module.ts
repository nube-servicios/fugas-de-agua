import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { opcionesBaseDeDatos } from './database/data-source';
import { ReportsModule } from './reports/reports.module';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(opcionesBaseDeDatos),
    ReportsModule,
    AuthModule,
    EmailModule,
  ],
})
export class AppModule {}
