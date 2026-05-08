"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Video, MapPin, Phone, Mail, Calendar, FileText, Edit2, Plus, X, Save, CheckCircle2, ChevronDown, ChevronUp, MessageSquare, CalendarPlus, Loader2, AlertCircle, MoreVertical, Trash2, AlertTriangle, Clock, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/utils/supabase';
import { addMinutes, format, addDays, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

type PatientStatus = 'En proceso' | 'En pausa' | 'Alta' | 'Evaluación';

const STATUS_CONFIG: Record<PatientStatus, { bg: string; color: string; dot: string; label: string }> = {
  'En proceso': { bg: '#ecfdf5', color: '#059669', dot: '#10b981', label: 'En proceso' },
  'En pausa':   { bg: '#fef9ee', color: '#d97706', dot: '#f59e0b', label: 'En pausa' },
  'Alta':       { bg: '#f0fdf4', color: '#15803d', dot: '#22c55e', label: 'Alta' },
  'Evaluación': { bg: '#f1f5f9', color: '#64748b', dot: '#94a3b8', label: 'Evaluación' },
};

const COLORS = ['#10b981','#0ea5e9','#f59e0b','#7c3aed','#ec4899','#64748b'];

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}
function colorFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % COLORS.length;
  return COLORS[h];
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}
function gcalUrl(patient: string, date: string, time: string, duration: string, modality: string) {
  if (!date || !time) return '#';
  const [y, m, d] = date.split('-');
  const [h, min] = time.split(':');
  const pad = (n: string) => n.padStart(2, '0');
  const start = `${y}${pad(m)}${pad(d)}T${pad(h)}${pad(min)}00`;
  const totalMin = parseInt(min) + parseInt(duration);
  const endH = parseInt(h) + Math.floor(totalMin / 60);
  const endMin = totalMin % 60;
  const end = `${y}${pad(m)}${pad(d)}T${pad(String(endH))}${pad(String(endMin))}00`;
  const loc = modality === 'online' ? 'Google Meet' : 'Consulta presencial';
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Sesión: ${patient}`)}&dates=${start}/${end}&location=${encodeURIComponent(loc)}`;
}

type AppointmentRow = {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  patient_notes: string | null;
  event_types: { title: string; mode: string } | null;
  sessionNotes: { id: string; content: string; created_at: string }[];
  sessionNumber: number;
};

type PatientData = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
  status: PatientStatus | null;
};

type EventTypeOption = { id: string; title: string; duration_minutes: number; mode: string; price: number };

export default function PatientDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const patientId = params.id;

  const [patient, setPatient] = useState<PatientData | null>(null);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [psychologistId, setPsychologistId] = useState<string | null>(null);
  const [eventTypes, setEventTypes] = useState<EventTypeOption[]>([]);

  const [patientStatus, setPatientStatus] = useState<PatientStatus>('Evaluación');
  const [statusOpen, setStatusOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'info'>('timeline');
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Note editing
  const [editingNoteApptId, setEditingNoteApptId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [savedNote, setSavedNote] = useState(false);

  // Schedule modal
  const [showSchedModal, setShowSchedModal] = useState(false);
  const [schedStep, setSchedStep] = useState<'form' | 'success'>('form');
  const [schedDate, setSchedDate] = useState('');
  const [schedTime, setSchedTime] = useState('');
  const [schedEventTypeId, setSchedEventTypeId] = useState('');
  const [schedModality, setSchedModality] = useState<'online' | 'presencial'>('online');
  const [schedDuration, setSchedDuration] = useState('50');
  const [savingSched, setSavingSched] = useState(false);
  const [schedPrice, setSchedPrice] = useState('');
  const [globalModality, setGlobalModality] = useState<string | null>(null);

  // Connected Booking Data
  const [availConfig, setAvailConfig] = useState<any[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [availSettings, setAvailSettings] = useState<any>(null);
  const [allAppointments, setAllAppointments] = useState<any[]>([]);
  const [availableDates, setAvailableDates] = useState<any[]>([]);
  const [selectedDateISO, setSelectedDateISO] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) { setLoading(false); return; }

    const { data: psych } = await supabase
      .from('psychologists').select('id').eq('user_id', user.id).single();
    if (!psych) { setLoading(false); return; }
    setPsychologistId(psych.id);

    // Load patient
    const { data: pat, error: patErr } = await supabase
      .from('patients').select('id, name, email, phone, created_at, status').eq('id', patientId).single();
    if (patErr || !pat) { setNotFound(true); setLoading(false); return; }
    setPatient(pat as PatientData);
    if ((pat as any).status) setPatientStatus((pat as any).status as PatientStatus);

    // Load appointments for this patient + psychologist
    const { data: apptRows } = await supabase
      .from('appointments')
      .select('id, start_time, end_time, status, patient_notes, event_types(title, mode)')
      .eq('patient_id', patientId)
      .eq('psychologist_id', psych.id)
      .order('start_time', { ascending: false });

    // Load notes for each appointment
    const apptIds = (apptRows || []).map((a: Record<string, unknown>) => a.id as string);
    let notesByAppt: Record<string, { id: string; content: string; created_at: string }[]> = {};
    if (apptIds.length > 0) {
      const { data: notesRows } = await supabase
        .from('notes')
        .select('id, appointment_id, content, created_at')
        .in('appointment_id', apptIds)
        .order('created_at');
      (notesRows || []).forEach((n: Record<string, unknown>) => {
        const aid = n.appointment_id as string;
        if (!notesByAppt[aid]) notesByAppt[aid] = [];
        notesByAppt[aid].push({ id: n.id as string, content: n.content as string, created_at: n.created_at as string });
      });
    }

    const mapped: AppointmentRow[] = ((apptRows || []) as Record<string, unknown>[]).map((a, idx, arr) => ({
      id: a.id as string,
      start_time: a.start_time as string,
      end_time: a.end_time as string,
      status: a.status as string,
      patient_notes: a.patient_notes as string | null,
      event_types: a.event_types as { title: string; mode: string } | null,
      sessionNotes: notesByAppt[a.id as string] ?? [],
      sessionNumber: arr.length - idx,
    }));

    // Auto-expand most recent
    if (mapped.length > 0) setExpandedId(mapped[0].id);
    setAppointments(mapped);

    // Load event types for scheduling
    const [
      { data: evtRows },
      { data: psychData },
      { data: availDataRaw },
      { data: blockedDataRaw },
      { data: settingsDataRaw },
      { data: allApptsRaw }
    ] = await Promise.all([
      supabase.from('event_types').select('id, title, duration_minutes, mode, price').eq('psychologist_id', psych.id).eq('is_active', true),
      supabase.from('psychologists').select('session_type').eq('id', psych.id).single(),
      supabase.from('availability').select('day_of_week, start_time, end_time').eq('psychologist_id', psych.id),
      supabase.from('blocked_dates').select('date').eq('psychologist_id', psych.id),
      supabase.from('availability_settings').select('buffer_minutes, min_notice_hours, max_sessions_per_day, booking_window_days, allow_overtime').eq('psychologist_id', psych.id).maybeSingle(),
      supabase.from('appointments').select('start_time, end_time').eq('psychologist_id', psych.id).neq('status', 'cancelled'),
    ]);

    const evts = (evtRows || []) as EventTypeOption[];
    setEventTypes(evts);
    setGlobalModality((psychData as any)?.session_type || null);
    setAvailConfig(availDataRaw ?? []);
    setBlockedDates((blockedDataRaw ?? []).map((b: any) => b.date));
    setAvailSettings(settingsDataRaw || { buffer_minutes: 10, min_notice_hours: 2, max_sessions_per_day: 12, booking_window_days: 60, allow_overtime: false });
    setAllAppointments(allApptsRaw ?? []);

    if (evts.length > 0) {
      setSchedEventTypeId(evts[0].id);
      setSchedModality(evts[0].mode as 'online' | 'presencial');
      setSchedDuration(String(evts[0].duration_minutes));
      setSchedPrice(String(evts[0].price));
    }

    setLoading(false);
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const el1 = document.getElementById('patient-status-dropdown');
      if (el1 && !el1.contains(e.target as Node)) setStatusOpen(false);
      const el2 = document.getElementById('patient-options-dropdown');
      if (el2 && !el2.contains(e.target as Node)) setOptionsOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [statusOpen, optionsOpen]);

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

  // Effect to generate slots
  useEffect(() => {
    if (!availConfig.length || !showSchedModal) return;
    const duration = parseInt(schedDuration) || 50;
    const buffer = availSettings?.buffer_minutes ?? 10;
    const notice = availSettings?.min_notice_hours ?? 2;
    const maxPerDay = availSettings?.max_sessions_per_day ?? 12;
    const windowDays = availSettings?.booking_window_days ?? 60;

    const slots = generateSlots(
      availConfig,
      allAppointments,
      blockedDates,
      duration,
      buffer,
      notice,
      maxPerDay,
      windowDays,
      availSettings?.allow_overtime ?? false
    );
    setAvailableDates(slots);
    
    if (slots.length > 0) {
      const exists = slots.find(d => d.dateISO === selectedDateISO);
      if (!exists) {
        setSelectedDateISO(slots[0].dateISO);
        setSchedDate(slots[0].dateISO);
      }
    }
  }, [schedDuration, availConfig, allAppointments, blockedDates, availSettings, selectedDateISO, showSchedModal]);

  const handleDelete = async () => {
    setDeleting(true);
    await supabase.from('patients').delete().eq('id', patientId);
    setDeleting(false);
    router.push('/dashboard/patients');
  };

  const openNote = (appt?: AppointmentRow) => {
    const fecha = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const p = new URLSearchParams({
      paciente: patient?.name ?? '',
      fecha,
      sesion: String(appointments.length + 1),
      ...(appt ? { appt_id: appt.id } : {}),
    });
    router.push(`/dashboard/nota?${p.toString()}`);
  };

  const startEditNote = (apptId: string, note?: { id: string; content: string }) => {
    setEditingNoteApptId(apptId);
    setEditingNoteId(note?.id ?? null);
    setNoteText(note?.content ?? '');
    setSavedNote(false);
  };

  const saveNote = async () => {
    if (!editingNoteApptId || !noteText.trim()) return;
    setSavingNote(true);
    if (editingNoteId) {
      await supabase.from('notes').update({ content: noteText, updated_at: new Date().toISOString() }).eq('id', editingNoteId);
      setAppointments(prev => prev.map(a => a.id === editingNoteApptId
        ? { ...a, sessionNotes: a.sessionNotes.map(n => n.id === editingNoteId ? { ...n, content: noteText } : n) }
        : a
      ));
    } else {
      const { data } = await supabase.from('notes')
        .insert([{ appointment_id: editingNoteApptId, content: noteText }])
        .select('id, content, created_at').single();
      if (data) {
        setAppointments(prev => prev.map(a => a.id === editingNoteApptId
          ? { ...a, sessionNotes: [...a.sessionNotes, data as { id: string; content: string; created_at: string }] }
          : a
        ));
      }
    }
    setSavingNote(false); setSavedNote(true);
    setTimeout(() => { setSavedNote(false); setEditingNoteApptId(null); setEditingNoteId(null); setNoteText(''); }, 1000);
  };

  const openSchedModal = () => {
    setSchedDate(''); setSchedTime(''); setSchedStep('form'); setSavingSched(false);
    setShowSchedModal(true);
  };

  const saveSchedule = async () => {
    if (!schedDate || !schedTime || !psychologistId || !patientId) return;
    setSavingSched(true);
    const [h, min] = schedTime.split(':').map(Number);
    const startDt = new Date(`${schedDate}T${schedTime}:00`);
    const endDt = new Date(startDt.getTime() + parseInt(schedDuration) * 60000);
    await supabase.from('appointments').insert([{
      patient_id: patientId,
      psychologist_id: psychologistId,
      event_type_id: schedEventTypeId || null,
      start_time: startDt.toISOString(),
      end_time: endDt.toISOString(),
      status: 'pending',
    }]);
    setSavingSched(false);
    setSchedStep('success');
    load();
  };

  if (loading) {
    return (
      <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem', color: 'var(--text-muted)' }}>
        <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary-blue)' }} />
        <p style={{ fontWeight: 500 }}>Cargando paciente...</p>
      </div>
    );
  }

  if (notFound || !patient) {
    return (
      <div className="animate-slide-up">
        <Link href="/dashboard/patients" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500, marginBottom: '1.5rem' }}>
          <ArrowLeft size={16} /> Volver a pacientes
        </Link>
        <div className="premium-card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <AlertCircle size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
          <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>Paciente no encontrado</p>
          <p style={{ fontSize: '0.88rem', marginTop: '0.5rem' }}>Es posible que haya sido eliminado o no tengas acceso.</p>
        </div>
      </div>
    );
  }

  const color = colorFor(patient.name);
  const initials = getInitials(patient.name);
  const totalSessions = appointments.filter(a => a.status !== 'cancelled').length;
  const nextAppt = appointments.find(a => a.status === 'scheduled' && new Date(a.start_time) > new Date());
  const firstAppt = appointments.length > 0 ? appointments[appointments.length - 1] : null;
  const consultReason = firstAppt?.patient_notes ?? null;
  const startDate = firstAppt ? new Date(firstAppt.start_time).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }) : null;
  const cfg = STATUS_CONFIG[patientStatus];

  return (
    <div className="animate-slide-up">
      <Link href="/dashboard/patients" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500, marginBottom: '1.5rem' }}>
        <ArrowLeft size={16} /> Volver a pacientes
      </Link>

      {/* Header Card */}
      <div className="premium-card" style={{ padding: '2rem 2.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: `${color}18`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700, flexShrink: 0 }}>
            {initials}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.3rem' }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>{patient.name}</h1>

              <div id="patient-status-dropdown" style={{ position: 'relative' }}>
                <button onClick={() => setStatusOpen(!statusOpen)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.75rem', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 700, background: cfg.bg, color: cfg.color, border: `1.5px solid ${cfg.dot}30`, cursor: 'pointer', transition: 'all 0.15s' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
                  {cfg.label}
                  <ChevronDown size={12} style={{ opacity: 0.6, transition: 'transform 0.2s', transform: statusOpen ? 'rotate(180deg)' : 'none' }} />
                </button>
                {statusOpen && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 200, background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', boxShadow: '0 8px 32px rgba(0,0,0,0.13)', minWidth: '180px', overflow: 'hidden' }}>
                    <div style={{ padding: '0.5rem 0.9rem', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #f1f5f9' }}>Estado del paciente</div>
                    {(Object.entries(STATUS_CONFIG) as [PatientStatus, typeof STATUS_CONFIG[PatientStatus]][]).map(([key, c]) => (
                      <button key={key} onClick={() => { setPatientStatus(key); setStatusOpen(false); supabase.from('patients').update({ status: key }).eq('id', patientId).then(() => {}); }}
                        style={{ width: '100%', padding: '0.7rem 1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', background: patientStatus === key ? c.bg : 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: patientStatus === key ? 700 : 600, color: c.color, textAlign: 'left', transition: 'background 0.12s' }}
                        onMouseEnter={e => { if (patientStatus !== key) e.currentTarget.style.background = c.bg; }}
                        onMouseLeave={e => { if (patientStatus !== key) e.currentTarget.style.background = 'transparent'; }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
                        {c.label}
                        {patientStatus === key && <span style={{ marginLeft: 'auto', fontSize: '0.75rem' }}>✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Options Dots */}
              <div id="patient-options-dropdown" style={{ position: 'relative' }}>
                <button onClick={() => setOptionsOpen(!optionsOpen)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-main)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <MoreVertical size={18} />
                </button>
                {optionsOpen && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 200, background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', boxShadow: '0 8px 32px rgba(0,0,0,0.13)', minWidth: '180px', overflow: 'hidden' }}>
                    <button onClick={() => { setDeleteConfirmOpen(true); setOptionsOpen(false); }} style={{ width: '100%', padding: '0.7rem 1rem', display: 'flex', alignItems: 'center', gap: '0.65rem', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#ef4444', textAlign: 'left', transition: 'background 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <Trash2 size={15} /> Eliminar paciente
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              {patient.email && <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}><Mail size={14} />{patient.email}</span>}
              {patient.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}><Phone size={14} />{patient.phone}</span>}
              {startDate && <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}><Calendar size={14} />Desde {startDate}</span>}
            </div>
          </div>
        </div>

        {/* Stats + Actions */}
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-dark)', lineHeight: 1, marginBottom: '0.3rem' }}>{totalSessions}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>sesiones realizadas</p>
          </div>

          {nextAppt && (
            <>
              <div style={{ width: '1px', height: '50px', background: 'var(--border-light)' }} />
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Próxima sesión</p>
                <p style={{ fontWeight: 700, color: 'var(--primary-dark-blue)', fontSize: '0.92rem' }}>
                  {new Date(nextAppt.start_time).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })}
                </p>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {new Date(nextAppt.start_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                  {' · '}
                  {nextAppt.event_types?.mode === 'presencial' ? 'Presencial' : 'Online'}
                </span>
              </div>
            </>
          )}

          <div style={{ width: '1px', height: '50px', background: 'var(--border-light)' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button onClick={() => openNote()} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', fontSize: '0.88rem' }}>
              <Plus size={15} /> Nueva Nota
            </button>
            <button onClick={openSchedModal} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1.2rem', fontSize: '0.88rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', background: 'var(--bg-white)', color: 'var(--text-dark)', fontWeight: 600, cursor: 'pointer' }}>
              <Calendar size={15} /> Agendar
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', marginBottom: '1.5rem', background: 'var(--bg-white)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', overflow: 'hidden', width: 'fit-content', boxShadow: 'var(--shadow-sm)' }}>
        {[{ id: 'timeline', label: 'Notas de Sesión' }, { id: 'info', label: 'Información del Paciente' }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as 'timeline' | 'info')}
            style={{ padding: '0.65rem 1.5rem', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', background: activeTab === tab.id ? 'var(--primary-light-blue)' : 'transparent', color: activeTab === tab.id ? 'var(--primary-dark-blue)' : 'var(--text-muted)', transition: 'all 0.2s', borderRight: tab.id === 'timeline' ? '1px solid var(--border-light)' : 'none' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* TIMELINE TAB */}
      {activeTab === 'timeline' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ padding: '0.75rem 1.1rem', background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.85rem' }}>🔒</div>
            <p style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4, margin: 0 }}>
              <strong style={{ color: '#334155' }}>Notas privadas del profesional.</strong> Teramy no accede, interpreta ni comparte su contenido.
            </p>
          </div>

          {consultReason && (
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem 1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div style={{ width: '3px', height: '16px', background: 'var(--primary-blue)', borderRadius: '2px' }} />
                <p style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, color: '#94a3b8', margin: 0 }}>Motivo de consulta (ingresado por el paciente)</p>
              </div>
              <p style={{ color: '#334155', lineHeight: 1.65, fontSize: '0.93rem', margin: 0 }}>{consultReason}</p>
            </div>
          )}

          {appointments.length === 0 ? (
            <div className="premium-card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Calendar size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
              <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Sin sesiones aún</p>
              <p style={{ fontSize: '0.88rem', marginBottom: '1.5rem' }}>Cuando el paciente tenga sesiones agendadas, aparecerán aquí.</p>
              <button onClick={openSchedModal} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem' }}>
                <Calendar size={16} /> Agendar primera sesión
              </button>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '20px', top: '30px', bottom: '30px', width: '2px', background: 'var(--border-light)', zIndex: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {appointments.map(appt => {
                  const isExpanded = expandedId === appt.id;
                  const isCancelled = appt.status === 'cancelled';
                  const dotColor = isCancelled ? '#cbd5e1' : '#0ea5e9';
                  const serviceName = appt.event_types?.title ?? 'Sesión';
                  const isOnline = appt.event_types?.mode !== 'presencial';
                  const isEditingThisNote = editingNoteApptId === appt.id;

                  return (
                    <div key={appt.id} style={{ display: 'flex', gap: '1.25rem', position: 'relative', zIndex: 1 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: '1.1rem' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: dotColor, border: '2px solid white', boxShadow: `0 0 0 3px ${dotColor}30`, zIndex: 2, position: 'relative' }} />
                      </div>

                      <div style={{ flex: 1, background: 'white', border: `1px solid ${isExpanded ? '#bae6fd' : '#e2e8f0'}`, borderRadius: '12px', overflow: 'hidden', transition: 'border-color 0.2s', boxShadow: isExpanded ? '0 4px 16px rgba(14,165,233,0.08)' : '0 1px 3px rgba(0,0,0,0.04)', opacity: isCancelled ? 0.6 : 1 }}>
                        <div onClick={() => setExpandedId(isExpanded ? null : appt.id)}
                          style={{ padding: '1rem 1.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, minWidth: 0 }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${dotColor}12`, border: `1px solid ${dotColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: dotColor }}>#{appt.sessionNumber}</span>
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontWeight: 700, color: '#0f172a', margin: 0, fontSize: '0.93rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{serviceName}</p>
                              <div style={{ display: 'flex', gap: '0.85rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>{formatDate(appt.start_time)}</span>
                                <span style={{ fontSize: '0.76rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                  {isOnline ? <Video size={10} style={{ color: '#0ea5e9' }} /> : <MapPin size={10} style={{ color: '#f97316' }} />}
                                  {isOnline ? 'Online' : 'Presencial'}
                                </span>
                                {appt.sessionNotes.length > 0 && (
                                  <span style={{ fontSize: '0.76rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <FileText size={10} /> {appt.sessionNotes.length} nota{appt.sessionNotes.length > 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                            {isCancelled && <span style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: 600, background: '#f1f5f9', padding: '0.2rem 0.65rem', borderRadius: '2rem' }}>Cancelada</span>}
                            <div style={{ color: '#cbd5e1' }}>{isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="animate-slide-up" style={{ borderTop: '1px solid #f1f5f9' }}>
                            {/* Existing notes */}
                            {appt.sessionNotes.map(note => (
                              <div key={note.id} style={{ padding: '1rem 1.4rem', borderBottom: '1px solid #f8fafc' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <FileText size={12} style={{ color: '#94a3b8' }} />
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                      Nota · {new Date(note.created_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                                    </span>
                                  </div>
                                  <button onClick={() => startEditNote(appt.id, note)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.65rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                                    <Edit2 size={12} /> Editar
                                  </button>
                                </div>
                                {isEditingThisNote && editingNoteId === note.id ? (
                                  <div>
                                    <textarea rows={4} value={noteText} onChange={e => setNoteText(e.target.value)}
                                      style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1.5px solid #bae6fd', fontSize: '0.9rem', lineHeight: 1.6, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }} />
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                                      <button onClick={() => { setEditingNoteApptId(null); setEditingNoteId(null); }} style={{ padding: '0.4rem 0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
                                      <button onClick={saveNote} disabled={savingNote} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}>
                                        {savedNote ? <><CheckCircle2 size={13} /> Guardado</> : savingNote ? <><Loader2 size={13} /> Guardando...</> : <><Save size={13} /> Guardar</>}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p style={{ lineHeight: 1.75, color: '#334155', fontSize: '0.91rem', margin: 0, borderLeft: '3px solid #bae6fd', paddingLeft: '1rem' }}>{note.content}</p>
                                )}
                              </div>
                            ))}

                            {/* Add note inline */}
                            {!isCancelled && (
                              <div style={{ padding: '0.75rem 1.4rem', background: '#fafcff', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                {isEditingThisNote && !editingNoteId ? (
                                  <div style={{ flex: 1 }}>
                                    <textarea rows={3} value={noteText} onChange={e => setNoteText(e.target.value)}
                                      placeholder="Escribe las notas de esta sesión..."
                                      style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1.5px solid #bae6fd', fontSize: '0.88rem', lineHeight: 1.6, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none', marginBottom: '0.5rem' }} />
                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                      <button onClick={() => { setEditingNoteApptId(null); setNoteText(''); }} style={{ padding: '0.4rem 0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
                                      <button onClick={saveNote} disabled={savingNote || !noteText.trim()} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}>
                                        {savedNote ? <><CheckCircle2 size={13} /> Guardado</> : savingNote ? <><Loader2 size={13} /> Guardando...</> : <><Save size={13} /> Guardar nota</>}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button onClick={() => startEditNote(appt.id)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                                    <Plus size={13} /> {appt.sessionNotes.length === 0 ? 'Agregar nota' : 'Nueva nota'}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* INFO TAB */}
      {activeTab === 'info' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="premium-card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-dark)' }}>Datos de Contacto</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { label: 'Nombre completo', value: patient.name },
                { label: 'Correo electrónico', value: patient.email ?? '—' },
                { label: 'Teléfono', value: patient.phone ?? '—' },
                { label: 'Registrado', value: new Date(patient.created_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }) },
              ].map(f => (
                <div key={f.label} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</label>
                  <p style={{ fontWeight: 500, color: 'var(--text-dark)', fontSize: '0.95rem', margin: 0 }}>{f.value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="premium-card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-dark)' }}>Resumen del Proceso</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { label: 'Sesiones realizadas', value: String(totalSessions) },
                { label: 'Sesiones canceladas', value: String(appointments.filter(a => a.status === 'cancelled').length) },
                { label: 'Inicio del proceso', value: startDate ?? '—' },
                { label: 'Último servicio', value: appointments[0]?.event_types?.title ?? '—' },
                { label: 'Estado actual', value: patientStatus },
              ].map(f => (
                <div key={f.label} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</label>
                  <p style={{ fontWeight: 500, color: 'var(--text-dark)', fontSize: '0.95rem', margin: 0 }}>{f.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showSchedModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at 60% 50%, rgba(15,23,42,0.52) 0%, rgba(2,8,23,0.32) 100%)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowSchedModal(false)}>
          <div onClick={e => e.stopPropagation()} className="animate-slide-up" style={{ width: '100%', maxWidth: '580px', background: '#fff', borderRadius: '22px', boxShadow: '0 32px 80px rgba(0,0,0,0.22)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {schedStep === 'form' ? (
              <>
                <div style={{ padding: '1.75rem 2rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', background: '#fcfcfc' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: `${color}18`, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>{patient?.name?.charAt(0)}</div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>{patient?.name}</span>
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Agendar nueva sesión</h3>
                  </div>
                  <button onClick={() => setShowSchedModal(false)} style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={16} />
                  </button>
                </div>

                <div style={{ padding: '1.75rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', flex: 1 }}>
                  
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.6rem' }}>Selecciona Fecha <span style={{ color: '#ef4444' }}>*</span></label>
                    <div style={{ display: 'flex', gap: '0.6rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
                      {availableDates.map(d => (
                        <button key={d.dateISO} onClick={() => { setSelectedDateISO(d.dateISO); setSchedDate(d.dateISO); setSchedTime(''); }}
                          style={{ minWidth: '85px', padding: '0.75rem 0.5rem', borderRadius: '12px', border: selectedDateISO === d.dateISO ? '2px solid #3b82f6' : '1.5px solid #e2e8f0', background: selectedDateISO === d.dateISO ? '#eff6ff' : 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', transition: 'all 0.2s' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: selectedDateISO === d.dateISO ? '#3b82f6' : '#94a3b8', textTransform: 'uppercase' }}>{d.label.split(' ')[0]}</span>
                          <span style={{ fontSize: '1rem', fontWeight: 800, color: selectedDateISO === d.dateISO ? '#1e40af' : '#334155' }}>{d.label.split(' ')[1]}</span>
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: selectedDateISO === d.dateISO ? '#3b82f6' : '#94a3b8' }}>{d.label.split(' ')[2]}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedDateISO && (
                    <div className="animate-slide-up">
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.6rem' }}>Horas disponibles <span style={{ color: '#ef4444' }}>*</span></label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.6rem' }}>
                        {(availableDates.find(d => d.dateISO === selectedDateISO)?.slots || []).map(t => (
                          <button key={t} onClick={() => setSchedTime(t)}
                            style={{ padding: '0.65rem', borderRadius: '10px', border: schedTime === t ? '2px solid #3b82f6' : '1.5px solid #e2e8f0', background: schedTime === t ? '#3b82f6' : 'white', color: schedTime === t ? 'white' : '#475569', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' }}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.4rem' }}>Tipo de sesión</label>
                    <div style={{ position: 'relative' }}>
                      <select value={schedEventTypeId} onChange={e => {
                        setSchedEventTypeId(e.target.value);
                        const svc = eventTypes.find(s => s.id === e.target.value);
                        if (svc) { 
                          setSchedModality(svc.mode as 'online' | 'presencial'); 
                          setSchedDuration(String(svc.duration_minutes));
                          setSchedPrice(String(svc.price));
                        } else {
                          setSchedDuration(''); setSchedPrice('');
                        }
                      }} style={{ width: '100%', fontSize: '0.93rem', padding: '0.8rem 1rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', background: '#fafcff', appearance: 'none' }}>
                        <option value="">Selecciona un tipo de sesión</option>
                        {eventTypes.map(s => <option key={s.id} value={s.id}>{s.title} · {s.duration_minutes} min</option>)}
                      </select>
                      <ChevronDown size={16} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                    </div>
                  </div>

                  {globalModality ? (
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.5rem' }}>Modalidad</label>
                      <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.6rem', width: 'fit-content' }}>
                        {globalModality === 'online' ? <Video size={16} style={{ color: '#3b82f6' }} /> : <MapPin size={16} style={{ color: '#f59e0b' }} />}
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>{globalModality === 'online' ? 'Online' : 'Presencial'}</span>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>(Configurado en Integraciones)</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.5rem' }}>Modalidad</label>
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        {(['online', 'presencial'] as const).map(m => (
                          <button key={m} type="button" onClick={() => setSchedModality(m)} style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem', border: schedModality === m ? '2px solid #3b82f6' : '2px solid #e2e8f0', background: schedModality === m ? '#eff6ff' : 'white', color: schedModality === m ? '#1e40af' : '#64748b', transition: 'all 0.2s' }}>
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
                        {schedDuration ? `${schedDuration} min` : '—'}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.4rem' }}>Honorario</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '0.93rem', color: '#334155', fontWeight: 800 }}>
                        <DollarSign size={16} style={{ color: '#94a3b8' }} />
                        {schedPrice ? `$${parseInt(schedPrice).toLocaleString('es-CL')}` : '—'}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '1.25rem 2rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '0.75rem', background: '#fafafa' }}>
                  <button onClick={() => setShowSchedModal(false)} style={{ padding: '0.85rem 1.5rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
                  <button onClick={saveSchedule} disabled={!schedDate || !schedTime || !schedEventTypeId || savingSched}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.85rem', fontSize: '0.95rem', fontWeight: 700, cursor: (!schedDate || !schedTime || !schedEventTypeId) ? 'not-allowed' : 'pointer', borderRadius: '12px', border: 'none', background: (!schedDate || !schedTime || !schedEventTypeId) ? '#e2e8f0' : 'linear-gradient(135deg,#3b82f6,#2563eb)', color: (!schedDate || !schedTime || !schedEventTypeId) ? '#94a3b8' : 'white' }}>
                    {savingSched ? <Loader2 size={17} className="animate-spin" /> : <CalendarPlus size={17} />} Agendar sesión
                  </button>
                </div>
              </>
            ) : (
              <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#f0fdf4', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                  <CheckCircle2 size={32} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>¡Sesión agendada!</h3>
                <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '2rem' }}>La sesión con {patient?.name} ha sido registrada exitosamente.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <a href={`https://wa.me/?text=${encodeURIComponent(`¡Hola ${patient?.name}! 👋\n\nTu próxima sesión ha sido confirmada:\n📅 ${schedDate} a las ${schedTime}\n💻 Modalidad: ${schedModality === 'online' ? 'Online (Google Meet)' : 'Presencial'}\n\n¡Nos vemos! ✨`)}`}
                    target="_blank" rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', padding: '0.85rem', borderRadius: '12px', background: '#f0fdf4', color: '#15803d', fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none', border: '1.5px solid #bbf7d0' }}>
                    <MessageSquare size={16} /> Enviar WhatsApp al paciente
                  </a>
                  <a href={gcalUrl(patient?.name || '', schedDate, schedTime, schedDuration, schedModality)}
                    target="_blank" rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', padding: '0.85rem', borderRadius: '12px', background: '#eff6ff', color: '#1d4ed8', fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none', border: '1.5px solid #bfdbfe' }}>
                    <CalendarPlus size={16} /> Agregar a Google Calendar
                  </a>
                  <button onClick={() => { setShowSchedModal(false); setSchedStep('form'); }}
                    style={{ padding: '0.85rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', marginTop: '0.5rem' }}>
                    Listo, cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>, document.body
      )}

      {/* Delete confirmation modal */}
      {deleteConfirmOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setDeleteConfirmOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '400px', background: '#fff', borderRadius: '20px', padding: '2rem', textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.18)', animation: 'slide-up 0.2s ease-out' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <AlertTriangle size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#0f172a' }}>¿Eliminar paciente?</h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0 0 1.5rem', lineHeight: 1.4 }}>
              Esta acción eliminará permanentemente al paciente de tu base de datos y no se podrá deshacer.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button onClick={() => setDeleteConfirmOpen(false)} style={{ padding: '0.75rem 1.25rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleDelete} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', borderRadius: '10px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>
                {deleting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={16} />}
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
