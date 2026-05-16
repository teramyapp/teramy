import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { sendBookingConfirmation } from '@/lib/email';

export async function POST(request: Request) {
  const supabase = createServerClient();

  try {
    const body = await request.json();
    const { psychologist_id, event_type_id, patient, start_time, end_time, patient_notes } = body;

    if (!psychologist_id || !patient?.email || !patient?.name || !patient?.phone || !start_time || !end_time) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    // 1. Find or create patient
    let patientId: string;
    const { data: existing, error: findError } = await supabase
      .from('patients')
      .select('id')
      .eq('email', patient.email)
      .single();

    if (findError && findError.code !== 'PGRST116') {
      throw findError;
    }

    if (existing) {
      patientId = existing.id;
    } else {
      const { data: newPatient, error: insertError } = await supabase
        .from('patients')
        .insert([{ name: patient.name, email: patient.email, phone: patient.phone }])
        .select('id')
        .single();
      if (insertError || !newPatient) throw insertError;
      patientId = newPatient.id;
    }

    // 2. Enforce is_first_session_only rule
    if (event_type_id && existing) {
      const { data: eventType } = await supabase
        .from('event_types')
        .select('is_first_session_only')
        .eq('id', event_type_id)
        .single();
        
      if (eventType?.is_first_session_only) {
        // Check if patient already has ANY past appointment with this psychologist
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

    // 3. Create appointment
    const { data: appointment, error: apptError } = await supabase
      .from('appointments')
      .insert([{
        patient_id: patientId,
        psychologist_id,
        event_type_id: event_type_id || null,
        start_time,
        end_time,
        status: 'pending',
        patient_notes: patient_notes || null,
      }])
      .select()
      .single();

    if (apptError || !appointment) throw apptError;

    // 4. Fetch psychologist + event_type for email
    const [{ data: psychologist }, { data: eventType }] = await Promise.all([
      supabase
        .from('psychologists')
        .select('name, title, video_meeting_url, video_meeting_type')
        .eq('id', psychologist_id)
        .single(),
      event_type_id
        ? supabase.from('event_types').select('title, mode, price').eq('id', event_type_id).single()
        : Promise.resolve({ data: null, error: null }),
    ]);

    // 5. Send confirmation email (non-blocking)
    if (psychologist) {
      sendBookingConfirmation({
        to: patient.email,
        patientName: patient.name,
        psychologistName: psychologist.name,
        psychologistTitle: psychologist.title ?? undefined,
        startTime: start_time,
        endTime: end_time,
        modality: (eventType as any)?.mode ?? 'online',
        videoUrl: psychologist.video_meeting_url,
        videoType: psychologist.video_meeting_type,
        serviceName: (eventType as any)?.title ?? undefined,
        price: (eventType as any)?.price ?? undefined,
      }).catch(console.error);
    }

    return NextResponse.json({ success: true, appointment, patientId }, { status: 201 });
  } catch (error: any) {
    console.error('Booking error:', error);
    return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 });
  }
}
