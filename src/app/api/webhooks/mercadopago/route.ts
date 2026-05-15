import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Usamos el Service Role para poder saltarnos las políticas de RLS y actualizar el estado
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('data.id') || searchParams.get('id');
    const type = searchParams.get('type');

    console.log('Webhook MP recibido:', { id, type });

    // Solo nos interesan las notificaciones de pago
    if (type === 'payment' && id) {
      const accessToken = process.env.MP_ACCESS_TOKEN;

      // 1. Consultar el estado del pago en Mercado Pago
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const payment = await response.json();

      if (payment.status === 'approved') {
        const psychologistId = payment.metadata?.psychologist_id;

        if (psychologistId) {
          console.log('Pago aprobado para psicólogo:', psychologistId);

          // 2. Activar la suscripción en Supabase
          const { error } = await supabaseAdmin
            .from('psychologists')
            .update({
              subscription_status: 'active',
              trial_ends_at: '2099-12-31T23:59:59Z', // Fecha lejana para usuarios activos
            })
            .eq('id', psychologistId);

          if (error) {
            console.error('Error al actualizar psicólogo en Supabase:', error);
            throw error;
          }

          console.log('Suscripción activada con éxito para:', psychologistId);
        }
      }
    }

    // Mercado Pago espera un 200 para confirmar que recibimos la notificación
    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('Webhook error:', error);
    // Retornamos 200 igual para que MP no reintente infinitamente si es un error de lógica
    return NextResponse.json({ error: error.message }, { status: 200 });
  }
}
