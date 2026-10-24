import { Module } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import { StorageService } from './storage.service';
import { envs } from '../config/envs';

@Module({
  providers: [
    {
      // Credenciales por la cadena estandar del SDK (variables AWS_*, perfil o rol).
      provide: S3Client,
      useFactory: () => new S3Client({ region: envs.s3.region }),
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}
