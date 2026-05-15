import { NextResponse } from 'next/server';
import { MercadoPagoConfig, PreApproval } from 'mercadopago';

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
      return NextResponse.json({ error: 'El administrador aún no ha configurado Mercado Pago.' }, { status: 500 });
    }

    // Inicializar SDK de Mercado Pago v2
    const client = new MercadoPagoConfig({ accessToken });
    const preApproval = new PreApproval(client);

    // Crear la suscripción (PreApproval ad-hoc)
    const response = await preApproval.create({
      body: {
        reason: 'Teramy Pro - Suscripción Mensual',
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: 19990,
          currency_id: 'CLP',
        },
        payer_email: email || 'test_user_123@testuser.com', // MP requires an email
        back_url: `${appUrl}/dashboard/settings?payment=success`,
        external_reference: psychologistId,
        status: 'pending',
      }
    });

    if (!response.init_point) {
      console.error('Error MP:', response);
      throw new Error('No se pudo generar el enlace de suscripción.');
    }

    // Retornamos la URL de Mercado Pago (init_point) para suscripciones
    return NextResponse.json({ url: response.init_point });

  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
