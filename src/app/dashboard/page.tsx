"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  TrendingUp, Users, Clock, ExternalLink, Video, MapPin, FileText, X,
  ChevronRight, DollarSign, CheckCircle2, Calendar, ArrowUpRight,
  MessageSquare, Plus, ChevronDown, Mail, CalendarPlus, Bell,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { addMinutes, format, addDays, isBefore, startOfDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { usePsychologist, useCachedQuery, useDashboardCache } from '@/lib/dashboard-context';

type NsPatientOption  = { id: string; name: string; email?: string; phone?: string };
type NsServiceOption  = { id: string; title: string; mode: string; duration_minutes: number; price: number };

type Session = {
  time: string;
  name: string;
  type: string;
  status: 'Confirmado' | 'Pendiente';
  initial: string;
  color: string;
  modality: string;
  isNext: boolean;
  phone: string;
  email: string;
};

type RecentActivity = {
  id: string;
  patientName: string;
  serviceTitle: string;
  startTime: string;
  status: string;
  createdAt: string;
  initial: string;
  color: string;
  modality: string;
};

function gcalUrl(patient: string, date: string, time: string, duration: string, modality: string) {
  if (!date || !time) return '#';
  const [y, m, d] = date.split('-');
  const [h, min]  = time.split(':');
  const pad = (n: string) => n.padStart(2, '0');
  const startDt = `${y}${pad(m)}${pad(d)}T${pad(h)}${pad(min)}00`;
  const endMin  = (parseInt(min) + parseInt(duration)) % 60;
  const endH    = parseInt(h) + Math.floor((parseInt(min) + parseInt(duration)) / 60);
  const endDt   = `${y}${pad(m)}${pad(d)}T${pad(String(endH))}${pad(String(endMin))}00`;
  const loc     = modality === 'online' ? 'Google Meet' : 'Consulta presencial';
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Sesión: ${patient}`)}&dates=${startDt}/${endDt}&location=${encodeURIComponent(loc)}`;
}

export default function DashboardHome() {
  const router = useRouter();
  const { psychologist } = usePsychologist();
  const { invalidate } = useDashboardCache();

  const psychId   = psychologist?.id ?? null;
  const psychName = psychologist?.name ?? '';
  const psychSlug = psychologist?.slug ?? '';
  const videoUrl  = psychologist?.video_meeting_url ?? null;
  const globalModality = psychologist?.session_type ?? null;

  const [reminderOpen, setReminderOpen] = useState<number | null>(null);
  const [reminderPos,  setReminderPos]  = useState<{ top: number; right: number } | null>(null);

  // ── One bundled cached query for the whole dashboard home ─────────────────
  type HomeBundle = {
    sessions:       Session[];
    recentActivity: RecentActivity[];
    stats:          { todayCount: number; patientsCount: number; weekRevenue: number; weekHoursStr: string };
    nsPatientsList: NsPatientOption[];
    nsServicesList: NsServiceOption[];
    availConfig:    any[];
    blockedDates:   string[];
    availSettings:  any;
    allAppointments: any[];
  };

  const { data: bundle, loading: bundleLoading } = useCachedQuery<HomeBundle>(
    psychId ? `home:bundle:${psychId}` : null,
    async () => {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);
      const weekStart  = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay());

      // Auto-cancel pending/scheduled sessions from past days (fire-and-forget)
      supabase.from('appointments')
        .update({ status: 'cancelled' })
        .eq('psychologist_id', psychId!)
        .in('status', ['pending', 'scheduled'])
        .lt('end_time', todayStart.toISOString());

      const [
        { data: todayRows },
        { data: patientRows },
        { data: weekRows },
        { data: apptPatientsData },
        { data: directPatientsData },
        { data: servicesData },
        { data: recentRows },
        { data: availDataRaw },
        { data: blockedDataRaw },
        { data: settingsDataRaw },
        { data: allApptsRaw },
      ] = await Promise.all([
        supabase.from('appointments')
          .select('id, start_time, status, patients(name, email, phone), event_types(title, mode, price)')
          .eq('psychologist_id', psychId!)
          .in('status', ['pending', 'confirmed', 'scheduled'])
          .gte('start_time', todayStart.toISOString())
          .lte('start_time', todayEnd.toISOString())
          .order('start_time'),
        supabase.from('appointments').select('patient_id').eq('psychologist_id', psychId!).neq('status', 'cancelled'),
        supabase.from('appointments').select('start_time, end_time, event_types(price)').eq('psychologist_id', psychId!).eq('status', 'completed').gte('start_time', weekStart.toISOString()),
        supabase.from('appointments').select('patients(id, name, email, phone)').eq('psychologist_id', psychId!),
        supabase.from('patients').select('id, name, email, phone').eq('psychologist_id', psychId!),
        supabase.from('event_types').select('id, title, mode, duration_minutes, price').eq('psychologist_id', psychId!).eq('is_active', true).order('title'),
        supabase.from('appointments').select('id, start_time, status, created_at, patients(name), event_types(title, mode)').eq('psychologist_id', psychId!).order('created_at', { ascending: false }).limit(8),
        supabase.from('availability').select('day_of_week, start_time, end_time').eq('psychologist_id', psychId!),
        supabase.from('blocked_dates').select('date').eq('psychologist_id', psychId!),
        supabase.from('availability_settings').select('buffer_minutes, min_notice_hours, max_sessions_per_day, booking_window_days, allow_overtime').eq('psychologist_id', psychId!).maybeSingle(),
        supabase.from('appointments').select('start_time, end_time').eq('psychologist_id', psychId!).neq('status', 'cancelled'),
      ]);

      const pMap = new Map<string, any>();
      (apptPatientsData ?? []).forEach((r: any) => { if (r.patients) pMap.set(r.patients.id, r.patients); });
      (directPatientsData ?? []).forEach((r: any) => pMap.set(r.id, r));
      const nsPatientsList = Array.from(pMap.values())
        .map(p => ({ id: p.id, name: p.name, email: p.email, phone: p.phone }))
        .sort((a, b) => a.name.localeCompare(b.name, 'es'));

      const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#7c3aed', '#ec4899'];
      const sessions: Session[] = (todayRows ?? []).map((r: any, i: number) => {
        const name = r.patients?.name ?? 'Paciente';
        return {
          time:     new Date(r.start_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
          name,
          type:     r.event_types?.title ?? 'Sesión',
          status:   r.status === 'pending' ? 'Pendiente' : 'Confirmado',
          initial:  name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase(),
          color:    COLORS[i % COLORS.length],
          modality: r.event_types?.mode ?? 'online',
          isNext:   i === 0,
          phone:    r.patients?.phone ?? '',
          email:    r.patients?.email ?? '',
        };
      });

      const uniquePatients = new Set((patientRows ?? []).map((r: any) => r.patient_id)).size;
      const weekRev = (weekRows ?? []).reduce((sum: number, r: any) => sum + (r.event_types?.price ?? 0), 0);
      let weekMins = 0;
      (weekRows ?? []).forEach((r: any) => {
        if (r.start_time && r.end_time) {
          const diffMs = new Date(r.end_time).getTime() - new Date(r.start_time).getTime();
          if (diffMs > 0) weekMins += diffMs / (1000 * 60);
        }
      });
      const weekHoursStr = weekMins >= 60
        ? `${Math.floor(weekMins / 60)}h ${Math.round(weekMins % 60)}m`
        : `${Math.round(weekMins)} min`;

      const ACT_COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#7c3aed', '#ec4899', '#ef4444', '#6366f1', '#14b8a6'];
      const statusLabel: Record<string, string> = {
        pending: 'Pendiente', confirmed: 'Confirmada', scheduled: 'Confirmada', cancelled: 'Cancelada', completed: 'Completada',
      };
      const recentActivity: RecentActivity[] = (recentRows ?? []).map((r: any, i: number) => {
        const name = r.patients?.name ?? 'Paciente';
        return {
          id: r.id,
          patientName: name,
          serviceTitle: r.event_types?.title ?? 'Sesión',
          startTime: r.start_time,
          status: statusLabel[r.status] ?? r.status,
          createdAt: r.created_at,
          initial: name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase(),
          color: ACT_COLORS[i % ACT_COLORS.length],
          modality: r.event_types?.mode ?? 'online',
        };
      });

      return {
        sessions, recentActivity,
        stats:           { todayCount: sessions.length, patientsCount: uniquePatients, weekRevenue: weekRev, weekHoursStr },
        nsPatientsList,
        nsServicesList:  (servicesData ?? []) as NsServiceOption[],
        availConfig:     availDataRaw ?? [],
        blockedDates:    (blockedDataRaw ?? []).map((b: any) => b.date),
        availSettings:   settingsDataRaw || { buffer_minutes: 10, min_notice_hours: 2, max_sessions_per_day: 12, booking_window_days: 60, allow_overtime: false },
        allAppointments: allApptsRaw ?? [],
      };
    },
  );

  // Derived (always defined, with fallback empty data so the JSX doesn't break)
  const sessions       = bundle?.sessions       ?? [];
  const recentActivity = bundle?.recentActivity ?? [];
  const stats          = bundle?.stats          ?? { todayCount: 0, patientsCount: 0, weekRevenue: 0, weekHoursStr: '0h 0m' };
  const availConfig    = bundle?.availConfig    ?? [];
  const blockedDates   = bundle?.blockedDates   ?? [];
  const availSettings  = bundle?.availSettings  ?? null;
  const allAppointments = bundle?.allAppointments ?? [];
  const loading        = bundleLoading;

  const [availableDates,  setAvailableDates]  = useState<any[]>([]);
  const [selectedDateISO, setSelectedDateISO] = useState<string>('');

  // Sync modality from psychologist profile once known
  useEffect(() => {
    if (globalModality) setNsModality(globalModality as 'online' | 'presencial');
  }, [globalModality]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-dropdown]')) { setReminderOpen(null); setReminderPos(null); }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const openNote = (s: Session) => {
    const fecha = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    router.push(`/dashboard/nota?${new URLSearchParams({ paciente: s.name, hora: s.time, fecha }).toString()}`);
  };

  const sendWhatsApp = (s: Session) => {
    if (!s.phone) return;
    const defaultTemplate = `¡Hola {{nombre}}! 👋\n\nTe recuerdo que tienes sesión hoy a las *{{hora}}*.\n\n💻 Modalidad: {{modalidad}}\n{{detalle}}\n\n¡Nos vemos! 💙`;
    const template = psychologist?.whatsapp_reminder_template || defaultTemplate;
    
    const detail = s.modality === 'online' 
      ? `🔗 ${psychologist?.video_meeting_url || 'Google Meet'}`
      : `📍 Presencial`;

    const msg = template
      .replace('{{nombre}}', s.name)
      .replace('{{fecha}}', 'hoy')
      .replace('{{hora}}', s.time)
      .replace('{{detalle}}', detail)
      .replace('{{modalidad}}', s.modality === 'online' ? 'Online' : 'Presencial');
    
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const baseUrl = isMobile ? 'https://wa.me' : 'https://web.whatsapp.com/send';
    const phone = s.phone.replace(/\D/g, '');
    const url = isMobile 
      ? `${baseUrl}/${phone}?text=${encodeURIComponent(msg)}`
      : `${baseUrl}?phone=${phone}&text=${encodeURIComponent(msg)}`;
      
    window.open(url, '_blank');
    setReminderOpen(null); setReminderPos(null);
  };

  const sendEmail = (s: Session) => {
    if (!s.email) return;
    const subj = encodeURIComponent(`Recordatorio: Tu sesión hoy a las ${s.time}`);
    const body = encodeURIComponent(`Hola ${s.name},\n\nTe recuerdo que tienes sesión hoy a las ${s.time}.\nModalidad: ${s.modality === 'online' ? 'Online' : 'Presencial'}\n\n¡Nos vemos!`);
    window.open(`mailto:${s.email}?subject=${subj}&body=${body}`, '_blank');
    setReminderOpen(null);
  };

  // Nueva sesión modal
  const [showNewSession, setShowNewSession] = useState(false);
  const [nsStep, setNsStep]             = useState<'form' | 'success'>('form');
  const [nsPatient, setNsPatient]       = useState('');
  const [nsPatientId, setNsPatientId]   = useState<string | null>(null);
  const [nsPatientFocused, setNsPatientFocused] = useState(false);
  const [nsDate, setNsDate]             = useState('');
  const [nsTime, setNsTime]             = useState('');
  const [nsServiceId, setNsServiceId]   = useState('');
  const [nsModality, setNsModality]     = useState<'online' | 'presencial'>('online');
  const [nsDuration, setNsDuration]     = useState('50');
  const [nsPrice, setNsPrice]           = useState('');
  const nsPatientsList = bundle?.nsPatientsList ?? [];
  const nsServicesList = bundle?.nsServicesList ?? [];

  // Generate slots whenever service, settings or bookings change.
  // Depend on `bundle` (stable reference) instead of derived arrays — those
  // would be new literals every render and trigger an infinite loop.
  useEffect(() => {
    if (!bundle || !bundle.availConfig.length) return;
    const duration = parseInt(nsDuration) || 50;
    const buffer = bundle.availSettings?.buffer_minutes ?? 10;
    const notice = bundle.availSettings?.min_notice_hours ?? 2;
    const maxPerDay = bundle.availSettings?.max_sessions_per_day ?? 12;
    const windowDays = bundle.availSettings?.booking_window_days ?? 60;

    const slots = generateSlots(
      bundle.availConfig,
      bundle.allAppointments,
      bundle.blockedDates,
      duration,
      buffer,
      notice,
      maxPerDay,
      windowDays,
      bundle.availSettings?.allow_overtime ?? false,
    );
    setAvailableDates(slots);

    // Auto-select first date if none selected or if current selection is invalid
    if (slots.length > 0) {
      const exists = slots.find(d => d.dateISO === selectedDateISO);
      if (!exists) {
        setSelectedDateISO(slots[0].dateISO);
        setNsDate(slots[0].dateISO);
      }
    }
  }, [nsDuration, bundle, selectedDateISO]);

  function generateSlots(
    availability:    any[],
    booked:          any[],
    blocked:         string[],
    durationMinutes: number,
    bufferMinutes:   number,
    minNoticeHours:  number,
    maxPerDay:       number,
    daysAhead:       number,
    allowOvertime:   boolean = false
  ) {
    const result: any[] = [];
    const now = new Date();
    const minStart = new Date(now.getTime() + minNoticeHours * 3600000);

    for (let i = 0; i <= daysAhead; i++) {
      const day = addDays(now, i);
      day.setHours(0, 0, 0, 0);
      const dateISO = format(day, 'yyyy-MM-dd');

      if (blocked.includes(dateISO)) continue;

      const dayBlocks = availability
        .filter(a => a.day_of_week === day.getDay())
        .sort((a, b) => a.start_time.localeCompare(b.start_time));
      if (dayBlocks.length === 0) continue;

      const dayStart = startOfDay(day);
      const dayEnd = new Date(day); dayEnd.setHours(23, 59, 59, 999);
      const existingToday = booked.filter(b => {
        const t = new Date(b.start_time);
        return t >= dayStart && t <= dayEnd;
      });
      const capacity = maxPerDay - existingToday.length;
      if (capacity <= 0) continue;

      const slots: string[] = [];
      for (const block of dayBlocks) {
        if (slots.length >= capacity) break;
        const [sh, sm] = block.start_time.split(':').map(Number);
        const [eh, em] = block.end_time.split(':').map(Number);

        let cursor = new Date(day); cursor.setHours(sh, sm, 0, 0);
        const blockEnd = new Date(day); blockEnd.setHours(eh, em, 0, 0);

        while (slots.length < capacity) {
          const slotEnd = addMinutes(cursor, durationMinutes);
          
          if (allowOvertime) {
            if (cursor >= blockEnd) break;
          } else {
            if (slotEnd > blockEnd) break;
          }
          if (isBefore(cursor, minStart)) {
            cursor = addMinutes(cursor, durationMinutes + bufferMinutes);
            continue;
          }

          const bufMs = bufferMinutes * 60000;
          const hasConflict = booked.some(b => {
            const bStart = new Date(b.start_time).getTime();
            const bEnd   = new Date(b.end_time).getTime();
            return cursor.getTime() < bEnd + bufMs && slotEnd.getTime() > bStart;
          });

          if (!hasConflict) slots.push(format(cursor, 'HH:mm'));
          cursor = addMinutes(cursor, durationMinutes + bufferMinutes);
        }
      }

      if (slots.length > 0) {
        result.push({
          label: format(day, 'EEE d MMM', { locale: es }),
          dateISO,
          slots: slots.filter((s, i, a) => a.indexOf(s) === i).sort(),
        });
      }
    }
    return result;
  }


  const closeNewSession = () => {
    setShowNewSession(false);
    setTimeout(() => {
      setNsStep('form'); setNsPatient(''); setNsPatientId(null);
      setNsDate(''); setNsTime(''); setNsPrice(''); setNsPatientFocused(false);
    }, 300);
  };

  const saveNewSession = async () => {
    if (!nsPatientId || !nsDate || !nsTime) return;
    const startDt = new Date(`${nsDate}T${nsTime}:00`);
    const endDt   = new Date(startDt.getTime() + parseInt(nsDuration) * 60000);

    const selectedPatient = nsPatientsList.find(p => p.id === nsPatientId);
    if (!selectedPatient?.email) {
      alert("El paciente seleccionado no tiene correo electrónico. Por favor agrégalo en la sección de Pacientes.");
      return;
    }

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          psychologist_id: psychId,
          event_type_id: nsServiceId || null,
          patient: {
            name: selectedPatient.name,
            email: selectedPatient.email,
            phone: selectedPatient.phone || ''
          },
          start_time: startDt.toISOString(),
          end_time: endDt.toISOString(),
          patient_notes: null
        })
      });

      if (!res.ok) throw new Error('Error al crear la sesión en el servidor');

      const formattedDate = startDt.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
      const defaultTemplate = `¡Hola {{nombre}}! 👋\n\nTu sesión ha sido confirmada:\nFecha: {{fecha}} a las {{hora}}\nModalidad: {{modalidad}}\n\n¡Nos vemos! 💙`;
      const template = psychologist?.whatsapp_reminder_template || defaultTemplate;
      const detail = nsModality === 'online' 
        ? `🔗 ${psychologist?.video_meeting_url || 'Google Meet'}`
        : `📍 Presencial`;

      const waMsg = template
        .replace('{{nombre}}', nsPatient)
        .replace('{{fecha}}', formattedDate)
        .replace('{{hora}}', nsTime)
        .replace('{{detalle}}', detail)
        .replace('{{modalidad}}', nsModality === 'online' ? 'Online' : 'Presencial');

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const baseUrl = isMobile ? 'https://wa.me' : 'https://web.whatsapp.com/send';
      const phone = selectedPatient.phone ? selectedPatient.phone.replace(/\D/g, '') : '';
      const url = isMobile 
        ? `${baseUrl}/${phone}?text=${encodeURIComponent(waMsg)}`
        : `${baseUrl}?phone=${phone}&text=${encodeURIComponent(waMsg)}`;
      
      window.open(url, '_blank');
      setNsStep('success');
      if (psychId) invalidate(`home:bundle:${psychId}`);
    } catch (err: any) {
      alert(err.message || 'Error al crear la sesión');
    }
  };

  const today = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
  const nextSession = sessions[0];

  return (
    <>
      <style>{`
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 2rem;
          gap: 1rem;
        }
        .header-actions {
          display: flex;
          gap: 0.75rem;
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.25rem;
          margin-bottom: 2rem;
        }
        .main-grid {
          display: grid;
          grid-template-columns: minmax(300px, 1fr) 2fr;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }
        @media (max-width: 1024px) {
          .metrics-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .main-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 768px) {
          .dashboard-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .header-actions {
            width: 100%;
            flex-direction: column;
          }
          .header-actions a, .header-actions button {
            width: 100%;
            justify-content: center;
          }
          .metrics-grid {
            grid-template-columns: 1fr;
          }
          .agenda-row {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 1rem !important;
            padding: 1.25rem !important;
          }
          .agenda-row-header {
            display: none !important;
          }
          .agenda-row-meta {
            width: 100% !important;
            justify-content: space-between !important;
            display: flex;
            align-items: center;
          }
          .agenda-row-actions {
            width: 100% !important;
            gap: 0.5rem !important;
          }
          .agenda-row-actions button, .agenda-row-actions a {
            flex: 1;
            justify-content: center;
          }
        }
      `}</style>
      <div className="animate-slide-up">

        {/* Header */}
        <div className="dashboard-header">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '0.25rem', letterSpacing: '-0.02em' }}>
            {(() => {
              const hour = new Date().getHours();
              let g = 'Hola';
              if (hour >= 5 && hour < 12) g = 'Buenos días';
              else if (hour >= 12 && hour < 20) g = 'Buenas tardes';
              else g = 'Buenas noches';
              return `${g}${psychName ? `, ${psychName}` : ''}`;
            })()}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem' }}>
            {today.charAt(0).toUpperCase() + today.slice(1)} ·{' '}
            {loading ? 'Cargando...' : stats.todayCount === 0
              ? 'Sin sesiones hoy'
              : <><strong style={{ color: 'var(--text-dark)' }}>{stats.todayCount} sesión{stats.todayCount > 1 ? 'es' : ''}</strong> hoy</>
            }
          </p>
        </div>
        <div className="header-actions">
          <Link href={`/${psychSlug}`} target="_blank" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', background: 'var(--bg-white)', color: 'var(--text-dark)', fontWeight: 600, fontSize: '0.9rem', boxShadow: 'var(--shadow-sm)', textDecoration: 'none' }}>
            Ver perfil público <ExternalLink size={15} />
          </Link>
          <button onClick={() => setShowNewSession(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.5rem', fontSize: '0.9rem' }}>
            <Plus size={16} /> Nueva Sesión
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="metrics-grid">
        {[
          { label: 'Sesiones hoy',        val: loading ? '—' : String(stats.todayCount),    change: stats.todayCount === 0 ? 'Sin sesiones programadas' : `${stats.todayCount} sesión${stats.todayCount > 1 ? 'es' : ''} hoy`, icon: TrendingUp, Ibg: 'var(--primary-light-blue)', Icol: 'var(--primary-blue)',  chcol: 'var(--accent-green)' },
          { label: 'Pacientes totales',   val: loading ? '—' : String(stats.patientsCount), change: stats.patientsCount === 0 ? 'Aún sin pacientes' : 'Con al menos 1 sesión',                                                   icon: Users,      Ibg: 'var(--accent-soft-green)', Icol: 'var(--accent-green)', chcol: 'var(--text-muted)'   },
          { label: 'Ingresos esta semana',val: loading ? '—' : stats.weekRevenue > 0 ? `$${stats.weekRevenue.toLocaleString('es-CL')}` : '—', change: stats.weekRevenue > 0 ? 'Sesiones completadas' : 'Sin sesiones completadas', icon: DollarSign, Ibg: '#fef9ee',                  Icol: '#d97706',              chcol: 'var(--accent-green)' },
          { label: 'Horas en sesión',     val: loading ? '—' : stats.weekHoursStr, change: 'Sesiones completadas (semana)', icon: Clock, Ibg: '#f5f3ff', Icol: '#7c3aed', chcol: 'var(--text-muted)' },
        ].map((m, i) => {
          const Icon = m.icon;
          return (
            <div key={i} className="premium-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>{m.label}</span>
                <span style={{ padding: '0.4rem', background: m.Ibg, color: m.Icol, borderRadius: '8px' }}><Icon size={16} /></span>
              </div>
              <p style={{ fontSize: i === 2 ? '1.9rem' : '2.5rem', fontWeight: 700, color: 'var(--text-dark)', lineHeight: 1 }}>{m.val}</p>
              <p style={{ fontSize: '0.82rem', color: m.chcol, fontWeight: 600, marginTop: '0.5rem' }}>{m.change}</p>
            </div>
          );
        })}
      </div>

      {/* Main grid */}
      <div className="main-grid">

        {/* Próxima sesión */}
        <div>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-dark)' }}>Próxima Sesión</h2>
          {nextSession ? (
            <div className="premium-card" style={{ padding: '2rem', background: 'linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)', color: 'white', border: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div style={{ padding: '0.35rem 0.9rem', background: 'rgba(255,255,255,0.2)', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 700 }}>{nextSession.time}</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.7rem', background: 'rgba(56,189,248,0.25)', border: '1px solid rgba(56,189,248,0.4)', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#bae6fd' }}>
                  {nextSession.modality === 'online' ? <><Video size={13} /> Online</> : <><MapPin size={13} /> Presencial</>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 700 }}>{nextSession.initial}</div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>{nextSession.name}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.88rem', margin: '0.2rem 0 0 0' }}>{nextSession.type}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {nextSession.modality === 'online' && videoUrl ? (
                  <>
                    <a href={videoUrl} target="_blank" rel="noreferrer"
                      style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: 'none', background: 'white', color: '#0369a1', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.9rem', textDecoration: 'none' }}>
                      <Video size={16} /> Unirse
                    </a>
                    <button onClick={() => openNote(nextSession)} style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                      <FileText size={16} />
                    </button>
                  </>
                ) : (
                  <button onClick={() => openNote(nextSession)} style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <FileText size={16} /> Nota
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="premium-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Calendar size={36} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
              <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Sin sesiones hoy</p>
              <p style={{ fontSize: '0.85rem' }}>Las sesiones agendadas para hoy aparecerán aquí.</p>
            </div>
          )}
        </div>

        {/* Agenda de hoy */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-dark)' }}>Agenda de Hoy</h2>
            <Link href="/dashboard/appointments" style={{ fontSize: '0.85rem', color: 'var(--primary-blue)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none' }}>
              Ver todas <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="premium-card" style={{ overflow: 'hidden' }}>
            {sessions.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Clock size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
                <p style={{ fontWeight: 600, marginBottom: '0.4rem' }}>Sin sesiones programadas para hoy</p>
                <p style={{ fontSize: '0.85rem' }}>Cuando los pacientes agenden, aparecerán aquí.</p>
              </div>
            ) : (
              <>
                <div className="agenda-row-header" style={{ padding: '0.75rem 1.5rem', background: 'var(--bg-main)', borderBottom: '1px solid var(--border-light)', display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                  <span style={{ width: '52px', flexShrink: 0 }}>Hora</span>
                  <span style={{ flex: 1 }}>Paciente</span>
                  <span style={{ width: '130px', textAlign: 'center', flexShrink: 0 }}>Estado</span>
                  <span style={{ width: '170px', textAlign: 'right', flexShrink: 0 }}>Acciones</span>
                </div>
                {sessions.map((s, i) => (
                  <div key={i} className="agenda-row" style={{ padding: '1rem 1.5rem', borderBottom: i < sessions.length - 1 ? '1px solid var(--border-light)' : 'none', display: 'flex', alignItems: 'center', gap: '1rem', background: s.isNext ? 'rgba(14,165,233,0.03)' : 'white' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', minWidth: 0 }}>
                      <strong style={{ width: '52px', flexShrink: 0, fontWeight: 700, color: s.isNext ? 'var(--primary-blue)' : 'var(--text-dark)', fontSize: '0.95rem' }}>{s.time}</strong>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: `${s.color}18`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 }}>{s.initial}</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-dark)', fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                          <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.1rem' }}>
                            {s.modality === 'online' ? <Video size={10} style={{ color: '#0ea5e9' }} /> : <MapPin size={10} style={{ color: '#f97316' }} />}
                            {s.type}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="agenda-row-meta" style={{ width: '130px', flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                      {s.status === 'Pendiente' ? (
                        <span style={{ padding: '0.3rem 0.75rem', borderRadius: '2rem', fontSize: '0.72rem', fontWeight: 700, background: '#fef9ee', color: '#d97706' }}>
                          ⏳ Pendiente
                        </span>
                      ) : (
                        <span style={{ padding: '0.3rem 0.75rem', borderRadius: '2rem', fontSize: '0.72rem', fontWeight: 700, background: 'var(--accent-soft-green)', color: 'var(--accent-green)' }}>
                          ✓ Confirmado
                        </span>
                      )}
                    </div>
                    <div className="agenda-row-actions" style={{ width: '170px', flexShrink: 0, display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                      <div data-dropdown="true">
                        <button onClick={(e) => {
                          if (reminderOpen === i) { setReminderOpen(null); setReminderPos(null); }
                          else {
                            const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                            setReminderPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
                            setReminderOpen(i);
                          }
                        }} style={{ padding: '0.35rem 0.7rem', borderRadius: '8px', border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#15803d', fontSize: '0.74rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          <Bell size={11} /> Recordar <ChevronDown size={10} />
                        </button>
                      </div>
                      {s.modality === 'online' && videoUrl ? (
                        <a href={videoUrl} target="_blank" rel="noreferrer" style={{ padding: '0.35rem 0.7rem', borderRadius: '8px', border: '1px solid #bae6fd', background: '#f0f9ff', color: '#0369a1', fontSize: '0.74rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                          <Video size={11} /> Unirse
                        </a>
                      ) : (
                        <button onClick={() => openNote(s)} style={{ padding: '0.35rem 0.7rem', borderRadius: '8px', border: '1px solid var(--border-light)', background: 'white', color: 'var(--primary-blue)', fontSize: '0.74rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          <FileText size={11} /> Nota
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Actividad reciente */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-dark)' }}>Actividad Reciente</h2>
          <Link href="/dashboard/appointments" style={{ fontSize: '0.82rem', color: 'var(--primary-blue)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            Ver sesiones <ChevronRight size={14} />
          </Link>
        </div>
        <div className="premium-card" style={{ overflow: 'hidden' }}>
          {recentActivity.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
              <p style={{ fontWeight: 600, marginBottom: '0.4rem' }}>Sin actividad reciente</p>
              <p style={{ fontSize: '0.85rem' }}>Las reservas de pacientes aparecerán aquí.</p>
            </div>
          ) : (
            recentActivity.map((act, i) => {
              const start = new Date(act.startTime);
              const dateStr = (() => {
                const d = start.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
                return d.charAt(0).toUpperCase() + d.slice(1);
              })();
              const timeStr = start.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
              const statusColors: Record<string, { bg: string; color: string }> = {
                'Pendiente':   { bg: '#fef9ee', color: '#d97706' },
                'Confirmada':  { bg: 'var(--accent-soft-green)', color: 'var(--accent-green)' },
                'Cancelada':   { bg: '#fef2f2', color: '#ef4444' },
                'Completada':  { bg: '#f1f5f9', color: '#64748b' },
              };
              const sc = statusColors[act.status] ?? { bg: '#f1f5f9', color: '#64748b' };
              return (
                <div key={act.id} style={{ padding: '0.9rem 1.5rem', borderBottom: i < recentActivity.length - 1 ? '1px solid var(--border-light)' : 'none', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `${act.color}18`, color: act.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>{act.initial}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-dark)', fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{act.patientName}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.1rem' }}>
                      {act.modality === 'online' ? <Video size={10} style={{ color: '#0ea5e9' }} /> : <MapPin size={10} style={{ color: '#f97316' }} />}
                      {act.serviceTitle}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <Calendar size={11} /> {dateStr} · {timeStr}
                    </div>
                    <span style={{ padding: '0.18rem 0.6rem', borderRadius: '2rem', fontSize: '0.7rem', fontWeight: 700, background: sc.bg, color: sc.color }}>{act.status}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal — Nueva Sesión */}
      {showNewSession && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={closeNewSession}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '520px', background: 'white', borderRadius: '20px', boxShadow: '0 24px 64px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', maxHeight: '92vh', overflow: 'hidden' }}>
            {nsStep === 'form' && (
              <>
                <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Calendar size={19} style={{ color: '#3b82f6' }} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111827', margin: 0 }}>Nueva Sesión</h3>
                      <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: '0.1rem 0 0' }}>Registra una sesión manualmente</p>
                    </div>
                  </div>
                  <button onClick={closeNewSession} style={{ padding: '0.4rem', borderRadius: '8px', color: '#9ca3af', cursor: 'pointer', background: 'transparent', border: 'none', display: 'flex' }}><X size={18} /></button>
                </div>

                <div style={{ padding: '1.75rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.2rem', overflowY: 'auto' }}>

                  {/* Patient autocomplete */}
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.4rem' }}>Paciente <span style={{ color: '#ef4444' }}>*</span></label>
                    <div style={{ position: 'relative' }}>
                      <input
                        value={nsPatient}
                        onChange={e => { setNsPatient(e.target.value); setNsPatientId(null); }}
                        onFocus={() => setNsPatientFocused(true)}
                        onBlur={() => setTimeout(() => setNsPatientFocused(false), 150)}
                        placeholder="Buscar paciente..."
                        autoComplete="off"
                        style={{ width: '100%', fontSize: '0.93rem', padding: '0.8rem 1rem', borderRadius: '12px', border: `1.5px solid ${nsPatientFocused ? '#0ea5e9' : '#e2e8f0'}`, outline: 'none', boxSizing: 'border-box' }}
                      />
                      {nsPatientFocused && (
                        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 50, overflow: 'hidden', maxHeight: '200px', overflowY: 'auto' }}>
                          {(() => {
                            const filtered = nsPatientsList.filter(p => p.name.toLowerCase().includes(nsPatient.toLowerCase()));
                            if (nsPatientsList.length === 0) {
                              return (
                                <div style={{ padding: '1rem 1.1rem', fontSize: '0.85rem', color: '#92400e', background: '#fffbeb', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span>⚠️</span>
                                  <span>No tienes pacientes registrados. <Link href="/dashboard/patients" style={{ color: '#d97706', fontWeight: 700 }}>Crear paciente</Link></span>
                                </div>
                              );
                            }
                            if (filtered.length === 0 && nsPatient.length > 0) {
                              return (
                                <div style={{ padding: '1rem 1.1rem', fontSize: '0.85rem', color: '#92400e', background: '#fffbeb', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span>⚠️</span>
                                  <span>Paciente no encontrado. Primero debes <Link href="/dashboard/patients" style={{ color: '#d97706', fontWeight: 700 }}>crear el paciente</Link>.</span>
                                </div>
                              );
                            }
                            return filtered.map(p => (
                              <button key={p.id} onMouseDown={() => { setNsPatient(p.name); setNsPatientId(p.id); }}
                                style={{ width: '100%', padding: '0.75rem 1rem', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: '0.92rem', fontWeight: 500, color: '#1e293b' }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#f0f9ff')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                {p.name}
                              </button>
                            ));
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Date Selection (Connected) */}
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.6rem' }}>Selecciona Fecha <span style={{ color: '#ef4444' }}>*</span></label>
                    <div style={{ display: 'flex', gap: '0.6rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
                      {availableDates.map(d => (
                        <button key={d.dateISO} onClick={() => { setSelectedDateISO(d.dateISO); setNsDate(d.dateISO); setNsTime(''); }}
                          style={{ minWidth: '85px', padding: '0.75rem 0.5rem', borderRadius: '12px', border: selectedDateISO === d.dateISO ? '2px solid #3b82f6' : '1.5px solid #e2e8f0', background: selectedDateISO === d.dateISO ? '#eff6ff' : 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', transition: 'all 0.2s' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: selectedDateISO === d.dateISO ? '#3b82f6' : '#94a3b8', textTransform: 'uppercase' }}>{d.label.split(' ')[0]}</span>
                          <span style={{ fontSize: '1rem', fontWeight: 800, color: selectedDateISO === d.dateISO ? '#1e40af' : '#334155' }}>{d.label.split(' ')[1]}</span>
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: selectedDateISO === d.dateISO ? '#3b82f6' : '#94a3b8' }}>{d.label.split(' ')[2]}</span>
                        </button>
                      ))}
                      {availableDates.length === 0 && <p style={{ fontSize: '0.85rem', color: '#94a3b8', padding: '1rem' }}>No hay fechas disponibles configuradas.</p>}
                    </div>
                  </div>

                  {/* Time Selection (Connected) */}
                  {selectedDateISO && (
                    <div className="animate-slide-up">
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.6rem' }}>Horas disponibles <span style={{ color: '#ef4444' }}>*</span></label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.6rem' }}>
                        {(availableDates.find(d => d.dateISO === selectedDateISO)?.slots || []).map((t: string) => (
                          <button key={t} onClick={() => setNsTime(t)}
                            style={{ padding: '0.65rem', borderRadius: '10px', border: nsTime === t ? '2px solid #3b82f6' : '1.5px solid #e2e8f0', background: nsTime === t ? '#3b82f6' : 'white', color: nsTime === t ? 'white' : '#475569', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' }}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Service type from DB */}
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.4rem' }}>Tipo de sesión</label>
                    {nsServicesList.length > 0 ? (
                      <div style={{ position: 'relative' }}>
                        <select value={nsServiceId} onChange={e => {
                          setNsServiceId(e.target.value);
                          const svc = nsServicesList.find(s => s.id === e.target.value);
                          if (svc) { 
                            setNsModality(svc.mode as 'online' | 'presencial'); 
                            setNsDuration(String(svc.duration_minutes));
                            setNsPrice(String(svc.price));
                          } else {
                            setNsModality('online');
                            setNsDuration('');
                            setNsPrice('');
                          }
                        }} style={{ width: '100%', fontSize: '0.93rem', padding: '0.8rem 1rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', background: 'white', appearance: 'none' }}>
                          <option value="">Selecciona un tipo de sesión</option>
                          {nsServicesList.map(s => <option key={s.id} value={s.id}>{s.title} · {s.duration_minutes} min</option>)}
                        </select>
                        <ChevronDown size={16} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                      </div>
                    ) : (
                      <div style={{ padding: '0.8rem 1rem', background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '12px', fontSize: '0.85rem', color: '#92400e' }}>
                        ⚠️ No tienes servicios activos. <Link href="/dashboard/services" style={{ color: '#d97706', fontWeight: 700 }}>Crear servicio</Link>
                      </div>
                    )}
                  </div>

                  {/* Modality — only show if not forced by global setting */}
                  {globalModality ? (
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.5rem' }}>Modalidad</label>
                      <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.6rem', width: 'fit-content' }}>
                        {globalModality === 'online' ? <Video size={16} style={{ color: '#3b82f6' }} /> : <MapPin size={16} style={{ color: '#f59e0b' }} />}
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>
                          {globalModality === 'online' ? 'Online' : 'Presencial'}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>(Configurado en Integraciones)</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.5rem' }}>Modalidad</label>
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        {(['online', 'presencial'] as const).map(m => (
                          <button key={m} type="button" onClick={() => setNsModality(m)} style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem', border: nsModality === m ? '2px solid #3b82f6' : '2px solid #e2e8f0', background: nsModality === m ? '#eff6ff' : 'white', color: nsModality === m ? '#1e40af' : '#64748b', transition: 'all 0.2s' }}>
                            {m === 'online' ? 'Online' : 'Presencial'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.4rem' }}>Duración</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '0.93rem', color: '#475569', fontWeight: 700 }}>
                        <Clock size={16} style={{ color: '#94a3b8' }} />
                        {nsDuration ? `${nsDuration} min` : '—'}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.4rem' }}>Honorario</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '0.93rem', color: '#334155', fontWeight: 800 }}>
                        <DollarSign size={16} style={{ color: '#94a3b8' }} />
                        {nsPrice ? `$${parseInt(nsPrice).toLocaleString('es-CL')}` : '—'}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '1.25rem 2rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '0.75rem', background: '#fafafa' }}>
                  <button onClick={closeNewSession} style={{ padding: '0.85rem 1.5rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
                  <button onClick={saveNewSession} disabled={!nsPatientId || !nsDate || !nsTime}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.85rem', fontSize: '0.95rem', fontWeight: 700, cursor: (!nsPatientId || !nsDate || !nsTime) ? 'not-allowed' : 'pointer', borderRadius: '12px', border: 'none', background: (!nsPatientId || !nsDate || !nsTime) ? '#e2e8f0' : 'linear-gradient(135deg,#3b82f6,#2563eb)', color: (!nsPatientId || !nsDate || !nsTime) ? '#94a3b8' : 'white', boxShadow: (!nsPatientId || !nsDate || !nsTime) ? 'none' : '0 4px 12px rgba(37,99,235,0.2)' }}>
                    <Calendar size={17} /> Agendar sesión
                  </button>
                </div>
              </>
            )}

            {nsStep === 'success' && (
              <div style={{ padding: '3rem 2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1.5rem' }}>
                <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg,#dcfce7,#bbf7d0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={36} style={{ color: '#16a34a' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem' }}>Sesión agendada</h3>
                  <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6 }}>La sesión con <strong>{nsPatient}</strong> quedó registrada.<br />Puedes notificarle por WhatsApp.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                  <a href={`https://wa.me/?text=${encodeURIComponent(`¡Hola ${nsPatient}!\n\nTu sesión ha sido confirmada:\nFecha: ${nsDate} a las ${nsTime}\nModalidad: ${nsModality === 'online' ? 'Online' : 'Presencial'}\n\n¡Nos vemos!`)}`} target="_blank" rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', padding: '0.9rem', borderRadius: '12px', background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none', border: '1.5px solid #bbf7d0' }}>
                    <MessageSquare size={18} /> Enviar WhatsApp
                  </a>
                  <a href={gcalUrl(nsPatient, nsDate, nsTime, nsDuration, nsModality)} target="_blank" rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', padding: '0.9rem', borderRadius: '12px', background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none', border: '1.5px solid #bfdbfe' }}>
                    <CalendarPlus size={18} /> Agregar a Google Calendar
                  </a>
                  <button onClick={closeNewSession} style={{ padding: '0.85rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer' }}>
                    Listo, cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      , document.body)}

      {/* Dropdown recordar */}
      {reminderOpen !== null && reminderPos && (() => {
        const s = sessions[reminderOpen];
        if (!s) return null;
        return (
          <div data-dropdown="true" style={{ position: 'fixed', top: reminderPos.top, right: reminderPos.right, zIndex: 9999, background: 'white', border: '1px solid var(--border-light)', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: '170px', overflow: 'hidden' }}>
            {s.phone && <button onClick={() => sendWhatsApp(s)} style={{ width: '100%', padding: '0.7rem 1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.83rem', fontWeight: 600, color: '#16a34a', textAlign: 'left' }} onMouseEnter={e => (e.currentTarget.style.background = '#f0fdf4')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}><MessageSquare size={14} /> WhatsApp</button>}
            {s.email && <button onClick={() => sendEmail(s)} style={{ width: '100%', padding: '0.7rem 1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.83rem', fontWeight: 600, color: '#1d4ed8', textAlign: 'left', borderTop: s.phone ? '1px solid var(--border-light)' : 'none' }} onMouseEnter={e => (e.currentTarget.style.background = '#eff6ff')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}><Mail size={14} /> Correo electrónico</button>}
          </div>
        );
      })()}
    </div>
    </>
  );
}
