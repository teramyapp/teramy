"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard, Shield, Download, Trash2, LogOut, CheckCircle2,
  AlertTriangle, ChevronRight, Calendar, Zap, Clock, RefreshCcw,
  Lock, Eye, EyeOff, X, FileJson, FileSpreadsheet, Check, Star,
} from 'lucide-react';
import { supabase } from '@/utils/supabase';


// ── Reusable section card ──────────────────────────────────────────────────
function SectionCard({ title, icon, children, danger }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div style={{
      background: 'var(--bg-white)',
      borderRadius: 'var(--radius-lg)',
      border: danger ? '1px solid #fecaca' : '1px solid var(--border-light)',
      boxShadow: 'var(--shadow-sm)',
      overflow: 'hidden',
    }}>
      <div className="section-card-header" style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '1.4rem 2rem',
        borderBottom: danger ? '1px solid #fecaca' : '1px solid var(--border-light)',
        background: danger ? '#fff5f5' : 'var(--bg-white)',
      }}>
        <span style={{ color: danger ? '#ef4444' : 'var(--primary-blue)' }}>{icon}</span>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: danger ? '#ef4444' : 'var(--text-dark)', margin: 0 }}>
          {title}
        </h2>
      </div>
      <div className="section-card-content" style={{ padding: '1.75rem 2rem' }}>
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value, action }: { label: string; value: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="info-row">
      <div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '0.15rem' }}>{label}</p>
        <div style={{ fontSize: '0.97rem', fontWeight: 600, color: 'var(--text-dark)' }}>{value}</div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

function DangerButton({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem 1.25rem',
        borderRadius: 'var(--radius-sm)', border: '1px solid #fecaca', background: 'white',
        color: '#ef4444', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
        transition: 'all 0.2s', width: '100%', marginBottom: '0.75rem',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fef2f2'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'white'; }}
    >
      {icon} {label}
    </button>
  );
}

// ── Confirmation Modal ─────────────────────────────────────────────────────
function Modal({ title, description, confirmLabel, confirmDanger, onConfirm, onCancel, children }: {
  title: string;
  description: string;
  confirmLabel: string;
  confirmDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}) {
  return (
    <>
      <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', zIndex: 1000 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        background: 'white', borderRadius: '20px', padding: '2.5rem', maxWidth: '440px', width: '90%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.14)', zIndex: 1001,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: confirmDanger ? '#fef2f2' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {confirmDanger ? <AlertTriangle size={22} style={{ color: '#ef4444' }} /> : <CheckCircle2 size={22} style={{ color: '#0ea5e9' }} />}
          </div>
          <button onClick={onCancel} style={{ color: '#94a3b8', cursor: 'pointer', background: 'none', border: 'none', padding: '0.2rem' }}>
            <X size={20} />
          </button>
        </div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>{title}</h3>
        <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.6, marginBottom: '1.5rem' }}>{description}</p>
        {children}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '0.8rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '0.8rem', borderRadius: '10px', border: 'none',
              background: confirmDanger ? '#ef4444' : 'linear-gradient(135deg,#0369a1,#0ea5e9)',
              color: 'white', fontWeight: 700, cursor: 'pointer',
              boxShadow: confirmDanger ? '0 4px 12px rgba(239,68,68,0.3)' : '0 4px 12px rgba(14,165,233,0.3)',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState('');
  const [memberSince, setMemberSince] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState<'trialing' | 'active' | 'paused' | 'cancelled' | string>('trialing');
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [psychologistId, setPsychologistId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (user) {
        setUserEmail(user.email ?? '');
        const d = new Date(user.created_at);
        setMemberSince(d.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }));

        const { data: psych } = await supabase
          .from('psychologists')
          .select('id, subscription_status, trial_ends_at')
          .eq('user_id', user.id)
          .single();

        if (psych) {
          setPsychologistId(psych.id);
          setUserId(user.id);
          setSubscriptionStatus(psych.subscription_status);
          setTrialEndsAt(psych.trial_ends_at);
        }
      }
      setLoading(false);
    }
    loadData();
  }, []);

  // Modals
  const [modal, setModal] = useState<
    null | 'cancel_plan' | 'delete_account' | 'logout' | 'download_json' | 'download_csv' | 'change_password' | 'change_card'
  >(null);

  // Password change
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);

  // Download done toast
  const [downloadDone, setDownloadDone] = useState('');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleDeleteAccount = async () => {
    if (!psychologistId || !userId) return;
    
    try {
      const res = await fetch('/api/user/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ psychologistId, userId }),
      });
      
      if (res.ok) {
        await supabase.auth.signOut();
        router.push('/');
      } else {
        alert('Error al eliminar la cuenta. Por favor contacta a soporte.');
      }
    } catch (err) {
      console.error(err);
      alert('Hubo un problema al procesar la solicitud.');
    }
  };

  const handleCancelPlan = async () => {
    if (!psychologistId || !userId) return;
    try {
      const res = await fetch('/api/user/cancel-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ psychologistId, userId }),
      });
      if (res.ok) {
        setSubscriptionStatus('cancelled');
        setModal(null);
      } else {
        alert('Error al cancelar el plan. Por favor intenta de nuevo.');
      }
    } catch (err) {
      console.error(err);
      alert('Hubo un problema al procesar la solicitud.');
    }
  };

  const handleDownload = async (format: 'json' | 'csv') => {
    if (!psychologistId) return;

    // Fetch real data
    const { data: patients } = await supabase.from('patients').select('*').eq('psychologist_id', psychologistId);
    const { data: appointments } = await supabase.from('appointments').select('*').eq('psychologist_id', psychologistId);

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: { email: userEmail, memberSince },
      subscription: { status: subscriptionStatus, trialEndsAt },
      patients: patients || [],
      appointments: appointments || [],
    };

    let blob: Blob; let filename: string;
    if (format === 'json') {
      blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      filename = `teramy-export-${new Date().toISOString().split('T')[0]}.json`;
    } else {
      // Basic CSV export for patients
      const headers = ['Nombre', 'Email', 'Teléfono', 'Creado en'];
      const rows = (patients || []).map(p => [
        p.name || '',
        p.email || '',
        p.phone || '',
        p.created_at || ''
      ].join(','));
      
      const csvContent = [headers.join(','), ...rows].join('\n');
      blob = new Blob([csvContent], { type: 'text/csv' });
      filename = `teramy-pacientes-${new Date().toISOString().split('T')[0]}.csv`;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    setModal(null); setDownloadDone(format.toUpperCase());
    setTimeout(() => setDownloadDone(''), 3000);
  };

  const handlePasswordSave = async () => {
    await supabase.auth.updateUser({ password: newPw });
    setPwSaved(true);
    setTimeout(() => { setPwSaved(false); setModal(null); setCurrentPw(''); setNewPw(''); }, 1500);
  };

  return (
    <>
      <style>{`
        .settings-header {
          margin-bottom: 2.25rem;
        }
        .settings-grid {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .plan-badge-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(135deg, #f0f9ff, #e8f4fc);
          border-radius: 14px;
          padding: 1.25rem 1.75rem;
          margin-bottom: 1.75rem;
          border: 1px solid rgba(14,165,233,0.2);
        }
        .data-buttons-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }
        .info-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.85rem 0;
          border-bottom: 1px solid var(--border-light);
        }

        @media (max-width: 768px) {
          .settings-header h1 {
            font-size: 1.75rem !important;
          }
          .section-card-header {
            padding: 1.25rem 1.5rem !important;
          }
          .section-card-content {
            padding: 1.5rem !important;
          }
          .plan-badge-container {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
            padding: 1.25rem !important;
          }
          .plan-badge-price {
            font-size: 2rem !important;
          }
          .info-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }
          .info-row div:last-child {
            width: 100%;
          }
          .info-row button {
            width: 100%;
            justify-content: space-between;
          }
          .data-buttons-grid {
            grid-template-columns: 1fr;
          }
          .modal-box {
            padding: 1.5rem !important;
          }
        }
      `}</style>
      <div className="animate-slide-up">

      {/* Header */}
      <div className="settings-header">
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.2rem' }}>
          Configuración
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
          Gestiona tu plan, seguridad y datos de cuenta.
        </p>
      </div>

      <div className="settings-grid">
        
        {subscriptionStatus === 'trialing' && trialEndsAt && (
          <div style={{ 
            background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)', 
            border: '1px solid #bae6fd', 
            borderRadius: '16px', 
            padding: '1.25rem 1.75rem', 
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)'
          }}>
            <div style={{ 
              width: '40px', height: '40px', borderRadius: '12px', background: 'white', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
            }}>
              <Zap size={20} style={{ color: '#0284c7' }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 800, color: '#0c4a6e', fontSize: '0.95rem', marginBottom: '0.1rem' }}>
                Aprovecha al máximo tu periodo de prueba
              </p>
              <p style={{ fontSize: '0.85rem', color: '#0369a1', fontWeight: 500 }}>
                Tu acceso de prueba gratuita finalizará el {new Date(trialEndsAt).toLocaleDateString('es-CL')}. ¡Suscríbete para asegurar tu lugar en Teramy Pro!
              </p>
            </div>
            <button 
              onClick={() => router.push('/subscribe')}
              style={{ 
                padding: '0.6rem 1.25rem', borderRadius: '10px', background: '#0284c7', color: 'white', 
                fontWeight: 700, fontSize: '0.85rem', border: 'none', cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.2)'
              }}
            >
              Suscribirme ahora
            </button>
          </div>
        )}

        {subscriptionStatus === 'active' && (
          <div style={{ 
            background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', 
            border: '1px solid #bbf7d0', 
            borderRadius: '16px', 
            padding: '1.25rem 1.75rem', 
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 4px 12px rgba(22, 163, 74, 0.08)'
          }}>
            <div style={{ 
              width: '40px', height: '40px', borderRadius: '12px', background: 'white', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
            }}>
              <CheckCircle2 size={20} style={{ color: '#16a34a' }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 800, color: '#14532d', fontSize: '0.95rem', marginBottom: '0.1rem' }}>
                ¡Eres Miembro Pro!
              </p>
              <p style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 500 }}>
                Gracias por ser parte de Teramy. Tienes acceso ilimitado a todas las funcionalidades profesionales.
              </p>
            </div>
          </div>
        )}

        <SectionCard 
          title="Plan y suscripción" 
          icon={subscriptionStatus === 'active' ? <Star size={20} style={{ color: '#f59e0b' }} /> : <Zap size={20} />}
        >

          {/* Plan badge */}
          <div className="plan-badge-container">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-dark-blue)' }}>
                  {subscriptionStatus === 'trialing' ? 'Teramy Trial' : 'Teramy Pro'}
                </span>
                <span style={{ 
                  padding: '0.15rem 0.65rem', 
                  borderRadius: '2rem', 
                  background: subscriptionStatus === 'active' ? 'linear-gradient(135deg, #dcfce7, #bbf7d0)' : subscriptionStatus === 'trialing' ? '#eff6ff' : '#fee2e2', 
                  color: subscriptionStatus === 'active' ? '#15803d' : subscriptionStatus === 'trialing' ? '#0ea5e9' : '#ef4444', 
                  fontSize: '0.72rem', 
                  fontWeight: 800, 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.05em',
                  border: subscriptionStatus === 'active' ? '1px solid #86efac' : 'none'
                }}>
                  ● {
                    subscriptionStatus === 'active' ? 'Activo' : 
                    subscriptionStatus === 'trialing' ? 'En Prueba' : 
                    subscriptionStatus === 'cancelled' ? 'Cancelado' : 'Pausado'
                  }
                </span>
              </div>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                {subscriptionStatus === 'trialing' ? 'Sin cobros actuales (Periodo de prueba gratuito)' : '$19.990 CLP / mensual'} · Miembro desde {memberSince || '—'}
              </p>
            </div>
            <div className="plan-badge-price" style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--primary-dark-blue)', lineHeight: 1 }}>
              {subscriptionStatus === 'trialing' ? 'Prueba' : '$19.990'}
            </div>
          </div>

          <InfoRow 
            label={subscriptionStatus === 'trialing' ? "Fin del trial" : "Próximo cobro"} 
            value={
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={15} style={{ color: 'var(--primary-blue)' }} /> 
                {trialEndsAt ? new Date(trialEndsAt).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Por confirmar'}
              </span>
            } 
          />
          <InfoRow label="Frecuencia de pago" value="Mensual" action={<button style={{ fontSize: '0.8rem', color: 'var(--primary-blue)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>Cambiar <ChevronRight size={14} /></button>} />
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
            {subscriptionStatus === 'trialing' ? (
              <button onClick={() => router.push('/subscribe')} style={{ padding: '0.7rem 1.25rem', borderRadius: '10px', border: 'none', background: 'var(--primary-blue)', color: 'white', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Zap size={15} /> Suscribirme a Teramy Pro
              </button>
            ) : (
              <button onClick={() => setModal('cancel_plan')} style={{ padding: '0.7rem 1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <X size={15} /> Cancelar plan
              </button>
            )}
          </div>
        </SectionCard>

                {/* Método de pago */}
        <SectionCard title="Método de pago" icon={<CreditCard size={20} />}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1rem' }}>
            La gestión de métodos de pago e historial de facturas se realiza directamente desde Mercado Pago.
          </p>
          <InfoRow label="Estado" value={
            <span style={{ 
              color: subscriptionStatus === 'active' ? '#16a34a' : subscriptionStatus === 'trialing' ? '#0284c7' : '#ef4444', 
              fontWeight: 700 
            }}>
              {subscriptionStatus === 'active' ? '✓ Suscripción activa' 
                : subscriptionStatus === 'trialing' ? '⏳ En período de prueba' 
                : '✗ Sin suscripción activa'}
            </span>}
            action={<button onClick={() => setModal('change_card')} style={{ fontSize: '0.82rem', color: 'var(--primary-blue)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>Gestionar <ChevronRight size={14} /></button>}
          />
        </SectionCard>

                {/* ── 3. SEGURIDAD ── */}
        <SectionCard title="Seguridad de cuenta" icon={<Shield size={20} />}>
          <InfoRow
            label="Correo de acceso"
            value={userEmail || '—'}
            action={
              <span style={{ padding: '0.2rem 0.65rem', borderRadius: '2rem', background: '#f0fdf4', color: '#16a34a', fontSize: '0.72rem', fontWeight: 700 }}>Verificado ✓</span>
            }
          />
          <InfoRow
            label="Contraseña"
            value="••••••••••••"
            action={
              <button
                onClick={() => setModal('change_password')}
                style={{ fontSize: '0.82rem', color: 'var(--primary-blue)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              >
                Cambiar <ChevronRight size={14} />
              </button>
            }
          />
          <InfoRow
            label="Autenticación en 2 pasos"
            value={<span style={{ color: '#d97706', fontWeight: 600, fontSize: '0.88rem' }}>⚠️ No activada</span>}
            action={
              <button style={{ padding: '0.4rem 0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: 'var(--text-dark)', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', opacity: 0.7 }}>
                Próximamente
              </button>
            }
          />
          <div style={{ marginTop: '1.5rem', padding: '0.9rem 1rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
            <Lock size={15} style={{ color: '#64748b', marginTop: '2px', flexShrink: 0 }} />
            <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}>
              Tus notas de sesión y datos de pacientes nunca son accedidos por el equipo de Teramy. Solo tú puedes ver esa información.
            </p>
          </div>
        </SectionCard>

        {/* ── 4. TUS DATOS ── */}
        <SectionCard title="Tus datos" icon={<Download size={20} />}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            Descarga una copia completa de tu información: pacientes, sesiones y notas. Tus datos son tuyos y siempre puedes llevártelos.
          </p>
          <div className="data-buttons-grid">
            <button
              onClick={() => setModal('download_json')}
              style={{ padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', transition: 'all 0.2s', textAlign: 'left' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary-blue)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-light)'; }}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileJson size={20} style={{ color: 'var(--primary-blue)' }} />
              </div>
              <div>
                <p style={{ fontWeight: 700, color: 'var(--text-dark)', fontSize: '0.9rem', marginBottom: '0.1rem' }}>Descargar JSON</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Formato completo, para developers</p>
              </div>
            </button>
            <button
              onClick={() => setModal('download_csv')}
              style={{ padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', transition: 'all 0.2s', textAlign: 'left' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#10b981'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-light)'; }}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileSpreadsheet size={20} style={{ color: '#10b981' }} />
              </div>
              <div>
                <p style={{ fontWeight: 700, color: 'var(--text-dark)', fontSize: '0.9rem', marginBottom: '0.1rem' }}>Descargar CSV</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Para Excel u otras planillas</p>
              </div>
            </button>
          </div>
        </SectionCard>

        {/* ── 5. SESIÓN ── */}
        <SectionCard title="Sesión" icon={<LogOut size={20} />}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Cierra tu sesión en este dispositivo. Tus datos quedan guardados y puedes volver a ingresar cuando quieras.
          </p>
          <button
            onClick={() => setModal('logout')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.8rem 1.5rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: 'white', color: '#1e293b', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f8fafc'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'white'; }}
          >
            <LogOut size={17} style={{ color: '#64748b' }} /> Cerrar sesión
          </button>
        </SectionCard>

        {/* ── 6. ZONA DE PELIGRO ── */}
        <SectionCard title="Zona de peligro" icon={<AlertTriangle size={20} />} danger>
          <p style={{ fontSize: '0.9rem', color: '#7f1d1d', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            Las siguientes acciones son <strong>irreversibles</strong>. Por favor, lee bien antes de continuar.
          </p>
          <DangerButton
            onClick={() => setModal('cancel_plan')}
            icon={<RefreshCcw size={16} />}
            label="Cancelar mi suscripción"
          />
          <DangerButton
            onClick={() => setModal('delete_account')}
            icon={<Trash2 size={16} />}
            label="Eliminar mi cuenta permanentemente"
          />
        </SectionCard>

      </div>

      {/* ── Toast ── */}
      {downloadDone && (
        <div style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', background: '#0f172a', color: 'white', padding: '0.9rem 1.75rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.6rem', zIndex: 2000, boxShadow: '0 8px 32px rgba(0,0,0,0.25)', fontWeight: 600, fontSize: '0.9rem' }}>
          <Check size={18} style={{ color: '#4ade80' }} /> Archivo {downloadDone} descargado correctamente
        </div>
      )}

      {/* ── MODALS ── */}

      {/* Cerrar sesión */}
      {modal === 'logout' && (
        <Modal
          title="¿Cerrar sesión?"
          description="Saldrás de tu cuenta en este dispositivo. Puedes volver a ingresar en cualquier momento."
          confirmLabel="Sí, cerrar sesión"
          onConfirm={handleLogout}
          onCancel={() => setModal(null)}
        />
      )}

      {/* Cancelar plan */}
      {modal === 'cancel_plan' && (
        <Modal
          title="¿Cancelar tu suscripción?"
          description={subscriptionStatus === 'trialing' ? "Tu periodo de prueba terminará y tu cuenta quedará limitada hasta que elijas un plan." : "Al cancelar, seguirás teniendo acceso hasta el final de tu ciclo de facturación actual. Después, tu cuenta pasará al modo gratuito con funcionalidades limitadas."}
          confirmLabel="Sí, cancelar plan"
          confirmDanger
          onConfirm={handleCancelPlan}
          onCancel={() => setModal(null)}
        >
          <div style={{ padding: '0.85rem 1rem', background: '#fef9ee', border: '1px solid #fde68a', borderRadius: '10px', marginBottom: '1.25rem', fontSize: '0.85rem', color: '#92400e', display: 'flex', gap: '0.5rem' }}>
            ⚠️ Tus datos y pacientes <strong>no se eliminarán</strong>. Solo perderás acceso a funciones Pro.
          </div>
        </Modal>
      )}

      {/* Eliminar cuenta */}
      {modal === 'delete_account' && (
        <Modal
          title="¿Eliminar tu cuenta?"
          description="Esto eliminará permanentemente tu perfil, todos tus pacientes, sesiones y notas. Esta acción no se puede deshacer."
          confirmLabel="Eliminar todo, entiendo"
          confirmDanger
          onConfirm={handleDeleteAccount}
          onCancel={() => setModal(null)}
        >
          <div style={{ padding: '0.85rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', marginBottom: '1.25rem', fontSize: '0.85rem', color: '#7f1d1d', display: 'flex', gap: '0.5rem' }}>
            🔴 <span>Te recomendamos <strong>descargar tus datos</strong> antes de eliminar tu cuenta.</span>
          </div>
        </Modal>
      )}

      {/* Descargar JSON */}
      {modal === 'download_json' && (
        <Modal
          title="Descargar datos en JSON"
          description="Generaremos un archivo con todos tus pacientes, sesiones y configuración de cuenta en formato JSON."
          confirmLabel="Descargar JSON"
          onConfirm={() => handleDownload('json')}
          onCancel={() => setModal(null)}
        />
      )}

      {/* Descargar CSV */}
      {modal === 'download_csv' && (
        <Modal
          title="Descargar datos en CSV"
          description="Generaremos un archivo compatible con Excel con el listado de tus pacientes y sesiones."
          confirmLabel="Descargar CSV"
          onConfirm={() => handleDownload('csv')}
          onCancel={() => setModal(null)}
        />
      )}

      {/* Cambiar contraseña */}
      {modal === 'change_password' && (
        <>
          <div onClick={() => setModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', zIndex: 1000 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'white', borderRadius: '20px', padding: '2.5rem', maxWidth: '420px', width: '90%', boxShadow: '0 24px 64px rgba(0,0,0,0.14)', zIndex: 1001 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Cambiar contraseña</h3>
              <button onClick={() => setModal(null)} style={{ color: '#94a3b8', cursor: 'pointer', background: 'none', border: 'none' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.83rem', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '0.4rem' }}>Contraseña actual</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPw ? 'text' : 'password'} value={currentPw} onChange={e => setCurrentPw(e.target.value)}
                    placeholder="••••••••"
                    style={{ width: '100%', padding: '0.75rem 3rem 0.75rem 1rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.92rem', outline: 'none', boxSizing: 'border-box' }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#0ea5e9')} onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', cursor: 'pointer', background: 'none', border: 'none', display: 'flex' }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.83rem', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '0.4rem' }}>Nueva contraseña</label>
                <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.92rem', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#0ea5e9')} onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.75rem' }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: '0.8rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handlePasswordSave} disabled={!currentPw || newPw.length < 8}
                style={{ flex: 1, padding: '0.8rem', borderRadius: '10px', border: 'none', background: pwSaved ? '#10b981' : 'linear-gradient(135deg,#0369a1,#0ea5e9)', color: 'white', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', transition: 'all 0.3s' }}>
                {pwSaved ? <><CheckCircle2 size={16} /> Guardada</> : <><Lock size={15} /> Guardar</>}
              </button>
            </div>
          </div>
        </>
      )}

      {modal === 'change_card' && (
        <Modal
          title="Gestionar método de pago"
          description="Serás redirigido a Mercado Pago para administrar tu suscripción, tarjetas guardadas e historial de pagos."
          confirmLabel="Ir a Mercado Pago"
          onConfirm={() => { setModal(null); window.open('https://www.mercadopago.cl/subscriptions', '_blank'); }}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
    </>
  );
}
