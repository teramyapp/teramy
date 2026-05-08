"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight, Check, Star, Users, ChevronDown,
  Calendar, FileText, BarChart2, Zap, Video, MessageSquare,
  Clock, Shield, UserCheck, Smartphone, Eye, Link2, Laptop
} from 'lucide-react';

const FEATURES = [
  {
    icon: <Calendar size={28} />,
    color: '#0ea5e9', bg: '#e8f4fc',
    title: 'Agenda Online 24/7',
    desc: 'Tu paciente elige horario desde tu enlace personalizado. Sin llamadas ni WhatsApp de coordinación.',
  },
  {
    icon: <FileText size={28} />,
    color: '#10b981', bg: '#ecfdf5',
    title: 'Notas de Sesión',
    desc: 'Notas privadas por sesión, organizadas en el historial de cada paciente. Accesibles en segundos.',
  },
  {
    icon: <Zap size={28} />,
    color: '#f59e0b', bg: '#fef9ee',
    title: 'Recordatorios en un clic',
    desc: 'Confirmaciones automáticas por correo y recordatorios por WhatsApp listos para enviar desde tu número.',
  },
  {
    icon: <BarChart2 size={28} />,
    color: '#7c3aed', bg: '#f5f3ff',
    title: 'Analíticas de tu consulta',
    desc: 'Ingresos, asistencia y carga semanal en un vistazo. Sin planillas ni cálculos manuales.',
  },
  {
    icon: <Video size={28} />,
    color: '#0369a1', bg: '#e0f2fe',
    title: 'Meet y Zoom integrados',
    desc: 'El enlace de videollamada se genera solo y llega al paciente en cada comunicación.',
  },
  {
    icon: <UserCheck size={28} />,
    color: '#ec4899', bg: '#fdf2f8',
    title: 'CRM de Pacientes',
    desc: 'Estado, sesiones y historial de cada paciente en un solo lugar.',
  },
];

const FAQS = [
  {
    q: '¿Para qué tipo de profesionales está pensado Teramy?',
    a: 'Para cualquier profesional que realiza sesiones de forma individual con pacientes o clientes: psicólogos, psicoterapeutas, terapeutas de pareja y familia, coaches de bienestar, psicopedagogos, nutricionistas, fonoaudiólogos y otros profesionales de la salud y el acompañamiento. Si tienes una agenda, pacientes y necesitas orden, Teramy es para ti.',
  },
  {
    q: '¿Necesito tarjeta de crédito para iniciar la prueba?',
    a: 'No. Tienes 30 días para evaluar Teramy de manera completamente gratuita, sin compromisos ni tarjeta. Activas tu cuenta en menos de 2 minutos.',
  },
  {
    q: '¿Los recordatorios y avisos de WhatsApp tienen algún costo adicional?',
    a: 'No. Teramy prepara automáticamente los mensajes de confirmación, recordatorio y cancelación con todos los datos de la sesión. Tú los envías con un clic desde tu propio número, sin costos adicionales ni integraciones complicadas. Si el paciente responde, la conversación continúa directamente en tu teléfono de forma natural.',
  },
  {
    q: '¿Mis pacientes deben descargar alguna aplicación?',
    a: 'No. Tus pacientes agendan desde cualquier navegador (celular o computador) a través de tu enlace personalizado. Sin fricción, sin apps, sin registros obligatorios.',
  },
  {
    q: '¿Puedo usarlo para atención online o presencial?',
    a: 'Sí. Puedes configurar tu consulta para atención online, con el enlace de Google Meet o Zoom generado automáticamente, o para atención presencial. Cada servicio tiene su propia modalidad, precio y duración, y tus pacientes lo ven todo antes de agendar.',
  },
  {
    q: '¿Puedo personalizar los mensajes?',
    a: 'Sí. Tienes plantillas editables para WhatsApp y correos. El sistema rellena automáticamente los datos (nombre, fecha, hora, link de sesión) para que tú solo tengas que confirmar y enviar.',
  },
  {
    q: '¿Qué pasa con mis datos si decido cancelar?',
    a: 'Tus datos son tuyos. Si decides cancelar, puedes exportar el historial de tus pacientes y sesiones antes de cerrar tu cuenta. No retenemos tu información ni la usamos para ningún otro fin. Cancelar es fácil y sin penalizaciones.',
  },
  {
    q: '¿Funciona bien desde el celular?',
    a: 'Completamente. Teramy está optimizado para usarse desde el teléfono. Puedes revisar tu agenda del día, ver los datos de un paciente, escribir notas de sesión y enviar recordatorios de WhatsApp, todo sin necesidad de abrir el computador.',
  },
];


const TESTIMONIALS = [
  {
    quote: 'Desde que uso Teramy eliminé las inasistencias. Los recordatorios los envío por WhatsApp con un clic y mis pacientes agradecen que el contacto sea así de cercano y humano.',
    name: 'Carolina V.', role: 'Psicóloga Clínica · Consulta independiente', initials: 'CV', color: '#0ea5e9', bg: '#e8f4fc',
  },
  {
    quote: 'Lo que más me cambió la vida fue el historial de sesiones integrado. Antes perdía tiempo buscando notas en libretas. Ahora en dos clics tengo todo lo que pasó en cada sesión.',
    name: 'Sara P.', role: 'Terapeuta de Pareja · Centro de Bienestar', initials: 'SP', color: '#10b981', bg: '#ecfdf5',
  },
  {
    quote: 'Por fin una plataforma que entiende el flujo real de una consulta: agenda, notas, analíticas y recordatorios. Todo en un solo lugar, y sin complicaciones técnicas.',
    name: 'Andrés M.', role: 'Terapeuta Sistémico · Atención online', initials: 'AM', color: '#7c3aed', bg: '#f5f3ff',
  },
];

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [contactStatus, setContactStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  async function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault();
    setContactStatus('sending');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      });
      if (res.ok) {
        setContactStatus('sent');
        setContactForm({ name: '', email: '', message: '' });
      } else {
        setContactStatus('error');
      }
    } catch {
      setContactStatus('error');
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'Outfit, sans-serif' }}>

      {/* ── Navbar ─────────────────────────────────────────── */}
      <header style={{
        padding: isMobile ? '1rem 1.5rem' : '1.25rem 5rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 100,
        borderBottom: '1px solid var(--border-light)',
        boxShadow: '0 1px 0 0 rgba(0,0,0,0.04)',
        flexWrap: 'wrap', gap: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <img src="/fondo%20blanco.png" alt="Teramy Logo" style={{ width: '38px', height: '38px', mixBlendMode: 'multiply', objectFit: 'contain' }} />
          <div style={{ fontSize: '1.55rem', fontWeight: 800, background: 'var(--primary-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}>
            Teramy
          </div>
        </div>

        {isMobile ? (
          <button
            onClick={() => setMenuOpen(o => !o)}
            style={{ background: 'none', border: 'none', padding: '0.5rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '5px' }}
            aria-label="Menú"
          >
            {menuOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            )}
          </button>
        ) : (
          <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            {[['#features', 'Características'], ['#booking-flow', 'Cómo se agenda'], ['#pricing', 'Precios'], ['#faq', 'Preguntas'], ['#contacto', 'Contacto']].map(([href, label]) => (
              <a key={href} href={href} style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.95rem', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-dark)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                {label}
              </a>
            ))}
            <div style={{ display: 'flex', gap: '0.75rem', marginLeft: '0.5rem', alignItems: 'center' }}>
              <Link href="/login" style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.92rem', padding: '0.5rem 1rem' }}>
                Ingresar
              </Link>
              <Link href="/register" className="btn-primary" style={{ padding: '0.6rem 1.4rem', fontSize: '0.92rem' }}>
                Registrarme
              </Link>
            </div>
          </nav>
        )}

        {isMobile && menuOpen && (
          <div style={{ width: '100%', borderTop: '1px solid var(--border-light)', paddingTop: '1rem', paddingBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0' }}>
            {[['#features', 'Características'], ['#booking-flow', 'Cómo se agenda'], ['#pricing', 'Precios'], ['#faq', 'Preguntas'], ['#contacto', 'Contacto']].map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)}
                style={{ padding: '0.85rem 0.25rem', color: 'var(--text-dark)', fontWeight: 500, fontSize: '1rem', borderBottom: '1px solid var(--border-light)', display: 'block' }}>
                {label}
              </a>
            ))}
            <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '1rem' }}>
              <Link href="/login" style={{ flex: 1, textAlign: 'center', padding: '0.75rem', border: '1.5px solid var(--border-light)', borderRadius: '12px', fontWeight: 600, color: 'var(--text-dark)', fontSize: '0.95rem' }}>
                Ingresar
              </Link>
              <Link href="/register" className="btn-primary" style={{ flex: 1, textAlign: 'center', padding: '0.75rem', fontSize: '0.95rem', fontWeight: 700 }}>
                Registrarme
              </Link>
            </div>
          </div>
        )}
      </header>

      <main style={{ flex: 1 }}>

        {/* ── Hero ────────────────────────────────────────── */}
        <section style={{ padding: isMobile ? '4rem 1.5rem 5rem' : '7rem 5rem 8rem', background: isMobile ? 'linear-gradient(180deg, #f0f7ff 0%, #fafcff 80%, #ffffff 100%)' : 'linear-gradient(160deg, #f0f7ff 0%, #fafcff 60%, #f0fdf4 100%)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '5%', left: '30%', width: '500px', height: '500px', background: 'rgba(14,165,233,0.12)', filter: 'blur(120px)', borderRadius: '50%', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '0', right: '10%', width: '400px', height: '400px', background: 'rgba(16,185,129,0.1)', filter: 'blur(100px)', borderRadius: '50%', pointerEvents: 'none' }} />

          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: isMobile ? '1rem' : '3rem', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>

            {/* Left: copy */}
            <div className="animate-slide-up" style={{ flex: 1, minWidth: isMobile ? '0' : '420px', width: '100%' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.1rem', background: 'var(--primary-light-blue)', borderRadius: '2rem', fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary-dark-blue)', letterSpacing: '0.04em', marginBottom: '1.75rem', textTransform: 'uppercase' }}>
                <Zap size={14} style={{ color: 'var(--primary-blue)' }} /> Para terapeutas y profesionales de la salud
              </div>

              <h1 style={{ fontSize: isMobile ? '2.5rem' : '4rem', fontWeight: 900, color: 'var(--text-dark)', lineHeight: 1.08, letterSpacing: '-0.03em', marginBottom: '1.5rem' }}>
                Tu consulta,<br />
                <span style={{ background: 'var(--primary-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  organizada de verdad.
                </span>
              </h1>

              <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', lineHeight: 1.65, maxWidth: '520px', marginBottom: isMobile ? '0.5rem' : '2.5rem' }}>
                Dedica tu energía a lo que importa: acompañar a tus pacientes. Teramy se encarga de la agenda, los recordatorios y el orden, para que ganes tiempo, tranquilidad y control de tu consulta.
              </p>

              {!isMobile && (
                <>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
                    <Link href="/register" className="btn-primary" style={{ padding: '1.1rem 2.5rem', fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      Probar gratis 30 días <ArrowRight size={19} />
                    </Link>
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    {['Configuras en 2 minutos', 'Cancela cuando quieras'].map(t => (
                      <span key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        <Check size={15} style={{ color: 'var(--accent-green)' }} /> {t}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Right: dual-device mockup (desktop) / phone mockup (mobile) */}
            {isMobile ? (
              <div className="animate-slide-up" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '0', marginTop: '0.5rem', position: 'relative', paddingBottom: '1rem' }}>

                {/* Mini laptop card — peeking from left */}
                <div style={{ width: '155px', flexShrink: 0, marginRight: '-18px', marginBottom: '20px', zIndex: 1 }}>
                  <div style={{ background: 'white', borderRadius: '10px 10px 0 0', boxShadow: '0 12px 32px rgba(0,0,0,0.15)', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                    {/* Window chrome */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '0.4rem 0.6rem', background: '#f8fafc', borderBottom: '1px solid var(--border-light)' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fc625d' }} />
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fdbc40' }} />
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#35cd4b' }} />
                      <div style={{ flex: 1, marginLeft: '4px', height: '12px', background: '#eaecef', borderRadius: '4px' }} />
                    </div>
                    {/* Dashboard content */}
                    <div style={{ display: 'flex', height: '160px' }}>
                      {/* Sidebar */}
                      <div style={{ width: '48px', background: '#f8fafc', borderRight: '1px solid var(--border-light)', padding: '0.5rem 0.3rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ fontSize: '0.45rem', fontWeight: 800, background: 'var(--primary-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.25rem', paddingLeft: '0.2rem' }}>Teramy</div>
                        {['Dashboard', 'Pacientes', 'Sesiones', 'Analytics'].map((item, i) => (
                          <div key={item} style={{ padding: '0.25rem 0.3rem', borderRadius: '4px', background: i === 0 ? '#e8f4fc' : 'transparent', color: i === 0 ? '#0369a1' : '#94a3b8', fontSize: '0.38rem', fontWeight: i === 0 ? 700 : 500 }}>{item}</div>
                        ))}
                      </div>
                      {/* Main */}
                      <div style={{ flex: 1, padding: '0.5rem 0.4rem', background: '#f4f6f9' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem', marginBottom: '0.4rem' }}>
                          {[{ l: 'Sesiones', v: '3', c: '#0ea5e9' }, { l: 'Ingresos', v: '$125K', c: '#10b981' }].map(m => (
                            <div key={m.l} style={{ background: 'white', borderRadius: '5px', padding: '0.3rem', border: '1px solid #e2e8f0' }}>
                              <p style={{ fontSize: '0.35rem', color: '#94a3b8', margin: '0 0 0.1rem' }}>{m.l}</p>
                              <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>{m.v}</p>
                            </div>
                          ))}
                        </div>
                        {[
                          { time: '10:00', name: 'Carlos R.', color: '#0ea5e9', next: true },
                          { time: '12:30', name: 'Ana S.', color: '#f59e0b', next: false },
                          { time: '16:00', name: 'Miguel T.', color: '#10b981', next: false },
                        ].map((s, i) => (
                          <div key={i} style={{ padding: '0.25rem 0.3rem', display: 'flex', gap: '0.25rem', alignItems: 'center', background: s.next ? '#f0f9ff' : 'white', borderRadius: '4px', marginBottom: '0.2rem', border: `1px solid ${s.next ? '#bae6fd' : '#f1f5f9'}` }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: `${s.color}20`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.3rem', fontWeight: 700, flexShrink: 0 }}>
                              {s.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <p style={{ fontSize: '0.38rem', fontWeight: 600, color: '#0f172a', margin: 0, flex: 1 }}>{s.name}</p>
                            <p style={{ fontSize: '0.38rem', fontWeight: 700, color: s.next ? '#0ea5e9' : '#94a3b8', margin: 0 }}>{s.time}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Laptop base */}
                  <div style={{ height: '8px', background: 'linear-gradient(180deg,#e2e8f0,#cbd5e1)', borderRadius: '0 0 3px 3px' }} />
                  <div style={{ height: '3px', background: '#94a3b8', borderRadius: '0 0 5px 5px', width: '110%', marginLeft: '-5%' }} />
                </div>

                {/* Phone — main */}
                <div style={{ zIndex: 2, flexShrink: 0 }}>
                  <div style={{ background: '#1a1a2e', borderRadius: '24px', padding: '7px', boxShadow: '0 28px 56px rgba(0,0,0,0.4)', border: '1px solid #2d2d4a', width: '140px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '3px' }}>
                      <div style={{ width: '36px', height: '5px', background: '#2d2d4a', borderRadius: '3px' }} />
                    </div>
                    <div style={{ background: '#f4f6f9', borderRadius: '17px', overflow: 'hidden' }}>
                      <div style={{ background: 'white', padding: '0.6rem 0.7rem 0.4rem', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontWeight: 800, fontSize: '0.7rem', background: 'var(--primary-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Teramy</div>
                          <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#e8f4fc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.45rem', fontWeight: 700, color: '#0ea5e9' }}>LM</div>
                        </div>
                        <p style={{ fontSize: '0.48rem', color: '#94a3b8', fontWeight: 600, margin: '0.15rem 0 0' }}>HOY · 3 SESIONES</p>
                      </div>
                      <div style={{ padding: '0.5rem 0.6rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem', marginBottom: '0.1rem' }}>
                          {[{ l: 'Sesiones', v: '3', c: '#0ea5e9', bg: '#e8f4fc' }, { l: 'Ingresos', v: '$135K', c: '#10b981', bg: '#ecfdf5' }].map(m => (
                            <div key={m.l} style={{ background: 'white', borderRadius: '7px', padding: '0.35rem 0.4rem', border: '1px solid #e2e8f0' }}>
                              <p style={{ fontSize: '0.42rem', color: '#94a3b8', margin: '0 0 0.1rem' }}>{m.l}</p>
                              <p style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>{m.v}</p>
                            </div>
                          ))}
                        </div>
                        {[
                          { time: '10:00', name: 'Carlos R.', color: '#0ea5e9', next: true },
                          { time: '12:30', name: 'Ana S.', color: '#f59e0b', next: false },
                          { time: '16:00', name: 'Miguel T.', color: '#10b981', next: false },
                        ].map((s, i) => (
                          <div key={i} style={{ background: s.next ? '#f0f9ff' : 'white', borderRadius: '7px', padding: '0.35rem 0.45rem', border: `1px solid ${s.next ? '#bae6fd' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: `${s.color}20`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.4rem', fontWeight: 800, flexShrink: 0 }}>
                              {s.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontSize: '0.52rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>{s.name}</p>
                              <p style={{ fontSize: '0.45rem', color: '#94a3b8', margin: 0 }}>{s.time} hrs</p>
                            </div>
                            {s.next && <div style={{ fontSize: '0.38rem', fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '0.08rem 0.25rem', borderRadius: '3px' }}>Próxima</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4px' }}>
                      <div style={{ width: '30px', height: '3px', background: '#3d3d5c', borderRadius: '2px' }} />
                    </div>
                  </div>
                </div>

                {/* Mobile CTA and Badges (Moved here) */}
                <div className="animate-slide-up" style={{ width: '100%', marginTop: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                    <Link href="/register" className="btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '0.88rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      Probar gratis 30 días <ArrowRight size={16} />
                    </Link>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {['Configuras en 2 minutos', 'Cancela cuando quieras'].map(t => (
                      <span key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        <Check size={14} style={{ color: 'var(--accent-green)' }} /> {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : <div className="animate-slide-up" style={{ flex: '1.2', minWidth: '500px', position: 'relative', display: 'flex', alignItems: 'flex-end', gap: '0' }}>

              {/* Glow backdrop */}
              <div style={{ position: 'absolute', inset: '-20px', background: 'var(--primary-gradient)', opacity: 0.04, borderRadius: '32px', transform: 'rotate(1.5deg)', pointerEvents: 'none' }} />

              {/* ── Laptop mockup ── */}
              <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
                {/* Screen */}
                <div style={{ background: 'white', borderRadius: '16px 16px 0 0', boxShadow: '0 24px 60px -12px rgba(0,0,0,0.22)', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                  {/* Window chrome */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '0.7rem 1rem', background: '#f8fafc', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#fc625d' }} />
                    <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#fdbc40' }} />
                    <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#35cd4b' }} />
                    <div style={{ flex: 1, marginLeft: '0.6rem', height: '18px', background: '#eaecef', borderRadius: '5px' }} />
                  </div>
                  {/* Content */}
                  <div style={{ display: 'flex', height: '300px' }}>
                    {/* Sidebar */}
                    <div style={{ width: '130px', background: '#f8fafc', borderRight: '1px solid var(--border-light)', padding: '0.85rem 0.6rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <div style={{ padding: '0.4rem 0.6rem', fontWeight: 800, fontSize: '0.9rem', background: 'var(--primary-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.4rem' }}>Teramy</div>
                      {[
                        { label: 'Dashboard', active: true },
                        { label: 'Pacientes', active: false },
                        { label: 'Sesiones', active: false },
                        { label: 'Analíticas', active: false },
                        { label: 'Automatizac.', active: false },
                      ].map(item => (
                        <div key={item.label} style={{ padding: '0.45rem 0.55rem', borderRadius: '7px', background: item.active ? 'var(--primary-light-blue)' : 'transparent', color: item.active ? 'var(--primary-dark-blue)' : '#94a3b8', fontSize: '0.65rem', fontWeight: item.active ? 700 : 500 }}>
                          {item.label}
                        </div>
                      ))}
                    </div>
                    {/* Main area */}
                    <div style={{ flex: 1, padding: '1rem', background: '#f4f6f9', overflowY: 'hidden' }}>
                      <p style={{ fontSize: '0.62rem', color: '#94a3b8', marginBottom: '0.6rem', fontWeight: 600 }}>MIÉ 9 ABR · 3 SESIONES HOY</p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.4rem', marginBottom: '0.6rem' }}>
                        {[
                          { label: 'Sesiones hoy', val: '3', color: '#0ea5e9' },
                          { label: 'Pacientes', val: '48', color: '#10b981' },
                          { label: 'Ingresos', val: '$125K', color: '#d97706' },
                          { label: 'Hrs libres', val: '7', color: '#7c3aed' },
                        ].map(m => (
                          <div key={m.label} style={{ background: 'white', borderRadius: '8px', padding: '0.5rem', border: '1px solid #e2e8f0' }}>
                            <p style={{ fontSize: '0.52rem', color: '#94a3b8', marginBottom: '0.2rem', fontWeight: 500 }}>{m.label}</p>
                            <p style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>{m.val}</p>
                          </div>
                        ))}
                      </div>
                      <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                        {[
                          { time: '10:00', name: 'Carlos Ramírez', type: 'Psicoterapia', color: '#0ea5e9', next: true },
                          { time: '12:30', name: 'Ana Silva', type: 'Terapia pareja', color: '#f59e0b', next: false },
                          { time: '16:00', name: 'Miguel Torres', type: 'Evaluación', color: '#10b981', next: false },
                        ].map((s, i) => (
                          <div key={i} style={{ padding: '0.45rem 0.7rem', display: 'flex', gap: '0.5rem', alignItems: 'center', borderBottom: i < 2 ? '1px solid #f1f5f9' : 'none', background: s.next ? '#f0f9ff' : 'white' }}>
                            <span style={{ fontSize: '0.6rem', fontWeight: 700, color: s.next ? '#0ea5e9' : '#64748b', width: '30px', flexShrink: 0 }}>{s.time}</span>
                            <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: `${s.color}20`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.48rem', fontWeight: 700, flexShrink: 0 }}>
                              {s.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontSize: '0.6rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>{s.name}</p>
                              <p style={{ fontSize: '0.52rem', color: '#94a3b8', margin: 0 }}>{s.type}</p>
                            </div>
                            <div style={{ background: s.next ? '#dcfce7' : '#f1f5f9', color: s.next ? '#15803d' : '#94a3b8', padding: '0.12rem 0.35rem', borderRadius: '4px', fontSize: '0.5rem', fontWeight: 700 }}>
                              {s.next ? 'Próxima' : 'Hoy'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Laptop base */}
                <div style={{ height: '12px', background: 'linear-gradient(180deg, #e2e8f0 0%, #cbd5e1 100%)', borderRadius: '0 0 4px 4px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }} />
                <div style={{ height: '5px', background: '#94a3b8', borderRadius: '0 0 8px 8px', width: '110%', marginLeft: '-5%', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
                {/* Label */}
                <div style={{ position: 'absolute', bottom: '-2.2rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Laptop size={14} /> Desde tu computador
                  </span>
                </div>
              </div>

              {/* ── Phone mockup ── */}
              <div style={{ width: '148px', flexShrink: 0, marginLeft: '-28px', marginBottom: '17px', position: 'relative', zIndex: 2 }}>
                {/* Phone frame */}
                <div style={{ background: '#1a1a2e', borderRadius: '28px', padding: '8px', boxShadow: '0 28px 60px -8px rgba(0,0,0,0.45)', border: '1px solid #2d2d4a' }}>
                  {/* Notch */}
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>
                    <div style={{ width: '44px', height: '6px', background: '#2d2d4a', borderRadius: '3px' }} />
                  </div>
                  {/* Screen */}
                  <div style={{ background: '#f4f6f9', borderRadius: '20px', overflow: 'hidden', height: '280px' }}>
                    {/* Mobile top bar */}
                    <div style={{ background: 'white', padding: '0.7rem 0.8rem 0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.75rem', background: 'var(--primary-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Teramy</div>
                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#e8f4fc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.52rem', fontWeight: 700, color: '#0ea5e9' }}>LM</div>
                      </div>
                      <p style={{ fontSize: '0.55rem', color: '#94a3b8', fontWeight: 600, margin: '0.25rem 0 0' }}>MIÉ 9 ABR</p>
                    </div>
                    {/* Mobile content */}
                    <div style={{ padding: '0.6rem 0.65rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', overflowY: 'hidden' }}>
                      {/* Quick stats row */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
                        {[
                          { label: 'Sesiones hoy', val: '3', color: '#0ea5e9', bg: '#e8f4fc' },
                          { label: 'Ingresos hoy', val: '$135K', color: '#10b981', bg: '#ecfdf5' },
                        ].map(m => (
                          <div key={m.label} style={{ background: 'white', borderRadius: '8px', padding: '0.45rem 0.5rem', border: '1px solid #e2e8f0' }}>
                            <p style={{ fontSize: '0.48rem', color: '#94a3b8', margin: '0 0 0.15rem', fontWeight: 500 }}>{m.label}</p>
                            <p style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>{m.val}</p>
                          </div>
                        ))}
                      </div>
                      {/* Session cards */}
                      <p style={{ fontSize: '0.52rem', fontWeight: 700, color: '#64748b', margin: '0.1rem 0 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Próximas sesiones</p>
                      {[
                        { time: '10:00', name: 'Carlos R.', type: 'Psicoterapia', color: '#0ea5e9', next: true },
                        { time: '12:30', name: 'Ana S.', type: 'Terapia pareja', color: '#f59e0b', next: false },
                        { time: '16:00', name: 'Miguel T.', type: 'Evaluación', color: '#10b981', next: false },
                      ].map((s, i) => (
                        <div key={i} style={{ background: s.next ? '#f0f9ff' : 'white', borderRadius: '8px', padding: '0.45rem 0.55rem', border: `1px solid ${s.next ? '#bae6fd' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: `${s.color}20`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.48rem', fontWeight: 800, flexShrink: 0 }}>
                            {s.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '0.6rem', fontWeight: 700, color: '#0f172a', margin: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{s.name}</p>
                            <p style={{ fontSize: '0.52rem', color: '#94a3b8', margin: 0 }}>{s.type}</p>
                          </div>
                          <div style={{ flexShrink: 0, textAlign: 'right' }}>
                            <p style={{ fontSize: '0.6rem', fontWeight: 800, color: s.next ? '#0ea5e9' : '#64748b', margin: 0 }}>{s.time}</p>
                            {s.next && <div style={{ fontSize: '0.45rem', fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '0.08rem 0.28rem', borderRadius: '3px', marginTop: '0.1rem' }}>Próxima</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Home indicator */}
                  <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '5px' }}>
                    <div style={{ width: '36px', height: '4px', background: '#3d3d5c', borderRadius: '2px' }} />
                  </div>
                </div>
                {/* Label */}
                <div style={{ position: 'absolute', bottom: '-2.2rem', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Smartphone size={14} /> Desde tu celular
                  </span>
                </div>
              </div>

            </div>}
          </div>
        </section>


        {/* ── Features Grid ───────────────────────────────── */}
        <section id="features" style={{ padding: isMobile ? '4rem 1.5rem' : '7rem 5rem', background: 'var(--bg-main)' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: isMobile ? '2.5rem' : '4.5rem' }}>
              <span style={{ display: 'inline-block', padding: '0.4rem 1rem', background: 'var(--primary-light-blue)', color: 'var(--primary-dark-blue)', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1.25rem' }}>
                Características
              </span>
              <h2 style={{ fontSize: isMobile ? '2rem' : '2.8rem', fontWeight: 800, color: 'var(--text-dark)', lineHeight: 1.15, marginBottom: '1rem' }}>
                Todo lo que necesitas para gestionar tu consulta.<br />
                <span style={{ color: 'var(--primary-blue)' }}>Sin complicaciones innecesarias.</span>
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '580px', margin: '0 auto', lineHeight: 1.6 }}>
                Teramy fue diseñado para profesionales que realizan sesiones. Una plataforma que entiende el flujo real de tu consulta.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '1rem' }}>
              {FEATURES.map((f, i) => (
                <div key={i} className="premium-card" style={{ padding: '2rem', background: 'white' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: f.bg, color: f.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                    {f.icon}
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.6rem' }}>{f.title}</h3>
                  <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, fontSize: '0.92rem' }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Time Savings ────────────────────────────────── */}
        <section style={{ padding: isMobile ? '4rem 1.5rem' : '7rem 5rem', background: 'linear-gradient(160deg, #0f172a 0%, #0c1a2e 100%)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '10%', left: '5%', width: '400px', height: '400px', background: 'rgba(14,165,233,0.1)', filter: 'blur(120px)', borderRadius: '50%', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '5%', right: '5%', width: '350px', height: '350px', background: 'rgba(16,185,129,0.08)', filter: 'blur(100px)', borderRadius: '50%', pointerEvents: 'none' }} />
          <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
            <div style={{ textAlign: 'center', marginBottom: '4.5rem' }}>
              <span style={{ display: 'inline-block', padding: '0.4rem 1rem', background: 'rgba(14,165,233,0.15)', color: '#38bdf8', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1.25rem', border: '1px solid rgba(14,165,233,0.25)' }}>
                Tu tiempo vale
              </span>
              <h2 style={{ fontSize: isMobile ? '2rem' : '2.8rem', fontWeight: 900, color: 'white', lineHeight: 1.12, marginBottom: '1rem', letterSpacing: '-0.02em' }}>
                Ahorra más de 10 horas<br />
                <span style={{ background: 'var(--primary-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  semanales en tu consulta.
                </span>
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '1.1rem', maxWidth: '560px', margin: '0 auto', lineHeight: 1.65 }}>
                Cada semana pierdes tiempo valioso en tareas administrativas que Teramy puede hacer por ti.
              </p>
            </div>

            {/* 4 time-loss cards */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
              {[
                { icon: <MessageSquare size={22} />, hours: '3–4 hrs', label: 'Coordinando horarios por WhatsApp y llamadas telefónicas', color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)', border: 'rgba(14,165,233,0.2)' },
                { icon: <Clock size={22} />, hours: '2–3 hrs', label: 'Enviando recordatorios manualmente a cada paciente', color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)' },
                { icon: <FileText size={22} />, hours: '1–2 hrs', label: 'Buscando notas en libretas, archivos y carpetas', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' },
                { icon: <BarChart2 size={22} />, hours: '1 hr', label: 'Revisando ingresos en hojas de cálculo o cuadernos', color: '#7c3aed', bg: 'rgba(124,58,237,0.1)', border: 'rgba(124,58,237,0.2)' },
              ].map((item, i) => (
                <div key={i} style={{ background: item.bg, border: `1px solid ${item.border}`, borderRadius: '16px', padding: '1.75rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${item.color}20`, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.icon}
                  </div>
                  <div>
                    <p style={{ fontSize: '1.8rem', fontWeight: 900, color: 'white', margin: '0 0 0.3rem', letterSpacing: '-0.03em' }}>{item.hours}</p>
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>{item.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Result banner */}
            <div style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.15) 0%, rgba(16,185,129,0.12) 100%)', border: '1px solid rgba(14,165,233,0.25)', borderRadius: '20px', padding: isMobile ? '1.75rem 1.5rem' : '2.5rem 3rem', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 8px 24px rgba(14,165,233,0.4)' }}>
                  <Zap size={28} style={{ color: 'white' }} />
                </div>
                <div>
                  <p style={{ fontSize: '2.4rem', fontWeight: 900, color: 'white', margin: 0, letterSpacing: '-0.03em' }}>+10 horas <span style={{ background: 'var(--primary-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>recuperadas</span></p>
                  <p style={{ fontSize: '1rem', color: '#94a3b8', margin: 0 }}>por semana. Tiempo para más pacientes, más descanso, o simplemente para desconectar.</p>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: '1rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '1rem' }}>Ese tiempo es tuyo.<br />Teramy te lo devuelve.</p>
                <Link href="/register" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.9rem 2rem', fontSize: '0.97rem', fontWeight: 700 }}>
                  Probar gratis <ArrowRight size={17} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── CRM Feature Spotlight ───────────────────────── */}
        <section style={{ padding: isMobile ? '4rem 1.5rem' : '7rem 5rem', background: 'linear-gradient(160deg, #f0f7ff, #ffffff)' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '3rem' : '6rem', alignItems: 'center' }}>

            {/* Left: visual */}
            <div style={{ position: 'relative' }}>
              <div style={{ background: 'white', borderRadius: '18px', boxShadow: '0 20px 60px rgba(0,0,0,0.1)', border: '1px solid var(--border-light)', overflow: 'hidden' }}>
                {/* Patient header */}
                <div style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', borderBottom: '1px solid var(--border-light)', background: '#fafcff' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 700, flexShrink: 0 }}>MG</div>
                  <div>
                    <p style={{ fontWeight: 800, color: '#0f172a', margin: 0, fontSize: '1rem' }}>María Gómez</p>
                    <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.2rem' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.55rem', background: '#ecfdf5', color: '#059669', borderRadius: '2rem' }}>● En proceso</span>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Sesión 6/16</span>
                    </div>
                  </div>
                  <div style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#0ea5e9', fontWeight: 700 }}>Próx: Jue 10 Abr</div>
                </div>

                {/* Timeline */}
                <div style={{ padding: '1.25rem' }}>
                  {[
                    { n: 6, date: 'Mié 9 Abr', topic: 'Técnicas de respiración', statusColor: '#10b981' },
                    { n: 5, date: 'Mié 26 Mar', topic: 'Reestructuración cognitiva', statusColor: '#f59e0b' },
                    { n: 4, date: 'Mié 12 Mar', topic: 'Análisis de estrés laboral', statusColor: '#ef4444' },
                  ].map((sess, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start', paddingBottom: i < 2 ? '1rem' : 0, marginBottom: i < 2 ? '1rem' : 0, borderBottom: i < 2 ? '1px solid #f1f5f9' : 'none' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: sess.statusColor, marginTop: '0.3rem', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Sesión #{sess.n}</span>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{sess.date}</span>
                        </div>
                        <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a', margin: '0.15rem 0 0' }}>{sess.topic}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating badge */}
              <div style={{ position: 'absolute', top: '-16px', right: '-20px', background: 'var(--primary-gradient)', borderRadius: '14px', padding: '0.75rem 1.1rem', boxShadow: '0 10px 30px rgba(14,165,233,0.35)', color: 'white', fontSize: '0.8rem', fontWeight: 700, lineHeight: 1.4, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={18} />
                <div>Notas de sesión<br />en 30 segundos</div>
              </div>
            </div>

            {/* Right: copy */}
            <div>
              <span style={{ display: 'inline-block', padding: '0.4rem 1rem', background: '#ecfdf5', color: '#15803d', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1.5rem' }}>
                Notas de Sesión
              </span>
              <h2 style={{ fontSize: isMobile ? '1.75rem' : '2.4rem', fontWeight: 800, color: 'var(--text-dark)', lineHeight: 1.2, marginBottom: '1.25rem' }}>
                Olvídate de las libretas. El historial de cada paciente, siempre a mano.
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.7, marginBottom: '2rem' }}>
                Desde el dashboard, agrega notas privadas de cada sesión con un clic. Revisa el historial ordenado del paciente y cuántas sesiones llevan. Todo sin salir de la pantalla de la agenda.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginBottom: '2.5rem' }}>
                {[
                  'Historial de sesiones organizado cronológicamente',
                  'Estado del proceso: activo, en pausa, concluido',
                  'Registro del tema de cada sesión y observaciones',
                  'Notas accesibles desde agenda y panel rápido',
                  'Privadas — Teramy no accede ni interpreta su contenido',
                ].map((feat, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', fontSize: '0.95rem', color: 'var(--text-dark)', fontWeight: 500 }}>
                    <Check size={17} style={{ color: '#10b981', flexShrink: 0, marginTop: '0.15rem' }} />
                    {feat}
                  </div>
                ))}
              </div>
              <Link href="/register" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.9rem 2rem', fontSize: '0.95rem' }}>
                Ver demo <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Automations spotlight ───────────────────────── */}
        <section style={{ padding: isMobile ? '4rem 1.5rem' : '7rem 5rem', background: 'var(--bg-main)' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '3rem' : '6rem', alignItems: 'center' }}>
            {/* Left: copy */}
            <div>
              <span style={{ display: 'inline-block', padding: '0.4rem 1rem', background: '#fef9ee', color: '#d97706', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1.5rem' }}>
                Automatizaciones
              </span>
              <h2 style={{ fontSize: isMobile ? '1.75rem' : '2.4rem', fontWeight: 800, color: 'var(--text-dark)', lineHeight: 1.2, marginBottom: '1.25rem' }}>
                Comunicación impecable con tus pacientes.
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.7, marginBottom: '2rem' }}>
                Mantén a tus pacientes informados sin esfuerzo. Teramy se encarga de los correos de confirmación automáticos y te prepara los recordatorios de WhatsApp con todos los datos listos para que los envíes en un clic.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginBottom: '2rem' }}>
                {[
                  'Confirmación instantánea por correo',
                  'Recordatorios de WhatsApp listos para enviar',
                  'Avisos de reagendamiento y cancelación',
                  'Plantillas 100% personalizables',
                  'Sin configuraciones técnicas complejas',
                ].map((feat, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', fontSize: '0.95rem', color: 'var(--text-dark)', fontWeight: 500 }}>
                    <Check size={17} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '0.15rem' }} />
                    {feat}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: WhatsApp preview */}
            <div style={{ position: 'relative' }}>
              {/* Phone frame */}
              <div style={{ background: '#1f2937', borderRadius: '40px', padding: '12px', boxShadow: '0 30px 60px rgba(0,0,0,0.25)', maxWidth: '300px', margin: '0 auto' }}>
                <div style={{ background: '#e5ddd5', borderRadius: '30px', overflow: 'hidden' }}>
                  {/* WA header */}
                  <div style={{ background: '#075e54', padding: '0.9rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, color: '#059669' }}>MG</div>
                    <div>
                      <p style={{ color: 'white', fontWeight: 700, fontSize: '0.88rem', margin: 0 }}>María Gómez</p>
                      <p style={{ color: '#9ec8c2', fontSize: '0.7rem', margin: 0 }}>en línea</p>
                    </div>
                  </div>

                  {/* Messages */}
                  <div style={{ padding: '1rem 0.75rem', minHeight: '260px', display: 'flex', flexDirection: 'column', gap: '0.65rem', backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23c5b8b8' fill-opacity='0.06'%3E%3Crect x='40' y='40' width='20' height='20'/%3E%3C/g%3E%3C/svg%3E\")" }}>
                    {/* Sent bubble (psychologist) */}
                    <div style={{ alignSelf: 'flex-end', maxWidth: '85%' }}>
                      <div style={{ background: '#dcf8c6', borderRadius: '12px 2px 12px 12px', padding: '0.65rem 0.85rem', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }}>
                        <p style={{ fontSize: '0.75rem', color: '#1a1a1a', lineHeight: 1.5, margin: 0 }}>
                          ¡Hola María!<br /><br />
                          Te confirmo tu sesión:<br /><br />
                          <strong>Jue 10 Abr</strong> a las <strong>15:00</strong><br />
                          Online — <span style={{ color: '#075e54', textDecoration: 'underline' }}>meet.google.com/abc</span><br /><br />
                          ¡Nos vemos!
                        </p>
                        <p style={{ fontSize: '0.6rem', color: '#888', margin: '0.3rem 0 0', textAlign: 'right' }}>10:32 ✓✓</p>
                      </div>
                      <p style={{ fontSize: '0.65rem', color: '#64748b', textAlign: 'right', marginTop: '0.2rem', fontWeight: 600 }}>Dra. Laura Morales</p>
                    </div>

                    {/* Received reply */}
                    <div style={{ alignSelf: 'flex-start', maxWidth: '80%' }}>
                      <div style={{ background: 'white', borderRadius: '2px 12px 12px 12px', padding: '0.65rem 0.85rem', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }}>
                        <p style={{ fontSize: '0.75rem', color: '#1a1a1a', lineHeight: 1.5, margin: 0 }}>Perfecto, ahí estaré</p>
                        <p style={{ fontSize: '0.6rem', color: '#888', margin: '0.3rem 0 0', textAlign: 'right' }}>10:35</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <div style={{ position: 'absolute', bottom: '-16px', left: '-20px', background: 'white', borderRadius: '12px', padding: '0.75rem 1rem', boxShadow: '0 8px 28px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: '0.6rem', border: '1px solid var(--border-light)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src="/whatsapp.png" alt="" style={{ width: '20px', objectFit: 'contain' }} />
                </div>
                <div>
                  <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Tú tienes el control</p>
                  <p style={{ fontSize: '0.65rem', color: '#64748b', margin: 0 }}>Envía desde tu número</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Patient Booking Flow ─────────────────────────── */}
        <section id="booking-flow" style={{ padding: isMobile ? '4rem 1.5rem' : '7rem 5rem', background: 'white', borderTop: '1px solid var(--border-light)' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: isMobile ? '2.5rem' : '5rem' }}>
              <span style={{ display: 'inline-block', padding: '0.4rem 1rem', background: '#f0fdf4', color: '#15803d', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1.25rem' }}>
                Agendado online
              </span>
              <h2 style={{ fontSize: isMobile ? '2rem' : '2.8rem', fontWeight: 800, color: 'var(--text-dark)', lineHeight: 1.15, marginBottom: '1rem' }}>
                Tu paciente agenda en 3 pasos.<br />
                <span style={{ color: 'var(--primary-blue)' }}>Sin llamadas. Sin WhatsApp de ida y vuelta.</span>
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '560px', margin: '0 auto 2.5rem' }}>
                Cada terapeuta tiene un enlace único. Tu paciente entra, elige y confirma. Tú solo recibes la notificación.
              </p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', padding: '0.7rem 1.4rem', background: '#f8fafc', border: '1.5px solid var(--border-light)', borderRadius: '2rem', fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary-dark-blue)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Tu enlace será:</span>
                &nbsp;teramy.cl/<span style={{ color: 'var(--primary-blue)' }}>tu-nombre</span>
              </div>
            </div>

            {/* Steps row */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: isMobile ? '2rem 1rem' : '0', position: 'relative', marginBottom: isMobile ? '3rem' : '5rem' }}>
              {/* connector line */}
              {!isMobile && <div style={{ position: 'absolute', top: '28px', left: '12.5%', right: '12.5%', height: '2px', background: 'linear-gradient(90deg, #0ea5e9, #10b981)', opacity: 0.2, zIndex: 0 }} />}

              {[
                {
                  icon: <Link2 size={24} />,
                  step: '01',
                  title: 'Recibe el link',
                  desc: 'Tu paciente recibe o encuentra tu enlace personalizado teramy.cl/tu-nombre desde cualquier red social, correo o derivación.',
                  color: '#0ea5e9', bg: '#e8f4fc',
                },
                {
                  icon: <UserCheck size={24} />,
                  step: '02',
                  title: 'Ve tu perfil',
                  desc: 'Accede a tu perfil profesional con tu foto, especialidades, experiencia y los servicios disponibles. Todo claro y confiable.',
                  color: '#7c3aed', bg: '#f5f3ff',
                },
                {
                  icon: <Calendar size={24} />,
                  step: '03',
                  title: 'Elige día y hora',
                  desc: 'Selecciona el tipo de sesión, elige un día disponible y confirma su horario preferido. En menos de 2 minutos.',
                  color: '#10b981', bg: '#ecfdf5',
                },
                {
                  icon: <Check size={24} />,
                  step: '04',
                  title: '¡Todo listo!',
                  desc: 'Tu paciente recibe confirmación automática por correo. Tú recibes una notificación al instante y tienes el contacto listo para avisar por WhatsApp con un clic.',
                  color: '#f59e0b', bg: '#fef9ee',
                },
              ].map((s, i) => (
                <div key={i} style={{ padding: '0 1.25rem', textAlign: 'center', position: 'relative', zIndex: 1 }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: s.bg, border: `2px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', color: s.color, position: 'relative', zIndex: 1 }}>
                    {s.icon}
                  </div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: s.color, letterSpacing: '0.1em', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Paso {s.step}</div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.5rem', lineHeight: 1.25 }}>{s.title}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', lineHeight: 1.6 }}>{s.desc}</p>
                </div>
              ))}
            </div>

            {/* Main visual: profile preview */}
            <div style={{ background: 'linear-gradient(135deg, #f0f7ff 0%, #e8f4fc 100%)', borderRadius: '24px', padding: isMobile ? '1.75rem' : '3rem', border: '1px solid #dbeafe', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '2.5rem' : '4rem', alignItems: 'center' }}>

              {/* Left: copy */}
              <div>
                <span style={{ display: 'inline-block', padding: '0.35rem 0.9rem', background: '#dbeafe', color: '#1d4ed8', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1.25rem' }}>
                  Tu perfil público
                </span>
                <h3 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-dark)', lineHeight: 1.2, marginBottom: '1.1rem' }}>
                  Tu link para agendar, listo en minutos.
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.97rem', lineHeight: 1.7, marginBottom: '1.75rem' }}>
                  Tu perfil incluye tu foto, descripción, especialidades, servicios con precio y duración, y un calendario de disponibilidad en tiempo real. Tus pacientes lo ven todo antes de confirmar.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2.25rem' }}>
                  {[
                    'Tu propio Link de Agendamiento personalizado',
                    'Tu foto y descripción profesional',
                    'Servicios con precio, duración y modalidad',
                    'Calendario con horarios disponibles en tiempo real',
                    'Confirmación automática al paciente',
                    'Sin crear cuenta ni descargar apps',
                  ].map((feat, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.55rem', alignItems: 'flex-start', fontSize: '0.92rem', color: 'var(--text-dark)', fontWeight: 500 }}>
                      <Check size={16} style={{ color: '#10b981', flexShrink: 0, marginTop: '0.15rem' }} />
                      {feat}
                    </div>
                  ))}
                </div>
                <Link
                  href="/psicologo-prueba"
                  target="_blank"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.55rem', padding: '0.95rem 2rem', background: 'white', color: 'var(--primary-dark-blue)', fontWeight: 700, fontSize: '0.97rem', borderRadius: 'var(--radius-md)', border: '2px solid var(--primary-blue)', boxShadow: '0 4px 16px rgba(14,165,233,0.15)', transition: 'all 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--primary-blue)'; (e.currentTarget as HTMLElement).style.color = 'white'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'white'; (e.currentTarget as HTMLElement).style.color = 'var(--primary-dark-blue)'; }}
                >
                  <Eye size={20} /> Ver página de ejemplo <ArrowRight size={17} />
                </Link>
                <p style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Ejemplo real · Sin registrarse
                </p>
              </div>

              {/* Right: profile card mockup */}
              <div style={{ position: 'relative' }}>
                {/* Browser chrome */}
                <div style={{ background: 'white', borderRadius: '18px', boxShadow: '0 20px 60px rgba(0,0,0,0.14)', border: '1px solid var(--border-light)', overflow: 'hidden' }}>
                  {/* URL bar label */}
                  <div style={{ padding: '0.4rem 1rem 0', fontSize: '0.65rem', fontWeight: 700, color: 'var(--primary-blue)', letterSpacing: '0.02em' }}>
                    TU LINK DE AGENDAMIENTO
                  </div>
                  {/* URL bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.4rem 1rem 0.75rem', background: 'white' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, padding: '0.45rem 0.75rem', background: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <Link2 size={12} style={{ color: '#94a3b8' }} />
                      <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>teramy.cl/dra-laura-morales</span>
                    </div>
                  </div>

                  {/* Profile content */}
                  <div style={{ display: 'flex', gap: '0', height: '340px' }}>
                    {/* Left sidebar: psychologist card */}
                    <div style={{ width: '145px', flexShrink: 0, padding: '1rem 0.85rem', borderRight: '1px solid #f1f5f9', background: 'white', overflowY: 'hidden' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #0ea5e9, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '0.9rem', marginBottom: '0.6rem' }}>LM</div>
                      <p style={{ fontSize: '0.6rem', color: '#0ea5e9', fontWeight: 700, margin: '0 0 0.15rem' }}>teramy.cl/dra-laura</p>
                      <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.1rem' }}>Dra. Laura Morales</p>
                      <p style={{ fontSize: '0.6rem', color: '#94a3b8', margin: '0 0 0.6rem' }}>Psicóloga Clínica</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                        <Star size={11} fill="currentColor" style={{ color: '#f59e0b' }} /> 10 años experiencia
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem', marginTop: '0.5rem' }}>
                        {['Ansiedad', 'TCC', 'Pareja'].map(sp => (
                          <span key={sp} style={{ padding: '0.1rem 0.35rem', background: '#e8f4fc', color: '#0369a1', borderRadius: '2rem', fontSize: '0.52rem', fontWeight: 600 }}>{sp}</span>
                        ))}
                      </div>
                    </div>

                    {/* Right: booking panel */}
                    <div style={{ flex: 1, padding: '1rem', background: '#fafcff', overflowY: 'hidden' }}>
                      <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.6rem' }}>¿Qué tipo de sesión necesitas?</p>
                      {[
                        { name: 'Evaluación Gratuita', tag: 'Online', tagColor: '#1d4ed8', tagBg: '#dbeafe', price: 'Gratis', priceColor: '#16a34a', min: '30 min' },
                        { name: 'Psicoterapia Individual', tag: 'Online', tagColor: '#1d4ed8', tagBg: '#dbeafe', price: '$45.000', priceColor: '#0f172a', min: '50 min' },
                        { name: 'Atención Presencial', tag: 'Presencial', tagColor: '#c2410c', tagBg: '#ffedd5', price: '$55.000', priceColor: '#0f172a', min: '50 min' },
                      ].map((svc, i) => (
                        <div key={i} style={{ padding: '0.55rem 0.65rem', background: i === 0 ? '#eff6ff' : 'white', borderRadius: '8px', border: `1.5px solid ${i === 0 ? '#93c5fd' : '#e2e8f0'}`, marginBottom: '0.4rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.15rem' }}>
                              <span style={{ fontSize: '0.5rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: '2rem', background: svc.tagBg, color: svc.tagColor }}>{svc.tag}</span>
                            </div>
                            <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>{svc.name}</p>
                            <p style={{ fontSize: '0.55rem', color: '#94a3b8', margin: 0 }}>{svc.min}</p>
                          </div>
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: svc.priceColor }}>{svc.price}</span>
                        </div>
                      ))}

                      {/* Mini calendar hint */}
                      <div style={{ marginTop: '0.65rem', padding: '0.5rem 0.65rem', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <p style={{ fontSize: '0.58rem', fontWeight: 700, color: '#64748b', margin: '0 0 0.4rem' }}>Próximas fechas disponibles</p>
                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                          {['Jue\n10', 'Vie\n11', 'Lun\n14', 'Mar\n15'].map((d, i) => (
                            <div key={i} style={{ flex: 1, textAlign: 'center', padding: '0.3rem 0.1rem', borderRadius: '6px', background: i === 0 ? '#0ea5e9' : '#f8fafc', border: `1px solid ${i === 0 ? '#0ea5e9' : '#e2e8f0'}` }}>
                              {d.split('\n').map((line, j) => (
                                <p key={j} style={{ margin: 0, fontSize: '0.5rem', fontWeight: j === 1 ? 800 : 500, color: i === 0 ? 'white' : (j === 1 ? '#0f172a' : '#94a3b8') }}>{line}</p>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating badge: confirmed */}
                <div style={{ position: 'absolute', bottom: '-14px', right: '-16px', background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '0.6rem 1rem', boxShadow: '0 8px 24px rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={14} style={{ color: '#15803d', strokeWidth: 3 }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#15803d', margin: 0 }}>¡Sesión confirmada!</p>
                    <p style={{ fontSize: '0.6rem', color: '#64748b', margin: 0 }}>Jue 10 · 15:00 hrs</p>
                  </div>
                </div>

                {/* Floating badge: link */}
                <div style={{ position: 'absolute', top: '-14px', left: '-16px', background: 'var(--primary-gradient)', borderRadius: '12px', padding: '0.6rem 1rem', boxShadow: '0 8px 24px rgba(14,165,233,0.3)', color: 'white' }}>
                  <p style={{ fontSize: '0.68rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Link2 size={12} /> teramy.cl/dra-laura
                  </p>
                  <p style={{ fontSize: '0.6rem', opacity: 0.85, margin: 0 }}>Tu enlace personalizado</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Testimonials ────────────────────────────────── */}
        <section style={{ padding: isMobile ? '4rem 1.5rem' : '7rem 5rem', background: 'white' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: isMobile ? '2rem' : '4rem' }}>
              <h2 style={{ fontSize: isMobile ? '1.8rem' : '2.5rem', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '0.75rem' }}>
                Lo que dicen los profesionales que ya usan Teramy
              </h2>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 1.5rem', background: 'var(--primary-light-blue)', borderRadius: '2rem', fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary-dark-blue)' }}>
                <Users size={18} /> +150 profesionales de la salud confían en Teramy
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '1rem' }}>
              {TESTIMONIALS.map((t, i) => (
                <div key={i} className="premium-card" style={{ padding: '2.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.2rem' }}>
                    {[...Array(5)].map((_, j) => <Star key={j} size={16} fill="#f59e0b" style={{ color: '#f59e0b' }} />)}
                  </div>
                  <p style={{ color: 'var(--text-dark)', fontSize: '0.97rem', fontStyle: 'italic', lineHeight: 1.65, flex: 1 }}>
                    "{t.quote}"
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: t.bg, color: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>{t.initials}</div>
                    <div>
                      <p style={{ fontWeight: 700, color: 'var(--text-dark)', fontSize: '0.9rem', margin: 0 }}>{t.name}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ─────────────────────────────────────── */}
        <section id="pricing" style={{ padding: isMobile ? '4rem 1.5rem' : '5rem 5rem', background: 'var(--bg-main)' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <span style={{ display: 'inline-block', padding: '0.4rem 1rem', background: 'var(--primary-light-blue)', color: 'var(--primary-dark-blue)', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem' }}>
                Precios
              </span>
              <h2 style={{ fontSize: isMobile ? '1.9rem' : '2.4rem', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '0.6rem', lineHeight: 1.15 }}>
                Un plan. Todo incluido. <span style={{ color: 'var(--primary-blue)' }}>Sin sorpresas.</span>
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: '460px', margin: '0 auto' }}>
                Todo lo que necesitas para tu consulta, en un solo lugar.
              </p>
            </div>

            <div style={{ background: 'white', border: '2px solid var(--primary-blue)', borderRadius: '20px', padding: isMobile ? '2rem 1.5rem' : '2.25rem 2.5rem', position: 'relative', maxWidth: '780px', margin: '0 auto' }}>
              <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: 'var(--primary-gradient)', color: 'white', padding: '0.3rem 1.25rem', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                30 DÍAS DE PRUEBA GRATUITA
              </div>

              {/* Price + features side by side on desktop */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '220px 1fr', gap: isMobile ? '1.5rem' : '3rem', alignItems: 'center' }}>

                {/* Price block */}
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.25rem' }}>Plan Profesional</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '0.1rem' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-dark-blue)', alignSelf: 'flex-start', paddingTop: '0.4rem' }}>$</span>
                    <span style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--primary-dark-blue)', letterSpacing: '-0.03em', lineHeight: 1 }}>19.990</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginLeft: '0.15rem' }}>/mes</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 1rem' }}>Luego del período de prueba</p>
                  <Link href="/register" className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.8rem 1.25rem', fontSize: '0.92rem', fontWeight: 700 }}>
                    Empezar gratis <ArrowRight size={16} />
                  </Link>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginTop: '0.75rem' }}>
                    <Shield size={13} style={{ color: 'var(--primary-blue)' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cancela cuando quieras</span>
                  </div>
                </div>

                {/* Features */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem' }}>
                  {[
                    'Agenda online 24/7',
                    'Pacientes y sesiones ilimitadas',
                    'Notas de sesión privadas',
                    'Recordatorios por WhatsApp',
                    'Confirmaciones automáticas por correo',
                    'CRM de pacientes e historial',
                    'Google Meet y Zoom integrados',
                    'Analíticas de ingresos y asistencia',
                    'Perfil público personalizado',
                    'Soporte por WhatsApp',
                  ].map((feat, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', fontSize: '0.84rem', color: 'var(--text-dark)', fontWeight: 500 }}>
                      <Check size={14} style={{ color: 'var(--primary-blue)', flexShrink: 0 }} />
                      {feat}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ + Contact ────────────────────────────────── */}
        <section id="faq" style={{ padding: isMobile ? '4rem 1.5rem' : '6rem 5rem', background: 'white', borderTop: '1px solid var(--border-light)' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '3rem' : '5rem', alignItems: 'start' }}>

            {/* Left: FAQ */}
            <div id="contacto">
              <h2 style={{ fontSize: isMobile ? '1.8rem' : '2rem', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '0.5rem' }}>Preguntas frecuentes</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '1.75rem' }}>Todo lo que necesitas saber antes de empezar.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {FAQS.map((faq, i) => (
                  <div
                    key={i}
                    style={{ borderBottom: '1px solid var(--border-light)', cursor: 'pointer', paddingBottom: openFaq === i ? '1rem' : '0' }}
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', padding: '0.9rem 0' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-dark)', margin: 0, lineHeight: 1.4 }}>{faq.q}</h4>
                      <div style={{ flexShrink: 0, color: 'var(--text-muted)', transition: 'transform 0.2s', transform: openFaq === i ? 'rotate(180deg)' : 'none', marginTop: '2px' }}>
                        <ChevronDown size={16} />
                      </div>
                    </div>
                    {openFaq === i && (
                      <p style={{ color: 'var(--text-muted)', lineHeight: 1.65, fontSize: '0.87rem', margin: 0 }}>
                        {faq.a}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Contact form */}
            <div>
              <h2 style={{ fontSize: isMobile ? '1.8rem' : '2rem', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '0.5rem' }}>¿Tienes alguna duda?</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '1.75rem' }}>
                Escríbenos a <strong>contacto@teramy.cl</strong> o completa el formulario.
              </p>

              <form onSubmit={handleContactSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dark)' }}>Nombre</label>
                    <input
                      type="text"
                      placeholder="Tu nombre"
                      required
                      value={contactForm.name}
                      onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))}
                      style={{ padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1.5px solid var(--border-light)', fontSize: '0.88rem', outline: 'none', fontFamily: 'inherit', background: '#f8fafc', transition: 'border-color 0.2s' }}
                      onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary-blue)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-light)')}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dark)' }}>Correo</label>
                    <input
                      type="email"
                      placeholder="tu@correo.com"
                      required
                      value={contactForm.email}
                      onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
                      style={{ padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1.5px solid var(--border-light)', fontSize: '0.88rem', outline: 'none', fontFamily: 'inherit', background: '#f8fafc', transition: 'border-color 0.2s' }}
                      onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary-blue)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-light)')}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dark)' }}>Mensaje</label>
                  <textarea
                    placeholder="Cuéntanos tu duda o consulta..."
                    required
                    rows={5}
                    value={contactForm.message}
                    onChange={e => setContactForm(f => ({ ...f, message: e.target.value }))}
                    style={{ padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1.5px solid var(--border-light)', fontSize: '0.88rem', outline: 'none', fontFamily: 'inherit', background: '#f8fafc', resize: 'vertical', transition: 'border-color 0.2s' }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary-blue)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-light)')}
                  />
                </div>

                {contactStatus === 'sent' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.9rem 1.1rem', background: '#ecfdf5', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                    <Check size={16} style={{ color: '#15803d', flexShrink: 0 }} />
                    <p style={{ margin: 0, color: '#15803d', fontWeight: 600, fontSize: '0.88rem' }}>¡Mensaje enviado! Te responderemos pronto.</p>
                  </div>
                )}

                {contactStatus === 'error' && (
                  <div style={{ padding: '0.9rem 1.1rem', background: '#fef2f2', borderRadius: '10px', border: '1px solid #fecaca' }}>
                    <p style={{ margin: 0, color: '#dc2626', fontWeight: 600, fontSize: '0.88rem' }}>Error al enviar. Escríbenos directamente a contacto@teramy.cl</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={contactStatus === 'sending' || contactStatus === 'sent'}
                  className="btn-primary"
                  style={{ padding: '0.85rem', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: contactStatus === 'sending' ? 0.7 : 1, cursor: contactStatus === 'sending' ? 'not-allowed' : 'pointer' }}
                >
                  {contactStatus === 'sending' ? 'Enviando...' : contactStatus === 'sent' ? '¡Enviado!' : (<>Enviar mensaje <ArrowRight size={17} /></>)}
                </button>
              </form>
            </div>

          </div>
        </section>

      </main>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer style={{ padding: isMobile ? '2.5rem 1.5rem' : '3rem 5rem', background: 'var(--bg-white)', borderTop: '1px solid var(--border-light)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, background: 'var(--primary-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.3rem' }}>Teramy</div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>La plataforma de gestión para profesionales que acompañan personas.</p>
            <a
              href="https://instagram.com/teramy.cl"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#e1306c')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
              @teramy.cl
            </a>
          </div>
          <div style={{ display: 'flex', gap: isMobile ? '1.25rem' : '2.5rem', flexWrap: 'wrap' }}>
            {[['#features', 'Características'], ['#pricing', 'Precios'], ['#faq', 'Preguntas'], ['#contacto', 'Contacto']].map(([href, label]) => (
              <a key={href} href={href} style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: 500, transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-dark)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                {label}
              </a>
            ))}
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            © {new Date().getFullYear()} Teramy. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
