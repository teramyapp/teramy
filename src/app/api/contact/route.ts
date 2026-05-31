import { Resend } from 'resend';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeContactForm } from '@/lib/sanitize';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  // ── 1. Rate limiting: máx 5 mensajes por IP cada 10 minutos ─────────────
  const ip = getClientIp(req);
  const { success: allowed } = rateLimit(ip, { windowMs: 10 * 60_000, max: 5 });

  if (!allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Por favor espera unos minutos.' },
      { status: 429 }
    );
  }

  // ── 2. Parse body ────────────────────────────────────────────────────────
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
  }

  // ── 3. Sanitize & validate inputs ────────────────────────────────────────
  let name: string, email: string, message: string;
  try {
    ({ name, email, message } = sanitizeContactForm(raw as any));
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Datos inválidos.' }, { status: 400 });
  }

  // ── 4. Send email ────────────────────────────────────────────────────────
  try {
    const { data, error } = await resend.emails.send({
      from: `Teramy Web <${process.env.FROM_EMAIL || 'onboarding@resend.dev'}>`,
      to: process.env.CONTACT_EMAIL || 'contacto@teramy.cl',
      replyTo: email,
      subject: `Consulta de ${name} desde teramy.cl`,
      // All values are already HTML-escaped by sanitizeContactForm
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px;">
          <h2 style="color:#0f172a;margin:0 0 8px;">Nueva consulta desde el landing</h2>
          <p style="color:#64748b;margin:0 0 24px;font-size:14px;">Alguien se contactó a través del formulario de teramy.cl</p>
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:14px;width:100px;">Nombre</td>
              <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:14px;font-weight:600;">${name}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:14px;">Correo</td>
              <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#0ea5e9;font-size:14px;"><a href="mailto:${email}" style="color:#0ea5e9;">${email}</a></td>
            </tr>
            <tr>
              <td style="padding:12px 0;color:#64748b;font-size:14px;vertical-align:top;">Mensaje</td>
              <td style="padding:12px 0;color:#0f172a;font-size:14px;line-height:1.6;">${message.replace(/\n/g, '<br>')}</td>
            </tr>
          </table>
          <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;">Puedes responder directamente a este correo para contactar a ${name}.</p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend API Error:', error);
      return NextResponse.json({ error: 'Error al enviar el mensaje desde el servidor de correo.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    console.error('Contact form email error:', error);
    return NextResponse.json({ error: 'Error al enviar el mensaje.' }, { status: 500 });
  }
}
