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
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 });
    }

    const { psychologistId, userId } = body as any;

    // ── 2. Validar UUIDs ──────────────────────────────────────────────────
    if (!psychologistId || !userId) {
      return NextResponse.json({ error: 'Faltan IDs.' }, { status: 400 });
    }
    if (!isValidUuid(psychologistId) || !isValidUuid(userId)) {
      return NextResponse.json({ error: 'IDs inválidos.' }, { status: 400 });
    }

    // ── 3. Verificar que el userId es dueño del psychologistId ────────────
    const { data: psych, error: fetchErr } = await supabaseAdmin
      .from('psychologists')
      .select('id, user_id, subscription_status')
      .eq('id', psychologistId)
      .eq('user_id', userId)
      .single();

    if (fetchErr || !psych) {
      console.warn(`Cancel plan no autorizado: userId=${userId}, psychologistId=${psychologistId}`);
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
    }

    // ── 4. Actualizar estado a cancelled ──────────────────────────────────
    const { error: updateErr } = await supabaseAdmin
      .from('psychologists')
      .update({ subscription_status: 'cancelled' })
      .eq('id', psychologistId);

    if (updateErr) {
      console.error('Error cancelando plan:', updateErr);
      return NextResponse.json({ error: 'Error interno al cancelar el plan.' }, { status: 500 });
    }

    console.log(`Plan cancelado para psicólogo: ${psychologistId}`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Cancel plan error:', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
