"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { supabase } from '@/utils/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError(authError.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : authError.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError('');
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (authError) {
      setError('No se pudo conectar con Google. Verifica la configuración en Supabase.');
      setGoogleLoading(false);
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
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#64748b' }}>Gestión de consulta para psicólogos</p>
        </div>

        {/* Card */}
        <div style={{ background: 'white', borderRadius: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.08)', padding: '2rem 1.5rem', border: '1px solid rgba(255,255,255,0.8)' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem', textAlign: 'center' }}>
            Bienvenido de vuelta
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', marginBottom: '2rem' }}>
            Ingresa a tu cuenta para gestionar tu consulta
          </p>

          {/* Google button */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            style={{
              width: '100%', padding: '0.85rem', borderRadius: '12px',
              border: '1.5px solid #e2e8f0', background: googleLoading ? '#f8fafc' : 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
              fontWeight: 700, fontSize: '0.95rem', color: '#1e293b', cursor: 'pointer',
              transition: 'all 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              marginBottom: '1.5rem',
            }}
            onMouseEnter={e => { if (!googleLoading) (e.currentTarget as HTMLElement).style.background = '#f8fafc'; }}
            onMouseLeave={e => { if (!googleLoading) (e.currentTarget as HTMLElement).style.background = 'white'; }}
          >
            {googleLoading ? (
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #e2e8f0', borderTopColor: '#0ea5e9', animation: 'spin 0.7s linear infinite' }} />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            )}
            {googleLoading ? 'Iniciando sesión...' : 'Continuar con Google'}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>o con tu correo</span>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          </div>

          {/* Error message */}
          {error && (
            <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.85rem', fontWeight: 500, marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>Correo electrónico</label>
              <input
                required type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                style={{ padding: '0.8rem 1rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s' }}
                onFocus={e => (e.currentTarget.style.borderColor = '#0ea5e9')}
                onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>Contraseña</label>
                <button type="button" style={{ fontSize: '0.8rem', color: '#0ea5e9', fontWeight: 600, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  required type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '0.8rem 3rem 0.8rem 1rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#0ea5e9')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', cursor: 'pointer', background: 'none', border: 'none', padding: '0.2rem', display: 'flex' }}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', padding: '0.9rem', borderRadius: '12px',
                background: loading ? '#94a3b8' : 'linear-gradient(135deg, #0369a1, #0ea5e9)',
                color: 'white', fontWeight: 800, fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(14,165,233,0.3)', transition: 'all 0.2s', marginTop: '0.5rem',
              }}
            >
              {loading ? 'Iniciando sesión...' : <><span>Iniciar sesión</span> <ArrowRight size={18} /></>}
            </button>
          </form>
        </div>

        {/* Register link */}
        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: '#64748b' }}>
          ¿No tienes cuenta?{' '}
          <Link href="/register" style={{ color: '#0ea5e9', fontWeight: 700, textDecoration: 'none' }}>
            Crea tu cuenta gratis
          </Link>
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
