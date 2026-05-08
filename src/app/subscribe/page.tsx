"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, CheckCircle, ArrowRight, Mail, Shield, Zap, Calendar, FileText, BarChart2, MessageSquare } from 'lucide-react';

export default function SubscribePage() {
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    // Could be passed via query param from middleware in future
    // For now just show the blocking page
  }, []);

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

            {/* CTA — Mercado Pago (URL will be configured) */}
            <a
              href={process.env.NEXT_PUBLIC_MP_CHECKOUT_URL || '#'}
              id="mp-checkout-btn"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                width: '100%', padding: '1rem', borderRadius: '14px',
                background: 'linear-gradient(135deg, #009ee3, #00bcf2)',
                color: 'white', fontWeight: 800, fontSize: '1.05rem',
                textDecoration: 'none', boxShadow: '0 8px 24px rgba(0,158,227,0.35)',
                transition: 'all 0.2s', marginBottom: '0.75rem',
                cursor: process.env.NEXT_PUBLIC_MP_CHECKOUT_URL ? 'pointer' : 'not-allowed',
                opacity: process.env.NEXT_PUBLIC_MP_CHECKOUT_URL ? 1 : 0.7,
              }}
            >
              {/* Mercado Pago logo */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="12" fill="white" fillOpacity="0.25"/>
                <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">MP</text>
              </svg>
              Pagar con Mercado Pago
              <ArrowRight size={18} />
            </a>

            {!process.env.NEXT_PUBLIC_MP_CHECKOUT_URL && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: '#fef9ee', border: '1px solid #fde68a', borderRadius: '10px', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#92400e', fontWeight: 500 }}>
                  ⚙️ El pago vía Mercado Pago está siendo configurado. Escríbenos para activar tu cuenta manualmente.
                </span>
              </div>
            )}

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
