"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/utils/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      setSuccess(true);
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err.message || 'Ocurrió un error al intentar enviar el correo. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0f7ff 0%, #e8eeff 50%, #f5f3ff 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem',
    }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
            <img src="/fondo%20blanco.png" alt="Teramy Logo" style={{ width: '56px', height: '56px', mixBlendMode: 'multiply', objectFit: 'contain' }} />
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>teramy</span>
          </Link>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#64748b' }}>Recuperación de contraseña segura</p>
        </div>

        {/* Card */}
        <div style={{ background: 'white', borderRadius: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.08)', padding: '2.5rem 2rem', border: '1px solid rgba(255,255,255,0.8)' }}>
          
          <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none', marginBottom: '1.5rem', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#0ea5e9'} onMouseLeave={e => e.currentTarget.style.color = '#64748b'}>
            <ArrowLeft size={16} /> Volver al inicio de sesión
          </Link>

          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
            ¿Olvidaste tu contraseña?
          </h1>
          
          {success ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                <CheckCircle2 size={32} style={{ color: '#16a34a' }} />
              </div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#166534', marginBottom: '0.5rem' }}>¡Correo enviado!</h2>
              <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.6 }}>
                Si existe una cuenta asociada a <strong>{email}</strong>, hemos enviado un enlace seguro para que puedas crear una nueva contraseña.
              </p>
              <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '1.5rem' }}>
                No olvides revisar tu carpeta de spam.
              </p>
            </div>
          ) : (
            <>
              <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: 1.5 }}>
                Ingresa el correo electrónico asociado a tu cuenta y te enviaremos un enlace seguro para recuperarla.
              </p>

              {/* Error message */}
              {error && (
                <div style={{ padding: '0.85rem 1rem', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.85rem', fontWeight: 500, marginBottom: '1.5rem' }}>
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>Correo electrónico</label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                      <Mail size={18} />
                    </div>
                    <input
                      required type="email" value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="tu@correo.com"
                      style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.8rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                      onFocus={e => (e.currentTarget.style.borderColor = '#0ea5e9')}
                      onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
                    />
                  </div>
                </div>

                <button
                  type="submit" disabled={loading || !email}
                  style={{
                    width: '100%', padding: '0.9rem', borderRadius: '12px',
                    background: loading || !email ? '#94a3b8' : 'linear-gradient(135deg, #0369a1, #0ea5e9)',
                    color: 'white', fontWeight: 800, fontSize: '1rem', cursor: loading || !email ? 'not-allowed' : 'pointer',
                    border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    boxShadow: loading || !email ? 'none' : '0 4px 12px rgba(14,165,233,0.3)', transition: 'all 0.2s',
                  }}
                >
                  {loading ? 'Enviando enlace...' : 'Enviar enlace de recuperación'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
