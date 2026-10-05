import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function activateSubscription(psychologistId: string, subscriptionId?: string) {
  if (!psychologistId) return;

  const updateData: Record<string, any> = {
    subscription_status: 'active',
    trial_ends_at: '2099-12-31T23:59:59Z',
  };

  const { error } = await supabaseAdmin
    .from('psychologists')
    .update(updateData)
    .eq('id', psychologistId);

  if (error) {
    console.error('Error al activar suscripción en Supabase:', error);
    throw error;
  }
  console.log(`✅ Suscripción activada exitosamente para psicólogo: ${psychologistId}`);
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
    
    // Parse JSON body if present
    let bodyData: any = {};
    try {
      bodyData = await request.json();
    } catch {
      // Body may be empty or not JSON
    }

    // Extract ID & Type from query params OR body JSON
    let id = searchParams.get('data.id') || searchParams.get('id') || bodyData?.data?.id || bodyData?.id;
    let type = searchParams.get('type') || searchParams.get('topic') || bodyData?.type || bodyData?.topic || bodyData?.action;

    // Handle resource URL format (e.g. /v1/preapproval/2c9380847...)
    const resource = searchParams.get('resource') || bodyData?.resource;
    if (!id && resource) {
      const parts = resource.split('/');
      id = parts[parts.length - 1];
    }

    console.log('Webhook MercadoPago recibido:', { id, type, resource });

    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      console.error('MP_ACCESS_TOKEN no configurado en variables de entorno');
      return NextResponse.json({ received: true });
    }

    // Normalize type string
    const normalizedType = String(type || '').toLowerCase();

    // ── 2. Manejar suscripciones (PreApproval / Subscriptions) ────────────────
    const isPreapproval =
      normalizedType.includes('preapproval') ||
      normalizedType.includes('subscription') ||
      normalizedType === 'authorized_payment';

    if (isPreapproval && id) {
      // Query MercadoPago Preapproval API
      const res = await fetch(`https://api.mercadopago.com/preapproval/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        console.error(`Error consultando preapproval ${id}: HTTP ${res.status}`);
        return NextResponse.json({ received: true });
      }

      const preapproval = await res.json();
      console.log('Estado preapproval MercadoPago:', {
        id: preapproval.id,
        status: preapproval.status,
        external_reference: preapproval.external_reference,
      });

      // Activate when status is "authorized" or "active"
      if (preapproval.status === 'authorized' || preapproval.status === 'active') {
        const psychologistId = preapproval.external_reference;
        if (psychologistId) {
          await activateSubscription(psychologistId, preapproval.id);
        }
      }
    }

    // ── 3. Manejar pagos individuales (Payment Notifications) ─────────────────
    if (normalizedType.includes('payment') && id) {
      const res = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (res.ok) {
        const payment = await res.json();
        console.log('Estado pago MercadoPago:', {
          id: payment.id,
          status: payment.status,
          external_reference: payment.external_reference,
        });

        if (payment.status === 'approved') {
          const psychologistId =
            payment.external_reference || payment.metadata?.psychologist_id;
          if (psychologistId) {
            await activateSubscription(psychologistId);
          }
        }
      }
    }

    // Responder siempre HTTP 200 a MercadoPago
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('MercadoPago Webhook Error:', error);
    return NextResponse.json({ received: true });
  }
}

