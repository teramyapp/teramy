import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function activateSubscription(psychologistId: string) {
  if (!UUID_RE.test(psychologistId)) {
    console.warn('psychologistId inválido, ignorando:', psychologistId);
    return;
  }
  const { error } = await supabaseAdmin
    .from('psychologists')
    .update({
      subscription_status: 'active',
      trial_ends_at: '2099-12-31T23:59:59Z',
    })
    .eq('id', psychologistId);

  if (error) {
    console.error('Error al activar suscripción:', error);
    throw error;
  }
  console.log('Suscripción activada para:', psychologistId);
}

export async function POST(request: Request) {
  // ── 1. Rate limiting ─────────────────────────────────────────────────────
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

    const accessToken = process.env.MP_ACCESS_TOKEN;

    // ── 2. Manejar suscripciones (PreApproval) ────────────────────────────
    // Cuando un usuario se suscribe con PreApproval, MP envía type="preapproval"
    if (type === 'preapproval' && id) {
      if (!/^\d+$/.test(id)) {
        console.warn('ID de preapproval inválido:', id);
        return NextResponse.json({ received: true });
      }

      const res = await fetch(`https://api.mercadopago.com/preapproval/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        console.error('Error consultando preapproval:', res.status);
        return NextResponse.json({ received: true });
      }

      const preapproval = await res.json();
      console.log('Estado preapproval:', preapproval.status, '| external_reference:', preapproval.external_reference);

      // Activar cuando el estado sea "authorized" (suscripción aprobada y activa)
      if (preapproval.status === 'authorized') {
        const psychologistId = preapproval.external_reference;
        await activateSubscription(psychologistId);
      }
    }

    // ── 3. Manejar pagos individuales (por si acaso) ──────────────────────
    if (type === 'payment' && id) {
      if (!/^\d+$/.test(id)) {
        console.warn('ID de pago inválido:', id);
        return NextResponse.json({ received: true });
      }

      const res = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        console.error('Error consultando pago:', res.status);
        return NextResponse.json({ received: true });
      }

      const payment = await res.json();
      if (payment.status === 'approved') {
        const psychologistId =
          payment.metadata?.psychologist_id ?? payment.external_reference;
        await activateSubscription(psychologistId);
      }
    }

    // MP espera 200 para confirmar recepción
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    // Devolver 200 igual para que MP no reintente en errores de lógica
    return NextResponse.json({ received: true });
  }
}
