import { Resend } from 'resend';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = `${process.env.FROM_NAME || 'Teramy'} <${process.env.FROM_EMAIL || 'onboarding@resend.dev'}>`;
const TZ = 'America/Santiago';

// ─── Helpers ────────────────────────────────────────────────────────────────

function toSantiago(iso: string): Date {
  return new Date(new Date(iso).toLocaleString('en-US', { timeZone: TZ }));
}

function formatDate(iso: string): string {
  return format(toSantiago(iso), "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
}

function formatTime(iso: string): string {
  return format(toSantiago(iso), 'HH:mm', { locale: es });
}

export function buildCalendarUrl(params: {
  title: string;
  startTime: string;
  endTime: string;
  description?: string;
}): string {
  const start = new Date(params.startTime)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace('.000', '');
  const end = new Date(params.endTime)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace('.000', '');
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: params.title,
    dates: `${start}/${end}`,
    details: params.description || '',
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

// ─── SVG Icons ───────────────────────────────────────────────────────────────

const ic = {
  user: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  file: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  calendar: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px;"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  clock: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  mapPin: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px;"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  video: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px;"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>`,
  price: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px;"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  check: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:8px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  calendarPlus: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px;"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="15" x2="12" y2="19"/><line x1="10" y1="17" x2="14" y2="17"/></svg>`,
  externalLink: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
};

// ─── Shared layout ───────────────────────────────────────────────────────────

function layout(
  content: string,
  psych?: { name: string; title?: string | null; photoUrl?: string | null }
): string {
  const profileHeader = psych
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;padding-bottom:24px;border-bottom:1px solid #f1f5f9;">
        <tr>
          <td width="56" valign="top" style="padding-right:16px;">
            ${psych.photoUrl 
              ? `<img src="${psych.photoUrl}" width="56" height="56" style="border-radius:50%;object-fit:cover;display:block;border:1px solid #e2e8f0;" alt="${psych.name}" />`
              : `<div style="width:56px;height:56px;border-radius:50%;background:#eff6ff;color:#2563eb;font-size:18px;font-weight:700;line-height:56px;text-align:center;text-transform:uppercase;border:1px solid #bfdbfe;">
                  ${psych.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                 </div>`
            }
          </td>
          <td valign="middle">
            <h3 style="margin:0;color:#0f172a;font-size:18px;font-weight:700;line-height:1.2;">${psych.name}</h3>
            ${psych.title ? `<p style="margin:4px 0 0;color:#64748b;font-size:13px;line-height:1.2;">${psych.title}</p>` : ''}
          </td>
        </tr>
      </table>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Notificación de Cita</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;box-shadow:0 4px 12px rgba(15,23,42,0.03);overflow:hidden;">
          <tr>
            <td style="padding:32px;">
              ${profileHeader}
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0 0 6px;color:#94a3b8;font-size:11px;line-height:1.4;">Este es un correo automático enviado a nombre de tu terapeuta.</p>
              <p style="margin:0;color:#94a3b8;font-size:11px;line-height:1.4;">Tecnología de agendamiento provista por <a href="https://teramy.com" target="_blank" style="color:#2563eb;text-decoration:none;font-weight:600;">Teramy</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function infoRow(icon: string, label: string, value: string): string {
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
      <span style="color:#64748b;font-size:14px;line-height:1.5;">${icon}<strong style="color:#0f172a;"> ${label}:</strong> ${value}</span>
    </td>
  </tr>`;
}

function primaryButton(href: string, text: string): string {
  return `<a href="${href}" target="_blank"
    style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;
    padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;margin-top:20px;box-shadow:0 4px 12px rgba(37,99,235,0.18);">
    ${text}
  </a>`;
}

function secondaryButton(href: string, text: string): string {
  return `<a href="${href}" target="_blank"
    style="display:inline-block;border:1px solid #e2e8f0;color:#334155;text-decoration:none;
    padding:10px 24px;border-radius:8px;font-size:13px;font-weight:600;margin-top:10px;background:#ffffff;">
    ${text}
  </a>`;
}

// ─── Booking confirmation ────────────────────────────────────────────────────

export interface BookingConfirmationData {
  to: string;
  patientName: string;
  psychologistName: string;
  psychologistTitle?: string;
  psychologistPhotoUrl?: string;
  startTime: string;
  endTime: string;
  modality: 'online' | 'presencial';
  videoUrl?: string | null;
  videoType?: 'meet' | 'zoom' | null;
  officeAddress?: string | null;
  serviceName?: string;
  price?: number;
}

export async function sendBookingConfirmation(data: BookingConfirmationData) {
  const dateStr = formatDate(data.startTime);
  const timeStr = formatTime(data.startTime);
  const calUrl = buildCalendarUrl({
    title: `Sesión con ${data.psychologistName}`,
    startTime: data.startTime,
    endTime: data.endTime,
    description: data.videoUrl ? `Enlace de sesión: ${data.videoUrl}` : '',
  });

  const locationSection = data.modality === 'online' && data.videoUrl
    ? `<tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
        <span style="color:#64748b;font-size:14px;line-height:1.5;">
          ${ic.video}<strong style="color:#0f172a;"> Enlace de sesión:</strong>
          <a href="${data.videoUrl}" style="color:#2563eb;">${data.videoUrl}</a>
        </span>
      </td></tr>`
    : data.modality === 'presencial' && data.officeAddress
    ? `<tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
        <span style="color:#64748b;font-size:14px;line-height:1.5;">
          ${ic.mapPin}<strong style="color:#0f172a;"> Dirección:</strong> ${data.officeAddress}
        </span>
      </td></tr>`
    : '';

  const actionButton = data.modality === 'online' && data.videoUrl
    ? primaryButton(data.videoUrl, `${ic.externalLink}Unirse a la sesión`)
    : data.modality === 'presencial' && data.officeAddress
    ? primaryButton(`https://maps.google.com/?q=${encodeURIComponent(data.officeAddress)}`, `${ic.mapPin}Ver en Google Maps`)
    : '';

  const priceSection = data.price && data.price > 0
    ? infoRow(ic.price, 'Valor', `$${data.price.toLocaleString('es-CL')}`)
    : '';

  const html = layout(`
    <h2 style="margin:0 0 6px;color:#0f172a;font-size:20px;font-weight:700;">Sesión confirmada</h2>
    <p style="margin:0 0 24px;color:#64748b;font-size:15px;">Hola <strong>${data.patientName}</strong>, aquí están los detalles de tu sesión:</p>

    <table width="100%" cellpadding="0" cellspacing="0">
      ${data.serviceName ? infoRow(ic.file, 'Tipo de sesión', data.serviceName) : ''}
      ${infoRow(ic.calendar, 'Fecha', dateStr.charAt(0).toUpperCase() + dateStr.slice(1))}
      ${infoRow(ic.clock, 'Hora', `${timeStr} hrs (hora de Santiago)`)}
      ${infoRow(ic.mapPin, 'Modalidad', data.modality === 'online' ? 'Online' : 'Presencial')}
      ${locationSection}
      ${priceSection}
    </table>

    <div style="text-align:center;margin-top:8px;">
      ${actionButton}
      ${secondaryButton(calUrl, `${ic.calendarPlus}Agregar al calendario`)}
    </div>

    <div style="margin-top:28px;padding:16px;background:#f0f9ff;border-radius:10px;border-left:3px solid #0ea5e9;">
      <p style="margin:0;color:#0369a1;font-size:13px;line-height:1.4;">
        ¿Necesitas cancelar o reagendar? Contacta a tu psicólogo/a con anticipación.
      </p>
    </div>
  `, { name: data.psychologistName, title: data.psychologistTitle, photoUrl: data.psychologistPhotoUrl });

  return resend.emails.send({
    from: FROM,
    to: data.to,
    subject: `Sesión confirmada con ${data.psychologistName} — ${dateStr}`,
    html,
  });
}

// ─── Cancellation ────────────────────────────────────────────────────────────

export interface CancellationEmailData {
  to: string;
  patientName: string;
  psychologistName: string;
  psychologistTitle?: string;
  psychologistPhotoUrl?: string;
  startTime: string;
  bookingUrl?: string;
}

export async function sendCancellationEmail(data: CancellationEmailData) {
  const dateStr = formatDate(data.startTime);
  const timeStr = formatTime(data.startTime);

  const html = layout(`
    <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;font-weight:700;">Sesión cancelada</h2>
    <p style="margin:0 0 24px;color:#64748b;font-size:15px;">
      Hola <strong>${data.patientName}</strong>, te informamos que tu sesión ha sido cancelada.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0">
      ${infoRow(ic.calendar, 'Fecha cancelada', dateStr.charAt(0).toUpperCase() + dateStr.slice(1))}
      ${infoRow(ic.clock, 'Hora', `${timeStr} hrs`)}
    </table>

    <div style="margin-top:24px;padding:16px;background:#fffbeb;border-radius:10px;border-left:3px solid #f59e0b;">
      <p style="margin:0;color:#92400e;font-size:14px;line-height:1.4;">
        Puedes reagendar cuando lo necesites. Tu psicólogo/a estará disponible para una nueva sesión.
      </p>
    </div>

    ${data.bookingUrl ? `<div style="text-align:center;margin-top:8px;">${primaryButton(data.bookingUrl, `${ic.calendarPlus}Reagendar sesión`)}</div>` : ''}
  `, { name: data.psychologistName, title: data.psychologistTitle, photoUrl: data.psychologistPhotoUrl });

  return resend.emails.send({
    from: FROM,
    to: data.to,
    subject: `Sesión cancelada — ${data.psychologistName}`,
    html,
  });
}

// ─── Reschedule ──────────────────────────────────────────────────────────────

export interface RescheduleEmailData {
  to: string;
  patientName: string;
  psychologistName: string;
  psychologistTitle?: string;
  psychologistPhotoUrl?: string;
  oldStartTime: string;
  newStartTime: string;
  newEndTime: string;
  modality: 'online' | 'presencial';
  videoUrl?: string | null;
  videoType?: 'meet' | 'zoom' | null;
  officeAddress?: string | null;
}

export async function sendRescheduleEmail(data: RescheduleEmailData) {
  const oldDateStr = formatDate(data.oldStartTime);
  const oldTimeStr = formatTime(data.oldStartTime);
  const newDateStr = formatDate(data.newStartTime);
  const newTimeStr = formatTime(data.newStartTime);
  const calUrl = buildCalendarUrl({
    title: `Sesión con ${data.psychologistName}`,
    startTime: data.newStartTime,
    endTime: data.newEndTime,
    description: data.videoUrl ? `Enlace de sesión: ${data.videoUrl}` : '',
  });

  const html = layout(`
    <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;font-weight:700;">Sesión reagendada</h2>
    <p style="margin:0 0 24px;color:#64748b;font-size:15px;">
      Hola <strong>${data.patientName}</strong>, tu sesión ha sido reagendada.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr>
        <td style="padding:14px;background:#fef2f2;border-radius:10px;border-left:3px solid #f87171;">
          <p style="margin:0 0 4px;color:#991b1b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;">Hora anterior</p>
          <p style="margin:0;color:#7f1d1d;font-size:14px;font-weight:600;">${oldDateStr.charAt(0).toUpperCase() + oldDateStr.slice(1)}</p>
          <p style="margin:2px 0 0;color:#7f1d1d;font-size:13px;">${oldTimeStr} hrs</p>
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:14px;background:#f0fdf4;border-radius:10px;border-left:3px solid #4ade80;">
          <p style="margin:0 0 4px;color:#166534;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;">Nueva hora</p>
          <p style="margin:0;color:#14532d;font-size:16px;font-weight:700;">${newDateStr.charAt(0).toUpperCase() + newDateStr.slice(1)}</p>
          <p style="margin:2px 0 0;color:#14532d;font-size:15px;font-weight:600;">${newTimeStr} hrs (hora de Santiago)</p>
        </td>
      </tr>
    </table>

    ${data.modality === 'online' && data.videoUrl
      ? `<table width="100%" cellpadding="0" cellspacing="0">
          ${infoRow(ic.video, 'Enlace de sesión', `<a href="${data.videoUrl}" style="color:#2563eb;">${data.videoUrl}</a>`)}
        </table>`
      : data.modality === 'presencial' && data.officeAddress
      ? `<table width="100%" cellpadding="0" cellspacing="0">
          ${infoRow(ic.mapPin, 'Dirección', data.officeAddress)}
        </table>`
      : ''}

    <div style="text-align:center;margin-top:8px;">
      ${data.modality === 'online' && data.videoUrl ? primaryButton(data.videoUrl, `${ic.externalLink}Unirse a la sesión`) : ''}
      ${data.modality === 'presencial' && data.officeAddress ? primaryButton(`https://maps.google.com/?q=${encodeURIComponent(data.officeAddress)}`, `${ic.mapPin}Ver en Google Maps`) : ''}
      ${secondaryButton(calUrl, `${ic.calendarPlus}Agregar al calendario`)}
    </div>
  `, { name: data.psychologistName, title: data.psychologistTitle, photoUrl: data.psychologistPhotoUrl });

  return resend.emails.send({
    from: FROM,
    to: data.to,
    subject: `Sesión reagendada — nueva hora: ${newDateStr} a las ${newTimeStr} hrs`,
    html,
  });
}
