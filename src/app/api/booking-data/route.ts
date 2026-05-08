/**
 * GET /api/booking-data?psychologist_id=<uuid>
 *
 * Server-side endpoint (service role → bypasses RLS) that returns
 * everything the public booking page needs to compute available slots:
 *
 *   • availability blocks  (day_of_week, start_time, end_time)
 *   • existing appointments (start_time, end_time) — no PII
 *   • blocked dates        (YYYY-MM-DD strings)
 *   • scheduling settings  (buffer, min_notice, max_sessions)
 *
 * The client then runs generateSlots() locally using the selected
 * service's duration_minutes, so no per-service round-trip is needed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const psychologistId = searchParams.get('psychologist_id');

  if (!psychologistId) {
    return NextResponse.json({ error: 'Missing psychologist_id' }, { status: 400 });
  }

  const supabase = createServerClient(); // service role — bypasses RLS

  try {
    const now = new Date().toISOString();

    const [
      { data: availability, error: availErr },
      { data: settings,    error: settErr  },
      { data: blocked,     error: blockErr },
      { data: booked,      error: bookErr  },
    ] = await Promise.all([
      // Weekly time blocks
      supabase
        .from('availability')
        .select('day_of_week, start_time, end_time')
        .eq('psychologist_id', psychologistId)
        .order('day_of_week')
        .order('start_time'),

      // Scheduling rules (single row per psychologist)
      supabase
        .from('availability_settings')
        .select('buffer_minutes, min_notice_hours, max_sessions_per_day, booking_window_days, allow_overtime')
        .eq('psychologist_id', psychologistId)
        .maybeSingle(),

      // Blocked / vacation dates
      supabase
        .from('blocked_dates')
        .select('date')
        .eq('psychologist_id', psychologistId),

      // Active future appointments — only time range, no PII
      supabase
        .from('appointments')
        .select('start_time, end_time')
        .eq('psychologist_id', psychologistId)
        .in('status', ['scheduled', 'pending', 'confirmed'])
        .gte('start_time', now),
    ]);

    // Log but don't crash on non-critical errors
    if (availErr)  console.error('availability fetch error:', availErr);
    if (settErr)   console.error('settings fetch error:',    settErr);
    if (blockErr)  console.error('blocked_dates error:',     blockErr);
    if (bookErr)   console.error('appointments error:',      bookErr);

    return NextResponse.json({
      availability:  availability  ?? [],
      booked:        booked        ?? [],
      blockedDates:  (blocked ?? []).map((b: { date: string }) => b.date),
      settings: {
        buffer_minutes:       settings?.buffer_minutes       ?? 10,
        min_notice_hours:     settings?.min_notice_hours     ?? 24,
        max_sessions_per_day: settings?.max_sessions_per_day ?? 8,
        booking_window_days:  settings?.booking_window_days  ?? 30,
        allow_overtime:       settings?.allow_overtime       ?? false,
      },
    });
  } catch (error: any) {
    console.error('booking-data error:', error);
    return NextResponse.json({ error: error?.message ?? 'Internal error' }, { status: 500 });
  }
}
