"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, CheckCircle, ArrowRight, Mail, Shield, Zap, Calendar, FileText, BarChart2, MessageSquare, Loader2, Lock, CreditCard } from 'lucide-react';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';

export default function SubscribePage() {
  const [loading, setLoading] = useState(true);
  const [psychologist, setPsychologist] = useState<any>(null);
  const [subscribing, setSubscribing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      
      const { data: psych, error } = await supabase
        .from('psychologists')
        .select('id, name')
        .eq('user_id', session.user.id)
        .single();
        
      if (error) {
        console.error('Error fetching psychologist:', error);
      }

      if (psych) {
        setPsychologist({ ...psych, email: session.user.email });
      }
      setLoading(false);
    }
    checkUser();
  }, [router]);

  const handleSubscribe = async () => {
    if (!psychologist) return;
    setSubscribing(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          psychologistId: psychologist.id,
          email: psychologist.email
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Error al generar link de pago');
      }
    } catch (err) {
      console.error(err);
      alert('Hubo un problema al conectar con Mercado Pago. Por favor intenta de nuevo.');
      setSubscribing(false);
    }
  };

  const features = [
    { icon: <Calendar size={18} />, text: 'Agenda online 24/7 para tus pacientes' },
    { icon: <FileText size={18} />, text: 'Notas de sesión privadas e ilimitadas' },
    { icon: <MessageSquare size={18} />, text: 'Recordatorios WhatsApp con un clic' },
    { icon: <Zap size={18} />, text: 'Confirmaciones automáticas por correo' },
    { icon: <BarChart2 size={18} />, text: 'Analíticas de ingresos y asistencia' },
    { icon: <Shield size={18} />, text: 'Cancela cuando quieras, sin penalidades' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0f7ff 0%, #e8eeff 50%, #f5f3ff 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      fontFamily: 'var(--font-sans, Inter, sans-serif)',
    }}>
      <div style={{ width: '100%', maxWidth: '520px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
            <img src="/fondo%20blanco.png" alt="Teramy Logo" style={{ width: '48px', height: '48px', mixBlendMode: 'multiply', objectFit: 'contain' }} />
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>teramy</span>
          </Link>
        </div>

        {/* Main card */}
        <div style={{
          background: 'white',
          borderRadius: '24px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.1)',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.8)',
        }}>

          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #0369a1, #0ea5e9)',
            padding: '2.5rem 2.5rem 2rem',
            textAlign: 'center',
            color: 'white',
          }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.25rem',
              border: '2px solid rgba(255,255,255,0.3)',
            }}>
              <Clock size={30} style={{ color: 'white' }} />
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 0.5rem', lineHeight: 1.2 }}>
              Tu período de prueba terminó
            </h1>
            <p style={{ fontSize: '1rem', opacity: 0.9, margin: 0, lineHeight: 1.5 }}>
              Para seguir usando Teramy, activa tu suscripción y continúa sin perder ningún dato.
            </p>
          </div>

          {/* Price + CTA */}
          <div style={{ padding: '2rem 2.5rem' }}>

            {/* Price */}
            <div style={{
              textAlign: 'center',
              background: 'linear-gradient(135deg, #f0f9ff, #e8f4fc)',
              borderRadius: '16px',
              padding: '1.75rem',
              marginBottom: '1.75rem',
              border: '1px solid rgba(14,165,233,0.2)',
            }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                Plan Profesional
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '0.15rem', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0369a1', alignSelf: 'flex-start', paddingTop: '0.4rem' }}>$</span>
                <span style={{ fontSize: '3.5rem', fontWeight: 900, color: '#0369a1', letterSpacing: '-0.03em', lineHeight: 1 }}>19.990</span>
                <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 500 }}>/mes</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
                Todo incluido · Sin sorpresas
              </p>
            </div>

            {/* Features list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.75rem' }}>
              {features.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#e8f4fc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#0369a1' }}>
                    {f.icon}
                  </div>
                  <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: 500 }}>{f.text}</span>
                </div>
              ))}
            </div>

            {/* CTA — Secure Checkout */}
            <button
              onClick={handleSubscribe}
              disabled={subscribing || loading}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                width: '100%', padding: '0.95rem', borderRadius: '14px',
                background: '#0ea5e9',
                color: 'white', fontWeight: 800, fontSize: '1.05rem',
                border: 'none',
                boxShadow: '0 8px 24px rgba(14,165,233,0.35)',
                transition: 'all 0.2s', marginBottom: '0.5rem',
                cursor: (subscribing || loading) ? 'not-allowed' : 'pointer',
                opacity: (subscribing || loading) ? 0.7 : 1,
              }}
            >
              {subscribing ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                <>
                  <Lock size={18} />
                  Ir al pago seguro
                  <ArrowRight size={18} />
                </>
              )}
            </button>
            
            {/* Payment methods hint */}
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.4rem', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                <CreditCard size={14} /> Débito y Crédito aceptados
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', background: '#f1f5f9', borderRadius: '4px', color: '#475569', fontWeight: 600 }}>Visa</span>
                <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', background: '#f1f5f9', borderRadius: '4px', color: '#475569', fontWeight: 600 }}>Mastercard</span>
                <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', background: '#f1f5f9', borderRadius: '4px', color: '#475569', fontWeight: 600 }}>Amex</span>
                <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', background: '#f1f5f9', borderRadius: '4px', color: '#475569', fontWeight: 600 }}>Mach</span>
                <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', background: '#f1f5f9', borderRadius: '4px', color: '#475569', fontWeight: 600 }}>Mercado Pago</span>
              </div>
            </div>

            {/* Contact fallback */}
            <a
              href="mailto:contacto@teramy.cl?subject=Activar%20suscripción%20Teramy"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                width: '100%', padding: '0.85rem', borderRadius: '12px',
                border: '1.5px solid #e2e8f0', background: 'white',
                color: '#64748b', fontWeight: 600, fontSize: '0.9rem',
                textDecoration: 'none', transition: 'all 0.2s',
                boxSizing: 'border-box' as const,
              }}
            >
              <Mail size={16} />
              Contactar al equipo de Teramy
            </a>

            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', marginTop: '1.25rem', lineHeight: 1.5 }}>
              🔒 Pago seguro · Tus datos siguen guardados y seguros · Cancela cuando quieras
            </p>

            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, fontWeight: 500 }}>
                  ¿No deseas continuar usando Teramy?
                </p>
                <Link 
                  href="/dashboard/settings" 
                  style={{ 
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0.75rem 1.5rem', borderRadius: '10px',
                    background: '#f8fafc', border: '1px solid #e2e8f0',
                    color: '#475569', fontSize: '0.85rem', fontWeight: 600,
                    textDecoration: 'none', transition: 'all 0.2s', width: '100%', boxSizing: 'border-box'
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f1f5f9'; (e.currentTarget as HTMLElement).style.borderColor = '#cbd5e1'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#f8fafc'; (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; }}
                >
                  Gestionar o eliminar mi cuenta
                </Link>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div style={{
            background: '#f8fafc', borderTop: '1px solid #e2e8f0',
            padding: '1rem 2.5rem',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}>
            <CheckCircle size={15} style={{ color: '#10b981', flexShrink: 0 }} />
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
              Todos tus pacientes, sesiones y notas están intactos y te esperan.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
