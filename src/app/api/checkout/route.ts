import { NextResponse } from 'next/server';
import { MercadoPagoConfig, PreApproval } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { isValidUuid } from '@/lib/sanitize';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: Request) {
  // ── 1. Rate limiting: máx 5 intentos de checkout por IP por hora ─────────
  const ip = getClientIp(request);
  const { success: allowed } = rateLimit(ip, { windowMs: 60 * 60_000, max: 10 });
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

    // ── 3. Verificar existencia del psicólogo en DB ────────────────────────
    const { data: psych, error: psychErr } = await supabaseAdmin
      .from('psychologists')
      .select('id, name')
      .eq('id', psychologistId)
      .single();

    if (psychErr || !psych) {
      return NextResponse.json({ error: 'Perfil de profesional no encontrado' }, { status: 404 });
    }

    const accessToken = process.env.MP_ACCESS_TOKEN;
    const appUrl      = process.env.NEXT_PUBLIC_APP_URL || 'https://teramy.cl';

    if (!accessToken) {
      console.error('MP_ACCESS_TOKEN no configurado');
      return NextResponse.json(
        { error: 'El servicio de cobro de Mercado Pago aún no está configurado.' },
        { status: 500 }
      );
    }

    // ── 4. Crear la suscripción en MercadoPago ────────────────────────────
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
        payer_email:        email || undefined,
        back_url:           `${appUrl}/dashboard/settings?payment=success`,
        external_reference: psychologistId,
        status:             'pending',
      },
    });

    if (!response.init_point) {
      console.error('Error al generar init_point MercadoPago:', response);
      throw new Error('No se pudo generar el enlace de suscripción.');
    }

    return NextResponse.json({ url: response.init_point });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: error?.message || 'Error interno al procesar el pago' }, { status: 500 });
  }
}

