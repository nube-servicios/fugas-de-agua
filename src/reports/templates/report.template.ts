import { CreateReportDto } from '../dto/create-report.dto';

/** Etiquetas legibles para la severidad reportada. */
const ETIQUETAS_SEVERIDAD: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
};

/** Color de acento segun la severidad. */
const COLORES_SEVERIDAD: Record<string, string> = {
  low: '#2e7d32',
  medium: '#ed6c02',
  high: '#c62828',
};

/**
 * Escapa los caracteres con significado en HTML para evitar inyeccion
 * de marcado a traves de los datos que envia el ciudadano.
 */
export function escaparHtml(valor: unknown): string {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\//g, '&#47;');
}

/**
 * Prepara una URL para un atributo src/href: solo acepta http(s) y escapa
 * los caracteres que podrian cerrar el atributo. Cualquier otra cosa -> ''.
 */
export function escaparUrl(url: unknown): string {
  const texto = String(url ?? '').trim();
  if (!/^https?:\/\//i.test(texto)) return '';

  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Bloque HTML con la fotografia de la fuga (o un aviso si no hay URL valida). */
function bloqueFotografia(photoUrl: string): string {
  const url = escaparUrl(photoUrl);

  if (!url) {
    return `<p style="margin:20px 0 0;font-size:13px;color:#616161;">El reporte no incluye fotografia.</p>`;
  }

  return `<p style="margin:20px 0 8px;font-size:14px;font-weight:bold;">Fotografia de la fuga</p>
          <a href="${url}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
            <img src="${url}" alt="Fotografia de la fuga reportada" width="572" style="display:block;width:100%;max-width:572px;height:auto;border:1px solid #e0e0e0;border-radius:6px;" />
          </a>
          <p style="margin:8px 0 0;font-size:12px;color:#616161;">
            Si la imagen no se muestra, <a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#0d47a1;">abrela aqui</a>.
          </p>`;
}

/**
 * Genera el HTML del correo que recibe la cuadrilla de mantenimiento.
 * Todos los valores dinamicos se escapan antes de interpolarse.
 */
export function generateReportTemplate(dto: CreateReportDto, photoUrl: string): string {
  const direccion = escaparHtml(dto.address);
  const descripcion = escaparHtml(dto.description);
  const telefono = escaparHtml(dto.reporterPhone);
  const severidadClave = escaparHtml(dto.severity);
  const severidadTexto = escaparHtml(
    ETIQUETAS_SEVERIDAD[dto.severity] ?? dto.severity,
  );
  const colorSeveridad = COLORES_SEVERIDAD[dto.severity] ?? '#37474f';
  const fecha = escaparHtml(
    new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }),
  );

  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Nuevo reporte de fuga de agua</title>
  </head>
  <body style="margin:0;padding:24px;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#212121;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:620px;margin:0 auto;background-color:#ffffff;border-radius:8px;border:1px solid #e0e0e0;">
      <tr>
        <td style="padding:20px 24px;background-color:#0d47a1;border-radius:8px 8px 0 0;">
          <h1 style="margin:0;font-size:20px;color:#ffffff;">Nuevo reporte de fuga de agua</h1>
          <p style="margin:6px 0 0;font-size:13px;color:#bbdefb;">Sistema municipal de atencion ciudadana</p>
        </td>
      </tr>
      <tr>
        <td style="padding:24px;">
          <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">
            Se registro un nuevo reporte ciudadano el <strong>${fecha}</strong>.
            A continuacion se muestran los datos para su atencion.
          </p>

          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;font-size:14px;">
            <tr>
              <td style="padding:10px 12px;background-color:#f5f5f5;border:1px solid #e0e0e0;width:170px;font-weight:bold;">Direccion</td>
              <td style="padding:10px 12px;border:1px solid #e0e0e0;">${direccion}</td>
            </tr>
            <tr>
              <td style="padding:10px 12px;background-color:#f5f5f5;border:1px solid #e0e0e0;font-weight:bold;">Descripcion</td>
              <td style="padding:10px 12px;border:1px solid #e0e0e0;">${descripcion}</td>
            </tr>
            <tr>
              <td style="padding:10px 12px;background-color:#f5f5f5;border:1px solid #e0e0e0;font-weight:bold;">Severidad</td>
              <td style="padding:10px 12px;border:1px solid #e0e0e0;">
                <span style="display:inline-block;padding:4px 10px;border-radius:12px;background-color:${colorSeveridad};color:#ffffff;font-weight:bold;font-size:12px;">
                  ${severidadTexto} (${severidadClave})
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 12px;background-color:#f5f5f5;border:1px solid #e0e0e0;font-weight:bold;">Telefono de contacto</td>
              <td style="padding:10px 12px;border:1px solid #e0e0e0;">${telefono}</td>
            </tr>
          </table>

          ${bloqueFotografia(photoUrl)}

          <p style="margin:20px 0 0;font-size:13px;line-height:1.5;color:#616161;">
            Favor de programar la inspeccion correspondiente y actualizar el estado del
            reporte una vez atendido.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 24px;background-color:#eceff1;border-radius:0 0 8px 8px;font-size:12px;color:#607d8b;">
          Correo generado automaticamente. Por favor no responda a este mensaje.
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
