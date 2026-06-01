"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { CheckCircle2, Calendar, Clock, User, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ConfirmAppointmentPage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appointment, setAppointment] = useState<any>(null);

  useEffect(() => {
    if (!id) return;

    const performConfirmation = async () => {
      try {
        // Update status to confirmed
        const { error: updateError } = await supabase
          .from('appointments')
          .update({ status: 'confirmed' })
          .eq('id', id);

        if (updateError) throw updateError;

        // Fetch details
        const { data, error: fetchError } = await supabase
          .from('appointments')
          .select('*, patients(*), psychologists(*)')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;
        setAppointment(data);
      } catch (err: any) {
        console.error('Error confirming appointment:', err);
        setError(err.message || 'No se pudo confirmar la sesión. Por favor contacta a tu terapeuta.');
      } finally {
        setLoading(false);
      }
    };

    performConfirmation();
  }, [id]);

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
      background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
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
              border: '4px solid #eff6ff',
              borderTopColor: '#3b82f6',
              borderRadius: '50%',
              margin: '0 auto 1.5rem',
              animation: 'spin 1s linear infinite'
            }} />
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>Confirmando tu asistencia...</h3>
            <p style={{ fontSize: '0.88rem', color: '#64748b', marginTop: '0.5rem' }}>Por favor espera un momento.</p>
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
              <span style={{ fontSize: '1.8rem' }}>⚠️</span>
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#991b1b', marginBottom: '0.75rem' }}>Ocurrió un inconveniente</h3>
            <p style={{ fontSize: '0.92rem', color: '#64748b', lineHeight: 1.6, marginBottom: '1.5rem' }}>{error}</p>
          </div>
        ) : (
          <div>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#dcfce7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              boxShadow: '0 8px 24px rgba(22, 163, 74, 0.15)'
            }}>
              <CheckCircle2 size={32} style={{ color: '#16a34a' }} />
            </div>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
              ¡Sesión Confirmada!
            </h3>
            <p style={{ fontSize: '0.92rem', color: '#64748b', lineHeight: 1.5, marginBottom: '2rem' }}>
              Tu asistencia ha sido confirmada exitosamente. Ya le notificamos a tu psicólogo/a.
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
