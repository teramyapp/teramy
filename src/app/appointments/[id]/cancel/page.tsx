"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { XCircle, Calendar, Clock, User, Sparkles, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function CancelAppointmentPage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appointment, setAppointment] = useState<any>(null);
  const [isCancelled, setIsCancelled] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchDetails = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('appointments')
          .select('*, patients(*), psychologists(*)')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;
        setAppointment(data);
        if (data.status === 'cancelled') {
          setIsCancelled(true);
        }
      } catch (err: any) {
        console.error('Error fetching appointment details:', err);
        setError(err.message || 'No se pudo cargar la información de la sesión.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  const handleCancel = async () => {
    if (!id) return;
    setCancelling(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (updateError) throw updateError;
      setIsCancelled(true);
    } catch (err: any) {
      console.error('Error cancelling appointment:', err);
      setError(err.message || 'No se pudo cancelar la sesión. Por favor contacta a tu terapeuta directamente.');
    } finally {
      setCancelling(false);
    }
  };

  const formatDateStr = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const formatted = format(date, "EEEE d 'de' MMMM", { locale: es });
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    } catch {
      return '';
    }
  };

  const formatTimeStr = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return format(date, "HH:mm");
    } catch {
      return '';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #fef2f2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '480px',
        background: 'white',
        borderRadius: '24px',
        boxShadow: '0 20px 40px rgba(15, 23, 42, 0.08)',
        padding: '2.5rem 2rem',
        textAlign: 'center',
        border: '1px solid rgba(226, 232, 240, 0.8)'
      }}>
        {loading ? (
          <div style={{ padding: '2rem 0' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #fef2f2',
              borderTopColor: '#ef4444',
              borderRadius: '50%',
              margin: '0 auto 1.5rem',
              animation: 'spin 1s linear infinite'
            }} />
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>Cargando información...</h3>
          </div>
        ) : error ? (
          <div>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem'
            }}>
              <AlertTriangle size={32} style={{ color: '#ef4444' }} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#991b1b', marginBottom: '0.75rem' }}>Ocurrió un inconveniente</h3>
            <p style={{ fontSize: '0.92rem', color: '#64748b', lineHeight: 1.6, marginBottom: '1.5rem' }}>{error}</p>
          </div>
        ) : isCancelled ? (
          <div>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              boxShadow: '0 8px 24px rgba(239, 68, 68, 0.15)'
            }}>
              <XCircle size={32} style={{ color: '#ef4444' }} />
            </div>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
              Sesión Cancelada
            </h3>
            <p style={{ fontSize: '0.92rem', color: '#64748b', lineHeight: 1.5, marginBottom: '2rem' }}>
              La sesión ha sido cancelada. Ya actualizamos tu agenda y le notificamos a tu terapeuta.
            </p>

            <div style={{
              background: '#f8fafc',
              borderRadius: '16px',
              padding: '1.25rem 1.5rem',
              textAlign: 'left',
              border: '1px solid #f1f5f9',
              marginBottom: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              {appointment.psychologists && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <User size={18} style={{ color: '#94a3b8', flexShrink: 0 }} />
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Psicólogo/a</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
                      {appointment.psychologists.name}
                    </span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Calendar size={18} style={{ color: '#94a3b8', flexShrink: 0 }} />
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Fecha original</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
                    {formatDateStr(appointment.start_time)}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Clock size={18} style={{ color: '#94a3b8', flexShrink: 0 }} />
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Hora original</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
                    {formatTimeStr(appointment.start_time)} hrs
                  </span>
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              color: '#94a3b8',
              fontSize: '0.75rem',
              borderTop: '1px solid #f1f5f9',
              paddingTop: '1.5rem'
            }}>
              <Sparkles size={12} style={{ color: '#3b82f6' }} />
              <span>Tecnología de agendamiento provista por <strong>Teramy</strong></span>
            </div>
          </div>
        ) : (
          <div>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#fff7ed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem'
            }}>
              <AlertTriangle size={32} style={{ color: '#ea580c' }} />
            </div>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
              ¿Cancelar esta sesión?
            </h3>
            <p style={{ fontSize: '0.92rem', color: '#64748b', lineHeight: 1.5, marginBottom: '2rem' }}>
              Si confirmas, liberaremos este horario en la agenda de tu terapeuta.
            </p>

            <div style={{
              background: '#f8fafc',
              borderRadius: '16px',
              padding: '1.25rem 1.5rem',
              textAlign: 'left',
              border: '1px solid #f1f5f9',
              marginBottom: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              {appointment.psychologists && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <User size={18} style={{ color: '#94a3b8', flexShrink: 0 }} />
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Psicólogo/a</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
                      {appointment.psychologists.name}
                    </span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Calendar size={18} style={{ color: '#94a3b8', flexShrink: 0 }} />
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Fecha</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
                    {formatDateStr(appointment.start_time)}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Clock size={18} style={{ color: '#94a3b8', flexShrink: 0 }} />
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Hora</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
                    {formatTimeStr(appointment.start_time)} hrs
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleCancel}
              disabled={cancelling}
              style={{
                width: '100%',
                padding: '0.9rem',
                borderRadius: '12px',
                background: '#ef4444',
                color: 'white',
                fontWeight: 700,
                fontSize: '0.95rem',
                border: 'none',
                cursor: cancelling ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)',
                marginBottom: '1.5rem'
              }}
            >
              {cancelling ? 'Cancelando...' : 'Confirmar Cancelación'}
            </button>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              color: '#94a3b8',
              fontSize: '0.75rem',
              borderTop: '1px solid #f1f5f9',
              paddingTop: '1.5rem'
            }}>
              <Sparkles size={12} style={{ color: '#3b82f6' }} />
              <span>Tecnología de agendamiento provista por <strong>Teramy</strong></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
