"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, MapPin, Video, Clock, CreditCard, Edit2, Trash2, X, Save, CheckCircle2, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import type { Service, ServiceModality } from '@/lib/types';
import { supabase } from '@/utils/supabase';
import { usePsychologist, useCachedQuery, useDashboardCache } from '@/lib/dashboard-context';

const EMPTY_SERVICE: Omit<Service, 'id' | 'psychologist_id' | 'created_at'> = {
  name: '', description: '', modality: 'online',
  duration_minutes: 50, price: 0, address: '', is_active: true, is_first_session_only: false,
};

const DURATIONS = [20, 30, 45, 50, 60, 75, 90];
const MODALITY_CONFIG: Record<ServiceModality, { label: string; icon: React.ReactNode; bg: string; color: string; border: string }> = {
  online:     { label: 'Online',              icon: <Video size={15} />,   bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' },
  presencial: { label: 'Presencial',           icon: <MapPin size={15} />,  bg: '#ffedd5', color: '#c2410c', border: '#fed7aa' },
};

export default function ServicesPage() {
  const { psychologist } = usePsychologist();
  const { invalidate } = useDashboardCache();
  const psychologistId = psychologist?.id ?? null;
  const globalModality: 'online' | 'presencial' = (psychologist?.session_type as any) || 'online';
  const [services, setServices] = useState<Service[]>([]);
  const [modal, setModal] = useState<'new' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_SERVICE);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: cachedServices, loading } = useCachedQuery<Service[]>(
    psychologistId ? `services:list:${psychologistId}` : null,
    async () => {
      const { data } = await supabase
        .from('event_types')
        .select('*')
        .eq('psychologist_id', psychologistId!)
        .order('created_at', { ascending: true });
      return ((data as Record<string, unknown>[]) ?? []).map(r => ({
        id: r.id as string,
        psychologist_id: r.psychologist_id as string,
        name: (r.title ?? r.name) as string,
        description: (r.description ?? '') as string,
        modality: ((r.mode ?? r.modality) ?? 'online') as Service['modality'],
        duration_minutes: r.duration_minutes as number,
        price: Number(r.price ?? 0),
        address: (r.address ?? '') as string,
        is_active: (r.is_active ?? true) as boolean,
        is_first_session_only: (r.is_first_session_only ?? false) as boolean,
        created_at: r.created_at as string,
      }));
    },
  );

  useEffect(() => {
    if (cachedServices) setServices(cachedServices);
  }, [cachedServices]);

  const loadServices = () => { if (psychologistId) invalidate(`services:list:${psychologistId}`); };

  const openNew = () => { setForm(EMPTY_SERVICE); setEditingId(null); setModal('new'); };
  const openEdit = (svc: Service) => {
    setForm({ name: svc.name, description: svc.description, modality: svc.modality, duration_minutes: svc.duration_minutes, price: svc.price, address: svc.address || '', is_active: svc.is_active, is_first_session_only: svc.is_first_session_only });
    setEditingId(svc.id); setModal('edit');
  };

  const toggleActive = async (id: string) => {
    const svc = services.find(s => s.id === id);
    if (!svc) return;
    const newVal = !svc.is_active;
    setServices(prev => prev.map(s => s.id === id ? { ...s, is_active: newVal } : s));
    await supabase.from('event_types').update({ is_active: newVal }).eq('id', id);
  };

  const deleteService = async (id: string) => {
    if (!confirm('¿Eliminar este servicio? Los pacientes no podrán agendarlo.')) return;
    setServices(prev => prev.filter(s => s.id !== id));
    await supabase.from('event_types').delete().eq('id', id);
  };

  const handleSave = async () => {
    if (!psychologistId) return;
    setSaving(true);
    // Map Service type fields (name, modality) → DB columns (title, mode)
    const dbPayload = {
      title: form.name,
      description: form.description,
      mode: globalModality,
      duration_minutes: form.duration_minutes,
      price: form.price,
      address: globalModality === 'presencial' ? form.address || null : null,
      is_active: form.is_active,
      is_first_session_only: form.is_first_session_only,
    };
    if (modal === 'new') {
      const { data, error } = await supabase
        .from('event_types')
        .insert([{ ...dbPayload, psychologist_id: psychologistId }])
        .select().single();
      if (error) { console.error(error); setSaving(false); return; }
      if (data) {
        const r = data as Record<string, unknown>;
        setServices(prev => [...prev, {
          id: r.id as string,
          psychologist_id: r.psychologist_id as string,
          name: (r.title ?? r.name) as string,
          description: (r.description ?? '') as string,
          modality: ((r.mode ?? r.modality) ?? 'online') as Service['modality'],
          duration_minutes: r.duration_minutes as number,
          price: Number(r.price ?? 0),
          address: (r.address ?? '') as string,
          is_active: (r.is_active ?? true) as boolean,
          is_first_session_only: (r.is_first_session_only ?? false) as boolean,
          created_at: r.created_at as string,
        }]);
      }
    } else if (editingId) {
      const { error } = await supabase.from('event_types').update(dbPayload).eq('id', editingId);
      if (error) { console.error(error); setSaving(false); return; }
      setServices(prev => prev.map(s => s.id === editingId ? { ...s, ...form } : s));
    }
    setSaving(false); setSaved(true);
    setTimeout(() => { setSaved(false); setModal(null); }, 800);
  };

  const setF = (field: string, value: unknown) => setForm(prev => ({ ...prev, [field]: value }));
  const activeCount = services.filter(s => s.is_active).length;

  return (
    <>
      <style>{`
        .services-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 2rem;
          gap: 1rem;
        }
        .services-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.25rem;
        }

        @media (max-width: 768px) {
          .services-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .services-header button {
            width: 100%;
            justify-content: center;
          }
          .services-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <div className="animate-slide-up">
      <div className="services-header">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.2rem' }}>Mis Servicios</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
            {activeCount} servicio{activeCount !== 1 ? 's' : ''} activo{activeCount !== 1 ? 's' : ''} · Aparecen en tu perfil público
          </p>
        </div>
        <button onClick={openNew} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.5rem', fontSize: '0.9rem' }}>
          <Plus size={18} /> Nuevo Servicio
        </button>
      </div>

      <div style={{ marginBottom: '1.5rem', padding: '1rem 1.5rem', background: '#f0fdf4', borderRadius: 'var(--radius-md)', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <ArrowRight size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
        <p style={{ fontSize: '0.88rem', color: '#15803d', margin: 0 }}>Los servicios activos aparecen automáticamente en tu perfil público.</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', color: 'var(--text-muted)', gap: '1rem' }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary-blue)' }} />
          <p>Cargando servicios...</p>
        </div>
      ) : (
        <div className="services-grid">
          {services.map(svc => {
            const mod = MODALITY_CONFIG[svc.modality];
            return (
              <div key={svc.id} className="premium-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem', opacity: svc.is_active ? 1 : 0.55, transition: 'opacity 0.2s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.75rem', borderRadius: '2rem', fontSize: '0.78rem', fontWeight: 700, background: mod.bg, color: mod.color, border: `1px solid ${mod.border}` }}>
                    {mod.icon} {mod.label}
                  </span>
                  {!svc.is_active && <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg-main)', padding: '0.2rem 0.6rem', borderRadius: '1rem', border: '1px solid var(--border-light)' }}>Inactivo</span>}
                </div>
                {(svc as any).is_first_session_only && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.22rem 0.65rem', background: '#fef9ee', border: '1px solid #fde68a', borderRadius: '2rem', fontSize: '0.74rem', fontWeight: 700, color: '#92400e', width: 'fit-content' }}>Solo primera consulta</div>
                )}
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.5rem' }}>{svc.name}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{svc.description}</p>
                </div>
                {svc.address && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    <MapPin size={14} style={{ flexShrink: 0, marginTop: '0.1rem', color: '#f97316' }} />{svc.address}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: 500 }}><Clock size={14} /> {svc.duration_minutes} min</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.95rem', fontWeight: 800, color: svc.price === 0 ? '#16a34a' : 'var(--text-dark)' }}>
                    <CreditCard size={14} style={{ color: 'var(--text-muted)' }} />
                    {svc.price === 0 ? 'Gratis' : `$${svc.price.toLocaleString('es-CL')} CLP`}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                  <button onClick={() => toggleActive(svc.id)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.55rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', background: 'transparent', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                    {svc.is_active ? <><EyeOff size={14} /> Pausar</> : <><Eye size={14} /> Activar</>}
                  </button>
                  <button onClick={() => openEdit(svc)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.55rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', background: 'transparent', color: 'var(--primary-blue)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <Edit2 size={14} /> Editar
                  </button>
                  <button onClick={() => deleteService(svc.id)} style={{ width: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', background: 'transparent', color: '#ef4444', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
          {services.length === 0 && !loading && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Sin servicios aún</p>
              <p style={{ fontSize: '0.88rem' }}>Crea tu primer servicio para que los pacientes puedan agendarte.</p>
            </div>
          )}
          <button onClick={openNew} style={{ minHeight: '200px', borderRadius: 'var(--radius-md)', border: '2px dashed var(--border-light)', background: 'transparent', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary-blue)'; (e.currentTarget as HTMLElement).style.color = 'var(--primary-blue)'; (e.currentTarget as HTMLElement).style.background = 'var(--primary-light-blue)'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-light)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
            <Plus size={28} /><span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Agregar servicio</span>
          </button>
        </div>
      )}

      {/* Modal */}
      {modal && createPortal(
        <div onClick={() => setModal(null)} style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at 60% 50%, rgba(15,23,42,0.52) 0%, rgba(2,8,23,0.32) 100%)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()} className="animate-slide-up" style={{ width: '100%', maxWidth: '560px', background: 'var(--bg-white)', borderRadius: '22px', boxShadow: '0 30px 80px rgba(0,0,0,0.18)', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fcfcfc' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-dark)' }}>{modal === 'new' ? 'Nuevo Servicio' : 'Editar Servicio'}</h2>
                <button onClick={() => setModal(null)} style={{ padding: '0.3rem', color: 'var(--text-muted)', cursor: 'pointer', borderRadius: '8px' }}><X size={20} /></button>
              </div>
              <div style={{ padding: '1.75rem 2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-dark)' }}>Nombre del servicio</label>
                  <input type="text" value={form.name} onChange={e => setF('name', e.target.value)} placeholder="Ej. Psicoterapia Individual" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-dark)' }}>Descripción <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.8rem' }}>— Visible en tu perfil público</span></label>
                  <textarea rows={3} value={form.description} onChange={e => setF('description', e.target.value)} placeholder="Describe qué incluye esta sesión..." style={{ resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-dark)' }}>Modalidad</label>
                  <div style={{ padding: '0.6rem 1rem', background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', width: 'fit-content' }}>
                    {globalModality === 'online' ? <Video size={16} style={{ color: '#0369a1' }} /> : <MapPin size={16} style={{ color: '#c2410c' }} />}
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-dark)' }}>
                      {globalModality === 'online' ? 'Online' : 'Presencial'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>(Configurado en Integraciones)</span>
                  </div>
                </div>
                {globalModality === 'presencial' && (
                  <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-dark)' }}>Dirección de la consulta</label>
                    <input type="text" value={form.address || ''} onChange={e => setF('address', e.target.value)} placeholder="Av. Providencia 1234, Oficina 501" />
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-dark)' }}>Duración</label>
                    <select value={form.duration_minutes} onChange={e => setF('duration_minutes', Number(e.target.value))}>
                      {DURATIONS.map(d => <option key={d} value={d}>{d} minutos</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-dark)' }}>Precio (CLP)</label>
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--bg-white)' }}>
                      <span style={{ padding: '0 0.75rem', color: 'var(--text-muted)', fontWeight: 700, borderRight: '1px solid var(--border-light)', background: 'var(--bg-main)' }}>$</span>
                      <input type="number" value={form.price || ''} onChange={e => setF('price', Number(e.target.value))} placeholder="0 = Gratis" min={0} step={1000} style={{ border: 'none', borderRadius: 0, flex: 1 }} />
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ padding: '1.25rem 2rem', borderTop: '1px solid var(--border-light)', background: '#fcfcfc', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button onClick={() => setModal(null)} style={{ padding: '0.65rem 1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', background: 'transparent', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={handleSave} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.75rem' }}>
                  {saved ? <><CheckCircle2 size={17} /> Guardado</> : saving ? <><Loader2 size={17} /> Guardando...</> : <><Save size={17} /> {modal === 'new' ? 'Crear Servicio' : 'Guardar Cambios'}</>}
                </button>
              </div>
          </div>
        </div>
      , document.body)}
    </div>
    </>
  );
}
