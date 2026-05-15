import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: Request) {
  try {
    const { psychologistId, userId } = await request.json();

    if (!psychologistId || !userId) {
      return NextResponse.json({ error: 'Faltan IDs para procesar el borrado' }, { status: 400 });
    }

    console.log('Iniciando borrado total para psicólogo:', psychologistId);

    // El borrado debe ser en orden para evitar errores de llaves foráneas
    
    // 1. Borrar Notas
    const { data: appointments } = await supabaseAdmin
      .from('appointments')
      .select('id')
      .eq('psychologist_id', psychologistId);
    
    if (appointments && appointments.length > 0) {
      const apptIds = appointments.map(a => a.id);
      await supabaseAdmin.from('notes').delete().in('appointment_id', apptIds);
    }

    // 2. Borrar Citas, Pacientes, Servicios y Configuración
    await Promise.all([
      supabaseAdmin.from('appointments').delete().eq('psychologist_id', psychologistId),
      supabaseAdmin.from('patients').delete().eq('psychologist_id', psychologistId),
      supabaseAdmin.from('event_types').delete().eq('psychologist_id', psychologistId),
      supabaseAdmin.from('availability').delete().eq('psychologist_id', psychologistId),
      supabaseAdmin.from('availability_settings').delete().eq('psychologist_id', psychologistId),
      supabaseAdmin.from('blocked_dates').delete().eq('psychologist_id', psychologistId),
    ]);

    // 3. Borrar Perfil de Psicólogo
    await supabaseAdmin.from('psychologists').delete().eq('id', psychologistId);

    // 4. Borrar Usuario de Autenticación (Supabase Auth)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (authError) {
      console.error('Error borrando usuario de Auth:', authError);
      // No lanzamos error aquí porque los datos ya se borraron, pero es bueno saberlo
    }

    console.log('Cuenta eliminada con éxito:', userId);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Delete account error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
