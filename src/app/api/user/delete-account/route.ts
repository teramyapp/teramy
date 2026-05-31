import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { isValidUuid } from '@/lib/sanitize';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: Request) {
  // ── 1. Rate limiting ─────────────────────────────────────────────────────
  const ip = getClientIp(request);
  const { success: allowed } = rateLimit(ip, { windowMs: 60_000, max: 5 });
  if (!allowed) {
    return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 });
  }

  try {
    // ── 2. Parse body ──────────────────────────────────────────────────────
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
    }

    const { psychologistId, userId } = body as any;

    if (!psychologistId || !userId) {
      return NextResponse.json({ error: 'Faltan IDs para procesar el borrado' }, { status: 400 });
    }

    // ── 3. Validar formato de los IDs ─────────────────────────────────────
    if (!isValidUuid(psychologistId) || !isValidUuid(userId)) {
      return NextResponse.json({ error: 'IDs inválidos' }, { status: 400 });
    }

    // ── 4. Verificar que el userId realmente sea el dueño de psychologistId ─
    // Esto previene que un usuario borre la cuenta de otro psicólogo
    const { data: psych, error: fetchError } = await supabaseAdmin
      .from('psychologists')
      .select('id, user_id')
      .eq('id', psychologistId)
      .eq('user_id', userId)   // <── cruce cruzado: ambos deben coincidir
      .single();

    if (fetchError || !psych) {
      console.warn(`Intento de borrado no autorizado: userId=${userId}, psychologistId=${psychologistId}`);
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    console.log('Iniciando borrado total para psicólogo:', psychologistId);

    // ── 5. Borrar en orden para evitar errores de foreign key ─────────────
    // 5a. Notas (dependen de appointments)
    const { data: appointments } = await supabaseAdmin
      .from('appointments')
      .select('id')
      .eq('psychologist_id', psychologistId);

    if (appointments && appointments.length > 0) {
      const apptIds = appointments.map((a: any) => a.id);
      await supabaseAdmin.from('notes').delete().in('appointment_id', apptIds);
    }

    // 5b. Resto de datos del psicólogo
    await Promise.all([
      supabaseAdmin.from('appointments').delete().eq('psychologist_id', psychologistId),
      supabaseAdmin.from('patients').delete().eq('psychologist_id', psychologistId),
      supabaseAdmin.from('event_types').delete().eq('psychologist_id', psychologistId),
      supabaseAdmin.from('availability').delete().eq('psychologist_id', psychologistId),
      supabaseAdmin.from('availability_settings').delete().eq('psychologist_id', psychologistId),
      supabaseAdmin.from('blocked_dates').delete().eq('psychologist_id', psychologistId),
    ]);

    // 5c. Perfil de psicólogo
    await supabaseAdmin.from('psychologists').delete().eq('id', psychologistId);

    // 5d. Usuario de Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) {
      console.error('Error borrando usuario de Auth:', authError);
    }

    console.log('Cuenta eliminada con éxito:', userId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete account error:', error);
    return NextResponse.json({ error: 'Error interno al procesar el borrado' }, { status: 500 });
  }
}
