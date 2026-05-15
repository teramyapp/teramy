import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Usamos el Service Role para poder actualizar masivamente sesiones de cualquier psicólogo
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(request: Request) {
  try {
    // 1. Verificar seguridad básica (Vercel envía un header especial en Cron Jobs)
    // Opcional: puedes agregar una API_KEY secreta si quieres más seguridad
    const authHeader = request.headers.get('authorization');
    if (process.env.VERCEL_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      // Nota: Durante las pruebas podrías querer desactivar esto o usar una simple API KEY
    }

    // 2. Calcular la fecha límite (hace 24 horas desde ahora)
    const limitDate = new Date();
    limitDate.setHours(limitDate.getHours() - 24);
    const limitISO = limitDate.toISOString();

    console.log('Ejecutando limpieza de sesiones. Límite:', limitISO);

    // 3. Buscar y actualizar sesiones:
    // Estado: 'pending' (o el que uses en la DB, usualmente 'pending')
    // Start_time < limitISO
    const { data, error, count } = await supabaseAdmin
      .from('appointments')
      .update({ status: 'completed' })
      .eq('status', 'pending')
      .lt('start_time', limitISO)
      .select('id');

    if (error) {
      throw error;
    }

    console.log(`Se actualizaron ${data?.length || 0} sesiones a 'completada'.`);

    return NextResponse.json({ 
      success: true, 
      updatedCount: data?.length || 0,
      message: 'Limpieza completada con éxito' 
    });

  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
