import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Usamos el Service Role para poder actualizar masivamente sesiones de cualquier psicólogo
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(request: Request) {
  // ── Autenticación del cron job ──────────────────────────────────────────
  // Vercel envía automáticamente el CRON_SECRET como Bearer token.
  // También lo verificamos en desarrollo con la variable de entorno.
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('CRON_SECRET no está configurado en las variables de entorno');
    return NextResponse.json({ error: 'Configuración incorrecta del servidor' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.warn('Intento no autorizado de ejecutar el cron job');
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    // Calcular la fecha límite (hace 24 horas desde ahora)
    const limitDate = new Date();
    limitDate.setHours(limitDate.getHours() - 24);
    const limitISO = limitDate.toISOString();

    console.log('Ejecutando limpieza de sesiones. Límite:', limitISO);

    const { data, error } = await supabaseAdmin
      .from('appointments')
      .update({ status: 'completed' })
      .eq('status', 'pending')
      .lt('start_time', limitISO)
      .select('id');

    if (error) {
      throw error;
    }

    const updatedCount = data?.length ?? 0;
    console.log(`Se actualizaron ${updatedCount} sesiones a 'completada'.`);

    return NextResponse.json({
      success: true,
      updatedCount,
      message: 'Limpieza completada con éxito',
    });
  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
