import { NextResponse } from 'next/server';
import { MercadoPagoConfig, PreApproval } from 'mercadopago';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { isValidUuid } from '@/lib/sanitize';

export async function POST(request: Request) {
  // ── 1. Rate limiting: máx 5 intentos de checkout por IP por hora ─────────
  const ip = getClientIp(request);
  const { success: allowed } = rateLimit(ip, { windowMs: 60 * 60_000, max: 5 });
  if (!allowed) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Por favor espera un momento.' },
      { status: 429 }
    );
  }

  try {
    // ── 2. Parse y validar body ───────────────────────────────────────────
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
    }

    const { psychologistId, email } = body as any;

    if (!psychologistId) {
      return NextResponse.json({ error: 'Falta el ID del psicólogo' }, { status: 400 });
    }

    // Validar que el ID sea un UUID real
    if (!isValidUuid(psychologistId)) {
      return NextResponse.json({ error: 'ID de psicólogo inválido' }, { status: 400 });
    }

    const accessToken = process.env.MP_ACCESS_TOKEN;
    const appUrl      = process.env.NEXT_PUBLIC_APP_URL || 'https://teramy.cl';

    if (!accessToken) {
      console.error('MP_ACCESS_TOKEN no configurado');
      return NextResponse.json(
        { error: 'El administrador aún no ha configurado Mercado Pago.' },
        { status: 500 }
      );
    }

    // ── 3. Crear la suscripción en MercadoPago ────────────────────────────
    const client      = new MercadoPagoConfig({ accessToken });
    const preApproval = new PreApproval(client);

    const response = await preApproval.create({
      body: {
        reason: 'Teramy Pro - Suscripción Mensual',
        auto_recurring: {
          frequency:          1,
          frequency_type:     'months',
          transaction_amount: 19990,
          currency_id:        'CLP',
        },
        payer_email:        email || 'test_user_123@testuser.com',
        back_url:           `${appUrl}/dashboard/settings?payment=success`,
        external_reference: psychologistId,
        status:             'pending',
      },
    });

    if (!response.init_point) {
      console.error('Error MP:', response);
      throw new Error('No se pudo generar el enlace de suscripción.');
    }

    return NextResponse.json({ url: response.init_point });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Error interno al procesar el pago' }, { status: 500 });
  }
}
