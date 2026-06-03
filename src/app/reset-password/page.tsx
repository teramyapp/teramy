"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/utils/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    // Supabase will automatically parse the hash fragment from the email link
    // and set up a session. We need to verify that the user has a valid session.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // If there's no session, the link is invalid or expired
        setError('El enlace de recuperación es inválido o ha expirado. Por favor, solicita uno nuevo.');
      }
      setSessionChecked(true);
    });
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      // Wait a moment and redirect to login
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      console.error('Update password error:', err);
      setError(err.message || 'Ocurrió un error al actualizar la contraseña. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!sessionChecked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#0ea5e9', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

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
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#64748b' }}>Restablecer tu contraseña</p>
        </div>

        {/* Card */}
        <div style={{ background: 'white', borderRadius: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.08)', padding: '2.5rem 2rem', border: '1px solid rgba(255,255,255,0.8)' }}>
          
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
            Crea tu nueva contraseña
          </h1>
          
          {success ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                <CheckCircle2 size={32} style={{ color: '#16a34a' }} />
              </div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#166534', marginBottom: '0.5rem' }}>¡Contraseña actualizada!</h2>
              <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.6 }}>
                Tu contraseña ha sido cambiada exitosamente. Serás redirigido al inicio de sesión en un momento.
              </p>
              <button
                onClick={() => router.push('/login')}
                style={{ marginTop: '1.5rem', padding: '0.8rem 1.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', color: '#0ea5e9', fontWeight: 700, cursor: 'pointer' }}
              >
                Ir a Iniciar Sesión ahora
              </button>
            </div>
          ) : (
            <>
              <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: 1.5 }}>
                Por favor ingresa tu nueva contraseña segura. Asegúrate de que tenga al menos 8 caracteres.
              </p>

              {/* Error message */}
              {error && (
                <div style={{ padding: '0.85rem 1rem', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.85rem', fontWeight: 500, marginBottom: '1.5rem' }}>
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>Nueva contraseña</label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                      <Lock size={18} />
                    </div>
                    <input
                      required type={showPassword ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      style={{ width: '100%', padding: '0.8rem 3rem 0.8rem 2.8rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                      onFocus={e => (e.currentTarget.style.borderColor = '#0ea5e9')}
                      onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', cursor: 'pointer', background: 'none', border: 'none', padding: '0.2rem', display: 'flex' }}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>Confirma tu contraseña</label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                      <Lock size={18} />
                    </div>
                    <input
                      required type={showPassword ? 'text' : 'password'} value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repite tu contraseña"
                      style={{ width: '100%', padding: '0.8rem 3rem 0.8rem 2.8rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                      onFocus={e => (e.currentTarget.style.borderColor = '#0ea5e9')}
                      onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
                    />
                  </div>
                </div>

                <button
                  type="submit" disabled={loading || !password || !confirmPassword || error === 'El enlace de recuperación es inválido o ha expirado. Por favor, solicita uno nuevo.'}
                  style={{
                    width: '100%', padding: '0.9rem', borderRadius: '12px', marginTop: '0.5rem',
                    background: loading || !password ? '#94a3b8' : 'linear-gradient(135deg, #0369a1, #0ea5e9)',
                    color: 'white', fontWeight: 800, fontSize: '1rem', cursor: loading || !password ? 'not-allowed' : 'pointer',
                    border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    boxShadow: loading || !password ? 'none' : '0 4px 12px rgba(14,165,233,0.3)', transition: 'all 0.2s',
                  }}
                >
                  {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
