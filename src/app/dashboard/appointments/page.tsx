"use client";

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar, Clock, FileText, Video, MapPin, ChevronLeft, ChevronRight,
  X, Save, CheckCircle2, MessageSquare, Mail, ChevronDown,
  Filter, ArrowUpDown, MoreVertical, RefreshCcw, Ban, CalendarPlus, Plus, CheckCheck, Loader2, AlertTriangle
} from 'lucide-react';
import { supabase } from '@/utils/supabase';
import { addMinutes, format, addDays, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { usePsychologist, useCachedQuery, useDashboardCache } from '@/lib/dashboard-context';

type AppStatus = 'Confirmada' | 'Pendiente' | 'Cancelada' | 'Completada';

type Appointment = {
  id: number;
  supabaseId?: string;
  patient: string;
  type: string;
  date: string;
  dateSort: string;
  time: string;
  hourNum: number;
  duration: string;
  status: AppStatus;
  initials: string;
  color: string;
  modality: 'online' | 'presencial';
  sessions: number;
  phone?: string;
  email?: string;
  patientNotes?: string;
};

const HOURS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'];

const STATUS_CONFIG: Record<AppStatus, { bg: string; color: string; dot: string; label: string }> = {
  Confirmada: { bg: 'var(--accent-soft-green)', color: 'var(--accent-green)', dot: '#10b981', label: 'Confirmada' },
  Pendiente:  { bg: '#fef9ee',                  color: '#d97706',             dot: '#f59e0b', label: 'Pendiente' },
  Cancelada:  { bg: '#fef2f2',                  color: '#ef4444',             dot: '#ef4444', label: 'Cancelada' },
  Completada: { bg: '#f1f5f9',                  color: '#64748b',             dot: '#94a3b8', label: 'Realizada' },
};

type FilterKey = 'Todas' | 'Próximas' | 'Hoy' | 'Pendiente' | 'Completada' | 'Cancelada';
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'Todas',      label: 'Todas' },
  { key: 'Próximas',   label: 'Próximas' },
  { key: 'Hoy',        label: 'Hoy' },
  { key: 'Pendiente',  label: 'Pendiente confirmación' },
  { key: 'Completada', label: 'Realizadas' },
  { key: 'Cancelada',  label: 'Canceladas' },
];

const SESSION_TYPES = ['Psicoterapia individual', 'Terapia de pareja', 'Evaluación inicial', 'Terapia familiar', 'Psicología infantil', 'Seguimiento'];

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

function ModalWrapper({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
  if (!mounted) return null;
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '540px', background: '#fff', borderRadius: '22px', boxShadow: '0 24px 64px rgba(0,0,0,0.18)', maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  , document.body);
}

export default function AppointmentsPage() {
  const router = useRouter();
  const { psychologist } = usePsychologist();
  const psychId = psychologist?.id ?? null;

  const { data: cachedAppointments } = useCachedQuery<Appointment[]>(
    psychId ? `appts:list:${psychId}` : null,
    async () => {
      const { data: rows } = await supabase
        .from('appointments')
        .select('id, start_time, end_time, status, patient_notes, patients(name, email, phone), event_types(title, mode, duration_minutes, price)')
        .eq('psychologist_id', psychId!)
        .order('start_time', { ascending: true });
      if (!rows || rows.length === 0) return [];
      const COLORS = ['#10b981','#0ea5e9','#f59e0b','#7c3aed','#ec4899','#ef4444'];
      const statusMap: Record<string, AppStatus> = {
        pending: 'Pendiente',
        confirmed: 'Confirmada',
        scheduled: 'Confirmada',
        cancelled: 'Cancelada',
        completed: 'Completada',
      };
      return rows.map((r: any, i: number) => {
        const start = new Date(r.start_time);
        const end = new Date(r.end_time);
        const durationMin = Math.round((end.getTime() - start.getTime()) / 60000);
        const patient = r.patients?.name ?? 'Paciente';
        const initials = patient.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
        const processed = {
          id: i + 1,
          supabaseId: r.id,
          patient,
          type: r.event_types?.title ?? 'Sesión',
          date: (() => {
            const d = start.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
            return d.charAt(0).toUpperCase() + d.slice(1);
          })(),
          dateSort: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`,
          time: start.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
          hourNum: start.getHours(),
          duration: `${durationMin} min`,
          status: statusMap[r.status] ?? 'Pendiente',
          initials,
          color: COLORS[i % COLORS.length],
          modality: r.event_types?.mode ?? 'online',
          sessions: 1,
          phone: r.patients?.phone,
          email: r.patients?.email,
          patientNotes: r.patient_notes ?? undefined,
        };
        
        // --- LIMPIEZA JUST-IN-TIME ---
        // Si la sesión es de hace más de 24 horas y sigue pendiente, la mostramos como completada
        const limitDate = new Date();
        limitDate.setHours(limitDate.getHours() - 24);
        
        if (processed.status === 'Pendiente' && start < limitDate) {
          processed.status = 'Completada';
          // Intentamos actualizar la DB en segundo plano para sincronizar
          supabase.from('appointments').update({ status: 'completed' }).eq('id', r.id).then(() => {});
        }

        return processed;
      });
    },
  );


  const [appointments, setAppointments] = useState<Appointment[]>([]);
  useEffect(() => {
    if (cachedAppointments) setAppointments(cachedAppointments);
  }, [cachedAppointments]);
  const [view, setView] = useState<'list' | 'week'>('list');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('Próximas');
  const [sortAsc, setSortAsc] = useState(true);

  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const [reminderOpen, setReminderOpen] = useState<number | null>(null);
  const [statusPickerId, setStatusPickerId] = useState<number | null>(null);

  const [statusPos,   setStatusPos]   = useState<{ top: number; right?: number; left?: number } | null>(null);
  const [reminderPos, setReminderPos] = useState<{ top: number; right?: number; left?: number } | null>(null);
  const [reminderPreviewApp, setReminderPreviewApp] = useState<Appointment | null>(null);
  const [reminderSendState, setReminderSendState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [reminderError, setReminderError] = useState('');
  const [rateLimited, setRateLimited] = useState(false);
  const [minutesLeft, setMinutesLeft] = useState(0);

  const handleSendReminder = async () => {
    if (!reminderPreviewApp || !reminderPreviewApp.supabaseId) return;
    setReminderSendState('sending');
    setReminderError('');
    try {
      const res = await fetch(`/api/appointments/${reminderPreviewApp.supabaseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remind' })
      });
      if (!res.ok) throw new Error('Error al enviar el recordatorio');
      
      // Update rate limit in localStorage
      localStorage.setItem('reminder_sent_' + reminderPreviewApp.supabaseId, Date.now().toString());
      setReminderSendState('success');
    } catch (err: any) {
      setReminderError(err.message || 'Error al enviar el recordatorio');
      setReminderSendState('error');
    }
  };
  const [menuPos,     setMenuPos]     = useState<{ top: number; right?: number; left?: number } | null>(null);

  const [statusConfirmFor, setStatusConfirmFor] = useState<Appointment | null>(null);
  const [statusConfirmNext, setStatusConfirmNext] = useState<AppStatus | null>(null);
  const [statusConfirmDone, setStatusConfirmDone] = useState(false);
  const [reactivateConfirmFor, setReactivateConfirmFor] = useState<Appointment | null>(null);

  const [showNS, setShowNS]       = useState(false);
  const [nsStep, setNsStep]       = useState<'form' | 'success'>('form');
  const [nsPatient, setNsPatient] = useState('');
  const [nsDate, setNsDate]       = useState('');
  const [nsTime, setNsTime]       = useState('');
  const [nsType, setNsType]       = useState(SESSION_TYPES[0]);
  const [nsModality, setNsModality] = useState<'online' | 'presencial'>('online');
  const [nsDuration, setNsDuration] = useState('50');
  
  const [rescheduleItem, setRescheduleItem] = useState<Appointment | null>(null);
  const [cancelItem, setCancelItem] = useState<Appointment | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [notifyMethod, setNotifyMethod] = useState<'whatsapp' | 'email' | 'none'>('whatsapp');
  const [updating, setUpdating] = useState(false);
  const [availableDates, setAvailableDates] = useState<any[]>([]);
  const [selectedDateISO, setSelectedDateISO] = useState<string>('');

  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1));
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const nextWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + 7);
    setCurrentWeekStart(d);
  };

  const prevWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() - 7);
    setCurrentWeekStart(d);
  };

  // Fetch availability and settings for the scheduler
  const { data: schedData } = useCachedQuery<any>(
    psychId ? `sched:data:${psychId}` : null,
    async () => {
      const [
        { data: avail },
        { data: blocked },
        { data: settings },
        { data: allAppts }
      ] = await Promise.all([
        supabase.from('availability').select('*').eq('psychologist_id', psychId!),
        supabase.from('blocked_dates').select('date').eq('psychologist_id', psychId!),
        supabase.from('availability_settings').select('*').eq('psychologist_id', psychId!).maybeSingle(),
        supabase.from('appointments').select('start_time, end_time').eq('psychologist_id', psychId!).neq('status', 'cancelled'),
      ]);
      return { 
        avail: avail || [], 
        blocked: (blocked || []).map((b: any) => b.date), 
        settings: settings || { buffer_minutes: 10, min_notice_hours: 2, max_sessions_per_day: 12, booking_window_days: 60, allow_overtime: false },
        allAppts: allAppts || []
      };
    }
  );

  useEffect(() => {
    if (!schedData || !rescheduleItem) return;
    const duration = 50; 
    const slots = generateSlots(
      schedData.avail,
      schedData.allAppts,
      schedData.blocked,
      duration,
      schedData.settings.buffer_minutes,
      schedData.settings.min_notice_hours,
      schedData.settings.max_sessions_per_day,
      schedData.settings.booking_window_days,
      schedData.settings.allow_overtime
    );
    setAvailableDates(slots);
    if (slots.length > 0 && !selectedDateISO) {
      setSelectedDateISO(slots[0].dateISO);
      setNewDate(slots[0].dateISO);
    }
  }, [schedData, rescheduleItem, selectedDateISO]);

  function generateSlots(availability: any[], booked: any[], blocked: string[], durationMinutes: number, bufferMinutes: number, minNoticeHours: number, maxPerDay: number, daysAhead: number, allowOvertime: boolean = false) {
    const result: any[] = [];
    const now = new Date();
    const minStart = new Date(now.getTime() + minNoticeHours * 3600000);
    for (let i = 0; i <= daysAhead; i++) {
      const day = addDays(now, i);
      day.setHours(0, 0, 0, 0);
      const dateISO = format(day, 'yyyy-MM-dd');
      if (blocked.includes(dateISO)) continue;
      const dayBlocks = availability.filter(a => a.day_of_week === day.getDay()).sort((a, b) => a.start_time.localeCompare(b.start_time));
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
          if (allowOvertime) { if (cursor >= blockEnd) break; } else { if (slotEnd > blockEnd) break; }
          if (isBefore(cursor, minStart)) { cursor = addMinutes(cursor, durationMinutes + bufferMinutes); continue; }
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

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-dropdown="true"]')) {
        setMenuOpen(null); setMenuPos(null);
        setReminderOpen(null); setReminderPos(null);
        setStatusPickerId(null); setStatusPos(null);
      }
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Transiciones válidas por estado — solo mostramos opciones con sentido lógico
  const VALID_TRANSITIONS: Record<AppStatus, AppStatus[]> = {
    Pendiente:  ['Confirmada', 'Cancelada'],
    Confirmada: ['Pendiente', 'Completada', 'Cancelada'],
    Completada: [], // solo se puede reactivar (vía botón dedicado)
    Cancelada:  [], // solo se puede reactivar (vía botón dedicado)
  };

  const changeAppStatus = (id: number, next: AppStatus) => {
    const app = appointments.find(a => a.id === id);
    if (!app) return;

    // Bloquear transiciones inválidas
    if (!VALID_TRANSITIONS[app.status].includes(next)) {
      setStatusPickerId(null); setStatusPos(null);
      return;
    }

    if (next === 'Completada' || next === 'Cancelada') {
      // Requiere confirmación antes de cerrar la sesión
      setStatusConfirmFor(app);
      setStatusConfirmNext(next);
      setStatusConfirmDone(false);
    } else {
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: next } : a));
      if (app.supabaseId) {
        supabase.from('appointments')
          .update({ status: next === 'Confirmada' ? 'confirmed' : 'pending' })
          .eq('id', app.supabaseId)
          .then();
      }
    }
    setStatusPickerId(null); setStatusPos(null);
  };

  // Reactivar una sesión cerrada (completada o cancelada) → vuelve a Confirmada
  const reactivateSession = async (app: Appointment) => {
    setAppointments(prev => prev.map(a => a.id === app.id ? { ...a, status: 'Confirmada' } : a));
    if (app.supabaseId) {
      await supabase.from('appointments')
        .update({ status: 'confirmed' })
        .eq('id', app.supabaseId);
    }
    setReactivateConfirmFor(null);
    setMenuOpen(null);
  };

  const applyStatusConfirm = async () => {
    if (!statusConfirmFor || !statusConfirmNext) return;
    const nextSupabase = statusConfirmNext === 'Completada' ? 'completed' : 'cancelled';
    setAppointments(prev => prev.map(a => a.id === statusConfirmFor.id ? { ...a, status: statusConfirmNext } : a));
    setStatusConfirmDone(true);
    if (statusConfirmFor.supabaseId) {
      await supabase.from('appointments').update({ status: nextSupabase }).eq('id', statusConfirmFor.supabaseId);
    }
    setTimeout(() => {
      setStatusConfirmFor(null); setStatusConfirmNext(null);
    }, 600);
  };

  const openNote = (app: Appointment) => {
    const noteId = app.supabaseId || `local-${app.id}`;
    router.push(`/dashboard/nota?id=${noteId}`);
  };

  const handleReschedule = async () => {
    if (!rescheduleItem || !newDate || !newTime) return;
    setUpdating(true);
    try {
      const durationMin = parseInt(rescheduleItem.duration) || 50;
      const newStart = new Date(`${newDate}T${newTime}:00`);
      const newEnd = addMinutes(newStart, durationMin);
      
      if (rescheduleItem.supabaseId) {
        const res = await fetch(`/api/appointments/${rescheduleItem.supabaseId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'reschedule',
            new_start_time: newStart.toISOString(),
            new_end_time: newEnd.toISOString()
          })
        });
        if (!res.ok) throw new Error('Error al reagendar en el servidor');
      }

      setAppointments(prev => prev.map(a => a.id === rescheduleItem.id ? {
        ...a,
        date: (() => {
          const d = new Date(`${newDate}T00:00:00`);
          const s = d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
          return s.charAt(0).toUpperCase() + s.slice(1);
        })(),
        dateSort: newDate,
        time: newTime,
        status: 'Confirmada'
      } : a));
      
      if (notifyMethod === 'whatsapp' && rescheduleItem.phone) {
        sendWhatsApp(rescheduleItem, true);
      }
      setRescheduleItem(null);
    } catch (err: any) {
      alert(err.message || 'Error al reagendar');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelItem) return;
    setUpdating(true);
    try {
      if (cancelItem.supabaseId) {
        const res = await fetch(`/api/appointments/${cancelItem.supabaseId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'cancel' })
        });
        if (!res.ok) throw new Error('Error al cancelar en el servidor');
      }
      setAppointments(prev => prev.map(a => a.id === cancelItem.id ? { ...a, status: 'Cancelada' } : a));
      
      if (notifyMethod === 'whatsapp' && cancelItem.phone) {
        sendWhatsApp(cancelItem, false, true);
      }
      setCancelItem(null);
    } catch (err: any) {
      alert(err.message || 'Error al cancelar');
    } finally {
      setUpdating(false);
    }
  };

  const sendWhatsApp = (app: Appointment, isReschedule = false, isCancel = false) => {
    if (!app.phone) {
      alert("Este paciente no tiene un número de teléfono registrado.");
      return;
    }
    
    let msg = "";
    if (isReschedule) {
      const formattedDate = newDate ? (() => {
        const d = new Date(`${newDate}T00:00:00`);
        const s = d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
        return s.charAt(0).toUpperCase() + s.slice(1);
      })() : app.date;
      msg = (psychologist?.whatsapp_reschedule_template || "Hola {{nombre}}.\n\nTe escribo para reagendar nuestra sesión:\n\nFecha: {{fecha}} a las {{hora}}\n{{detalle}}\n\nSaludos.")
        .replace('{{nombre}}', app.patient)
        .replace('{{fecha}}', formattedDate)
        .replace('{{hora}}', newTime || app.time)
        .replace('{{detalle}}', app.modality === 'online'
          ? `🔗 ${psychologist?.video_meeting_url || 'Meet'}`
          : `📍 ${
              [psychologist?.office_street, psychologist?.office_commune, psychologist?.office_city, psychologist?.office_suite]
                .filter(Boolean).join(', ') || 'Consultorio presencial'
            }`);
    } else if (isCancel) {
      msg = (psychologist?.whatsapp_cancel_template || "Hola {{nombre}}.\n\nLamento informarte que debo cancelar nuestra sesión del {{fecha}}.\n\nPronto te contactaré para buscar una nueva fecha. Saludos.")
        .replace('{{nombre}}', app.patient)
        .replace('{{fecha}}', app.date);
    } else {
      msg = (psychologist?.whatsapp_reminder_template || "Hola {{nombre}}.\n\nTe escribo para recordarte nuestra sesión de mañana:\n\nFecha: {{fecha}} a las {{hora}}\n{{detalle}}\n\nSaludos.")
        .replace('{{nombre}}', app.patient)
        .replace('{{fecha}}', app.date)
        .replace('{{hora}}', app.time)
        .replace('{{detalle}}', app.modality === 'online'
          ? `🔗 ${psychologist?.video_meeting_url || 'Meet'}`
          : `📍 ${
              [psychologist?.office_street, psychologist?.office_commune, psychologist?.office_city, psychologist?.office_suite]
                .filter(Boolean).join(', ') || 'Consultorio presencial'
            }`);
    }

    const cleanPhone = app.phone.replace(/\D/g, '');
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const baseUrl = isMobile ? 'https://wa.me' : 'https://web.whatsapp.com/send';
    const finalUrl = isMobile 
      ? `${baseUrl}/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `${baseUrl}?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;
    
    window.open(finalUrl, '_blank');
  };

  const sendEmail = (app: Appointment) => {
    if (!app.email) return;
    
    // Check rate limit
    if (app.supabaseId) {
      const lastSent = localStorage.getItem('reminder_sent_' + app.supabaseId);
      if (lastSent) {
        const elapsed = Date.now() - parseInt(lastSent);
        const limitMs = 60 * 60 * 1000; // 1 hour
        if (elapsed < limitMs) {
          const minutesElapsed = Math.floor(elapsed / (60 * 1000));
          setRateLimited(true);
          setMinutesLeft(60 - minutesElapsed);
          setReminderPreviewApp(app);
          setReminderSendState('idle');
          return;
        }
      }
    }
    setRateLimited(false);
    setReminderPreviewApp(app);
    setReminderSendState('idle');
  };

  const counts = {
    Todas:      appointments.length,
    Próximas:   appointments.filter(a => a.status === 'Confirmada' || a.status === 'Pendiente').length,
    Hoy:        appointments.filter(a => a.dateSort === new Date().toISOString().split('T')[0]).length,
    Pendiente:  appointments.filter(a => a.status === 'Pendiente').length,
    Completada: appointments.filter(a => a.status === 'Completada').length,
    Cancelada:  appointments.filter(a => a.status === 'Cancelada').length,
  };

  const filtered = appointments.filter(a => {
    if (activeFilter === 'Todas') return true;
    if (activeFilter === 'Próximas') return a.status === 'Confirmada' || a.status === 'Pendiente';
    if (activeFilter === 'Hoy') return a.dateSort === new Date().toISOString().split('T')[0];
    if (activeFilter === 'Pendiente') return a.status === 'Pendiente';
    if (activeFilter === 'Completada') return a.status === 'Completada';
    if (activeFilter === 'Cancelada') return a.status === 'Cancelada';
    return true;
  }).sort((a, b) => {
    const dA = new Date(`${a.dateSort}T${a.time}`).getTime();
    const dB = new Date(`${b.dateSort}T${b.time}`).getTime();
    return sortAsc ? dA - dB : dB - dA;
  });

  const todayDate = new Date();
  const monday = new Date(currentWeekStart);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const startStr = monday.getMonth() === sunday.getMonth() ? monday.toLocaleDateString('es-CL', { day: 'numeric' }) : monday.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }).replace('.', '');
  const endStr = sunday.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' });
  const formattedEndStr = endStr.split(' ').map(w => w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1) : w).join(' ');
  const weekLabel = `Semana del ${startStr} al ${formattedEndStr}`;
  const weekDaysShort = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const dynamicWeekDays = [0, 1, 2, 3, 4, 5, 6].map(offset => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + offset);
    return {
      label: `${weekDaysShort[offset]} ${d.getDate()}`,
      dateStr: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    };
  });
  const todayDayString = `${weekDaysShort[(todayDate.getDay() === 0 ? 6 : todayDate.getDay() - 1)] || ''} ${todayDate.getDate()}`;

  return (
    <div className="animate-slide-up">
      <style>{`
        .appointments-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.75rem; gap: 1rem; }
        .header-controls { display: flex; gap: 0.75rem; align-items: center; }
        .filter-container { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; gap: 1rem; flex-wrap: wrap; }
        .appointment-card { padding: 1.1rem 1.5rem; display: flex; align-items: center; gap: 1rem; transition: all 0.2s; border-radius: 16px; background: white; border: 1px solid var(--border-light); }
        .appointment-main { display: flex; align-items: center; gap: 1rem; flex: 1; min-width: 0; }
        .appointment-meta { display: flex; align-items: center; gap: 1.5rem; flex-shrink: 0; }
        .week-view-container { overflow-x: auto; }
        .week-view-grid { display: grid; grid-template-columns: 70px repeat(7, minmax(120px, 1fr)); min-width: 900px; }
        @media (max-width: 1024px) {
          .appointment-card { flex-direction: column; align-items: flex-start; gap: 1.25rem; }
          .appointment-main { width: 100%; }
          .appointment-meta { width: 100%; justify-content: space-between; border-top: 1px solid var(--border-light); padding-top: 1rem; }
        }
        @media (max-width: 768px) {
          .appointments-header { flex-direction: column; align-items: flex-start; }
          .header-controls { width: 100%; justify-content: space-between; }
        }
        .dropdown-menu {
          animation: dropIn 0.2s cubic-bezier(0, 0, 0.2, 1);
          transform-origin: top left;
        }
        @keyframes dropIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div className="appointments-header">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.2rem' }}>Sesiones</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>{weekLabel} · <strong style={{ color: 'var(--text-dark)' }}>{appointments.length} sesiones</strong></p>
        </div>
        <div className="header-controls">
          {view === 'week' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-white)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '2px' }}>
              <button onClick={prevWeek} style={{ padding: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><ChevronLeft size={18} /></button>
              <button onClick={() => setCurrentWeekStart(new Date(new Date().setDate(new Date().getDate() - (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1))))} style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0 0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-blue)' }}>Semana actual</button>
              <button onClick={nextWeek} style={{ padding: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><ChevronRight size={18} /></button>
            </div>
          )}
          <div style={{ display: 'flex', background: 'var(--bg-white)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            {(['list','week'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding: '0.5rem 1.1rem', fontSize: '0.85rem', fontWeight: 600, border: 'none', background: view === v ? 'var(--primary-light-blue)' : 'transparent', color: view === v ? 'var(--primary-dark-blue)' : 'var(--text-muted)', cursor: 'pointer' }}>{v === 'list' ? 'Lista' : 'Semana'}</button>
            ))}
          </div>
        </div>
      </div>

      {view === 'list' && (
        <>
          <div className="filter-container">
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {FILTERS.map(f => (
                <button key={f.key} onClick={() => setActiveFilter(f.key)} style={{ padding: '0.4rem 0.9rem', borderRadius: '2rem', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', border: '1px solid', borderColor: activeFilter === f.key ? 'var(--primary-blue)' : 'var(--border-light)', background: activeFilter === f.key ? 'var(--primary-light-blue)' : 'var(--bg-white)', color: activeFilter === f.key ? 'var(--primary-dark-blue)' : 'var(--text-muted)' }}>{f.label}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {filtered.map((app, idx) => {
              const st = STATUS_CONFIG[app.status];
              return (
                <div key={app.id} className="appointment-card" style={{ borderLeft: `4px solid ${app.color}`, opacity: (app.status === 'Cancelada' || app.status === 'Completada') ? 0.6 : 1 }}>
                  <div className="appointment-main">
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: `${app.color}18`, color: app.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{app.initials}</div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700 }}>{app.patient}</h3>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{app.type}</div>
                    </div>
                  </div>
                  <div className="appointment-meta">
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{app.date} · {app.time}</div>
                    <button onClick={(e) => {
                      e.stopPropagation();
                      const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                      setStatusPos({ top: rect.bottom + 6, left: rect.left });
                      setStatusPickerId(app.id);
                      setReminderOpen(null);
                      setMenuOpen(null);
                    }} style={{ padding: '0.4rem 1rem', borderRadius: '2rem', fontSize: '0.82rem', fontWeight: 700, background: st.bg, color: st.color, cursor: 'pointer', border: 'none' }}>{app.status}</button>
                    <div className="appointment-actions" style={{ display: 'flex', gap: '0.4rem' }}>
                      {/* Recordar: solo para sesiones activas (no cerradas) */}
                      {app.status !== 'Cancelada' && app.status !== 'Completada' && (
                        <button onClick={(e) => {
                          e.stopPropagation();
                          const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                          setReminderPos({ top: rect.bottom + 6, left: rect.left - 100 });
                          setReminderOpen(idx);
                          setStatusPickerId(null);
                          setMenuOpen(null);
                        }} style={{ padding: '0.45rem 0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>Recordar</button>
                      )}
                      <button onClick={() => openNote(app)} className="btn-primary" style={{ padding: '0.45rem 0.85rem' }}>Nota</button>
                      <button onClick={(e) => {
                        e.stopPropagation();
                        const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                        setMenuPos({ top: rect.bottom + 6, left: rect.right - 180 });
                        setMenuOpen(idx);
                        setStatusPickerId(null);
                        setReminderOpen(null);
                      }} style={{ padding: '0.45rem', borderRadius: '8px', border: '1px solid var(--border-light)', background: 'white', cursor: 'pointer' }}><MoreVertical size={16} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {view === 'week' && (
        <div className="premium-card week-view-container">
          <div className="week-view-grid" style={{ borderBottom: '2px solid var(--border-light)' }}>
            <div style={{ padding: '1rem', background: 'var(--bg-main)' }} />
            {dynamicWeekDays.map((dayObj, i) => (
              <div key={i} style={{ padding: '0.5rem', textAlign: 'center', borderLeft: '1px solid var(--border-light)' }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>{dayObj.label.split(' ')[0]}</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 700 }}>{dayObj.label.split(' ')[1]}</p>
              </div>
            ))}
          </div>
          <div className="week-view-grid" style={{ height: '600px', overflowY: 'auto' }}>
            <div style={{ background: 'var(--bg-main)', borderRight: '1px solid var(--border-light)' }}>
              {HOURS.map(h => <div key={h} style={{ height: '50px', padding: '0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'right', borderBottom: '1px solid var(--border-light)' }}>{h}</div>)}
            </div>
            {dynamicWeekDays.map((dayObj, dayIdx) => (
              <div key={dayIdx} style={{ position: 'relative', borderLeft: '1px solid var(--border-light)', background: 'white' }}>
                {HOURS.map(h => <div key={h} style={{ height: '50px', borderBottom: '1px solid #f1f5f9' }} />)}
                {appointments.filter(a => a.dateSort === dayObj.dateStr && a.status !== 'Cancelada').map((app, appIdx) => (
                  <div key={appIdx} onClick={() => openNote(app)} style={{ position: 'absolute', top: `${(app.hourNum - 8) * 50}px`, left: '4px', right: '4px', height: '46px', background: `${app.color}15`, borderLeft: `3px solid ${app.color}`, borderRadius: '4px', padding: '0.25rem 0.5rem', cursor: 'pointer', zIndex: 10 }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 700, color: app.color, margin: 0 }}>{app.time} {app.patient}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {statusConfirmFor && statusConfirmNext && (
        <ModalWrapper onClose={() => { setStatusConfirmFor(null); setStatusConfirmNext(null); }}>
          <div style={{ padding: '1.75rem 2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: statusConfirmNext === 'Completada' ? '#ecfdf5' : '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {statusConfirmNext === 'Completada' ? <CheckCircle2 size={22} style={{ color: '#10b981' }} /> : <Ban size={22} style={{ color: '#ef4444' }} />}
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-dark)', margin: 0 }}>
                {statusConfirmNext === 'Completada' ? 'Confirmar Sesión' : 'Confirmar Cancelación'}
              </h3>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-dark)', fontWeight: 600, margin: 0 }}>{statusConfirmFor.patient}</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{statusConfirmFor.date} · {statusConfirmFor.time}</p>
            </div>

            {statusConfirmNext === 'Completada' && (new Date(`${statusConfirmFor.dateSort}T${statusConfirmFor.time}`) > new Date()) && (
              <div style={{ padding: '1rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                <div>
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#92400e' }}>Aviso: Sesión futura</p>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#b45309', lineHeight: 1.4 }}>Esta sesión aún no ha ocurrido según el horario programado. ¿Estás seguro que deseas marcarla como completada ahora?</p>
                </div>
              </div>
            )}

            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '2rem' }}>
              {statusConfirmNext === 'Completada' 
                ? 'Al completar la sesión, se registrará en las analíticas y el estado cambiará permanentemente.' 
                : 'Esta acción cancelará la sesión permanentemente. Podrás reagendarla después si es necesario.'}
            </p>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => { setStatusConfirmFor(null); setStatusConfirmNext(null); }} className="btn-secondary" style={{ flex: 1 }}>Volver</button>
              <button onClick={() => applyStatusConfirm()} className="btn-primary" style={{ flex: 2, background: statusConfirmNext === 'Cancelada' ? '#ef4444' : undefined }}>
                {statusConfirmNext === 'Completada' ? 'Sí, completar sesión' : 'Confirmar cancelación'}
              </button>
            </div>
          </div>
        </ModalWrapper>
      )}

      {/* Status picker — solo muestra transiciones válidas para el estado actual */}
      {statusPickerId !== null && statusPos && createPortal(
        <div data-dropdown="true" className="dropdown-menu" style={{ position: 'fixed', top: statusPos.top, left: statusPos.left, zIndex: 9999, background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', boxShadow: '0 8px 32px rgba(0,0,0,0.13)', minWidth: '185px', overflow: 'hidden' }}>
          <div style={{ padding: '0.5rem 0.85rem', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #f1f5f9' }}>Cambiar estado</div>
          {(() => {
            const current = appointments.find(a => a.id === statusPickerId);
            if (!current) return null;
            const validNext = VALID_TRANSITIONS[current.status];
            if (validNext.length === 0) {
              // Sesión cerrada: solo opción de reactivar
              return (
                <button
                  onClick={() => { setReactivateConfirmFor(current); setStatusPickerId(null); setStatusPos(null); }}
                  style={{ width: '100%', padding: '0.7rem 1rem', display: 'flex', alignItems: 'center', gap: '0.65rem', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: '#0369a1', textAlign: 'left' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#eff6ff')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <RefreshCcw size={14} /> Reactivar sesión
                </button>
              );
            }
            return validNext.map(s => {
              const cfg = STATUS_CONFIG[s];
              return (
                <button key={s} onClick={() => changeAppStatus(statusPickerId, s)} style={{ width: '100%', padding: '0.7rem 1rem', display: 'flex', alignItems: 'center', gap: '0.65rem', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: cfg.color, textAlign: 'left', transition: 'background 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background = cfg.bg)} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
                  {cfg.label}
                </button>
              );
            });
          })()}
        </div>
      , document.body)}

      {reminderOpen !== null && reminderPos && createPortal(
        <div data-dropdown="true" className="dropdown-menu" style={{ position: 'fixed', top: reminderPos.top, left: reminderPos.left, zIndex: 9999, background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.13)', minWidth: '190px', overflow: 'hidden' }}>
          <button onClick={() => { sendWhatsApp(filtered[reminderOpen]); setReminderOpen(null); }} style={{ width: '100%', padding: '0.8rem 1.1rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.88rem', fontWeight: 600, color: '#16a34a' }} onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>WhatsApp</button>
          <button onClick={() => { sendEmail(filtered[reminderOpen]); setReminderOpen(null); }} style={{ width: '100%', padding: '0.8rem 1.1rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.88rem', fontWeight: 600, color: '#1d4ed8' }} onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>Correo electrónico</button>
        </div>
      , document.body)}

      {menuOpen !== null && menuPos && createPortal(
        <div data-dropdown="true" className="dropdown-menu" style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 9999, background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.13)', minWidth: '190px', overflow: 'hidden' }}>
          {(filtered[menuOpen]?.status === 'Cancelada' || filtered[menuOpen]?.status === 'Completada') ? (
            <button
              onClick={() => { setReactivateConfirmFor(filtered[menuOpen]); setMenuOpen(null); }}
              style={{ width: '100%', padding: '0.8rem 1.1rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.88rem', fontWeight: 600, color: '#0369a1', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <RefreshCcw size={14} /> Reactivar sesión
            </button>
          ) : (
            <>
              <button onClick={() => { setRescheduleItem(filtered[menuOpen]); setMenuOpen(null); }} style={{ width: '100%', padding: '0.8rem 1.1rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.88rem', fontWeight: 500, color: '#1d4ed8' }} onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>Reagendar sesión</button>
              <button onClick={() => { setCancelItem(filtered[menuOpen]); setMenuOpen(null); }} style={{ width: '100%', padding: '0.8rem 1.1rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.88rem', fontWeight: 500, color: '#ef4444' }} onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>Cancelar sesión</button>
            </>
          )}
        </div>
      , document.body)}

      {/* Modal de confirmación para reactivar una sesión cerrada */}
      {reactivateConfirmFor && (() => {
        const sessionDate = new Date(`${reactivateConfirmFor.dateSort}T${reactivateConfirmFor.time}`);
        const isPast = sessionDate < new Date();
        const isCompleted = reactivateConfirmFor.status === 'Completada';
        return (
          <ModalWrapper onClose={() => setReactivateConfirmFor(null)}>
            <div style={{ padding: '1.75rem 2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <RefreshCcw size={20} style={{ color: '#0369a1' }} />
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-dark)', margin: 0 }}>Reactivar sesión</h3>
              </div>

              <p style={{ fontSize: '0.95rem', color: 'var(--text-dark)', fontWeight: 600, margin: '0 0 0.2rem' }}>{reactivateConfirmFor.patient}</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>{reactivateConfirmFor.date} · {reactivateConfirmFor.time}</p>

              {/* Aviso: sesión completada por error */}
              {isCompleted && (
                <div style={{ padding: '0.9rem 1rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', marginBottom: '0.75rem', fontSize: '0.85rem', color: '#92400e', display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                  <span>⚠️</span>
                  <span>Esta sesión ya fue <strong>marcada como completada</strong>. Reactivarla indica que fue registrada por error.</span>
                </div>
              )}

              {/* Aviso: fecha en el pasado */}
              {isPast && (
                <div style={{ padding: '0.9rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', marginBottom: '0.75rem', fontSize: '0.85rem', color: '#7f1d1d', display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                  <span>📅</span>
                  <span>La fecha de esta sesión <strong>ya pasó</strong>. Al reactivarla, te recomendamos <strong>reagendarla</strong> a una fecha futura desde el menú <strong>···</strong>.</span>
                </div>
              )}

              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.75rem' }}>
                {isPast
                  ? 'La sesión volverá a estado Confirmada. Recuerda reagendarla para evitar confusiones.'
                  : 'La sesión volverá a estado Confirmada y podrás gestionarla normalmente.'}
              </p>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={() => setReactivateConfirmFor(null)} className="btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                <button onClick={() => reactivateSession(reactivateConfirmFor)} className="btn-primary" style={{ flex: 2 }}>
                  {isPast ? 'Reactivar y reagendar después' : 'Sí, reactivar'}
                </button>
              </div>
            </div>
          </ModalWrapper>
        );
      })()}

      {rescheduleItem && (
        <ModalWrapper onClose={() => setRescheduleItem(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '90vh' }}>
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-dark)', margin: 0 }}>Reagendar Sesión</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{rescheduleItem.patient} · <strong style={{ color: 'var(--primary-blue)' }}>{rescheduleItem.type}</strong></p>
              </div>
              <button onClick={() => setRescheduleItem(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ padding: '1.5rem 2rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Date selection (Horizontal) */}
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.6rem' }}>Selecciona Fecha</label>
                <div style={{ display: 'flex', gap: '0.6rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
                  {availableDates.map(d => (
                    <button key={d.dateISO} onClick={() => { setSelectedDateISO(d.dateISO); setNewDate(d.dateISO); setNewTime(''); }}
                      style={{ minWidth: '85px', padding: '0.75rem 0.5rem', borderRadius: '12px', border: selectedDateISO === d.dateISO ? '2px solid #3b82f6' : '1.5px solid #e2e8f0', background: selectedDateISO === d.dateISO ? '#eff6ff' : 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', transition: 'all 0.2s' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: selectedDateISO === d.dateISO ? '#3b82f6' : '#94a3b8', textTransform: 'uppercase' }}>{d.label.split(' ')[0]}</span>
                      <span style={{ fontSize: '1rem', fontWeight: 800, color: selectedDateISO === d.dateISO ? '#1e40af' : '#334155' }}>{d.label.split(' ')[1]}</span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: selectedDateISO === d.dateISO ? '#3b82f6' : '#94a3b8' }}>{d.label.split(' ')[2]}</span>
                    </button>
                  ))}
                  {availableDates.length === 0 && <p style={{ fontSize: '0.85rem', color: '#94a3b8', padding: '1rem' }}>No hay fechas disponibles configuradas.</p>}
                </div>
              </div>

              {/* Time selection (Grid) */}
              {selectedDateISO && (
                <div className="animate-slide-up">
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.6rem' }}>Horas disponibles</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.6rem' }}>
                    {(availableDates.find(d => d.dateISO === selectedDateISO)?.slots || []).map((t: string) => (
                      <button key={t} onClick={() => setNewTime(t)}
                        style={{ padding: '0.65rem', borderRadius: '10px', border: newTime === t ? '2px solid #3b82f6' : '1.5px solid #e2e8f0', background: newTime === t ? '#3b82f6' : 'white', color: newTime === t ? 'white' : '#475569', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Notification Method */}
              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem' }}>
                <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '0.75rem' }}>¿Cómo avisarle al paciente?</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  {[
                    { id: 'whatsapp', label: 'WhatsApp', icon: <MessageSquare size={16} />, color: '#16a34a' },
                    { id: 'email', label: 'Correo', icon: <Mail size={16} />, color: '#1d4ed8' },
                    { id: 'none', label: 'No avisar', icon: <Ban size={16} />, color: '#64748b' }
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => setNotifyMethod(m.id as any)}
                      style={{
                        padding: '0.75rem',
                        borderRadius: '12px',
                        border: '1.5px solid',
                        borderColor: notifyMethod === m.id ? m.color : 'var(--border-light)',
                        background: notifyMethod === m.id ? `${m.color}08` : 'white',
                        color: notifyMethod === m.id ? m.color : 'var(--text-muted)',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.4rem',
                        cursor: 'pointer'
                      }}
                    >
                      {m.icon} {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              {notifyMethod === 'whatsapp' && (
                <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803d', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><CheckCheck size={14}/> Vista previa del mensaje:</p>
                  <p style={{ fontSize: '0.8rem', color: '#166534', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                    Hola {rescheduleItem.patient}.{"\n"}
                    Te escribo para reagendar nuestra sesión:{"\n"}
                    Fecha: {newDate ? (new Date(`${newDate}T00:00:00`).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })) : rescheduleItem.date} a las {newTime || rescheduleItem.time}{"\n"}
                    {rescheduleItem.modality === 'online' ? `🔗 ${psychologist?.video_meeting_url || 'Meet'}` : '📍 Consulta presencial'}
                  </p>
                </div>
              )}
            </div>

            <div style={{ padding: '1.25rem 2rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '0.75rem', background: '#fafafa' }}>
              <button onClick={() => setRescheduleItem(null)} style={{ padding: '0.85rem 1.5rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleReschedule} disabled={updating || !newDate || !newTime} className="btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                {updating ? <><Loader2 size={18} className="animate-spin" /> Procesando...</> : <><RefreshCcw size={18} /> Confirmar Reagendamiento</>}
              </button>
            </div>
          </div>
        </ModalWrapper>
      )}

      {cancelItem && (
        <ModalWrapper onClose={() => setCancelItem(null)}>
          <div style={{ padding: '1.75rem 2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ef4444', margin: 0 }}>Cancelar Sesión</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{cancelItem.patient} · {cancelItem.date}</p>
              </div>
              <button onClick={() => setCancelItem(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ padding: '1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#991b1b', fontSize: '0.9rem', lineHeight: 1.5 }}>
                <p style={{ margin: 0, fontWeight: 600 }}>¿Estás seguro que deseas cancelar?</p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem' }}>Esta acción marcará la sesión como cancelada permanentemente.</p>
              </div>

              {/* Notification Method */}
              <div>
                <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '0.75rem' }}>¿Cómo avisarle al paciente?</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  {[
                    { id: 'whatsapp', label: 'WhatsApp', icon: <MessageSquare size={16} />, color: '#16a34a' },
                    { id: 'email', label: 'Correo', icon: <Mail size={16} />, color: '#1d4ed8' },
                    { id: 'none', label: 'No avisar', icon: <Ban size={16} />, color: '#64748b' }
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => setNotifyMethod(m.id as any)}
                      style={{
                        padding: '0.75rem',
                        borderRadius: '12px',
                        border: '1.5px solid',
                        borderColor: notifyMethod === m.id ? m.color : 'var(--border-light)',
                        background: notifyMethod === m.id ? `${m.color}08` : 'white',
                        color: notifyMethod === m.id ? m.color : 'var(--text-muted)',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.4rem',
                        cursor: 'pointer'
                      }}
                    >
                      {m.icon} {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              {notifyMethod === 'whatsapp' && (
                <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803d', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><CheckCheck size={14}/> Vista previa:</p>
                  <p style={{ fontSize: '0.8rem', color: '#166534', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                    Hola {cancelItem.patient}.{"\n"}
                    Lamento informarte que debo cancelar nuestra sesión del {cancelItem.date}.{"\n"}
                    Pronto te contactaré para buscar una nueva fecha. Saludos.
                  </p>
                </div>
              )}
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setCancelItem(null)} className="btn-secondary" style={{ flex: 1 }}>Volver</button>
              <button onClick={handleCancel} disabled={updating} className="btn-primary" style={{ flex: 2, background: '#ef4444', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                {updating ? <><Loader2 size={18} className="animate-spin" /> Procesando...</> : <><Ban size={18} /> Confirmar Cancelación</>}
              </button>
            </div>
          </div>
        </ModalWrapper>
      )}

      {/* Modal — Recordatorio Vista Previa */}
      {reminderPreviewApp && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setReminderPreviewApp(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '520px', background: 'white', borderRadius: '20px', boxShadow: '0 24px 64px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', maxHeight: '92vh', overflow: 'hidden' }}>
            
            <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Mail size={19} style={{ color: '#3b82f6' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111827', margin: 0 }}>Enviar Recordatorio</h3>
                  <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: '0.1rem 0 0' }}>Vista previa del correo para el paciente</p>
                </div>
              </div>
              <button onClick={() => setReminderPreviewApp(null)} style={{ padding: '0.4rem', borderRadius: '8px', color: '#9ca3af', cursor: 'pointer', background: 'transparent', border: 'none', display: 'flex' }}><X size={18} /></button>
            </div>

            <div style={{ padding: '1.75rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.2rem', overflowY: 'auto' }}>
              
              {reminderSendState === 'success' ? (
                <div style={{ padding: '2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1.2rem' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={32} style={{ color: '#16a34a' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem' }}>¡Correo Enviado!</h3>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.5 }}>
                      El recordatorio se ha enviado exitosamente a <strong>{reminderPreviewApp.email}</strong>.
                    </p>
                  </div>
                  <button onClick={() => setReminderPreviewApp(null)} style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', background: '#3b82f6', color: 'white', fontWeight: 700, fontSize: '0.92rem', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(59,130,246,0.2)' }}>
                    Listo, cerrar
                  </button>
                </div>
              ) : (
                <>
                  {rateLimited ? (
                    <div style={{ padding: '1rem', background: '#fffbeb', borderRadius: '12px', border: '1px solid #fef3c7', color: '#b45309', fontSize: '0.85rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <strong style={{ display: 'block', marginBottom: '2px' }}>Límite de recordatorios</strong>
                        Ya enviaste un recordatorio para esta sesión hace {60 - minutesLeft} minutos. Por favor, espera {minutesLeft} minutos más antes de enviar otro para evitar spam.
                      </div>
                    </div>
                  ) : reminderSendState === 'error' ? (
                    <div style={{ padding: '1rem', background: '#fef2f2', borderRadius: '12px', border: '1px solid #fee2e2', color: '#b91c1c', fontSize: '0.85rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <strong style={{ display: 'block', marginBottom: '2px' }}>Error al enviar</strong>
                        {reminderError}
                      </div>
                    </div>
                  ) : null}

                  {/* Faux Email Preview */}
                  <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', overflowY: 'auto', maxHeight: '350px', fontSize: '0.8rem', color: '#64748b' }}>
                    {/* Therapist Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0', marginBottom: '0.75rem' }}>
                      {psychologist?.photo_url ? (
                        <img src={psychologist.photo_url} alt={psychologist.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>
                          {(psychologist?.name || 'T').split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                        </div>
                      )}
                      <div>
                        <h4 style={{ margin: 0, color: '#0f172a', fontSize: '0.85rem', fontWeight: 700 }}>{psychologist?.name}</h4>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.7rem' }}>{psychologist?.title || 'Terapeuta'}</p>
                      </div>
                    </div>

                    {/* Content */}
                    <h3 style={{ color: '#0f172a', fontSize: '1.05rem', margin: '0 0 0.25rem', fontWeight: 700 }}>Recordatorio de sesión</h3>
                    <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: '#475569' }}>Hola <strong>{reminderPreviewApp.patient}</strong>, te escribimos para recordarte tu próxima sesión:</p>

                    <table width="100%" style={{ borderCollapse: 'collapse', marginBottom: '1rem', fontSize: '0.8rem' }}>
                      <tbody>
                        {reminderPreviewApp.type && (
                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '6px 0', color: '#64748b', fontWeight: 600 }}>Tipo de sesión:</td>
                            <td style={{ padding: '6px 0', color: '#0f172a', textAlign: 'right' }}>{reminderPreviewApp.type}</td>
                          </tr>
                        )}
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 0', color: '#64748b', fontWeight: 600 }}>Fecha:</td>
                          <td style={{ padding: '6px 0', color: '#0f172a', textAlign: 'right' }}>{reminderPreviewApp.date}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 0', color: '#64748b', fontWeight: 600 }}>Hora:</td>
                          <td style={{ padding: '6px 0', color: '#0f172a', textAlign: 'right' }}>{reminderPreviewApp.time} hrs</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 0', color: '#64748b', fontWeight: 600 }}>Modalidad:</td>
                          <td style={{ padding: '6px 0', color: '#0f172a', textAlign: 'right' }}>{reminderPreviewApp.modality === 'online' ? 'Online' : 'Presencial'}</td>
                        </tr>
                        {reminderPreviewApp.modality === 'online' && psychologist?.video_meeting_url ? (
                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '6px 0', color: '#64748b', fontWeight: 600 }}>Enlace:</td>
                            <td style={{ padding: '6px 0', color: '#2563eb', textAlign: 'right', wordBreak: 'break-all' }}>
                              <a href={psychologist.video_meeting_url} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>{psychologist.video_meeting_url}</a>
                            </td>
                          </tr>
                        ) : reminderPreviewApp.modality === 'presencial' && (
                          [psychologist?.office_street, psychologist?.office_commune, psychologist?.office_city, psychologist?.office_suite].filter(Boolean).join(', ')
                        ) ? (
                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '6px 0', color: '#64748b', fontWeight: 600 }}>Dirección:</td>
                            <td style={{ padding: '6px 0', color: '#0f172a', textAlign: 'right' }}>
                              {[psychologist?.office_street, psychologist?.office_commune, psychologist?.office_city, psychologist?.office_suite].filter(Boolean).join(', ')}
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>

                    {/* Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', margin: '1rem 0' }}>
                      {reminderPreviewApp.modality === 'online' && psychologist?.video_meeting_url && (
                        <div style={{ background: '#2563eb', color: 'white', fontWeight: 700, padding: '0.6rem 1.2rem', borderRadius: '6px', fontSize: '0.78rem', width: '100%', textAlign: 'center', boxSizing: 'border-box' }}>Unirse a la sesión</div>
                      )}
                      {reminderPreviewApp.modality === 'presencial' && (
                        [psychologist?.office_street, psychologist?.office_commune, psychologist?.office_city, psychologist?.office_suite].filter(Boolean).join(', ')
                      ) && (
                        <div style={{ background: '#2563eb', color: 'white', fontWeight: 700, padding: '0.6rem 1.2rem', borderRadius: '6px', fontSize: '0.78rem', width: '100%', textAlign: 'center', boxSizing: 'border-box' }}>Ver en Google Maps</div>
                      )}
                      <div style={{ border: '1px solid #e2e8f0', background: 'white', color: '#334155', fontWeight: 700, padding: '0.6rem 1.2rem', borderRadius: '6px', fontSize: '0.78rem', width: '100%', textAlign: 'center', boxSizing: 'border-box' }}>Agregar al calendario</div>
                    </div>

                    {/* Footer */}
                    <p style={{ textAlign: 'center', fontSize: '0.65rem', color: '#94a3b8', margin: 0, borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
                      Este es un correo automático enviado a nombre de tu terapeuta.<br />Tecnología de agendamiento provista por <strong>Teramy</strong>
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button onClick={() => setReminderPreviewApp(null)} style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer' }}>
                      Cancelar
                    </button>
                    <button
                      onClick={handleSendReminder}
                      disabled={rateLimited || reminderSendState === 'sending'}
                      style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', background: rateLimited ? '#94a3b8' : '#2563eb', color: 'white', fontWeight: 700, fontSize: '0.92rem', border: 'none', cursor: rateLimited ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: rateLimited ? 'none' : '0 4px 12px rgba(37,99,235,0.2)' }}
                    >
                      {reminderSendState === 'sending' ? 'Enviando...' : 'Confirmar y Enviar'}
                    </button>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}
