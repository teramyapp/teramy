/**
 * POST /api/save-availability
 *
 * Server-side save that uses the service role key, bypassing RLS entirely.
 * Handles:
 *   1. Replace availability blocks (delete + insert)
 *   2. Upsert availability_settings (buffer, min_notice, max_sessions)
 *   3. Update timezone on psychologists table
 *
 * Returns { success, needsMigration } so the client can show migration
 * instructions if the availability_settings table hasn't been created yet.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  const supabase = createServerClient(); // service role — bypasses RLS

  try {
    const {
      psychologist_id,
      availability,   // Array<{ day_of_week, start_time, end_time }>
      settings,       // { buffer_minutes, min_notice_hours, max_sessions_per_day, timezone }
    } = await request.json();

    if (!psychologist_id) {
      return NextResponse.json({ error: 'Missing psychologist_id' }, { status: 400 });
    }

    // ── 1. Replace availability blocks ────────────────────────────────────
    await supabase.from('availability').delete().eq('psychologist_id', psychologist_id);

    if (availability && availability.length > 0) {
      const { error: insertErr } = await supabase.from('availability').insert(
        availability.map((row: { day_of_week: number; start_time: string; end_time: string }) => ({
          psychologist_id,
          day_of_week: row.day_of_week,
          start_time:  row.start_time,
          end_time:    row.end_time,
        }))
      );
      if (insertErr) console.error('availability insert error:', insertErr);
    }

    // ── 2. Upsert scheduling settings ─────────────────────────────────────
    let needsMigration = false;
    if (settings) {
      const { error: settingsErr } = await supabase
        .from('availability_settings')
        .upsert({
          psychologist_id,
          buffer_minutes:       settings.buffer_minutes !== undefined ? Number(settings.buffer_minutes) : 10,
          min_notice_hours:     settings.min_notice_hours !== undefined ? Number(settings.min_notice_hours) : 24,
          max_sessions_per_day: settings.max_sessions_per_day !== undefined ? Number(settings.max_sessions_per_day) : 8,
          booking_window_days:  settings.booking_window_days !== undefined ? Number(settings.booking_window_days) : 30,
          allow_overtime:       settings.allow_overtime === true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'psychologist_id' });

      if (settingsErr) {
        // Table doesn't exist yet → caller should show migration instructions
        if (
          settingsErr.code === '42P01' ||                    // relation does not exist
          settingsErr.message?.includes('availability_settings') ||
          settingsErr.message?.includes('does not exist')
        ) {
          needsMigration = true;
        } else {
          console.error('settings upsert error:', settingsErr);
        }
      }
    }

    // ── 3. Update timezone ────────────────────────────────────────────────
    if (settings?.timezone) {
      await supabase
        .from('psychologists')
        .update({ timezone: settings.timezone })
        .eq('id', psychologist_id);
    }

    return NextResponse.json({ success: true, needsMigration });
  } catch (error: any) {
    console.error('save-availability error:', error);
    return NextResponse.json({ error: error?.message ?? 'Internal error' }, { status: 500 });
  }
}
