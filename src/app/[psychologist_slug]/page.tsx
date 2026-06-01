"use client";

import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, Video, MapPin, CheckCircle, ChevronLeft,
  ArrowRight, Globe, Star, Award, Instagram, Loader2, Eye,
} from 'lucide-react';
import { supabase } from '@/utils/supabase';
import { addMinutes, format, addDays, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EventType {
  id: string;
  title: string;
  description: string;
  mode: 'online' | 'presencial';
  duration_minutes: number;
  price: number;
  is_active?: boolean;
}

interface Psychologist {
  id: string;
  slug: string;
  name: string;
  title?: string;
  registration_number?: string;
  years_experience?: number;
  description?: string;
  photo_url?: string;
  specialties?: string[];
  therapies?: string[];
  languages?: string[];
  instagram_url?: string;
  phone?: string;
  timezone: string;
  video_meeting_url?: string;
  video_meeting_type?: 'meet' | 'zoom';
  event_types: EventType[];
}

interface AvailabilityRow {
  day_of_week: number;   // 0 = Sun … 6 = Sat
  start_time: string;    // "09:00"
  end_time: string;      // "18:00"
}

interface BookingData {
  availability:  AvailabilityRow[];
  booked:        Array<{ start_time: string; end_time: string }>;
  blockedDates:  string[];   // 'YYYY-MM-DD'
  settings: {
    buffer_minutes:       number;
    min_notice_hours:     number;
    max_sessions_per_day: number;
    booking_window_days:  number;
    allow_overtime?:      boolean;
  };
}

interface DateSlot {
  label:   string;
  dateISO: string;
  slots:   string[];
}

// ─── Core slot generation ──────────────────────────────────────────────────────
/**
 * Generates available time slots for the next `daysAhead` days, respecting:
 *  • Multiple time blocks per day (e.g. 09:00-13:00 AND 15:00-18:00)
 *  • Blocked / vacation dates
 *  • Minimum advance notice (e.g. 24 h)
 *  • Buffer between sessions
 *  • Maximum sessions per calendar day
 *  • Existing appointment conflicts
 */
function generateSlots(
  availability:    AvailabilityRow[],
  booked:          Array<{ start_time: string; end_time: string }>,
  blockedDates:    string[],
  durationMinutes: number,
  bufferMinutes:   number,
  minNoticeHours:  number,
  maxPerDay:       number,
  daysAhead = 60,
  allowOvertime = false,
): DateSlot[] {
  const result: DateSlot[] = [];
  const now      = new Date();
  const minStart = new Date(now.getTime() + minNoticeHours * 3_600_000);

  for (let i = 1; i <= daysAhead; i++) {
    const day = addDays(now, i);
    day.setHours(0, 0, 0, 0);
    const dateISO = format(day, 'yyyy-MM-dd');

    // ── 1. Skip blocked dates ───────────────────────────────────────────────
    if (blockedDates.includes(dateISO)) continue;

    // ── 2. Only generate for configured weekdays ────────────────────────────
    const dayBlocks = availability
      .filter(a => a.day_of_week === day.getDay())
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
    if (dayBlocks.length === 0) continue;

    // ── 3. Check max-sessions-per-day capacity ──────────────────────────────
    const dayStart = new Date(day);
    const dayEnd   = new Date(day); dayEnd.setHours(23, 59, 59, 999);
    const existingToday = booked.filter(b => {
      const t = new Date(b.start_time);
      return t >= dayStart && t <= dayEnd;
    });
    const capacity = maxPerDay - existingToday.length;
    if (capacity <= 0) continue;

    // ── 4. Iterate over time blocks and generate slots ──────────────────────
    const slots: string[] = [];

    for (const block of dayBlocks) {
      if (slots.length >= capacity) break;

      const [sh, sm] = block.start_time.split(':').map(Number);
      const [eh, em] = block.end_time.split(':').map(Number);

      let cursor   = new Date(day); cursor.setHours(sh, sm, 0, 0);
      const blockEnd = new Date(day); blockEnd.setHours(eh, em, 0, 0);

      while (slots.length < capacity) {
        const slotEnd = addMinutes(cursor, durationMinutes);

        // If flexibility is ON, we only check if the session STARTS before the block ends.
        // If flexibility is OFF, the entire session must fit.
        if (allowOvertime) {
          if (cursor >= blockEnd) break;
        } else {
          if (slotEnd > blockEnd) break;
        }

        // Skip slots that don't meet minimum notice
        if (isBefore(cursor, minStart)) {
          cursor = addMinutes(cursor, durationMinutes + bufferMinutes);
          continue;
        }

        // Conflict check: the slot window must not overlap any booked window
        // (including the buffer that follows each booked session)
        const bufMs = bufferMinutes * 60_000;
        const hasConflict = booked.some(b => {
          const bStart = new Date(b.start_time).getTime();
          const bEnd   = new Date(b.end_time).getTime();
          // New slot overlaps if it starts before booked_end + buffer
          // AND ends after booked_start
          return cursor.getTime() < bEnd + bufMs && slotEnd.getTime() > bStart;
        });

        if (!hasConflict) slots.push(format(cursor, 'HH:mm'));

        cursor = addMinutes(cursor, durationMinutes + bufferMinutes);
      }
    }

    // Deduplicate (shouldn't happen with correct blocks, but safety net)
    const unique = slots.filter((s, i, a) => a.indexOf(s) === i).sort();
    if (unique.length > 0) {
      result.push({
        label:   format(day, 'EEE d MMM', { locale: es }),
        dateISO,
        slots:   unique,
      });
    }
  }

  return result;
}

// ─── Demo data ─────────────────────────────────────────────────────────────────
const DEMO_SLUG = 'psicologo-prueba';

const DEMO_PSYCHOLOGIST: Psychologist = {
  id:   'demo',
  slug: DEMO_SLUG,
  name: 'Dra. Laura Morales',
  title: 'Psicóloga Clínica · Adultos y adolescentes',
  registration_number: '42857',
  years_experience: 8,
  description: 'Me especializo en terapia cognitivo-conductual para adultos y adolescentes. Mi enfoque es práctico, empático y orientado a resultados. Juntos construimos las herramientas que necesitas para avanzar.',
  photo_url: '/psychologist_avatar.png',
  specialties: ['Ansiedad', 'Depresión', 'Estrés', 'Autoestima', 'Duelo', 'Trauma'],
  therapies: ['Terapia individual', 'Terapia para adultos'],
  languages: ['Español', 'Inglés'],
  instagram_url: 'https://instagram.com/dralaura.psicologa',
  timezone: 'America/Santiago',
  video_meeting_url: 'https://meet.google.com/abc-defg-hij',
  video_meeting_type: 'meet',
  event_types: [
    { id: 'et1', title: 'Psicoterapia individual',  description: 'Sesión individual de trabajo terapéutico online. Ideal para continuar un proceso ya iniciado.', mode: 'online',     duration_minutes: 50, price: 45000 },
    { id: 'et2', title: 'Primera consulta',          description: 'Sesión inicial para conocernos, evaluar tu situación y definir el plan de trabajo juntos.',  mode: 'online',     duration_minutes: 60, price: 35000 },
    { id: 'et3', title: 'Sesión presencial',         description: 'Sesión individual en consulta. Providencia, Santiago.',                                      mode: 'presencial', duration_minutes: 50, price: 50000 },
  ],
};

const DEMO_BOOKING_DATA: BookingData = {
  availability: [
    { day_of_week: 1, start_time: '09:00', end_time: '13:00' },
    { day_of_week: 1, start_time: '15:00', end_time: '18:00' },
    { day_of_week: 2, start_time: '09:00', end_time: '17:00' },
    { day_of_week: 3, start_time: '10:00', end_time: '18:00' },
    { day_of_week: 4, start_time: '09:00', end_time: '16:00' },
    { day_of_week: 5, start_time: '09:00', end_time: '14:00' },
  ],
  booked:       [],
  blockedDates: [],
  settings: { buffer_minutes: 10, min_notice_hours: 1, max_sessions_per_day: 8, booking_window_days: 30 },
};

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function PublicBookingPage({ params }: { params: { psychologist_slug: string } }) {
  const isDemo = params.psychologist_slug === DEMO_SLUG;

  // ── Core data ────────────────────────────────────────────────────────────
  const [psychologist,  setPsychologist]  = useState<Psychologist | null>(null);
  const [bookingData,   setBookingData]   = useState<BookingData | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [notFound,      setNotFound]      = useState(false);

  // ── Booking flow ──────────────────────────────────────────────────────────
  const [step,             setStep]            = useState(1);
  const [selectedService,  setSelectedService]  = useState<EventType | null>(null);
  const [availableDates,   setAvailableDates]   = useState<DateSlot[]>([]);
  const [slotsLoading,     setSlotsLoading]     = useState(false);
  const [selectedDateIdx,  setSelectedDateIdx]  = useState<number | null>(null);
  const [selectedTime,     setSelectedTime]     = useState<string | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', birthDate: '', notes: '' });
  const [isReturning, setIsReturning] = useState(false);
  const [emailError,       setEmailError]       = useState<string | null>(null);
  const [submitting,       setSubmitting]       = useState(false);
  const [submitError,      setSubmitError]      = useState<string | null>(null);
  const [descExpanded,     setDescExpanded]     = useState(false);
  const [mobileBookingOpen, setMobileBookingOpen] = useState(false);

  // ── Load psychologist + booking data ─────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        if (isDemo) {
          setPsychologist(DEMO_PSYCHOLOGIST);
          setBookingData(DEMO_BOOKING_DATA);
          setLoading(false);
          return;
        }

        // 1. Fetch public psychologist profile + active services
        const { data, error } = await supabase
          .from('psychologists')
          .select('id, slug, name, title, registration_number, years_experience, description, photo_url, specialties, therapies, languages, instagram_url, phone, timezone, video_meeting_url, video_meeting_type')
          .eq('slug', params.psychologist_slug)
          .single();

        if (error || !data) { setNotFound(true); setLoading(false); return; }

        const { data: eventTypes } = await supabase
          .from('event_types')
          .select('id, title, description, mode, duration_minutes, price, is_active')
          .eq('psychologist_id', data.id)
          .eq('is_active', true)
          .order('created_at');

        setPsychologist({ ...data, event_types: eventTypes ?? [] });

        // 2. Fetch scheduling data via server-side API (bypasses RLS)
        const res  = await fetch(`/api/booking-data?psychologist_id=${data.id}`);
        const json = await res.json();
        if (res.ok) setBookingData(json);
      } catch (err) {
        console.error('Booking page load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.psychologist_slug]);

  // ── Regenerate slots whenever the selected service changes ────────────────
  useEffect(() => {
    if (!selectedService || !bookingData) return;

    setSlotsLoading(true);
    setAvailableDates([]);
    setSelectedDateIdx(null);
    setSelectedTime(null);

    // Defer one tick so the "Calculando horarios..." state shows immediately
    const id = setTimeout(() => {
      const { availability, booked, blockedDates, settings } = bookingData;
      const dates = generateSlots(
        availability,
        booked,
        blockedDates,
        selectedService.duration_minutes,
        settings.buffer_minutes,
        settings.min_notice_hours,
        settings.max_sessions_per_day,
        settings.booking_window_days || 60,
        settings.allow_overtime || false,
      );
      setAvailableDates(dates);
      setSlotsLoading(false);
    }, 0);

    return () => clearTimeout(id);
  }, [selectedService?.id, bookingData]);

  const selectedDate = selectedDateIdx !== null ? availableDates[selectedDateIdx] : null;

  // ── Book appointment ──────────────────────────────────────────────────────
  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!psychologist || !selectedService || !selectedDate || !selectedTime) return;
    setSubmitting(true);
    setSubmitError(null);

    if (isDemo) {
      await new Promise(r => setTimeout(r, 900));
      setStep(5);
      setSubmitting(false);
      return;
    }

    const startDate = new Date(`${selectedDate.dateISO}T${selectedTime}:00`);
    const endDate   = addMinutes(startDate, selectedService.duration_minutes);

    const patientPayload = isReturning
      ? { email: form.email, isReturning: true }
      : {
          firstName: form.firstName,
          lastName:  form.lastName,
          email:     form.email,
          phone:     `+569${form.phone}`,
          birthDate: form.birthDate || null,
        };

    const res = await fetch('/api/appointments', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        psychologist_id:  psychologist.id,
        event_type_id:    selectedService.id,
        patient:          patientPayload,
        start_time:       startDate.toISOString(),
        end_time:         endDate.toISOString(),
        patient_notes:    form.notes || null,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      if (json.error === 'PATIENT_NOT_FOUND') {
        setSubmitError('No encontramos ningún paciente con este correo electrónico registrado con este terapeuta. Por favor, ingresa tus datos en el formulario de abajo para registrarte.');
        setIsReturning(false);
      } else if (json.error?.includes('primera')) {
        setEmailError(json.error);
      } else {
        setSubmitError(json.error || 'Error al confirmar la sesión.');
      }
      setSubmitting(false);
      return;
    }
    setStep(5);
    setSubmitting(false);
  };

  // ── Render guards ─────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f0f7ff 0%, #e8eeff 100%)' }}>
      <div style={{ textAlign: 'center' }}>
        <Loader2 size={36} style={{ color: 'var(--primary-blue)', marginBottom: '1rem' }} />
        <p style={{ color: 'var(--text-muted)' }}>Cargando perfil...</p>
      </div>
    </div>
  );

  if (notFound || !psychologist) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f0f7ff 0%, #e8eeff 100%)' }}>
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>( ! )</p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.5rem' }}>Perfil no encontrado</h1>
        <p style={{ color: 'var(--text-muted)' }}>El enlace que ingresaste no corresponde a ningún psicólogo en Teramy.</p>
      </div>
    </div>
  );

  const psych = psychologist;

  return (
    <>
      <style>{`
        .booking-layout {
          display: flex;
          gap: 1.5rem;
          align-items: flex-start;
          flex-wrap: wrap;
        }
        .left-col {
          width: 300px;
          flex-shrink: 0;
        }
        .right-col {
          flex: 1;
          min-width: 340px;
        }
        .mobile-cta {
          display: none;
        }
        .mobile-back {
          display: none !important;
        }
        .mobile-only {
          display: none;
        }
        @media (max-width: 768px) {
          .booking-layout {
            flex-direction: column;
          }
          .left-col {
            width: 100%;
            display: ${mobileBookingOpen ? 'none' : 'block'};
          }
          .right-col {
            width: 100%;
            min-width: 100%;
            display: ${mobileBookingOpen ? 'flex' : 'none'} !important;
          }
          .mobile-cta {
            display: ${mobileBookingOpen ? 'none' : 'block'};
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 1rem 1.5rem;
            background: white;
            box-shadow: 0 -8px 30px rgba(0,0,0,0.08);
            z-index: 100;
            border-top-left-radius: 20px;
            border-top-right-radius: 20px;
          }
          .mobile-back {
            display: ${mobileBookingOpen ? 'inline-flex' : 'none'} !important;
          }
          .mobile-only {
            display: block;
          }
          /* Add bottom padding to left-col so it doesn't get covered by CTA */
          .left-col-inner {
            margin-bottom: ${mobileBookingOpen ? '0' : '90px'} !important;
          }
        }
      `}</style>
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0f7ff 0%, #e8eeff 100%)', padding: isDemo ? '4.5rem 1rem 2rem' : '2rem 1rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>

        {/* ── Demo banner ────────────────────────────────────────────────────── */}
        {isDemo && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, background: 'linear-gradient(90deg, #0ea5e9 0%, #6366f1 100%)', color: 'white', padding: '0.7rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', fontSize: '0.85rem', fontWeight: 600, boxShadow: '0 2px 12px rgba(14,165,233,0.3)' }}>
            <Eye size={15} />
            Vista de ejemplo · Así ve un paciente tu página de agendamiento en Teramy
          </div>
        )}

        <div className="booking-layout" style={{ width: '100%', maxWidth: '960px' }}>

          {/* ─────────────────────── LEFT: Profile card ─────────────────────── */}
          <div className="left-col">
            <div className="premium-card left-col-inner" style={{ padding: '2rem', position: 'sticky', top: '2rem', textAlign: 'center' }}>
            
            {/* Logo */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
              <h2 style={{ 
                fontSize: '1.6rem', 
                fontWeight: 800, 
                background: 'var(--primary-gradient)', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.5px',
                margin: 0
              }}>Teramy</h2>
            </div>

            {/* Photo */}
            <div style={{ position: 'relative', display: 'inline-flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <img
                src={psych.photo_url || '/psychologist_avatar.png'}
                alt={psych.name}
                style={{ width: '160px', height: '160px', borderRadius: '50%', objectFit: 'cover', border: '4px solid white', boxShadow: '0 4px 14px rgba(0,0,0,0.12)', pointerEvents: 'none', userSelect: 'none' }}
                draggable="false"
                onContextMenu={(e) => e.preventDefault()}
              />
              <div style={{ position: 'absolute', bottom: '8px', right: '12px', width: '22px', height: '22px', borderRadius: '50%', background: '#22c55e', border: '3px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
            </div>

            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-dark)', margin: '0 0 0.2rem 0' }}>{psych.name}</h1>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '0.9rem', fontWeight: 500 }}>{psych.title}</p>

            {/* Trust signals */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem', alignItems: 'center' }}>
              {psych.registration_number && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <Award size={14} style={{ color: 'var(--primary-blue)', flexShrink: 0 }} />
                  Reg. SPS #{psych.registration_number}
                </div>
              )}
              {psych.years_experience && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <Star size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
                  {psych.years_experience} años de experiencia
                </div>
              )}
              {(psych.languages ?? []).length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <Globe size={14} style={{ color: 'var(--primary-blue)', flexShrink: 0 }} />
                  {(psych.languages ?? []).join(' · ')}
                </div>
              )}
            </div>

            {/* Description */}
            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.65, margin: 0 }}>
                {psych.description && psych.description.length > 150 && !descExpanded 
                  ? `${psych.description.substring(0, 150)}...` 
                  : psych.description}
              </p>
              {psych.description && psych.description.length > 150 && (
                <button 
                  onClick={() => setDescExpanded(!descExpanded)} 
                  style={{ background: 'none', border: 'none', color: 'var(--primary-blue)', fontSize: '0.8rem', fontWeight: 700, padding: 0, marginTop: '0.4rem', cursor: 'pointer' }}
                >
                  {descExpanded ? 'Ver menos' : 'Leer más'}
                </button>
              )}
            </div>

            {/* Specialties */}
            {(psych.specialties ?? []).length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.25rem', justifyContent: 'center' }}>
                {(psych.specialties ?? []).map((sp: string) => (
                  <span key={sp} style={{ padding: '0.25rem 0.6rem', background: 'var(--primary-light-blue)', color: 'var(--primary-dark-blue)', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 600 }}>
                    {sp}
                  </span>
                ))}
              </div>
            )}

            {/* Therapies */}
            {(psych.therapies ?? []).length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.25rem', justifyContent: 'center' }}>
                {(psych.therapies ?? []).map((th: string) => (
                  <span key={th} style={{ padding: '0.25rem 0.6rem', background: '#f3e8ff', color: '#7e22ce', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 600 }}>
                    {th}
                  </span>
                ))}
              </div>
            )}

            {/* Social */}
            {(psych.instagram_url || psych.phone) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.5rem', marginBottom: '1.25rem', justifyContent: 'center' }}>
                {psych.instagram_url && (
                  <a href={psych.instagram_url.startsWith('http') ? psych.instagram_url : `https://instagram.com/${psych.instagram_url.replace('@', '')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#ec4899'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                    <Instagram size={15} /> {psych.instagram_url.replace(/https?:\/\/(www\.)?instagram\.com\//, '').replace(/\//g, '').startsWith('@') ? psych.instagram_url.replace(/https?:\/\/(www\.)?instagram\.com\//, '').replace(/\//g, '') : `@${psych.instagram_url.replace(/https?:\/\/(www\.)?instagram\.com\//, '').replace(/\//g, '')}`}
                  </a>
                )}
                {psych.phone && (
                  <a href={`https://wa.me/${psych.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#25D366'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                    <Globe size={15} style={{ display: 'none' }} />
                    <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'inherit' }}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                    {psych.phone}
                  </a>
                )}
              </div>
            )}

            {/* Mobile Read-Only Services */}
            {psych.event_types && psych.event_types.length > 0 && (
              <div className="mobile-only" style={{ marginTop: '2.5rem', textAlign: 'left' }}>
                <div style={{ width: '40px', height: '4px', background: 'var(--border-light)', borderRadius: '2px', margin: '0 auto 1.5rem' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '1rem', textAlign: 'center' }}>Servicios Disponibles</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {psych.event_types.map(svc => (
                    <div key={`ro-${svc.id}`} style={{ padding: '1.1rem', border: '1.5px solid var(--border-light)', borderRadius: '14px', background: '#f8fafc' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-dark)', paddingRight: '0.5rem' }}>{svc.title}</h4>
                        <span style={{ flexShrink: 0, fontSize: '0.7rem', fontWeight: 700, background: svc.mode === 'online' ? '#dbeafe' : '#ffedd5', color: svc.mode === 'online' ? '#1d4ed8' : '#c2410c', padding: '0.2rem 0.6rem', borderRadius: '2rem' }}>
                          {svc.mode === 'online' ? 'Online' : 'Presencial'}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 0.8rem 0', lineHeight: 1.4 }}>{svc.description}</p>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-dark)', fontWeight: 700 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Clock size={13} style={{ color: 'var(--text-muted)' }} /> {svc.duration_minutes} min</span>
                        <span style={{ color: svc.price === 0 ? '#16a34a' : 'var(--text-dark)' }}>
                          {svc.price === 0 ? 'Gratis' : `$${svc.price.toLocaleString('es-CL')}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Booking summary sidebar */}
            {step > 1 && selectedService && (
              <div className="animate-slide-up" style={{ marginTop: '1.5rem', padding: '1.1rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Resumen de tu agenda</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-dark)', fontWeight: 600 }}>
                    {selectedService.mode === 'online'
                      ? <Video size={15} style={{ color: '#0ea5e9', flexShrink: 0, marginTop: '0.1rem' }} />
                      : <MapPin size={15} style={{ color: '#f97316', flexShrink: 0, marginTop: '0.1rem' }} />}
                    {selectedService.title}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    <Clock size={14} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                    {selectedService.duration_minutes} min
                  </div>
                  {selectedDate && (
                    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      <Calendar size={14} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                      {selectedDate.label}
                    </div>
                  )}
                  {selectedTime && (
                    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      <Clock size={14} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                      {selectedTime} hrs
                    </div>
                  )}
                  <div style={{ marginTop: '0.25rem', paddingTop: '0.6rem', borderTop: '1px solid var(--border-light)', fontWeight: 800, color: 'var(--primary-dark-blue)', fontSize: '0.95rem' }}>
                    {selectedService.price === 0 ? 'Sesión Gratuita' : `$${selectedService.price.toLocaleString('es-CL')} CLP`}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─────────────────────── RIGHT: Booking flow ─────────────────────── */}
        <div className="premium-card animate-slide-up right-col" style={{ overflow: 'hidden', minHeight: '500px', display: 'flex', flexDirection: 'column' }}>

          {/* Back button */}
          <div style={{ padding: '1.25rem 2rem 0 2rem', display: 'flex', gap: '1rem' }}>
            {step === 1 && (
              <button
                className="mobile-back"
                onClick={() => setMobileBookingOpen(false)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: 500, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
              >
                <ChevronLeft size={16} /> Volver al perfil
              </button>
            )}
            {step > 1 && step < 5 && (
              <button
                onClick={() => setStep(step - 1)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: 500, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
              >
                <ChevronLeft size={16} /> Volver
              </button>
            )}
          </div>

          {/* Step indicator */}
          {step < 5 && (
            <div style={{ padding: '1rem 2rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {[1, 2, 3, 4].map(s => (
                <React.Fragment key={s}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, background: s <= step ? 'var(--primary-blue)' : 'var(--border-light)', color: s <= step ? 'white' : 'var(--text-muted)', transition: 'all 0.3s', flexShrink: 0 }}>
                    {s < step ? '✓' : s}
                  </div>
                  {s < 4 && <div style={{ flex: 1, height: '2px', background: s < step ? 'var(--primary-blue)' : 'var(--border-light)', borderRadius: '1px', transition: 'all 0.3s' }} />}
                </React.Fragment>
              ))}
            </div>
          )}

          <div style={{ padding: '1.75rem 2rem 2rem', flex: 1 }}>

            {/* ══ Step 1: Service selection ═══════════════════════════════════ */}
            {step === 1 && (
              <div className="animate-slide-up">
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.4rem' }}>
                  ¿Qué tipo de sesión necesitas?
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Selecciona el servicio que quieres agendar con {psych.name}.
                </p>

                {psych.event_types.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                    <p style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>( - )</p>
                    <p style={{ fontWeight: 600 }}>Sin servicios disponibles</p>
                    <p style={{ fontSize: '0.88rem', marginTop: '0.4rem' }}>Este psicólogo aún no ha configurado sus servicios.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                    {psych.event_types.map((svc: EventType) => (
                      <div
                        key={svc.id}
                        onClick={() => { setSelectedService(svc); setEmailError(null); setStep(2); }}
                        className="premium-card"
                        style={{ padding: '1.25rem 1.5rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', border: '1.5px solid var(--border-light)', transition: 'all 0.2s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary-blue)'; (e.currentTarget as HTMLElement).style.background = 'var(--primary-light-blue)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-light)'; (e.currentTarget as HTMLElement).style.background = 'white'; }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.6rem', borderRadius: '2rem', fontSize: '0.72rem', fontWeight: 700, background: svc.mode === 'online' ? '#dbeafe' : '#ffedd5', color: svc.mode === 'online' ? '#1d4ed8' : '#c2410c' }}>
                              {svc.mode === 'online' ? <Video size={11} /> : <MapPin size={11} />}
                              {svc.mode === 'online' ? 'Online' : 'Presencial'}
                            </span>
                            {svc.price === 0 && (
                              <span style={{ padding: '0.2rem 0.6rem', borderRadius: '2rem', fontSize: '0.72rem', fontWeight: 700, background: '#dcfce7', color: '#16a34a' }}>Gratis</span>
                            )}
                          </div>
                          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-dark)', margin: '0 0 0.3rem' }}>{svc.title}</h3>
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>{svc.description}</p>
                          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.6rem', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={12} /> {svc.duration_minutes} min</span>
                            <span style={{ fontWeight: 700, color: svc.price === 0 ? '#16a34a' : 'var(--text-dark)' }}>
                              {svc.price === 0 ? 'Gratis' : `$${svc.price.toLocaleString('es-CL')} CLP`}
                            </span>
                          </div>
                        </div>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary-light-blue)', color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <ArrowRight size={18} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ══ Step 2: Date selection ══════════════════════════════════════ */}
            {step === 2 && (
              <div className="animate-slide-up">
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.4rem' }}>Elige un día</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Próximos días disponibles de {psych.name}
                </p>

                {slotsLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '0.75rem', color: 'var(--text-muted)' }}>
                    <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary-blue)' }} />
                    <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>Calculando horarios disponibles...</p>
                  </div>
                ) : availableDates.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                    <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>[ - ]</p>
                    <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Sin disponibilidad próxima</p>
                    <p style={{ fontSize: '0.88rem' }}>Este psicólogo no tiene horarios disponibles en los próximos {bookingData?.settings?.booking_window_days || 60} días.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.75rem' }}>
                    {availableDates.map((d: DateSlot, i: number) => (
                      <button
                        key={d.dateISO}
                        onClick={() => { setSelectedDateIdx(i); setStep(3); }}
                        style={{ padding: '1.1rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-light)', background: 'white', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary-blue)'; (e.currentTarget as HTMLElement).style.background = 'var(--primary-light-blue)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-light)'; (e.currentTarget as HTMLElement).style.background = 'white'; }}
                      >
                        <p style={{ fontWeight: 700, color: 'var(--text-dark)', fontSize: '0.95rem', margin: '0 0 0.25rem' }}>
                          {d.label.split(' ')[0]}
                        </p>
                        <p style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-dark-blue)', margin: '0 0 0.25rem' }}>
                          {d.label.split(' ')[1]}
                        </p>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
                          {d.label.split(' ')[2]}
                        </p>
                        <p style={{ fontSize: '0.72rem', color: 'var(--accent-green)', fontWeight: 600, marginTop: '0.4rem' }}>
                          {d.slots.length} horario{d.slots.length !== 1 ? 's' : ''}
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                <p style={{ marginTop: '1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                  Los horarios se muestran en hora local.
                </p>
              </div>
            )}

            {/* ══ Step 3: Time selection ══════════════════════════════════════ */}
            {step === 3 && selectedDate && (
              <div className="animate-slide-up">
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.25rem' }}>
                  Elige una hora
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  {selectedDate.label} · {selectedDate.slots.length} horario{selectedDate.slots.length !== 1 ? 's' : ''} disponible{selectedDate.slots.length !== 1 ? 's' : ''}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.75rem' }}>
                  {selectedDate.slots.map(time => (
                    <button
                      key={time}
                      onClick={() => { setSelectedTime(time); setStep(4); }}
                      style={{ padding: '0.9rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border-light)', background: 'white', cursor: 'pointer', fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary-dark-blue)', transition: 'all 0.2s', textAlign: 'center' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary-blue)'; (e.currentTarget as HTMLElement).style.background = 'var(--primary-light-blue)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-light)'; (e.currentTarget as HTMLElement).style.background = 'white'; }}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ══ Step 4: Confirm data ════════════════════════════════════════ */}
            {step === 4 && (
              <div className="animate-slide-up">
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.25rem' }}>
                  Confirma tus datos
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
                  <span>Completa tu información para confirmar la sesión.</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsReturning(!isReturning);
                      setSubmitError(null);
                    }}
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: 'var(--primary-blue)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      textDecoration: 'underline',
                      marginLeft: '0.25rem'
                    }}
                  >
                    {isReturning ? '¿Ingresar todos mis datos?' : '¿Ya te has atendido aquí antes?'}
                  </button>
                </p>
                <form onSubmit={handleBook} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                  {/* Nombre + Apellido en grid */}
                  {!isReturning && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-dark)' }}>Nombre *</label>
                        <input
                          required={!isReturning}
                          type="text"
                          value={form.firstName}
                          onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))}
                          placeholder="Ej. Ana"
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-dark)' }}>Apellido *</label>
                        <input
                          required={!isReturning}
                          type="text"
                          value={form.lastName}
                          onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))}
                          placeholder="Ej. García"
                        />
                      </div>
                    </div>
                  )}

                  {/* Email */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-dark)' }}>Correo electrónico *</label>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={e => { setForm(p => ({ ...p, email: e.target.value })); setEmailError(null); }}
                      placeholder="tu@correo.com"
                      style={emailError ? { borderColor: '#ef4444', boxShadow: '0 0 0 3px rgba(239,68,68,0.1)' } : {}}
                    />
                    {emailError && (
                      <div style={{ padding: '0.85rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <p style={{ fontSize: '0.82rem', color: '#dc2626', fontWeight: 600, margin: 0 }}>
                          Este servicio es solo para tu primera sesión.
                        </p>
                        <p style={{ fontSize: '0.78rem', color: '#ef4444', margin: 0 }}>
                          Ya registramos una sesión inicial con este email. Por favor elige otro servicio para continuar.
                        </p>
                        <button
                          type="button"
                          onClick={() => { setStep(1); setSelectedService(null); setEmailError(null); }}
                          style={{ alignSelf: 'flex-start', fontSize: '0.78rem', fontWeight: 700, color: '#dc2626', textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                        >
                          Ver otros servicios
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Teléfono */}
                  {!isReturning && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-dark)' }}>Teléfono (WhatsApp) *</label>
                      <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid var(--border-light)', borderRadius: 'var(--radius-sm)', background: 'white', overflow: 'hidden' }}>
                        <span style={{ padding: '0.85rem 0.5rem 0.85rem 0.85rem', background: '#f8fafc', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.9rem', borderRight: '1.5px solid var(--border-light)' }}>+56 9</span>
                        <input
                          required={!isReturning}
                          type="tel"
                          value={form.phone}
                          onChange={e => setForm(p => ({ ...p, phone: e.target.value.replace(/[^0-9]/g, '') }))}
                          placeholder="1234 5678"
                          maxLength={8}
                          style={{ border: 'none', boxShadow: 'none', flex: 1, padding: '0.85rem', fontSize: '0.9rem', outline: 'none' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Fecha de nacimiento */}
                  {!isReturning && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-dark)' }}>
                        Fecha de nacimiento *
                        {form.birthDate && (() => {
                          const age = Math.floor((Date.now() - new Date(form.birthDate).getTime()) / (365.25 * 24 * 3600 * 1000));
                          return age >= 0 && age < 120
                            ? <span style={{ marginLeft: '0.5rem', fontWeight: 400, color: 'var(--primary-blue)', fontSize: '0.82rem' }}>{age} años</span>
                            : null;
                        })()}
                      </label>
                      <input
                        required={!isReturning}
                        type="date"
                        value={form.birthDate}
                        max={new Date().toISOString().split('T')[0]}
                        onChange={e => setForm(p => ({ ...p, birthDate: e.target.value }))}
                        style={{ colorScheme: 'light' }}
                      />
                    </div>
                  )}

                  {/* Motivo de consulta */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-dark)' }}>Motivo de consulta <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(opcional)</span></label>
                    <textarea
                      rows={2}
                      value={form.notes}
                      onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                      placeholder="Cuéntanos brevemente qué te trae a consulta..."
                      style={{ resize: 'none' }}
                    />
                  </div>

                  {submitError && (
                    <div style={{ padding: '0.85rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-sm)' }}>
                      <p style={{ fontSize: '0.85rem', color: '#dc2626', margin: 0 }}>{submitError}</p>
                    </div>
                  )}

                  <button type="submit" disabled={submitting} className="btn-primary" style={{ marginTop: '0.5rem', width: '100%', padding: '1rem', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: submitting ? 0.7 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}>
                    {submitting ? <><Loader2 size={18} /> Confirmando...</> : 'Confirmar Sesión →'}
                  </button>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    Recibirás una confirmación en tu correo. Sin pago anticipado.
                  </p>
                </form>
              </div>
            )}

            {/* ══ Step 5: Confirmed ═══════════════════════════════════════════ */}
            {step === 5 && (
              <div className="animate-slide-up" style={{ textAlign: 'center', paddingTop: '2rem' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                  <CheckCircle size={46} style={{ color: '#10b981' }} />
                </div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '0.75rem' }}>
                  ¡Sesión confirmada!
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.6, maxWidth: '380px', margin: '0 auto 2rem' }}>
                  Te enviamos una confirmación a <strong>{form.email}</strong> con todos los detalles.
                </p>
                <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.6rem', padding: '1.5rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', textAlign: 'left', marginBottom: '2rem', minWidth: '280px' }}>
                  {selectedService && <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-dark)' }}>{selectedService.title}</div>}
                  {selectedDate && <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}><Calendar size={14} />{selectedDate.label}</div>}
                  {selectedTime && <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}><Clock size={14} />{selectedTime} hrs</div>}
                </div>
                <a href="/" style={{ display: 'inline-block', fontSize: '0.88rem', color: 'var(--text-muted)', textDecoration: 'underline' }}>
                  Volver al inicio
                </a>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── Floating Mobile CTA ── */}
      <div className="mobile-cta animate-slide-up">
        <button onClick={() => { setMobileBookingOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="btn-primary" style={{ width: '100%', padding: '1.1rem', fontSize: '1.05rem', fontWeight: 700, borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(14,165,233,0.3)' }}>
          Agendar Sesión <ArrowRight size={18} />
        </button>
      </div>

    </div>
    </>
  );
}
