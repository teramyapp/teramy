import { Resend } from 'resend';
import { NextRequest, NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { name, email, message } = await req.json();

  if (!name || !email || !message) {
    return NextResponse.json({ error: 'Faltan campos requeridos.' }, { status: 400 });
  }

  try {
    await resend.emails.send({
      from: `Teramy Web <${process.env.FROM_EMAIL || 'onboarding@resend.dev'}>`,
      to: process.env.CONTACT_EMAIL || 'contacto@teramy.cl',
      replyTo: email,
      subject: `Consulta de ${name} desde teramy.cl`,
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

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Contact form email error:', error);
    return NextResponse.json({ error: 'Error al enviar el mensaje.', details: error.message }, { status: 500 });
  }
}
