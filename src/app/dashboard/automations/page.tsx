"use client";

import React, { useState, useEffect } from 'react';
import {
  Video, MapPin, MessageSquare, Mail, Check,
  Save, CheckCircle2, Link as LinkIcon, Info, Loader2, AlertTriangle,
  Bell, CheckCheck
} from 'lucide-react';
import { supabase } from '@/utils/supabase';
import { createPortal } from 'react-dom';

type SessionType = 'online' | 'presencial';
type VideoPlatform = 'google_meet' | 'zoom';

export default function AutomationsPage() {
  const [sessionType, setSessionType] = useState<SessionType>('online');
  const [videoPlatform, setVideoPlatform] = useState<VideoPlatform>('google_meet');
  const [zoomLink, setZoomLink] = useState('');
  const [address, setAddress] = useState('');
  const [whatsappTemplate, setWhatsappTemplate] = useState(
    `Hola {{nombre}}.\n\nTe recuerdo que tienes sesión mañana:\n\nFecha: {{fecha}} a las {{hora}}\n{{detalle}}\n\nSaludos.`
  );
  const [whatsappRescheduleTemplate, setWhatsappRescheduleTemplate] = useState(
    `Hola {{nombre}}.\n\nTe escribo para reagendar nuestra sesión:\n\nNueva fecha: {{fecha}} a las {{hora}}\n{{detalle}}\n\nQuedo atento/a a cualquier duda.`
  );
  const [whatsappCancelTemplate, setWhatsappCancelTemplate] = useState(
    `Hola {{nombre}}.\n\nLamento informarte que debo cancelar nuestra sesión del {{fecha}}.\n\nPronto te contactaré para buscar una nueva fecha. Saludos.`
  );
  const [whatsappTab, setWhatsappTab] = useState<'reminder' | 'reschedule' | 'cancel'>('reminder');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [psychologistId, setPsychologistId] = useState<string | null>(null);
  const [originalSessionType, setOriginalSessionType] = useState<SessionType>('online');
  const [services, setServices] = useState<any[]>([]);
  const [showWarningModal, setShowWarningModal] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { return; }
      const { data: psych } = await supabase
        .from('psychologists')
        .select('id, video_meeting_type, video_meeting_url, session_type, whatsapp_reminder_template, whatsapp_reschedule_template, whatsapp_cancel_template')
        .eq('user_id', user.id)
        .single();
      if (psych) {
        setPsychologistId(psych.id);
        if (psych.video_meeting_type) {
          setVideoPlatform(psych.video_meeting_type === 'meet' ? 'google_meet' : psych.video_meeting_type as VideoPlatform);
        }
        if (psych.video_meeting_url) setZoomLink(psych.video_meeting_url);
        if (psych.session_type) {
          setSessionType(psych.session_type as SessionType);
          setOriginalSessionType(psych.session_type as SessionType);
        }
        if (psych.whatsapp_reminder_template !== null && psych.whatsapp_reminder_template !== undefined) {
          setWhatsappTemplate(psych.whatsapp_reminder_template);
        }
        if (psych.whatsapp_reschedule_template) setWhatsappRescheduleTemplate(psych.whatsapp_reschedule_template);
        if (psych.whatsapp_cancel_template) setWhatsappCancelTemplate(psych.whatsapp_cancel_template);
        
        const { data: svcs } = await supabase.from('event_types').select('id, mode').eq('psychologist_id', psych.id);
        setServices(svcs || []);
      }
    } catch (err) {
      console.error('Automations load error:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSaveClick = () => {
    if (sessionType !== originalSessionType) {
      const mismatchedServices = services.filter(s => s.mode !== sessionType);
      if (mismatchedServices.length > 0) {
        setShowWarningModal(true);
        return;
      }
    }
    executeSave();
  };

  const executeSave = async () => {
    if (!psychologistId) return;
    setSaving(true);
    setShowWarningModal(false);
    
    if (sessionType !== originalSessionType) {
      const mismatchedServices = services.filter(s => s.mode !== sessionType);
      if (mismatchedServices.length > 0) {
        await supabase.from('event_types').delete().in('id', mismatchedServices.map(s => s.id));
        setServices(prev => prev.filter(s => s.mode === sessionType));
      }
    }

    try {
      const { error } = await supabase.from('psychologists').update({
        video_meeting_type: videoPlatform === 'google_meet' ? 'meet' : 'zoom',
        video_meeting_url: zoomLink,
        session_type: sessionType,
        whatsapp_reminder_template: whatsappTemplate,
        whatsapp_reschedule_template: whatsappRescheduleTemplate,
        whatsapp_cancel_template: whatsappCancelTemplate,
      }).eq('id', psychologistId);

      if (error) {
        console.error('Detalle del error Supabase:', error.message, error.details, error.hint);
        throw error;
      }
      
      setOriginalSessionType(sessionType);
      setSaving(false); 
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      console.error('Error saving automations:', err);
      setSaving(false);
      alert(`Error al guardar: ${err.message || 'Intenta de nuevo'}`);
    }
  };

  const whatsappPreview = whatsappTemplate
    .replace('{{nombre}}', '[Nombre del paciente]')
    .replace('{{fecha}}', '[Fecha de la sesión]')
    .replace('{{hora}}', '[Hora]')
    .replace('{{modalidad}}', sessionType === 'online' ? 'Online' : 'Presencial')
    .replace('{{detalle}}', sessionType === 'presencial'
      ? `📍 ${address || '[Dirección del consultorio]'}`
      : `💻 ${zoomLink || `[Link de ${videoPlatform === 'google_meet' ? 'Google Meet' : 'Zoom'}]`}`
    );

  const whatsappReschedulePreview = whatsappRescheduleTemplate
    .replace('{{nombre}}', '[Nombre del paciente]')
    .replace('{{fecha}}', '[Nueva Fecha]')
    .replace('{{hora}}', '[Nueva Hora]')
    .replace('{{modalidad}}', sessionType === 'online' ? 'Online' : 'Presencial')
    .replace('{{detalle}}', sessionType === 'presencial'
      ? `📍 ${address || '[Dirección del consultorio]'}`
      : `💻 ${zoomLink || `[Link de ${videoPlatform === 'google_meet' ? 'Google Meet' : 'Zoom'}]`}`
    );

  const whatsappCancelPreview = whatsappCancelTemplate
    .replace('{{nombre}}', '[Nombre del paciente]')
    .replace('{{fecha}}', '[Fecha original]')
    .replace('{{modalidad}}', sessionType === 'online' ? 'Online' : 'Presencial');
    
  const testWhatsApp = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const baseUrl = isMobile ? 'https://wa.me' : 'https://web.whatsapp.com/send';
    const msg = whatsappTab === 'reminder' ? whatsappPreview : (whatsappTab === 'reschedule' ? whatsappReschedulePreview : whatsappCancelPreview);
    const url = isMobile 
      ? `${baseUrl}/?text=${encodeURIComponent(msg)}`
      : `${baseUrl}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const showOnline = sessionType === 'online';
  const showPresencial = sessionType === 'presencial';

  if (loading) {
    return (
      <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem', color: 'var(--text-muted)' }}>
        <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary-blue)' }} />
        <p style={{ fontWeight: 500 }}>Cargando configuración...</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .integrations-header {
          margin-bottom: 2rem;
        }
        .options-grid-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }
        .options-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .whatsapp-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          align-items: start;
        }

        @media (max-width: 1024px) {
          .whatsapp-layout {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .options-grid-3, .options-grid-2 {
            grid-template-columns: 1fr;
          }
          .integrations-header h1 {
            font-size: 1.75rem !important;
          }
          .premium-card {
            padding: 1.5rem !important;
          }
          .integrations-header {
            text-align: left;
          }
          .btn-primary {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
      <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Header */}
      <div className="integrations-header">
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.25rem' }}>
          Configuración de sesiones
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
          Define cómo trabajas y cómo contactas a tus pacientes
        </p>
      </div>

      {/* ── Sección 1: Tipo de sesión ── */}
      <div className="premium-card" style={{ padding: '2rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-dark)', margin: '0 0 0.25rem' }}>
            Tipo de sesiones
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            ¿Cómo atiendes a tus pacientes?
          </p>
        </div>

        <div className="options-grid-3">
          {([
            { value: 'online',    label: 'Online',           sub: 'Videollamada',           icon: <Video size={22} />,  color: '#0369a1', bg: '#e8f4fc', border: '#bae6fd' },
            { value: 'presencial',label: 'Presencial',        sub: 'En consultorio',          icon: <MapPin size={22} />, color: '#c2410c', bg: '#ffedd5', border: '#fed7aa' },
          ] as const).map(opt => (
            <button
              key={opt.value}
              onClick={() => setSessionType(opt.value)}
              style={{
                padding: '1.5rem 1.25rem',
                borderRadius: '16px',
                border: sessionType === opt.value ? `2px solid ${opt.color}` : '2px solid var(--border-light)',
                background: sessionType === opt.value ? opt.bg : 'var(--bg-main)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
                position: 'relative',
              }}
            >
              {sessionType === opt.value && (
                <div style={{ position: 'absolute', top: '0.85rem', right: '0.85rem', width: '20px', height: '20px', borderRadius: '50%', background: opt.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={12} color="white" />
                </div>
              )}
              <div style={{ color: sessionType === opt.value ? opt.color : 'var(--text-muted)', marginBottom: '0.65rem', display: 'flex', gap: '0.25rem' }}>
                {opt.icon}
              </div>
              <p style={{ fontWeight: 700, fontSize: '0.95rem', color: sessionType === opt.value ? opt.color : 'var(--text-dark)', margin: '0 0 0.2rem' }}>
                {opt.label}
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>{opt.sub}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Sección 2: Configuración según tipo ── */}
      {showOnline && (
        <div className="premium-card" style={{ padding: '2rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-dark)', margin: '0 0 0.25rem' }}>
              Plataforma de videollamada
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              El link se enviará automáticamente al paciente al confirmar la sesión
            </p>
          </div>

          <div className="options-grid-2" style={{ marginBottom: videoPlatform === 'zoom' ? '1.25rem' : 0 }}>
          {([
            {
              value: 'google_meet' as const,
              label: 'Google Meet',
              sub: 'Ingresa tu link personal de Google Meet',
              badge: 'Recomendado',
              badgeColor: '#0369a1',
              badgeBg: '#e8f4fc',
              activeColor: '#0369a1',
              activeBg: '#e8f4fc',
              activeBorder: '#bae6fd',
              icon: (
                <div style={{ width: '60px', height: '60px', borderRadius: '14px', background: 'white', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '6px', flexShrink: 0 }}>
                  <img src="/logos/logo-google-meet.jpg" alt="Google Meet" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
              ),
            },
            {
              value: 'zoom' as const,
              label: 'Zoom',
              sub: 'Ingresa tu link personal de Zoom',
              badge: null,
              activeColor: '#2563eb',
              activeBg: '#eff6ff',
              activeBorder: '#bfdbfe',
              icon: (
                <div style={{ width: '60px', height: '60px', borderRadius: '14px', background: 'white', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '6px', flexShrink: 0 }}>
                  <img src="/logos/unnamed.png" alt="Zoom" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
              ),
            },
          ]).map(opt => (
            <button
              key={opt.value}
              onClick={() => setVideoPlatform(opt.value)}
              style={{
                padding: '1.25rem',
                borderRadius: '14px',
                border: videoPlatform === opt.value ? `2px solid ${opt.activeBorder}` : '2px solid var(--border-light)',
                background: videoPlatform === opt.value ? opt.activeBg : 'var(--bg-main)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-start',
                position: 'relative',
              }}
            >
              {videoPlatform === opt.value && (
                <div style={{ position: 'absolute', top: '0.85rem', right: '0.85rem', width: '20px', height: '20px', borderRadius: '50%', background: opt.activeColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={12} color="white" />
                </div>
              )}
              {opt.icon}
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.95rem', color: videoPlatform === opt.value ? opt.activeColor : 'var(--text-dark)', margin: '0 0 0.2rem' }}>
                  {opt.label}
                </p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>{opt.sub}</p>
                {opt.badge && (
                  <span style={{ display: 'inline-block', marginTop: '0.5rem', padding: '0.2rem 0.6rem', background: opt.badgeBg, color: opt.badgeColor, borderRadius: '2rem', fontSize: '0.72rem', fontWeight: 700 }}>
                    {opt.badge}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1.25rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <LinkIcon size={14} /> Tu link de sala {videoPlatform === 'google_meet' ? 'Google Meet' : 'Zoom'}
          </label>
          <input
            type="url"
            value={zoomLink}
            onChange={e => setZoomLink(e.target.value)}
            placeholder={videoPlatform === 'google_meet' ? "https://meet.google.com/abc-defg-hij" : "https://zoom.us/j/123456789"}
            style={{ fontSize: '0.9rem' }}
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
            Este link se incluirá en todos los correos de confirmación y recordatorio de sesiones online.
          </p>
        </div>
      </div>
    )}

      {showPresencial && (
        <div className="premium-card" style={{ padding: '2rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-dark)', margin: '0 0 0.25rem' }}>
              Dirección del consultorio
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              Se enviará automáticamente al paciente al confirmar su sesión presencial
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <MapPin size={14} /> Dirección
            </label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Av. Providencia 1234, Oficina 501, Providencia"
              style={{ fontSize: '0.9rem' }}
            />
          </div>
        </div>
      )}

      {/* ── Sección 3: Recordatorios por WhatsApp ── */}
      <div className="premium-card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-dark)', margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={18} style={{ color: '#16a34a' }} /> Recordatorios por WhatsApp
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              Enviados desde tu WhatsApp personal — tú controlas cuándo y a quién
            </p>
          </div>
        </div>

        {/* How it works */}
        <div style={{ padding: '1rem 1.25rem', background: '#f0fdf4', borderRadius: '14px', border: '1px solid #bbf7d0', marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#15803d', margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            ¿Cómo funciona?
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[
              'Vas al detalle de una sesión y presionas "Enviar recordatorio"',
              'Se abre WhatsApp automáticamente con el mensaje ya escrito',
              'Solo tienes que presionar enviar — usas tu número personal',
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.83rem', color: '#166534' }}>
                <span style={{ fontWeight: 800, minWidth: '18px', color: '#16a34a' }}>{i + 1}.</span>
                {step}
              </div>
            ))}
          </div>
        </div>

        {/* WhatsApp Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: '#f1f5f9', padding: '0.35rem', borderRadius: '12px' }}>
          {[
            { id: 'reminder', label: 'Recordatorio', color: '#16a34a' },
            { id: 'reschedule', label: 'Reagendar', color: '#0ea5e9' },
            { id: 'cancel', label: 'Cancelar', color: '#ef4444' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setWhatsappTab(tab.id as any)}
              style={{
                flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none',
                fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                background: whatsappTab === tab.id ? 'white' : 'transparent',
                color: whatsappTab === tab.id ? tab.color : '#64748b',
                boxShadow: whatsappTab === tab.id ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Template editor */}
        <div className="whatsapp-layout">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-dark)', display: 'block', marginBottom: '0.3rem' }}>
                Plantilla: {whatsappTab === 'reminder' ? 'Recordatorio' : whatsappTab === 'reschedule' ? 'Reagendar' : 'Cancelar'}
              </label>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                {whatsappTab === 'reminder' ? 'Este mensaje se envía para recordar sesiones agendadas.' : whatsappTab === 'reschedule' ? 'Se envía cuando cambias la fecha o hora de una sesión.' : 'Se envía al cancelar una sesión.'}
              </p>
            </div>
            <textarea
              rows={8}
              value={whatsappTab === 'reminder' ? whatsappTemplate : whatsappTab === 'reschedule' ? whatsappRescheduleTemplate : whatsappCancelTemplate}
              onChange={e => {
                const v = e.target.value;
                if (whatsappTab === 'reminder') setWhatsappTemplate(v);
                else if (whatsappTab === 'reschedule') setWhatsappRescheduleTemplate(v);
                else setWhatsappCancelTemplate(v);
              }}
              style={{ 
                resize: 'none', 
                fontSize: '0.9rem', 
                lineHeight: 1.6, 
                padding: '1rem', 
                borderRadius: '12px', 
                border: '1.5px solid var(--border-light)',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--primary-blue)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
            />
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Info size={14} /> Haz clic para insertar:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {[
                  { tag: '{{nombre}}', label: 'Nombre' },
                  { tag: '{{fecha}}', label: 'Fecha' },
                  { tag: '{{hora}}', label: 'Hora' },
                  { tag: '{{modalidad}}', label: 'Modalidad' },
                  { tag: '{{detalle}}', label: 'Link/Dirección' }
                ].map(v => (
                  <button
                    key={v.tag}
                    onClick={() => {
                      const setter = whatsappTab === 'reminder' ? setWhatsappTemplate : (whatsappTab === 'reschedule' ? setWhatsappRescheduleTemplate : setWhatsappCancelTemplate);
                      setter(t => t + v.tag);
                    }}
                    style={{ padding: '0.35rem 0.7rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: 'var(--primary-blue)', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* WhatsApp preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-dark)' }}>
              Vista previa
            </label>
            <div style={{
              background: '#e5ddd5',
              borderRadius: '14px',
              padding: '1.25rem',
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c5b8b8' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
            }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ maxWidth: '90%', background: '#dcf8c6', borderRadius: '12px 12px 2px 12px', padding: '0.75rem 1rem', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                  <p style={{ fontSize: '0.83rem', color: '#1a1a1a', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {whatsappTab === 'reminder' ? whatsappPreview : (whatsappTab === 'reschedule' ? whatsappReschedulePreview : whatsappCancelPreview)}
                  </p>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.75rem' }}>
              <button 
                onClick={testWhatsApp}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.5rem', borderRadius: '8px', border: '1px solid #16a34a', background: 'white', color: '#15803d', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f0fdf4'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
              >
                <MessageSquare size={14} /> Probar
              </button>
              <button 
                onClick={handleSaveClick}
                disabled={saving}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.5rem', borderRadius: '8px', border: 'none', background: 'var(--primary-blue)', color: 'white', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', opacity: saving ? 0.7 : 1 }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} 
                {saved ? '¡Guardado!' : 'Guardar'}
              </button>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0.75rem 0 0', textAlign: 'center' }}>
              Haz clic en "Probar" para verlo en tu WhatsApp o "Guardar" para activar los cambios.
            </p>
          </div>
        </div>
      </div>

      {/* ── Sección 4: Correos automáticos ── */}
      <div className="premium-card" style={{ padding: '2rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-dark)', margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Mail size={18} style={{ color: '#0369a1' }} /> Correos automáticos
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            Teramy los envía automáticamente — tú no necesitas hacer nada
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '1.25rem',
            padding: '1.25rem',
            borderRadius: '14px',
            border: '1.5px solid var(--border-light)',
            background: 'var(--bg-white)',
          }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.35rem', flexShrink: 0 }}>
              <CheckCheck size={22} style={{ color: '#10b981' }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-dark)', margin: '0 0 0.2rem' }}>Confirmación de sesión</p>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                {sessionType === 'presencial'
                  ? 'Al agendar → el paciente recibe fecha, hora y dirección del consultorio'
                  : `Al agendar → el paciente recibe fecha, hora y el link de ${videoPlatform === 'google_meet' ? 'Google Meet' : 'Zoom'}`}
              </p>
            </div>
            <div style={{ padding: '0.25rem 0.7rem', borderRadius: '2rem', background: '#f0fdf4', color: '#15803d', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #bbf7d0' }}>
              Siempre activo
            </div>
          </div>
        </div>

        <div style={{ marginTop: '1.25rem', padding: '0.9rem 1.1rem', background: 'var(--bg-main)', borderRadius: '12px', display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
          <Info size={15} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: '0.05rem' }} />
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
            Los correos se envían desde <strong>contacto@teramy.cl</strong>. Próximamente podrás conectar tu propio correo para que lleguen desde tu dirección.
          </p>
        </div>
      </div>

      {/* Save button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: '1rem' }}>
        <button
          onClick={handleSaveClick}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.85rem 2rem', fontSize: '0.95rem', borderRadius: '14px' }}
        >
          {saved
            ? <><CheckCircle2 size={18} /> Configuración guardada</>
            : saving
              ? <><Loader2 size={18} /> Guardando...</>
              : <><Save size={18} /> Guardar configuración</>
          }
        </button>
      </div>
      {showWarningModal && typeof document !== 'undefined' && createPortal(
        <div onClick={() => setShowWarningModal(false)} style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at 60% 50%, rgba(15,23,42,0.52) 0%, rgba(2,8,23,0.32) 100%)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()} className="animate-slide-up" style={{ width: '100%', maxWidth: '440px', background: 'var(--bg-white)', borderRadius: '22px', boxShadow: '0 30px 80px rgba(0,0,0,0.18)', overflow: 'hidden', padding: '2rem', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
              <AlertTriangle size={32} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '0.75rem' }}>
              ¿Cambiar modalidad?
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Al cambiar a <strong>{sessionType === 'online' ? 'Online' : 'Presencial'}</strong>, se eliminarán permanentemente <strong>{services.filter(s => s.mode !== sessionType).length} servicio(s)</strong> que tenías configurado(s) como {sessionType === 'online' ? 'Presencial' : 'Online'}.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setShowWarningModal(false)} style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'transparent', color: 'var(--text-dark)', fontWeight: 600, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={executeSave} disabled={saving} style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', opacity: saving ? 0.7 : 1 }}>
                {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                Eliminar y Guardar
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
    </>
  );
}
