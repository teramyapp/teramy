"use client";

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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

function NotaContent() {
  const params = useSearchParams();
  const router = useRouter();
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
      router.back();
    }, 1400);
  };

  const curState = NOTE_STATES[stateIdx];

  return (
    <div className="animate-slide-up" style={{ maxWidth: '820px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Page header */}
      <div style={{
        background: 'white',
        borderRadius: '18px',
        border: '1px solid #e2e8f0',
        padding: '1.25rem 1.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        gap: '1rem',
        flexWrap: 'wrap',
      }}>
        {/* Left: back + patient info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <button
            onClick={() => router.back()}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              color: '#64748b', background: '#f1f5f9', border: '1px solid #e2e8f0',
              cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600,
              padding: '0.5rem 0.9rem', borderRadius: '10px',
              transition: 'all 0.15s', flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
          >
            <ArrowLeft size={15} /> Volver
          </button>

          <div style={{ width: '1px', height: '32px', background: '#e2e8f0', flexShrink: 0 }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #0ea5e9, #3b82f6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.85rem', fontWeight: 700, color: 'white', flexShrink: 0,
            }}>{initials}</div>
            <div>
              <p style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem', margin: 0, lineHeight: 1.2 }}>{patient}</p>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0, marginTop: '0.1rem' }}>
                {[date, time, session ? `Sesión ${session}` : ''].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
        </div>

        {/* Right: auto-save + badge + save btn */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {autoSave !== 'idle' && (
            <span style={{ fontSize: '0.78rem', color: autoSave === 'saved' ? '#10b981' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              {autoSave === 'saving' ? (
                <><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94a3b8', display: 'inline-block' }} /> Guardando...</>
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
              padding: '0.6rem 1.35rem',
              background: saved ? 'linear-gradient(135deg,#10b981,#34d399)' : 'linear-gradient(135deg, #0ea5e9, #3b82f6)',
              color: 'white', border: 'none', borderRadius: '12px',
              fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
              boxShadow: saved ? '0 4px 12px rgba(16,185,129,0.3)' : '0 4px 12px rgba(14,165,233,0.3)',
              transition: 'all 0.3s',
            }}
          >
            {saved ? <><CheckCircle2 size={15} /> ¡Guardada!</> : <><Save size={15} /> Guardar nota</>}
          </button>
        </div>
      </div>

      {/* Meta row: session type + patient state */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
          <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.6rem' }}>
            <Tag size={11} /> Tipo de sesión
          </label>
          <div style={{ position: 'relative' }}>
            <select
              value={sesType}
              onChange={e => setSesType(e.target.value)}
              style={{
                width: '100%', padding: '0.7rem 2.5rem 0.7rem 1rem',
                borderRadius: '10px', border: '1.5px solid #e2e8f0',
                fontSize: '0.9rem', background: '#fafcff',
                color: '#0f172a', fontWeight: 600, appearance: 'none',
                cursor: 'pointer',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#0ea5e9')}
              onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
            >
              {SESSION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
          <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.6rem' }}>
            <User size={11} /> Estado del paciente
          </label>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {NOTE_STATES.map((s, i) => (
              <button
                key={i}
                onClick={() => setStateIdx(i)}
                style={{
                  flex: 1, padding: '0.6rem 0.35rem',
                  borderRadius: '10px', border: `1.5px solid ${stateIdx === i ? s.border : '#e2e8f0'}`,
                  background: stateIdx === i ? s.bg : '#fafcff',
                  color: stateIdx === i ? s.color : '#94a3b8',
                  fontWeight: stateIdx === i ? 700 : 500,
                  fontSize: '0.75rem', cursor: 'pointer',
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
      <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: '0.6rem' }}>
          Tema de la sesión
        </label>
        <input
          type="text"
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder="Ej. Técnica de respiración, exploración de creencias automáticas..."
          style={{
            padding: '0.85rem 1.1rem',
            borderRadius: '12px',
            border: '1.5px solid #e2e8f0',
            fontSize: '1rem',
            fontWeight: 600,
            color: '#0f172a',
            background: '#fafcff',
            width: '100%',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = '#0ea5e9';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(14,165,233,0.12)';
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
      </div>

      {/* Main notes textarea */}
      <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
          <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Observaciones clínicas
          </label>
          <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>{noteText.length} caracteres</span>
        </div>
        <textarea
          ref={textareaRef}
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
          placeholder={`Escribe aquí tus observaciones clínicas\n\n• Avances y retrocesos observados\n• Intervenciones realizadas\n• Respuesta emocional del paciente\n• Tareas asignadas para la próxima sesión\n• Aspectos a retomar en futuras sesiones...`}
          style={{
            minHeight: '320px',
            padding: '1.1rem 1.2rem',
            borderRadius: '12px',
            border: '1.5px solid #e2e8f0',
            fontSize: '0.96rem',
            lineHeight: 1.85,
            color: '#334155',
            background: '#fafcff',
            resize: 'vertical',
            width: '100%',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = '#0ea5e9';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(14,165,233,0.1)';
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
      </div>

      {/* Footer info strip */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.9rem 1.25rem',
        background: 'white',
        borderRadius: '14px',
        border: '1px solid #f1f5f9',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
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
            fontSize: '0.78rem', padding: '0.25rem 0.65rem', borderRadius: '2rem',
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
          fontWeight: 700, fontSize: '1rem', cursor: 'pointer',
          boxShadow: saved ? '0 6px 20px rgba(16,185,129,0.3)' : '0 6px 20px rgba(14,165,233,0.3)',
          transition: 'all 0.3s',
          marginBottom: '1rem',
        }}
      >
        {saved
          ? <><CheckCircle2 size={19} /> ¡Nota guardada correctamente!</>
          : <><Save size={19} /> Guardar nota</>
        }
      </button>
    </div>
  );
}

export default function NotaDashboardPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: '#94a3b8', fontSize: '0.95rem' }}>
        Cargando editor de notas...
      </div>
    }>
      <NotaContent />
    </Suspense>
  );
}
