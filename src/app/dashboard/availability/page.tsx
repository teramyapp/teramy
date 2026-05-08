"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  Globe, Save, Plus, Trash2, Copy, CheckCircle2,
  Clock, AlertCircle, X, Loader2, Eye, ChevronDown, ChevronUp,
} from 'lucide-react';
import { 
  addMinutes, addDays, format, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, 
  isToday, addMonths, subMonths, isSameMonth, parseISO
} from 'date-fns';
import { es } from 'date-fns/locale';
import type { DaySchedule, AvailabilitySettings, BlockedDate } from '@/lib/types';
import { supabase } from '@/utils/supabase';
import { usePsychologist, useCachedQuery, useDashboardCache } from '@/lib/dashboard-context';

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_SCHEDULE: DaySchedule[] = [
  { day: 'Lunes',     day_index: 1, active: false, slots: [{ start: '09:00', end: '18:00' }] },
  { day: 'Martes',    day_index: 2, active: false, slots: [{ start: '09:00', end: '18:00' }] },
  { day: 'Miércoles', day_index: 3, active: false, slots: [{ start: '09:00', end: '18:00' }] },
  { day: 'Jueves',    day_index: 4, active: false, slots: [{ start: '09:00', end: '18:00' }] },
  { day: 'Viernes',   day_index: 5, active: false, slots: [{ start: '09:00', end: '18:00' }] },
  { day: 'Sábado',    day_index: 6, active: false, slots: [{ start: '10:00', end: '14:00' }] },
  { day: 'Domingo',   day_index: 0, active: false, slots: [{ start: '10:00', end: '14:00' }] },
];

const DEFAULT_SETTINGS: AvailabilitySettings = {
  timezone: 'America/Santiago', buffer_minutes: 10, min_notice_hours: 24, max_sessions_per_day: 8, booking_window_days: 30, allow_overtime: false,
};

// ─── Preview slot generation (client-side, no bookings) ───────────────────────

function buildPreview(
  schedule: DaySchedule[],
  settings: AvailabilitySettings,
  durationMinutes: number,
  blocked: BlockedDate[],
): Array<{ label: string; slots: string[] }> {
  const daysAhead = settings.booking_window_days || 30;
  const result: Array<{ label: string; slots: string[] }> = [];
  const now      = new Date();
  const minStart = new Date(now.getTime() + settings.min_notice_hours * 3_600_000);

  for (let i = 1; i <= daysAhead; i++) {
    const day = addDays(now, i);
    day.setHours(0, 0, 0, 0);
    const dateISO = format(day, 'yyyy-MM-dd');

    if (blocked.some(b => b.date === dateISO)) continue;

    const dayConfig = schedule.find(d => d.active && d.day_index === day.getDay());
    if (!dayConfig) continue;

    const slots: string[] = [];
    const sortedBlocks = [...dayConfig.slots].sort((a, b) => a.start.localeCompare(b.start));

    for (const block of sortedBlocks) {
      if (slots.length >= settings.max_sessions_per_day) break;

      const [sh, sm] = block.start.split(':').map(Number);
      const [eh, em] = block.end.split(':').map(Number);

      let cursor   = new Date(day); cursor.setHours(sh, sm, 0, 0);
      const blockEnd = new Date(day); blockEnd.setHours(eh, em, 0, 0);

      while (slots.length < settings.max_sessions_per_day) {
        const slotEnd = addMinutes(cursor, durationMinutes);
        
        // If flexibility is ON, we only check if the session STARTS before the block ends.
        // If flexibility is OFF, the entire session must fit.
        if (settings.allow_overtime) {
          if (cursor >= blockEnd) break;
        } else {
          if (slotEnd > blockEnd) break;
        }

        if (cursor >= minStart) {
          slots.push(format(cursor, 'HH:mm'));
        }
        cursor = addMinutes(cursor, durationMinutes + settings.buffer_minutes);
      }
    }

    if (slots.length > 0) {
      result.push({ label: format(day, 'EEE d MMM', { locale: es }), slots });
    }
  }
  return result;
}

// ─── Migration SQL ─────────────────────────────────────────────────────────────

const MIGRATION_SQL = `-- Ejecuta esto en Supabase → SQL Editor
CREATE TABLE IF NOT EXISTS availability_settings (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  psychologist_id      UUID UNIQUE REFERENCES psychologists(id) ON DELETE CASCADE,
  buffer_minutes       INTEGER NOT NULL DEFAULT 10,
  min_notice_hours     INTEGER NOT NULL DEFAULT 24,
  max_sessions_per_day INTEGER NOT NULL DEFAULT 8,
  booking_window_days  INTEGER NOT NULL DEFAULT 30,
  allow_overtime       BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at           TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE availability_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "availability_settings_public_read" ON availability_settings FOR SELECT USING (true);
CREATE POLICY "availability_settings_owner_write" ON availability_settings FOR ALL
  USING (psychologist_id IN (SELECT id FROM psychologists WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "blocked_dates_public_read" ON blocked_dates;
CREATE POLICY "blocked_dates_public_read" ON blocked_dates FOR SELECT USING (true);`;

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AvailabilityPage() {
  const [schedule,        setSchedule]        = useState<DaySchedule[]>(DEFAULT_SCHEDULE);
  const [settings,        setSettings]        = useState<AvailabilitySettings>(DEFAULT_SETTINGS);
  const [blocked,         setBlocked]         = useState<BlockedDate[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [saving,          setSaving]          = useState(false);
  const [saved,           setSaved]           = useState(false);
  const [saveError,       setSaveError]       = useState<string | null>(null);
  const [needsMigration,  setNeedsMigration]  = useState(false);
  const [showMigrationSQL, setShowMigrationSQL] = useState(false);
  const [copiedSQL,       setCopiedSQL]       = useState(false);
  const [newBlockDate,    setNewBlockDate]    = useState('');
  const [newBlockReason,  setNewBlockReason]  = useState('');
  const { psychologist } = usePsychologist();
  const { invalidate } = useDashboardCache();
  const psychologistId = psychologist?.id ?? null;
  const [previewDuration, setPreviewDuration] = useState(60);
  const [showPreview,     setShowPreview]     = useState(true);
  const [viewDate,        setViewDate]        = useState(new Date());

  // Cached availability data — instant on revisit
  type AvailBundle = { slots: any[]; blocked: BlockedDate[]; settingsData: any | null };
  const { data: availBundle } = useCachedQuery<AvailBundle>(
    psychologistId ? `avail:full:${psychologistId}` : null,
    async () => {
      const [{ data: slots }, { data: blockedResult }, { data: settingsData }] = await Promise.all([
        supabase.from('availability').select('*').eq('psychologist_id', psychologistId!),
        supabase.from('blocked_dates').select('*').eq('psychologist_id', psychologistId!).order('date'),
        supabase.from('availability_settings')
          .select('buffer_minutes, min_notice_hours, max_sessions_per_day, booking_window_days, allow_overtime')
          .eq('psychologist_id', psychologistId!)
          .maybeSingle(),
      ]);
      return { slots: slots ?? [], blocked: (blockedResult ?? []) as BlockedDate[], settingsData };
    },
  );

  useEffect(() => {
    if (!availBundle) return;
    setLoading(false);
    if (availBundle.slots.length > 0) {
      setSchedule(DEFAULT_SCHEDULE.map(day => {
        const daySlots = availBundle.slots.filter((s: any) => s.day_of_week === day.day_index);
        return daySlots.length > 0
          ? { ...day, active: true, slots: daySlots.map((s: any) => ({ start: s.start_time, end: s.end_time })) }
          : { ...day, active: false };
      }));
    }
    setBlocked(availBundle.blocked);
    setSettings({
      timezone:             psychologist?.timezone ?? 'America/Santiago',
      buffer_minutes:       availBundle.settingsData?.buffer_minutes       ?? 10,
      min_notice_hours:     availBundle.settingsData?.min_notice_hours     ?? 24,
      max_sessions_per_day: availBundle.settingsData?.max_sessions_per_day ?? 8,
      booking_window_days:  availBundle.settingsData?.booking_window_days  ?? 30,
      allow_overtime:       availBundle.settingsData?.allow_overtime       ?? false,
    });
    if (!availBundle.settingsData) setNeedsMigration(false);
  }, [availBundle, psychologist?.timezone]);

  // ── Preview slots (recomputed instantly on any config change) ─────────────
  const previewSlots = useMemo(
    () => buildPreview(schedule, settings, previewDuration, blocked),
    [schedule, settings, previewDuration, blocked],
  );

  // Force re-fetch (called after saves/mutations)
  const reloadAvailability = () => { if (psychologistId) invalidate(`avail:full:${psychologistId}`); };

  // ── Mutations (schedule) ───────────────────────────────────────────────────
  const toggleDay    = (i: number) => setSchedule(p => p.map((d, idx) => idx === i ? { ...d, active: !d.active } : d));
  const addSlot      = (i: number) => setSchedule(p => p.map((d, idx) => idx === i ? { ...d, slots: [...d.slots, { start: '09:00', end: '17:00' }] } : d));
  const removeSlot   = (di: number, si: number) => setSchedule(p => p.map((d, idx) => {
    if (idx !== di) return d;
    const slots = d.slots.filter((_, i) => i !== si);
    return slots.length === 0 ? { ...d, active: false, slots: [{ start: '09:00', end: '17:00' }] } : { ...d, slots };
  }));
  const updateSlot   = (di: number, si: number, field: 'start' | 'end', val: string) =>
    setSchedule(p => p.map((d, idx) => idx !== di ? d : { ...d, slots: d.slots.map((s, i) => i !== si ? s : { ...s, [field]: val }) }));
  const copyToWeekdays = (sourceIdx: number) => {
    const s = schedule[sourceIdx];
    setSchedule(p => p.map((d, i) => (i < 5 && i !== sourceIdx) ? { ...d, active: s.active, slots: s.slots.map(sl => ({ ...sl })) } : d));
  };
  const setSetting = (k: keyof AvailabilitySettings, v: unknown) => setSettings(p => ({ ...p, [k]: v }));

  // ── Blocked dates ──────────────────────────────────────────────────────────
  const addBlocked = async (date?: string, reason?: string) => {
    const targetDate = date || newBlockDate;
    const targetReason = reason !== undefined ? reason : newBlockReason;
    
    if (!targetDate || !psychologistId) return;
    const tempId = `local-${Date.now()}`;
    const optimistic: BlockedDate = { id: tempId, psychologist_id: psychologistId, date: targetDate, reason: targetReason || undefined };
    setBlocked(p => [...p, optimistic].sort((a, b) => a.date.localeCompare(b.date)));
    
    if (!date) { setNewBlockDate(''); setNewBlockReason(''); }
    
    const { data, error } = await supabase.from('blocked_dates')
      .insert([{ psychologist_id: psychologistId, date: targetDate, reason: targetReason || null }])
      .select().single();
    if (!error && data) setBlocked(p => p.map(b => b.id === tempId ? data as BlockedDate : b));
    else if (error)     setBlocked(p => p.filter(b => b.id !== tempId));
  };
  const removeBlocked = async (id: string) => {
    setBlocked(p => p.filter(b => b.id !== id));
    if (!id.startsWith('local-')) await supabase.from('blocked_dates').delete().eq('id', id);
  };

  // ── Save (via server API — uses service role, bypasses RLS) ───────────────
  const handleSave = async () => {
    if (!psychologistId) return;
    setSaving(true);
    setSaveError(null);

    try {
      const availability = schedule
        .filter(d => d.active)
        .flatMap(d => d.slots.map(s => ({
          day_of_week: d.day_index,
          start_time:  s.start,
          end_time:    s.end,
        })));

      const res  = await fetch('/api/save-availability', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ psychologist_id: psychologistId, availability, settings }),
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || 'Error al guardar');

      if (json.needsMigration) {
        setNeedsMigration(true);
        setSaveError('Las reglas de agenda no se pudieron guardar. Ejecuta la migración de base de datos para activar esta función.');
      } else {
        setNeedsMigration(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch (err: any) {
      setSaveError(err.message ?? 'Error desconocido al guardar.');
    } finally {
      setSaving(false);
    }
  };

  // ── Copy migration SQL ─────────────────────────────────────────────────────
  const copySQL = () => {
    navigator.clipboard.writeText(MIGRATION_SQL).then(() => {
      setCopiedSQL(true);
      setTimeout(() => setCopiedSQL(false), 2000);
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem', color: 'var(--text-muted)' }}>
        <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary-blue)' }} />
        <p style={{ fontWeight: 500 }}>Cargando disponibilidad...</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .availability-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 1.5rem;
          gap: 1rem;
        }
        .availability-main-grid {
          display: grid;
          grid-template-columns: 300px 1fr;
          gap: 1.5rem;
          align-items: start;
        }
        .schedule-row {
          display: grid;
          grid-template-columns: 160px 1fr;
          align-items: start;
          padding-top: 1.25rem;
          padding-bottom: 1.25rem;
          gap: 1rem;
          transition: opacity 0.2s;
        }
        .slot-input-group {
          display: flex;
          gap: 0.75rem;
          align-items: center;
          flex-wrap: wrap;
        }
        .time-input {
          background: white;
          border: 1.5px solid var(--border-light);
          border-radius: 8px;
          padding: 0.4rem 0.75rem;
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-dark);
          outline: none;
          cursor: pointer;
          width: 140px;
          transition: border-color 0.2s;
        }

        @media (max-width: 1024px) {
          .availability-main-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .availability-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .availability-header div:last-child {
            width: 100%;
          }
          .availability-header button {
            width: 100%;
            justify-content: center;
          }
          .schedule-row {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }
          .time-input {
            width: 100%;
            flex: 1;
          }
          .slot-input-group {
            width: 100%;
          }
        }
      `}</style>
      <div className="animate-slide-up">

      {/* ── Header ── */}
      <div className="availability-header">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.2rem' }}>Disponibilidad</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Define cuándo los pacientes pueden agendarte.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
          <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.75rem', fontSize: '0.9rem', opacity: saving ? 0.7 : 1 }}>
            {saved ? <><CheckCircle2 size={17} /> ¡Guardado!</> : saving ? <><Loader2 size={17} /> Guardando...</> : <><Save size={17} /> Guardar</>}
          </button>
          {saveError && (
            <p style={{ fontSize: '0.78rem', color: '#ef4444', maxWidth: '280px', textAlign: 'right', lineHeight: 1.4 }}>{saveError}</p>
          )}
        </div>
      </div>

      {/* ── Migration banner ── */}
      {needsMigration && (
        <div style={{ marginBottom: '1.5rem', padding: '1.1rem 1.4rem', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <AlertCircle size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#92400e', margin: 0 }}>Migración de base de datos requerida</p>
                <p style={{ fontSize: '0.8rem', color: '#b45309', margin: '0.2rem 0 0' }}>
                  Ve a <strong>Supabase → SQL Editor</strong>, pega el SQL y presiona Run.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowMigrationSQL(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 700, color: '#b45309', cursor: 'pointer', background: 'none', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '8px' }}
            >
              {showMigrationSQL ? <><ChevronUp size={14} /> Ocultar SQL</> : <><ChevronDown size={14} /> Ver SQL</>}
            </button>
          </div>
          {showMigrationSQL && (
            <div style={{ marginTop: '1rem', position: 'relative' }}>
              <pre style={{ background: '#1e293b', color: '#e2e8f0', padding: '1rem', borderRadius: '10px', fontSize: '0.75rem', lineHeight: 1.6, overflowX: 'auto', margin: 0, whiteSpace: 'pre-wrap' }}>
                {MIGRATION_SQL}
              </pre>
              <button
                onClick={copySQL}
                style={{ position: 'absolute', top: '0.6rem', right: '0.6rem', padding: '0.3rem 0.75rem', background: copiedSQL ? '#10b981' : '#334155', color: 'white', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all 0.2s' }}
              >
                {copiedSQL ? '¡Copiado!' : 'Copiar'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Main grid ── */}
      <div className="availability-main-grid">

        {/* ─── Left column: settings panels ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Timezone */}
          {/* Timezone (Moved to a subtle indicator or removed as requested) */}
          <div style={{ padding: '0 0.5rem', marginBottom: '0.5rem' }}>
             <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
               <Globe size={13} /> Zona horaria: <strong>{settings.timezone === 'America/Santiago' ? 'Chile (Santiago)' : settings.timezone}</strong>
             </p>
          </div>

          {/* Session Rules */}
          <div className="premium-card" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
              <Clock size={18} style={{ color: 'var(--primary-blue)' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-dark)', margin: 0 }}>Reglas de agenda</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '0.4rem' }}>Buffer entre sesiones</label>
                <select value={settings.buffer_minutes} onChange={e => setSetting('buffer_minutes', Number(e.target.value))}>
                  <option value={0}>Sin buffer</option>
                  <option value={5}>5 minutos</option>
                  <option value={10}>10 minutos</option>
                  <option value={15}>15 minutos</option>
                  <option value={30}>30 minutos</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '0.4rem' }}>Aviso mínimo para agendar</label>
                <select value={settings.min_notice_hours} onChange={e => setSetting('min_notice_hours', Number(e.target.value))}>
                  <option value={1}>1 hora</option>
                  <option value={2}>2 horas</option>
                  <option value={12}>12 horas</option>
                  <option value={24}>24 horas</option>
                  <option value={48}>48 horas</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '0.4rem' }}>Ventana de agendamiento</label>
                <select value={settings.booking_window_days} onChange={e => setSetting('booking_window_days', Number(e.target.value))}>
                  <option value={7}>Próximos 7 días</option>
                  <option value={14}>Próximos 14 días</option>
                  <option value={30}>Próximo mes (30 días)</option>
                  <option value={60}>Próximos 2 meses (60 días)</option>
                  <option value={90}>Próximos 3 meses (90 días)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '0.4rem' }}>Máximo de sesiones por día</label>
                <input type="number" value={settings.max_sessions_per_day} onChange={e => setSetting('max_sessions_per_day', Number(e.target.value))} min={1} max={20} />
              </div>

              <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-dark)', cursor: 'pointer' }} onClick={() => setSetting('allow_overtime', !settings.allow_overtime)}>
                    Flexibilidad de cierre
                  </label>
                  <div onClick={() => setSetting('allow_overtime', !settings.allow_overtime)} style={{ width: '40px', height: '20px', borderRadius: '10px', background: settings.allow_overtime ? 'var(--primary-blue)' : '#e2e8f0', display: 'flex', alignItems: 'center', padding: '2px', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'white', transform: settings.allow_overtime ? 'translateX(20px)' : 'none', transition: 'all 0.2s' }} />
                  </div>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>
                  Si se activa, el sistema permitirá agendar una última sesión aunque termine después de tu hora de cierre, siempre y cuando la sesión <strong>comience</strong> dentro de tu horario. Ideal para no dejar "huecos muertos" al final del día.
                </p>
              </div>
            </div>
          </div>

          {/* Días Libres y Ausencias (Blocked Dates) */}
          <div className="premium-card" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <AlertCircle size={18} style={{ color: '#f59e0b' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-dark)', margin: 0 }}>Días libres y ausencias</h3>
              </div>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                <button onClick={() => setViewDate(subMonths(viewDate, 1))} style={{ padding: '0.3rem', borderRadius: '6px', border: '1px solid var(--border-light)', background: 'white', cursor: 'pointer' }}><ChevronUp size={14} style={{ transform: 'rotate(-90deg)' }} /></button>
                <button onClick={() => setViewDate(addMonths(viewDate, 1))} style={{ padding: '0.3rem', borderRadius: '6px', border: '1px solid var(--border-light)', background: 'white', cursor: 'pointer' }}><ChevronUp size={14} style={{ transform: 'rotate(90deg)' }} /></button>
              </div>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Vacaciones, feriados o días especiales.
            </p>

            {/* Mini Calendar */}
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-dark)', textAlign: 'center', marginBottom: '0.75rem', textTransform: 'capitalize' }}>
                {format(viewDate, 'MMMM yyyy', { locale: es })}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
                {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                  <span key={i} style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', paddingBottom: '4px' }}>{d}</span>
                ))}
                {(() => {
                  const start = startOfWeek(startOfMonth(viewDate), { weekStartsOn: 1 });
                  const end = endOfWeek(endOfMonth(viewDate), { weekStartsOn: 1 });
                  const days = eachDayOfInterval({ start, end });

                  return days.map(day => {
                    const iso = format(day, 'yyyy-MM-dd');
                    const isBlocked = blocked.some(b => b.date === iso);
                    const isCurrentMonth = isSameMonth(day, viewDate);
                    const isDayToday = isToday(day);

                    return (
                      <button
                        key={iso}
                        onClick={() => {
                          if (isBlocked) {
                            const b = blocked.find(x => x.date === iso);
                            if (b) removeBlocked(b.id);
                          } else {
                            addBlocked(iso, '');
                          }
                        }}
                        style={{
                          aspectRatio: '1',
                          borderRadius: '8px',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          background: isBlocked ? '#fee2e2' : isDayToday ? 'var(--primary-light-blue)' : 'transparent',
                          color: isBlocked ? '#dc2626' : isDayToday ? 'var(--primary-blue)' : isCurrentMonth ? 'var(--text-dark)' : '#cbd5e1',
                          outline: isDayToday ? '1.5px solid var(--primary-blue)' : 'none',
                          outlineOffset: '-1.5px'
                        }}
                        onMouseEnter={e => { if (!isBlocked) e.currentTarget.style.background = '#f1f5f9'; }}
                        onMouseLeave={e => { if (!isBlocked) e.currentTarget.style.background = isDayToday ? 'var(--primary-light-blue)' : 'transparent'; }}
                      >
                        {format(day, 'd')}
                      </button>
                    );
                  });
                })()}
              </div>
            </div>

            {/* List of blocked dates (only upcoming) */}
            {blocked.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>Mis próximos días libres</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                  {blocked
                    .filter(b => b.date >= format(new Date(), 'yyyy-MM-dd'))
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map(b => (
                    <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'white', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                      <div>
                        <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dark)', margin: 0 }}>
                          {format(parseISO(b.date), "d 'de' MMMM", { locale: es })}
                        </p>
                        {b.reason && <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>{b.reason}</p>}
                      </div>
                      <button onClick={() => removeBlocked(b.id)} style={{ color: '#94a3b8', cursor: 'pointer', padding: '0.2rem', borderRadius: '4px' }} onMouseEnter={e => e.currentTarget.style.color = '#ef4444'} onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}><X size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── Right column: weekly schedule ─── */}
        <div className="premium-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-dark)', margin: 0 }}>Horario semanal</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Activa los días y define los bloques horarios.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {schedule.map((dayObj, dayIdx) => (
              <div key={dayObj.day} className="schedule-row" style={{ borderBottom: dayIdx < schedule.length - 1 ? '1px solid var(--border-light)' : 'none', opacity: dayObj.active ? 1 : 0.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', paddingTop: '0.4rem' }}>
                  <div onClick={() => toggleDay(dayIdx)} role="switch" aria-checked={dayObj.active} style={{ width: '44px', height: '24px', borderRadius: '12px', flexShrink: 0, background: dayObj.active ? 'var(--primary-blue)' : 'var(--border-light)', display: 'flex', alignItems: 'center', padding: '2px', cursor: 'pointer', transition: 'all 0.3s' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'white', transform: dayObj.active ? 'translateX(20px)' : 'none', transition: 'all 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
                  </div>
                  <span style={{ fontWeight: dayObj.active ? 700 : 500, color: dayObj.active ? 'var(--text-dark)' : 'var(--text-muted)', fontSize: '0.95rem' }}>{dayObj.day}</span>
                </div>
                {dayObj.active ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {dayObj.slots.map((slot, slotIdx) => (
                      <div key={slotIdx} className="slot-input-group">
                        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flex: 1 }}>
                          <input type="time" value={slot.start} onChange={e => updateSlot(dayIdx, slotIdx, 'start', e.target.value)} className="time-input" onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-blue)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-light)'} />
                          
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>a</span>
                          
                          <input type="time" value={slot.end} onChange={e => updateSlot(dayIdx, slotIdx, 'end', e.target.value)} className="time-input" onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-blue)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-light)'} />
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', marginLeft: '0.5rem' }}>
                          <button onClick={() => removeSlot(dayIdx, slotIdx)} style={{ padding: '0.45rem', color: 'var(--text-muted)', background: 'transparent', border: '1px solid transparent', cursor: 'pointer', borderRadius: '8px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseEnter={e => { e.currentTarget.style.background='#f1f5f9'; e.currentTarget.style.color='#475569'; }} onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text-muted)'; }} title="Eliminar bloque"><Trash2 size={16} /></button>
                          {slotIdx === dayObj.slots.length - 1 && <button onClick={() => addSlot(dayIdx)} style={{ padding: '0.45rem', color: 'white', background: 'var(--primary-blue)', border: '1px solid var(--primary-blue)', cursor: 'pointer', borderRadius: '8px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseEnter={e => e.currentTarget.style.background='var(--primary-dark-blue)'} onMouseLeave={e => e.currentTarget.style.background='var(--primary-blue)'} title="Agregar otro bloque"><Plus size={16} /></button>}
                          {slotIdx === 0 && dayIdx < 5 && <button onClick={() => copyToWeekdays(dayIdx)} style={{ padding: '0.45rem', color: 'var(--text-muted)', background: 'transparent', border: '1px solid transparent', cursor: 'pointer', borderRadius: '8px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Copiar horario a toda la semana (Lun-Vie)" onMouseEnter={e => { e.currentTarget.style.background='#f1f5f9'; e.currentTarget.style.color='#475569'; }} onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text-muted)'; }}><Copy size={16} /></button>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', paddingTop: '0.4rem' }}>No disponible</div>
                )}
              </div>
            ))}
          </div>
          <div style={{ marginTop: '1.5rem', padding: '1rem 1.25rem', background: 'var(--primary-light-blue)', borderRadius: 'var(--radius-sm)' }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--primary-dark-blue)', lineHeight: 1.5, margin: 0 }}>
              💡 <strong>Tip:</strong> Usa el botón <strong>+</strong> para agregar bloques. Ej: <em>09:00 → 13:00</em> y <em>15:00 → 19:00</em> para dejar un espacio de almuerzo.
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          Preview section — shows exactly what the patient sees
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="premium-card" style={{ marginTop: '1.5rem', overflow: 'hidden' }}>

        {/* Preview header */}
        <button
          onClick={() => setShowPreview(v => !v)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.75rem', background: 'none', cursor: 'pointer', borderBottom: showPreview ? '1px solid var(--border-light)' : 'none' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Eye size={16} style={{ color: 'var(--primary-blue)' }} />
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-dark)' }}>
              Vista previa · Lo que verá el paciente
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
              (sin contar sesiones ya agendadas)
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {showPreview && (
              <select
                value={previewDuration}
                onChange={e => { e.stopPropagation(); setPreviewDuration(Number(e.target.value)); }}
                onClick={e => e.stopPropagation()}
                style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border-light)', background: 'var(--bg-main)', color: 'var(--text-dark)', fontWeight: 600 }}
              >
                <option value={20}>20 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={50}>50 min</option>
                <option value={60}>60 min</option>
                <option value={75}>75 min</option>
                <option value={90}>90 min</option>
              </select>
            )}
            {showPreview ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
          </div>
        </button>

        {/* Preview body */}
        {showPreview && (
          <div style={{ padding: '1.25rem 1.75rem' }}>
            {previewSlots.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📅</p>
                <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>Sin horarios disponibles en los próximos {settings.booking_window_days} días</p>
                <p style={{ fontSize: '0.82rem', marginTop: '0.3rem' }}>Activa al menos un día en el horario semanal para ver la vista previa.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {previewSlots.map(({ label, slots }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.65rem 1rem', background: 'var(--bg-main)', borderRadius: '10px' }}>
                      {/* Day label */}
                      <div style={{ minWidth: '90px', flexShrink: 0 }}>
                        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-dark)', margin: 0, textTransform: 'capitalize' }}>
                          {label}
                        </p>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
                          {slots.length} horario{slots.length !== 1 ? 's' : ''}
                        </p>
                      </div>

                      {/* Slots row */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', flex: 1 }}>
                        {slots.map(t => (
                          <span
                            key={t}
                            style={{ padding: '0.2rem 0.6rem', borderRadius: '6px', background: 'var(--primary-light-blue)', color: 'var(--primary-dark-blue)', fontSize: '0.78rem', fontWeight: 700, border: '1px solid #bae6fd' }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', textAlign: 'center' }}>
                  Sesiones de {previewDuration} min · Buffer {settings.buffer_minutes} min · Aviso {settings.min_notice_hours}h · Ventana {settings.booking_window_days} días · Máx. {settings.max_sessions_per_day}/día
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
