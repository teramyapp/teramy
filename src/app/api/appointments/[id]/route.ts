import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { sendCancellationEmail, sendRescheduleEmail, sendReminderEmail } from '@/lib/email';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient();
  const { id } = params;

  try {
    const body = await request.json();
    const { action, new_start_time, new_end_time } = body;

    if (!action || !['cancel', 'reschedule', 'remind'].includes(action)) {
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
    }

    // Fetch current appointment with patient and psychologist data
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select(`
        *,
        patients(name, email, phone),
        psychologists(name, title, photo_url, video_meeting_url, video_meeting_type, office_street, office_suite, office_commune, office_city),
        event_types(title, mode, price)
      `)
      .eq('id', id)
      .single();

    if (fetchError || !appointment) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }

    const patient = appointment.patients as any;
    const psychologist = appointment.psychologists as any;
    const eventType = appointment.event_types as any;

    if (action === 'cancel') {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;

      sendCancellationEmail({
        to: patient.email,
        patientName: patient.name,
        psychologistName: psychologist.name,
        psychologistTitle: psychologist.title ?? undefined,
        psychologistPhotoUrl: psychologist.photo_url ?? undefined,
        startTime: appointment.start_time,
      }).catch(console.error);

      return NextResponse.json({ success: true, action: 'cancelled' });
    }

    if (action === 'reschedule') {
      if (!new_start_time || !new_end_time) {
        return NextResponse.json({ error: 'Faltan nueva fecha y hora' }, { status: 400 });
      }

      const { error } = await supabase
        .from('appointments')
        .update({ start_time: new_start_time, end_time: new_end_time })
        .eq('id', id);

      if (error) throw error;

      const officeAddress = [psychologist.office_street, psychologist.office_commune, psychologist.office_city, psychologist.office_suite]
        .filter(Boolean).join(', ') || null;

      sendRescheduleEmail({
        to: patient.email,
        patientName: patient.name,
        psychologistName: psychologist.name,
        psychologistTitle: psychologist.title ?? undefined,
        psychologistPhotoUrl: psychologist.photo_url ?? undefined,
        oldStartTime: appointment.start_time,
        newStartTime: new_start_time,
        newEndTime: new_end_time,
        modality: eventType?.mode ?? 'online',
        videoUrl: psychologist.video_meeting_url,
        videoType: psychologist.video_meeting_type,
        officeAddress,
      }).catch(console.error);

      return NextResponse.json({ success: true, action: 'rescheduled' });
    }

    if (action === 'remind') {
      const officeAddress = [psychologist.office_street, psychologist.office_commune, psychologist.office_city, psychologist.office_suite]
        .filter(Boolean).join(', ') || null;

      sendReminderEmail({
        to: patient.email,
        patientName: patient.name,
        psychologistName: psychologist.name,
        psychologistTitle: psychologist.title ?? undefined,
        psychologistPhotoUrl: psychologist.photo_url ?? undefined,
        startTime: appointment.start_time,
        endTime: appointment.end_time,
        modality: eventType?.mode ?? 'online',
        videoUrl: psychologist.video_meeting_url,
        videoType: psychologist.video_meeting_type,
        officeAddress,
        serviceName: eventType?.title ?? undefined,
      }).catch(console.error);

      return NextResponse.json({ success: true, action: 'reminded' });
    }
  } catch (error: any) {
    console.error('Appointment PATCH error:', error);
    return NextResponse.json({ error: error.message || 'Error del servidor' }, { status: 500 });
  }
}
