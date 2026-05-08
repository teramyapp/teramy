"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Download, ChevronRight, Video, MapPin, UserPlus, X, Save, CheckCircle2, AlertTriangle, ChevronDown, Loader2, MoreVertical, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { usePsychologist, useCachedQuery, useDashboardCache } from '@/lib/dashboard-context';

type PatientStatus = 'En proceso' | 'En pausa' | 'Alta' | 'Evaluación';

type Patient = {
  id: string;
  name: string;
  email: string;
  phone: string;
  lastService: string;
  lastModality: 'online' | 'presencial';
  lastDate: string;
  total: number;
  initials: string;
  color: string;
  status: PatientStatus;
  maxSessions?: number;
};

const STATUS_CONFIG: Record<PatientStatus, { label: string; bg: string; color: string; dot: string }> = {
  'En proceso': { label: 'En proceso', bg: '#ecfdf5', color: '#059669', dot: '#10b981' },
  'En pausa':   { label: 'En pausa',   bg: '#fef9ee', color: '#d97706', dot: '#f59e0b' },
  'Alta':       { label: 'Alta',       bg: '#f0fdf4', color: '#15803d', dot: '#22c55e' },
  'Evaluación': { label: 'Evaluación', bg: 'var(--bg-main)', color: 'var(--text-muted)', dot: '#94a3b8' },
};

const COLORS = ['#10b981','#0ea5e9','#f59e0b','#7c3aed','#ec4899','#64748b','#f97316','#06b6d4','#8b5cf6','#ef4444'];

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function PatientsPage() {
  const router = useRouter();
  const { psychologist } = usePsychologist();
  const { invalidate } = useDashboardCache();
  const psychId = psychologist?.id ?? null;
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<PatientStatus | 'Todos'>('Todos');
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newStatus, setNewStatus] = useState<PatientStatus>('Evaluación');
  const [newSaved, setNewSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<Patient | null>(null);
  const [statusMenuId, setStatusMenuId] = useState<string | null>(null);
  const [statusMenuPos, setStatusMenuPos] = useState<{ top: number; left: number } | null>(null);
  const psychologistId = psychId;
  const [optionsMenuId, setOptionsMenuId] = useState<string | null>(null);
  const [optionsMenuPos, setOptionsMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const el1 = document.getElementById('patient-status-menu');
      if (el1 && !el1.contains(e.target as Node)) setStatusMenuId(null);
      const el2 = document.getElementById('patient-options-menu');
      if (el2 && !el2.contains(e.target as Node)) setOptionsMenuId(null);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Cached fetch — instant on revisit, refreshed in background
  const { data: cachedPatients, loading } = useCachedQuery<Patient[]>(
    psychId ? `patients:list:${psychId}` : null,
    async () => {
      const [{ data: apptRows }, { data: directRows }] = await Promise.all([
        supabase.from('appointments')
          .select('id, start_time, status, patient_id, patients(id, name, email, phone, status), event_types(title, mode)')
          .eq('psychologist_id', psychId!)
          .order('start_time', { ascending: false }),
        supabase.from('patients')
          .select('id, name, email, phone, status')
          .eq('psychologist_id', psychId!),
      ]);

      const patientMap = new Map<string, { p: any; appts: any[] }>();
      (apptRows || []).forEach((row: any) => {
        const pat = row.patients;
        if (!pat) return;
        if (!patientMap.has(pat.id)) patientMap.set(pat.id, { p: pat, appts: [] });
        patientMap.get(pat.id)!.appts.push(row);
      });
      (directRows || []).forEach((pat: any) => {
        if (!patientMap.has(pat.id)) patientMap.set(pat.id, { p: pat, appts: [] });
      });

      return Array.from(patientMap.values()).map(({ p, appts }, idx) => {
        const now = new Date();
        const pastAppts = appts.filter(a => new Date(a.start_time).getTime() <= now.getTime());
        const sortedPast = [...pastAppts].sort((a, b) =>
          new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
        );
        const last = sortedPast[0];
        return {
          id: p.id,
          name: p.name,
          email: p.email ?? '',
          phone: p.phone ?? '',
          lastService: last?.event_types?.title ?? '—',
          lastModality: last?.event_types?.mode === 'presencial' ? 'presencial' : 'online',
          lastDate: last ? formatRelativeDate(last.start_time) : 'Sin sesiones',
          total: appts.length,
          initials: getInitials(p.name),
          color: COLORS[idx % COLORS.length],
          status: (p.status as PatientStatus) ?? 'Evaluación',
          maxSessions: undefined,
        };
      });
    },
  );

  useEffect(() => {
    if (cachedPatients) setPatients(cachedPatients);
  }, [cachedPatients]);

  const loadPatients = () => { if (psychId) invalidate(`patients:list:${psychId}`); };

  function formatRelativeDate(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    
    // Normalize to start of day for accurate day-diff calculation
    const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffMs = nowStart.getTime() - dStart.getTime();
    const diffDays = Math.round(diffMs / 86400000);

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 0) return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }); // Future
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays/7)} sem`;
    if (diffDays < 365) return `Hace ${Math.floor(diffDays/30)} meses`;
    return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
  }

  const changeStatus = async (id: string, status: PatientStatus) => {
    setPatients(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    setStatusMenuId(null);
    supabase.from('patients').update({ status }).eq('id', id).then(() => {});
  };

  const checkDuplicate = (email: string, phone: string) => {
    const emailMatch = email.trim() ? patients.find(p => p.email.toLowerCase() === email.toLowerCase().trim()) : null;
    const phoneMatch = phone.trim() ? patients.find(p => p.phone.replace(/\s/g, '') === phone.replace(/\s/g, '').trim()) : null;
    setDuplicateWarning(emailMatch || phoneMatch || null);
  };

  const handleDeletePatient = async (id: string) => {
    setDeleting(true);
    await supabase.from('patients').delete().eq('id', id);
    setPatients(prev => prev.filter(p => p.id !== id));
    setDeleteConfirmId(null);
    setDeleting(false);
  };

  const saveNewPatient = async () => {
    if (!newName.trim() || duplicateWarning || !psychologistId) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('patients')
      .insert([{
        name: newName.trim(),
        email: newEmail.trim() || null,
        phone: newPhone.trim() || null,
        psychologist_id: psychologistId, // links patient to this psychologist (migration 002)
      }])
      .select('id, name, email, phone')
      .single();

    if (!error && data) {
      setNewSaved(true);
      await loadPatients();
      setTimeout(() => {
        setShowNewModal(false);
        setNewSaved(false);
        setNewName(''); setNewEmail(''); setNewPhone('');
        setDuplicateWarning(null);
      }, 1200);
    }
    setSaving(false);
  };

  const openNewModal = () => {
    setNewName(''); setNewEmail(''); setNewPhone('');
    setDuplicateWarning(null); setNewSaved(false);
    setNewStatus('Evaluación');
    setShowNewModal(true);
  };

  const filtered = patients.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'Todos' || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const counts = {
    Todos: patients.length,
    'En proceso': patients.filter(p => p.status === 'En proceso').length,
    'En pausa': patients.filter(p => p.status === 'En pausa').length,
    'Alta': patients.filter(p => p.status === 'Alta').length,
    'Evaluación': patients.filter(p => p.status === 'Evaluación').length,
  };

  return (
    <>
      <style>{`
        .patients-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 2rem;
          gap: 1rem;
        }
        .patients-header-controls {
          display: flex;
          gap: 0.75rem;
        }
        .patients-filters {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
          align-items: center;
          flex-wrap: wrap;
        }
        .patient-row {
          padding: 1.1rem 1.5rem;
          display: grid;
          grid-template-columns: 2fr 1.5fr 1.5fr 1fr 140px 50px;
          align-items: center;
          transition: background 0.15s;
        }
        .patient-table-header {
          padding: 0.9rem 1.5rem;
          background: var(--bg-main);
          border-bottom: 1px solid var(--border-light);
          display: grid;
          grid-template-columns: 2fr 1.5fr 1.5fr 1fr 140px 50px;
          color: var(--text-muted);
          fontSize: 0.78rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 600;
        }
        .patient-card-mobile {
          display: none;
        }
        @media (max-width: 1024px) {
          .patient-row, .patient-table-header {
            grid-template-columns: 1.5fr 1fr 1fr 80px 120px 40px;
          }
        }
        @media (max-width: 768px) {
          .patients-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .patients-header-controls {
            width: 100%;
          }
          .patients-header-controls button {
            flex: 1;
            justify-content: center;
          }
          .patients-filters {
            flex-direction: column;
            align-items: stretch;
          }
          .patient-table-header {
            display: none;
          }
          .patient-row {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 1rem !important;
            padding: 1.5rem !important;
          }
          .patient-info-main {
            grid-column: span 2;
            margin-bottom: 0.5rem;
          }
          .patient-status-cell {
            grid-column: span 2;
            border-top: 1px solid var(--border-light);
            padding-top: 1rem;
            margin-top: 0.5rem;
          }
          .patient-actions-cell {
            position: absolute;
            top: 1.5rem;
            right: 1.25rem;
          }
          .patient-actions-cell > .chevron-desktop {
            display: none;
          }
        }
      `}</style>
      <div className="animate-slide-up">
      {/* Header */}
      <div className="patients-header">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-dark)' }}>Mis Pacientes</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {patients.length} pacientes · {counts['En proceso']} en proceso activo
          </p>
        </div>
        <div className="patients-header-controls">
          <button className="premium-card" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.1rem', fontWeight: 500, color: 'var(--text-muted)', fontSize: '0.9rem', cursor: 'pointer', border: '1px solid var(--border-light)' }}>
            <Download size={16} /> Exportar
          </button>
          <button onClick={openNewModal} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}>
            <UserPlus size={16} /> Nuevo Paciente
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="patients-filters">
        <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Buscar por nombre o correo..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.75rem', background: 'var(--bg-white)', boxShadow: 'var(--shadow-sm)', width: '100%', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {(['Todos', 'En proceso', 'En pausa', 'Evaluación', 'Alta'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{ padding: '0.45rem 1rem', borderRadius: '2rem', border: '1px solid', fontSize: '0.83rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', borderColor: filterStatus === s ? 'var(--primary-blue)' : 'var(--border-light)', background: filterStatus === s ? 'var(--primary-light-blue)' : 'var(--bg-white)', color: filterStatus === s ? 'var(--primary-dark-blue)' : 'var(--text-muted)' }}>
              {s} <span style={{ opacity: 0.7 }}>({counts[s]})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="premium-card" style={{ overflow: 'hidden' }}>
        <div className="patient-table-header">
          <span>Paciente</span><span>Contacto</span><span>Última sesión</span>
          <span style={{ textAlign: 'center' }}>Sesiones</span><span>Estado</span><span />
        </div>

        {loading && (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={32} style={{ margin: '0 auto 1rem', opacity: 0.4, animation: 'spin 1s linear infinite' }} />
            <p>Cargando pacientes...</p>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Search size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <p style={{ fontWeight: 500 }}>{patients.length === 0 ? 'Aún no tienes pacientes registrados' : 'No se encontraron pacientes'}</p>
          </div>
        )}

        {filtered.map((p) => {
          const st = STATUS_CONFIG[p.status];
          const progress = p.maxSessions ? Math.round((p.total / p.maxSessions) * 100) : null;
          const nearLimit = progress !== null && progress >= 75;
          return (
            <div key={p.id} onClick={() => router.push(`/dashboard/patients/${p.id}`)} className="patient-row"
              style={{ borderBottom: '1px solid var(--border-light)', background: 'white', position: 'relative' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-main)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
              
              {/* 1. Info Principal */}
              <div className="patient-info-main" style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `${p.color}18`, color: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, flexShrink: 0 }}>{p.initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-dark)', fontSize: '0.95rem' }}>{p.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{p.lastService}</div>
                </div>
              </div>

              {/* 2. Contacto */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span style={{ fontSize: '0.88rem', color: 'var(--text-dark)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.email}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.phone}</span>
              </div>

              {/* 3. Última Sesión */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', background: p.lastModality === 'online' ? '#dbeafe' : '#ffedd5' }}>
                  {p.lastModality === 'online' ? <Video size={11} style={{ color: '#1d4ed8' }} /> : <MapPin size={11} style={{ color: '#c2410c' }} />}
                </span>
                <span style={{ fontSize: '0.88rem', color: 'var(--text-dark)', fontWeight: 500 }}>{p.lastDate}</span>
              </div>

              {/* 4. Sesiones */}
              <div style={{ textAlign: 'center' }}>
                {p.maxSessions ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: nearLimit ? '#d97706' : 'var(--text-dark)' }}>{p.total}</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>/ {p.maxSessions}</span>
                      {nearLimit && <AlertTriangle size={13} style={{ color: '#f59e0b' }} />}
                    </div>
                    <div style={{ width: '70px', height: '5px', borderRadius: '3px', background: 'var(--border-light)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: '3px', width: `${progress}%`, background: nearLimit ? '#f59e0b' : 'var(--primary-blue)', transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-main)', padding: '0.2rem 0.6rem', borderRadius: '1rem' }}>{p.total}</span>
                )}
              </div>

              {/* 5. Estado */}
              <div className="patient-status-cell">
                <button onClick={e => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); setStatusMenuPos({ top: rect.bottom + 6, left: rect.left }); setStatusMenuId(statusMenuId === p.id ? null : p.id); setOptionsMenuId(null); }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.7rem', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 600, background: st.bg, color: st.color, border: 'none', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: st.dot, flexShrink: 0 }} />
                  {st.label}<ChevronDown size={11} style={{ opacity: 0.6 }} />
                </button>
              </div>

              {/* 6. Acciones */}
              <div className="patient-actions-cell" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem' }}>
                <button onClick={(e) => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); setOptionsMenuPos({ top: rect.bottom + 6, left: window.innerWidth < 768 ? rect.left - 150 : rect.right - 180 }); setOptionsMenuId(optionsMenuId === p.id ? null : p.id); setStatusMenuId(null); }}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.3rem', borderRadius: '50%', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-main)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <MoreVertical size={16} />
                </button>
                <ChevronRight size={18} className="chevron-desktop" style={{ color: 'var(--border-light)' }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Nuevo Paciente — rendered in document.body via portal to avoid overflow:auto clipping */}
      {showNewModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at 60% 50%, rgba(15,23,42,0.52) 0%, rgba(2,8,23,0.32) 100%)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowNewModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '580px', background: '#fff', borderRadius: '22px', boxShadow: '0 32px 80px rgba(0,0,0,0.22)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '1.75rem 2rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Nuevo paciente</h2>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0.3rem 0 0' }}>Completa los datos para registrarlo</p>
              </div>
              <button onClick={() => setShowNewModal(false)} style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: '1.75rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.4rem', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>Nombre completo *</label>
                <input type="text" placeholder="Ej. Ana García" value={newName} onChange={e => setNewName(e.target.value)} style={{ padding: '0.85rem 1.1rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.95rem', fontFamily: 'inherit', background: '#fafcff', width: '100%', boxSizing: 'border-box', outline: 'none' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>Correo electrónico</label>
                  <input type="email" placeholder="ana@correo.com" value={newEmail} onChange={e => { setNewEmail(e.target.value); checkDuplicate(e.target.value, newPhone); }} style={{ padding: '0.85rem 1.1rem', borderRadius: '10px', fontSize: '0.95rem', fontFamily: 'inherit', background: '#fafcff', width: '100%', boxSizing: 'border-box', outline: 'none', border: duplicateWarning ? '1.5px solid #f59e0b' : '1.5px solid #e2e8f0' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>Teléfono</label>
                  <input type="tel" placeholder="+56 9..." value={newPhone} onChange={e => { setNewPhone(e.target.value); checkDuplicate(newEmail, e.target.value); }} style={{ padding: '0.85rem 1.1rem', borderRadius: '10px', fontSize: '0.95rem', fontFamily: 'inherit', background: '#fafcff', width: '100%', boxSizing: 'border-box', outline: 'none', border: duplicateWarning ? '1.5px solid #f59e0b' : '1.5px solid #e2e8f0' }} />
                </div>
              </div>
              {duplicateWarning && (
                <div style={{ padding: '1rem 1.25rem', background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '10px' }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#92400e', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}><AlertTriangle size={14} /> Paciente ya registrado</p>
                  <p style={{ fontSize: '0.8rem', color: '#b45309', margin: '0.35rem 0 0' }}><strong>{duplicateWarning.name}</strong> ya existe con este correo o teléfono.</p>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>Estado inicial</label>
                <select value={newStatus} onChange={e => setNewStatus(e.target.value as PatientStatus)} style={{ padding: '0.85rem 1.1rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.95rem', fontFamily: 'inherit', background: '#fafcff', width: '100%', boxSizing: 'border-box', outline: 'none' }}>
                  <option value="Evaluación">Evaluación</option>
                  <option value="En proceso">En proceso</option>
                  <option value="En pausa">En pausa</option>
                </select>
              </div>
            </div>
            <div style={{ padding: '1.4rem 2rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', background: '#fafafa', borderRadius: '0 0 22px 22px' }}>
              <button onClick={() => setShowNewModal(false)} style={{ padding: '0.8rem 1.4rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: '0.93rem', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={saveNewPatient} disabled={!!duplicateWarning || !newName.trim() || saving} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.8rem 1.75rem', borderRadius: '10px', fontSize: '0.97rem', fontWeight: 700, opacity: (duplicateWarning || !newName.trim() || saving) ? 0.4 : 1, cursor: (duplicateWarning || !newName.trim() || saving) ? 'not-allowed' : 'pointer' }}>
                {newSaved ? <><CheckCircle2 size={16} /> Guardado</> : saving ? <><Loader2 size={16} /> Guardando...</> : <><Save size={16} /> Crear paciente</>}
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Status dropdown */}
      {statusMenuId && statusMenuPos && createPortal(
        <div id="patient-status-menu" style={{ position: 'fixed', top: statusMenuPos.top, left: statusMenuPos.left, zIndex: 9999, background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', boxShadow: '0 8px 32px rgba(0,0,0,0.13)', minWidth: '180px', overflow: 'hidden' }}>
          <div style={{ padding: '0.5rem 0.85rem', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #f1f5f9' }}>Cambiar estado</div>
          {(Object.entries(STATUS_CONFIG) as [PatientStatus, typeof STATUS_CONFIG[PatientStatus]][]).map(([key, cfg]) => (
            <button key={key} onClick={() => changeStatus(statusMenuId, key)} style={{ width: '100%', padding: '0.7rem 1rem', display: 'flex', alignItems: 'center', gap: '0.65rem', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: cfg.color, textAlign: 'left', transition: 'background 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background = cfg.bg)} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />{cfg.label}
            </button>
          ))}
        </div>
      , document.body)}

      {/* Options dropdown */}
      {optionsMenuId && optionsMenuPos && createPortal(
        <div id="patient-options-menu" style={{ position: 'fixed', top: optionsMenuPos.top, left: optionsMenuPos.left, zIndex: 9999, background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', boxShadow: '0 8px 32px rgba(0,0,0,0.13)', minWidth: '180px', overflow: 'hidden' }}>
          <button onClick={() => { setDeleteConfirmId(optionsMenuId); setOptionsMenuId(null); }} style={{ width: '100%', padding: '0.7rem 1rem', display: 'flex', alignItems: 'center', gap: '0.65rem', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#ef4444', textAlign: 'left', transition: 'background 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <Trash2 size={15} /> Eliminar paciente
          </button>
        </div>
      , document.body)}

      {/* Delete confirmation modal */}
      {deleteConfirmId && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setDeleteConfirmId(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '400px', background: '#fff', borderRadius: '20px', padding: '2rem', textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.18)', animation: 'slide-up 0.2s ease-out' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <AlertTriangle size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#0f172a' }}>¿Eliminar paciente?</h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0 0 1.5rem', lineHeight: 1.4 }}>
              Esta acción eliminará permanentemente al paciente de tu base de datos y no se podrá deshacer.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button onClick={() => setDeleteConfirmId(null)} style={{ padding: '0.75rem 1.25rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => handleDeletePatient(deleteConfirmId)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', borderRadius: '10px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>
                {deleting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={16} />}
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
    </>
  );
}
