"use client";

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Save, CheckCircle2, Lock, FileText, ChevronDown, ArrowLeft,
  Clock, Calendar, User, Tag,
} from 'lucide-react';

const NOTE_STATES = [
  { emoji: '🟢', label: 'Buena evolución', color: '#10b981', bg: '#ecfdf5', border: '#6ee7b7' },
  { emoji: '🟡', label: 'Estable', color: '#d97706', bg: '#fef9ee', border: '#fcd34d' },
  { emoji: '🔴', label: 'En crisis', color: '#ef4444', bg: '#fef2f2', border: '#fca5a5' },
  { emoji: '⚪', label: 'Primera sesión', color: '#64748b', bg: '#f8fafc', border: '#cbd5e1' },
];

const SESSION_TYPES = [
  'Psicoterapia individual',
  'Terapia de pareja',
  'Evaluación inicial',
  'Terapia familiar',
  'Psicología infantil',
  'Seguimiento',
];

function NotaPageContent() {
  const params = useSearchParams();
  const patient = params.get('paciente') || 'Paciente';
  const time    = params.get('hora')    || '';
  const date    = params.get('fecha')   || new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const session = params.get('sesion')  || '';
  const initials = patient.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

  const [topic, setTopic]       = useState('');
  const [noteText, setNoteText] = useState('');
  const [stateIdx, setStateIdx] = useState(0);
  const [sesType, setSesType]   = useState(SESSION_TYPES[0]);
  const [saved, setSaved]       = useState(false);
  const [autoSave, setAutoSave] = useState<'idle' | 'saving' | 'saved'>('idle');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-save simulation after typing stops
  useEffect(() => {
    if (!noteText && !topic) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setAutoSave('saving');
    autoSaveTimer.current = setTimeout(() => {
      setAutoSave('saved');
      setTimeout(() => setAutoSave('idle'), 2000);
    }, 1200);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [noteText, topic]);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      window.close();
    }, 1400);
  };

  const curState = NOTE_STATES[stateIdx];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f0f4ff 100%)',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* ── Top bar ── */}
      <header style={{
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #e2e8f0',
        padding: '0 2rem',
        height: '62px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
      }}>
        {/* Left: brand + close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '30px', height: '30px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #0ea5e9, #3b82f6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FileText size={15} color="white" />
            </div>
            <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a', letterSpacing: '-0.02em' }}>
              Teramy <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '0.9rem' }}>· Nota de sesión</span>
            </span>
          </div>
          <div style={{ width: '1px', height: '20px', background: '#e2e8f0' }} />
          <button
            onClick={() => window.close()}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              color: '#64748b', background: 'transparent', border: 'none',
              cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600,
              padding: '0.35rem 0.7rem', borderRadius: '8px',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
          >
            <ArrowLeft size={15} /> Cerrar
          </button>
        </div>

        {/* Centre: patient info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #0ea5e9, #3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.8rem', fontWeight: 700, color: 'white', flexShrink: 0,
          }}>{initials}</div>
          <div>
            <p style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem', margin: 0, lineHeight: 1.2 }}>{patient}</p>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
              {[date, time, session ? `Sesión ${session}` : ''].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>

        {/* Right: auto-save indicator + save button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {autoSave !== 'idle' && (
            <span style={{ fontSize: '0.78rem', color: autoSave === 'saved' ? '#10b981' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              {autoSave === 'saving' ? (
                <>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94a3b8', display: 'inline-block' }} />
                  Guardando...
                </>
              ) : (
                <><CheckCircle2 size={13} /> Guardado</>
              )}
            </span>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#94a3b8' }}>
            <Lock size={12} /> Nota privada
          </div>
          <button
            onClick={handleSave}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.55rem 1.25rem',
              background: saved ? 'linear-gradient(135deg,#10b981,#34d399)' : 'linear-gradient(135deg, #0ea5e9, #3b82f6)',
              color: 'white', border: 'none', borderRadius: '10px',
              fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
              boxShadow: saved ? '0 4px 12px rgba(16,185,129,0.3)' : '0 4px 12px rgba(14,165,233,0.3)',
              transition: 'all 0.3s',
            }}
          >
            {saved ? <><CheckCircle2 size={15} /> ¡Guardada!</> : <><Save size={15} /> Guardar nota</>}
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <main style={{
        flex: 1,
        maxWidth: '820px',
        width: '100%',
        margin: '0 auto',
        padding: '2.5rem 1.5rem 4rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}>

        {/* Meta row: session type + patient state */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {/* Session type */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Tag size={11} /> Tipo de sesión
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={sesType}
                onChange={e => setSesType(e.target.value)}
                style={{
                  width: '100%', padding: '0.75rem 2.5rem 0.75rem 1rem',
                  borderRadius: '12px', border: '1.5px solid #e2e8f0',
                  fontSize: '0.9rem', fontFamily: 'inherit', background: 'white',
                  color: '#0f172a', fontWeight: 600, appearance: 'none', outline: 'none',
                  cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = '#0ea5e9')}
                onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
              >
                {SESSION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
            </div>
          </div>

          {/* Patient state selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <User size={11} /> Estado del paciente
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {NOTE_STATES.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setStateIdx(i)}
                  style={{
                    flex: 1, padding: '0.65rem 0.4rem',
                    borderRadius: '10px', border: `1.5px solid ${stateIdx === i ? s.border : '#e2e8f0'}`,
                    background: stateIdx === i ? s.bg : 'white',
                    color: stateIdx === i ? s.color : '#94a3b8',
                    fontWeight: stateIdx === i ? 700 : 500,
                    fontSize: '0.78rem', cursor: 'pointer',
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Session topic */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Tema de la sesión
          </label>
          <input
            type="text"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="Ej. Técnica de respiración, exploración de creencias automáticas..."
            style={{
              padding: '0.9rem 1.1rem',
              borderRadius: '14px',
              border: '1.5px solid #e2e8f0',
              fontSize: '1rem',
              fontFamily: 'inherit',
              fontWeight: 600,
              color: '#0f172a',
              background: 'white',
              outline: 'none',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = '#0ea5e9';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(14,165,233,0.12)';
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
            }}
          />
        </div>

        {/* Main notes textarea */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Observaciones clínicas
            </label>
            <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
              {noteText.length} caracteres
            </span>
          </div>
          <textarea
            ref={textareaRef}
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder={`Escribe aquí tus observaciones clínicas\n\n• Avances y retrocesos observados\n• Intervenciones realizadas\n• Respuesta emocional del paciente\n• Tareas asignadas para la próxima sesión\n• Aspectos a retomar en futuras sesiones...`}
            style={{
              minHeight: '340px',
              padding: '1.25rem 1.35rem',
              borderRadius: '16px',
              border: '1.5px solid #e2e8f0',
              fontSize: '0.96rem',
              lineHeight: 1.85,
              fontFamily: 'inherit',
              color: '#334155',
              background: 'white',
              resize: 'vertical',
              outline: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = '#0ea5e9';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(14,165,233,0.1), 0 2px 8px rgba(0,0,0,0.05)';
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
            }}
          />
        </div>

        {/* Footer info strip */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.9rem 1.25rem',
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #f1f5f9',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            {date && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: '#64748b' }}>
                <Calendar size={13} style={{ color: '#0ea5e9' }} /> {date}
              </span>
            )}
            {time && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: '#64748b' }}>
                <Clock size={13} style={{ color: '#0ea5e9' }} /> {time}
              </span>
            )}
            <span style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              fontSize: '0.78rem',
              padding: '0.25rem 0.65rem', borderRadius: '2rem',
              background: curState.bg, color: curState.color, fontWeight: 600,
              border: `1px solid ${curState.border}`,
            }}>
              {curState.emoji} {curState.label}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: '#94a3b8' }}>
            <Lock size={12} /> Solo tú puedes ver este contenido
          </div>
        </div>

        {/* Main save CTA */}
        <button
          onClick={handleSave}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
            padding: '1rem',
            background: saved
              ? 'linear-gradient(135deg, #10b981, #34d399)'
              : 'linear-gradient(135deg, #0ea5e9, #3b82f6)',
            color: 'white', border: 'none', borderRadius: '14px',
            fontWeight: 700, fontSize: '1rem',
            cursor: 'pointer',
            boxShadow: saved ? '0 6px 20px rgba(16,185,129,0.3)' : '0 6px 20px rgba(14,165,233,0.3)',
            transition: 'all 0.3s',
          }}
        >
          {saved
            ? <><CheckCircle2 size={19} /> ¡Nota guardada correctamente!</>
            : <><Save size={19} /> Guardar nota</>
          }
        </button>

      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>
    </div>
  );
}

export default function NotaPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontFamily: 'Inter, sans-serif', color: '#94a3b8',
        fontSize: '0.95rem',
      }}>
        Cargando editor de notas...
      </div>
    }>
      <NotaPageContent />
    </Suspense>
  );
}
