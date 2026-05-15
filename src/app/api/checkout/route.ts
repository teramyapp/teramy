import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

export async function POST(request: Request) {
  try {
    const { psychologistId, email } = await request.json();

    if (!psychologistId) {
      return NextResponse.json({ error: 'Falta el ID del psicólogo' }, { status: 400 });
    }

    const accessToken = process.env.MP_ACCESS_TOKEN;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://teramy.cl';

    if (!accessToken) {
      console.error('MP_ACCESS_TOKEN no configurado');
      return NextResponse.json({ error: 'Error de configuración en el servidor' }, { status: 500 });
    }

    // 1. Crear la preferencia en Mercado Pago
    // Documentación: https://www.mercadopago.cl/developers/es/reference/preferences/_checkout_preferences/post
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            id: 'plan-pro-mensual',
            title: 'Teramy Pro - Suscripción Mensual',
            description: 'Acceso completo a todas las funciones de Teramy',
            quantity: 1,
            unit_price: 19990,
            currency_id: 'CLP',
          }
        ],
        payer: {
          email: email || '',
        },
        // Metadata importante para identificar al usuario cuando nos llegue el Webhook
        metadata: {
          psychologist_id: psychologistId,
        },
        back_urls: {
          success: `${appUrl}/dashboard/settings?payment=success`,
          failure: `${appUrl}/dashboard/settings?payment=failure`,
          pending: `${appUrl}/dashboard/settings?payment=pending`,
        },
        auto_return: 'approved',
        notification_url: `${appUrl}/api/webhooks/mercadopago`, // Esta es la URL del Webhook
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Error MP:', data);
      throw new Error(data.message || 'Error al crear la preferencia');
    }

    // Retornamos la URL de Mercado Pago (init_point)
    return NextResponse.json({ url: data.init_point });

  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
