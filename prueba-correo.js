// Script temporal: verifica credenciales SMTP y manda un correo de prueba real.
require('dotenv').config();
const nodemailer = require('nodemailer');
const { generateReportTemplate } = require('./dist/reports/templates/report.template.js');

(async () => {
  const transportador = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT),
    secure: process.env.MAIL_SECURE === 'true',
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASSWORD },
    connectionTimeout: 20000,
    greetingTimeout: 20000,
  });

  try {
    await transportador.verify();
    console.log('CREDENCIALES: OK (Gmail acepto el login)');
  } catch (e) {
    console.log('CREDENCIALES: FALLO ->', e.message);
    process.exit(1);
  }

  const dto = {
    address: 'Blvd. Adolfo Lopez Mateos 1500, Leon, Gto.',
    description: 'Fuga constante en la banqueta, el agua llega hasta la esquina.',
    severity: 'high',
    reporterPhone: '4771234567',
  };

  const info = await transportador.sendMail({
    from: process.env.MAIL_FROM,
    to: process.env.MAINTENANCE_EMAIL,
    subject: 'Prueba - Nuevo reporte de fuga de agua #1 - severidad high',
    // Uso: TEST_PHOTO_URL=https://... node prueba-correo.js (sin URL el correo avisa que no hay foto)
    html: generateReportTemplate(dto, process.env.TEST_PHOTO_URL || ''),
  });

  console.log('ENVIO: OK ->', info.response);
  console.log('DESTINO:', process.env.MAINTENANCE_EMAIL);
})().catch((e) => { console.log('ERROR:', e.message); process.exit(1); });
