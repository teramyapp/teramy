import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: Request) {
  // ── 1. Rate limiting: máx 30 webhooks por IP cada 60 segundos ────────────
  // (MercadoPago envía desde sus propios servidores, pero igual aplicamos límite)
  const ip = getClientIp(request);
  const { success: allowed } = rateLimit(ip, { windowMs: 60_000, max: 30 });
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id   = searchParams.get('data.id') || searchParams.get('id');
    const type = searchParams.get('type');

    console.log('Webhook MP recibido:', { id, type });

    // Solo nos interesan las notificaciones de pago
    if (type === 'payment' && id) {
      // Validar que el ID es numérico (Mercado Pago siempre envía IDs numéricos)
      if (!/^\d+$/.test(id)) {
        console.warn('Webhook ID inválido ignorado:', id);
        // Devolvemos 200 igual para que MP no reintente
        return NextResponse.json({ received: true });
      }

      const accessToken = process.env.MP_ACCESS_TOKEN;

      // 1. Consultar el estado del pago directamente en Mercado Pago
      //    (nunca confiamos en el body del webhook — siempre verificamos en origen)
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        console.error('Error al verificar pago en MP:', response.status);
        return NextResponse.json({ received: true });
      }

      const payment = await response.json();

      if (payment.status === 'approved') {
        // Obtener el psychologistId desde external_reference (UUID que nosotros pusimos)
        const psychologistId =
          payment.metadata?.psychologist_id ?? payment.external_reference;

        // Validar que sea un UUID real antes de hacer la consulta a Supabase
        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!psychologistId || !UUID_RE.test(psychologistId)) {
          console.warn('external_reference inválido en webhook MP:', psychologistId);
          return NextResponse.json({ received: true });
        }

        console.log('Pago aprobado para psicólogo:', psychologistId);

        // 2. Activar la suscripción en Supabase
        const { error } = await supabaseAdmin
          .from('psychologists')
          .update({
            subscription_status: 'active',
            trial_ends_at: '2099-12-31T23:59:59Z',
          })
          .eq('id', psychologistId);

        if (error) {
          console.error('Error al actualizar psicólogo en Supabase:', error);
          throw error;
        }

        console.log('Suscripción activada con éxito para:', psychologistId);
      }
    }

    // MercadoPago espera un 200 para confirmar que recibimos la notificación
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    // Retornamos 200 para que MP no reintente en errores de lógica interna
    return NextResponse.json({ received: true });
  }
}
