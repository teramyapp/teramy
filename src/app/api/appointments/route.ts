import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { sendBookingConfirmation } from '@/lib/email';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizePatient, sanitizeText, isValidUuid } from '@/lib/sanitize';

export async function POST(request: Request) {
  // ── 1. Rate limiting: máx 10 reservas por IP cada 15 minutos ─────────────
  const ip = getClientIp(request);
  const { success: allowed } = rateLimit(ip, { windowMs: 15 * 60_000, max: 10 });

  if (!allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Por favor espera unos minutos.' },
      { status: 429 }
    );
  }

  const supabase = createServerClient();

  try {
    // ── 2. Parse body ──────────────────────────────────────────────────────
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
    }

    const { psychologist_id, event_type_id, patient, start_time, end_time, patient_notes } =
      body as any;

    // ── 3. Validate required fields ───────────────────────────────────────
    if (!psychologist_id || !patient || !start_time || !end_time) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    // Validate UUIDs to prevent probing
    if (!isValidUuid(psychologist_id)) {
      return NextResponse.json({ error: 'ID de psicólogo inválido' }, { status: 400 });
    }
    if (event_type_id && !isValidUuid(event_type_id)) {
      return NextResponse.json({ error: 'ID de servicio inválido' }, { status: 400 });
    }

    // ── 4. Sanitize patient inputs ────────────────────────────────────────
    let sanitizedPatient: import('@/lib/sanitize').SanitizedPatientInput;
    try {
      sanitizedPatient = sanitizePatient(patient);
    } catch (err: any) {
      return NextResponse.json({ error: err.message ?? 'Datos de paciente inválidos' }, { status: 400 });
    }

    // Sanitize optional text fields
    const sanitizedNotes = patient_notes
      ? sanitizeText(patient_notes, { maxLength: 1000 })
      : null;

    // Validate ISO date strings
    const parsedStart = Date.parse(start_time);
    const parsedEnd   = Date.parse(end_time);
    if (isNaN(parsedStart) || isNaN(parsedEnd) || parsedStart >= parsedEnd) {
      return NextResponse.json({ error: 'Fechas inválidas' }, { status: 400 });
    }

    // Prevent bookings too far in the past (> 5 minutes ago)
    if (parsedStart < Date.now() - 5 * 60_000) {
      return NextResponse.json({ error: 'No se pueden reservar horarios en el pasado' }, { status: 400 });
    }

    // ── 5. Find or create patient ─────────────────────────────────────────
    let patientId: string;
    const { data: existing, error: findError } = await supabase
      .from('patients')
      .select('id')
      .eq('email', sanitizedPatient.email)
      .single();

    if (findError && findError.code !== 'PGRST116') {
      throw findError;
    }

    if (existing) {
      patientId = existing.id;
      // Update first/last name and birth_date if they changed
      await supabase.from('patients').update({
        name:       sanitizedPatient.name,
        first_name: sanitizedPatient.firstName,
        last_name:  sanitizedPatient.lastName,
        phone:      sanitizedPatient.phone,
        ...(sanitizedPatient.birthDate ? { birth_date: sanitizedPatient.birthDate } : {}),
      }).eq('id', existing.id);
    } else {
      const { data: newPatient, error: insertError } = await supabase
        .from('patients')
        .insert([{
          name:       sanitizedPatient.name,
          first_name: sanitizedPatient.firstName,
          last_name:  sanitizedPatient.lastName,
          email:      sanitizedPatient.email,
          phone:      sanitizedPatient.phone,
          birth_date: sanitizedPatient.birthDate,
        }])
        .select('id')
        .single();
      if (insertError || !newPatient) throw insertError;
      patientId = newPatient.id;
    }

    // ── 6. Enforce is_first_session_only rule ─────────────────────────────
    if (event_type_id && existing) {
      const { data: eventType } = await supabase
        .from('event_types')
        .select('is_first_session_only')
        .eq('id', event_type_id)
        .single();

      if (eventType?.is_first_session_only) {
        const { data: pastAppts } = await supabase
          .from('appointments')
          .select('id')
          .eq('patient_id', patientId)
          .eq('psychologist_id', psychologist_id)
          .limit(1);

        if (pastAppts && pastAppts.length > 0) {
          return NextResponse.json({ error: 'Este servicio es solo para primera sesión' }, { status: 400 });
        }
      }
    }

    // ── 7. Create appointment ─────────────────────────────────────────────
    const { data: appointment, error: apptError } = await supabase
      .from('appointments')
      .insert([{
        patient_id:     patientId,
        psychologist_id,
        event_type_id:  event_type_id || null,
        start_time,
        end_time,
        status:         'pending',
        patient_notes:  sanitizedNotes,
      }])
      .select()
      .single();

    if (apptError || !appointment) throw apptError;

    // ── 8. Fetch psychologist + event_type for email ──────────────────────
    const [{ data: psychologist }, { data: eventType }] = await Promise.all([
      supabase
        .from('psychologists')
        .select('name, title, video_meeting_url, video_meeting_type, office_street, office_suite, office_commune, office_city')
        .eq('id', psychologist_id)
        .single(),
      event_type_id
        ? supabase.from('event_types').select('title, mode, price').eq('id', event_type_id).single()
        : Promise.resolve({ data: null, error: null }),
    ]);

    // Compose office address for presencial sessions
    const officeAddress = psychologist
      ? [psychologist.office_street, psychologist.office_suite, psychologist.office_commune, psychologist.office_city]
          .filter(Boolean).join(', ') || null
      : null;

    // ── 9. Send confirmation email (non-blocking) ─────────────────────────
    if (psychologist) {
      sendBookingConfirmation({
        to:                 sanitizedPatient.email,
        patientName:        sanitizedPatient.name,
        psychologistName:   psychologist.name,
        psychologistTitle:  psychologist.title ?? undefined,
        startTime:          start_time,
        endTime:            end_time,
        modality:           (eventType as any)?.mode ?? 'online',
        videoUrl:           psychologist.video_meeting_url,
        videoType:          psychologist.video_meeting_type,
        officeAddress:      officeAddress,
        serviceName:        (eventType as any)?.title ?? undefined,
        price:              (eventType as any)?.price ?? undefined,
      }).catch(console.error);
    }

    return NextResponse.json({ success: true, appointment, patientId }, { status: 201 });
  } catch (error: any) {
    console.error('Booking error:', error);
    // Never expose internal error details to the client
    return NextResponse.json({ error: 'Error interno al procesar la reserva' }, { status: 500 });
  }
}
