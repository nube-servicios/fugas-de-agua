// Pruebas unitarias con MOCKS (sin BD, S3 ni SMTP reales). Requieren `npm run build`.
// Ejecutar: npm test
const test = require('node:test');
const assert = require('node:assert/strict');

// Variables ficticias solo para poder cargar src/config/envs.ts.
Object.assign(process.env, {
  DB_HOST: 'localhost', DB_USERNAME: 'test', DB_PASSWORD: 'test', DB_NAME: 'test',
  MAIL_HOST: 'localhost', MAIL_PORT: '587', MAIL_USER: 'test', MAIL_PASSWORD: 'test',
  MAIL_FROM: 'Test <test@example.com>', MAINTENANCE_EMAIL: 'cuadrilla@example.com',
  AWS_REGION: 'us-east-1', AWS_S3_BUCKET: 'bucket-prueba', AWS_S3_PUBLIC_URL: '',
});

const { BadRequestException, InternalServerErrorException, ServiceUnavailableException } = require('@nestjs/common');
const { plainToInstance } = require('class-transformer');
const { validate } = require('class-validator');
const { PhotoValidationPipe } = require('../dist/reports/pipes/photo-validation.pipe');
const { generateReportTemplate } = require('../dist/reports/templates/report.template');
const { ReportsService } = require('../dist/reports/reports.service');
const { StorageService } = require('../dist/storage/storage.service');
const { CreateReportDto } = require('../dist/reports/dto/create-report.dto');

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]);
const DTO = {
  address: 'Calle <b>Hidalgo</b> 10',
  description: 'Fuga grande "con" <script>alert(1)</script>',
  severity: 'high',
  reporterPhone: '477 123 4567',
};
const URL_FOTO = 'https://bucket-prueba.s3.us-east-1.amazonaws.com/reports/abc.jpg';

test('pipe: sin foto -> 400', () => {
  assert.throws(() => new PhotoValidationPipe().transform(undefined), BadRequestException);
});

test('pipe: texto disfrazado de image/png -> 400', () => {
  const falso = { buffer: Buffer.from('esto no es una imagen, es texto'), mimetype: 'image/png', size: 31 };
  assert.throws(() => new PhotoValidationPipe().transform(falso), BadRequestException);
});

test('pipe: JPEG real se acepta y el Content-Type se toma del contenido', () => {
  const archivo = { buffer: JPEG, mimetype: 'application/octet-stream', size: JPEG.length };
  assert.equal(new PhotoValidationPipe().transform(archivo).mimetype, 'image/jpeg');
  const png = { buffer: PNG, mimetype: 'image/jpeg', size: PNG.length };
  assert.equal(new PhotoValidationPipe().transform(png).mimetype, 'image/png');
});

test('plantilla: incluye <img> con la URL, datos y escapa HTML', () => {
  const html = generateReportTemplate(DTO, URL_FOTO);
  assert.match(html, new RegExp(`<img src="${URL_FOTO.replace(/[.]/g, '\\.')}"`));
  assert.ok(html.includes('Calle &lt;b&gt;Hidalgo&lt;&#47;b&gt; 10'));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('477 123 4567'));
  assert.ok(html.includes('Alta (high)'));
});

test('plantilla: rechaza URLs que no son http(s)', () => {
  const html = generateReportTemplate(DTO, 'javascript:alert(1)');
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('javascript:'));
});

test('DTO: rechaza campos internos enviados por el ciudadano', async () => {
  const dto = plainToInstance(CreateReportDto, { ...DTO, isResolved: 'true', photoUrl: 'x', repairPhotoUrl: 'y' });
  const errores = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  const props = errores.map((e) => e.property).sort();
  assert.deepEqual(props, ['isResolved', 'photoUrl', 'repairPhotoUrl']);
});

function crearServicio({ falloS3 = false, falloBd = false, falloCorreo = false } = {}) {
  const llamadas = { subidas: [], borrados: [], guardados: [], correos: [] };
  const storage = {
    async uploadFile(file, folder) {
      llamadas.subidas.push(folder);
      if (falloS3) throw new ServiceUnavailableException('s3 caido');
      return URL_FOTO;
    },
    async deleteFile(url) { llamadas.borrados.push(url); },
  };
  const repo = {
    async crear(dto, photoUrl) {
      llamadas.guardados.push(photoUrl);
      if (falloBd) throw new Error('bd caida');
      return { id: 7, ...dto, photoUrl, repairPhotoUrl: null, isResolved: false };
    },
  };
  const email = {
    async sendEmail(to, subject, html) { llamadas.correos.push({ to, html }); return !falloCorreo; },
  };
  return { servicio: new ReportsService(repo, email, storage), llamadas };
}

const FOTO = { buffer: JPEG, mimetype: 'image/jpeg', size: JPEG.length };

test('servicio: flujo completo sube a reports/, guarda URL y manda correo con la foto', async () => {
  const { servicio, llamadas } = crearServicio();
  const reporte = await servicio.crearReporte(DTO, FOTO);
  assert.equal(reporte.photoUrl, URL_FOTO);
  assert.equal(reporte.repairPhotoUrl, null);
  assert.deepEqual(llamadas.subidas, ['reports']);
  assert.equal(llamadas.correos[0].to, 'cuadrilla@example.com');
  assert.ok(llamadas.correos[0].html.includes(`src="${URL_FOTO}"`));
});

test('servicio: si falla S3 no se guarda nada', async () => {
  const { servicio, llamadas } = crearServicio({ falloS3: true });
  await assert.rejects(servicio.crearReporte(DTO, FOTO), ServiceUnavailableException);
  assert.equal(llamadas.guardados.length, 0);
  assert.equal(llamadas.correos.length, 0);
});

test('servicio: si falla la BD se borra la foto (sin huerfanos) y responde 500', async () => {
  const { servicio, llamadas } = crearServicio({ falloBd: true });
  await assert.rejects(servicio.crearReporte(DTO, FOTO), InternalServerErrorException);
  assert.deepEqual(llamadas.borrados, [URL_FOTO]);
  assert.equal(llamadas.correos.length, 0);
});

test('servicio: si falla el correo el reporte igual se devuelve', async () => {
  const { servicio } = crearServicio({ falloCorreo: true });
  const reporte = await servicio.crearReporte(DTO, FOTO);
  assert.equal(reporte.id, 7);
});

test('storage: nombre unico bajo la carpeta, Content-Type y URL publica', async () => {
  const comandos = [];
  const cliente = { async send(cmd) { comandos.push(cmd); return {}; } };
  const storage = new StorageService(cliente);
  const url1 = await storage.uploadFile(FOTO, 'reports');
  const url2 = await storage.uploadFile(FOTO, 'reports');
  assert.notEqual(url1, url2);
  assert.match(url1, /^https:\/\/bucket-prueba\.s3\.us-east-1\.amazonaws\.com\/reports\/[0-9a-f-]{36}\.jpg$/);
  assert.equal(comandos[0].input.ContentType, 'image/jpeg');
  assert.equal(comandos[0].input.Bucket, 'bucket-prueba');

  await storage.deleteFile(url1);
  assert.equal(comandos[2].input.Key, url1.split('.amazonaws.com/')[1]);
});

test('storage: error de S3 -> 503 controlado', async () => {
  const cliente = { async send() { throw new Error('AccessDenied'); } };
  await assert.rejects(new StorageService(cliente).uploadFile(FOTO, 'reports'), ServiceUnavailableException);
});
