"use client";

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, ArrowRight, ArrowLeft, CheckCircle2, Camera, X, Plus, Mail } from 'lucide-react';
import { supabase } from '@/utils/supabase';

const STEPS = [
  { num: 1, label: 'Tu cuenta' },
  { num: 2, label: 'Tu perfil' },
  { num: 3, label: '¡Listo!' },
];

const SPECIALTIES_SUGGESTIONS = [
  'Ansiedad', 'Depresión', 'Terapia de Pareja', 'Trauma (EMDR)', 'TCC',
  'Duelo', 'Adolescentes', 'Estrés laboral', 'Autoestima', 'Fobias',
];

const THERAPIES_OPTIONS = [
  'Terapia individual', 'Terapia de pareja', 'Terapia familiar',
  'Terapia infantil', 'Terapia adolescente', 'Terapia para adultos', 'Terapia grupal'
];

function RegisterForm() {
  const router = useRouter();
  const searchParamsHook = useSearchParams();
  const initialStep = parseInt(searchParamsHook.get('step') || '1');
  const [step, setStep] = useState(initialStep);

  // Sync step if URL changes dynamically
  React.useEffect(() => {
    const s = parseInt(searchParamsHook.get('step') || '1');
    if (s !== step) setStep(s);
  }, [searchParamsHook]);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  // Step 1 data
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Step 2 data
  const [name, setName] = useState('');
  const [title, setTitle] = useState('Psicólogo/a Clínico/a');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [therapies, setTherapies] = useState<string[]>([]);
  const [therapyInput, setTherapyInput] = useState('');
  const [yearsExp, setYearsExp] = useState('');
  const [languages, setLanguages] = useState(['Español']);
  const [slug, setSlug] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [authError, setAuthError] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [newUserId, setNewUserId] = useState<string | null>(null);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setAuthError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/register?step=2` },
    });
    if (error) {
      setAuthError('No se pudo conectar con Google. Verifica la configuración en Supabase.');
      setGoogleLoading(false);
    }
  };

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { setPasswordError('Las contraseñas no coinciden.'); return; }
    if (password.length < 8) { setPasswordError('La contraseña debe tener al menos 8 caracteres.'); return; }
    setPasswordError('');
    setAuthError('');
    setRegisterLoading(true);
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/register?step=2`
      }
    });
    setRegisterLoading(false);
    
    if (error) {
      setPasswordError(error.message === 'User already registered' ? 'Este correo ya tiene una cuenta. Inicia sesión.' : error.message);
      return;
    }
    
    if (data.user && !data.session) {
      // Supabase requires email confirmation
      setCheckEmail(true);
    } else {
      // Email confirmation is disabled, proceed normally
      if (data.user) setNewUserId(data.user.id);
      setStep(2);
    }
  };

  const addTag = (tag: string) => {
    const t = tag.trim();
    if (t && !specialties.includes(t)) setSpecialties(prev => [...prev, t]);
    setTagInput('');
  };

  const addTherapy = (tag: string) => {
    const t = tag.trim();
    if (t && !therapies.includes(t)) setTherapies(prev => [...prev, t]);
    setTherapyInput('');
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => setPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setRegisterLoading(true);
    const userId = newUserId || (await supabase.auth.getUser()).data.user?.id;
    if (!userId) { setAuthError('Sesión expirada. Vuelve al paso anterior.'); setRegisterLoading(false); return; }
    const finalSlug = slug || autoSlug(name);
    const { error } = await supabase.from('psychologists').insert({
      user_id: userId,
      slug: finalSlug,
      name,
      title,
      description: bio,
      specialties,
      therapies,
      languages,
      years_experience: yearsExp ? parseInt(yearsExp) : null,
      phone: phone ? `+56${phone}` : null,
    });
    setRegisterLoading(false);
    if (error) {
      setAuthError(error.message.includes('duplicate') ? 'Ese enlace personalizado ya está en uso. Elige otro.' : error.message);
      return;
    }
    setSlug(finalSlug);
    setStep(3);
  };

  const autoSlug = (val: string) => val.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0f7ff 0%, #e8eeff 50%, #f5f3ff 100%)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '2rem 1rem',
    }}>
      <div style={{ width: '100%', maxWidth: '560px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
            <img src="/fondo%20blanco.png" alt="Teramy Logo" style={{ width: '52px', height: '52px', mixBlendMode: 'multiply', objectFit: 'contain' }} />
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>teramy</span>
          </Link>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            {STEPS.map(s => (
              <div key={s.num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: s.num < step ? '#0ea5e9' : s.num === step ? 'linear-gradient(135deg, #0369a1, #0ea5e9)' : 'white',
                  border: s.num <= step ? 'none' : '2px solid #e2e8f0',
                  color: s.num <= step ? 'white' : '#94a3b8', fontWeight: 700, fontSize: '0.85rem',
                  boxShadow: s.num === step ? '0 4px 12px rgba(14,165,233,0.3)' : 'none', transition: 'all 0.3s',
                }}>
                  {s.num < step ? <CheckCircle2 size={16} /> : s.num}
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: s.num === step ? '#0369a1' : '#94a3b8' }}>{s.label}</span>
              </div>
            ))}
          </div>
          <div style={{ position: 'relative', height: '4px', background: '#e2e8f0', borderRadius: '2px', marginTop: '-2.5rem', zIndex: -1 }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #0369a1, #0ea5e9)', borderRadius: '2px', transition: 'width 0.4s ease' }} />
          </div>
        </div>

        {/* STEP 1: Cuenta */}
        {step === 1 && !checkEmail && (
          <div style={{ background: 'white', borderRadius: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.08)', padding: '2rem 1.5rem', border: '1px solid rgba(255,255,255,0.8)' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.3rem' }}>Crea tu cuenta</h1>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '2rem' }}>Únete a la comunidad de profesionales que ya están organizando su consulta.</p>

            <button
              onClick={handleGoogle} disabled={googleLoading}
              style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', fontWeight: 700, fontSize: '0.95rem', color: '#1e293b', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '1.5rem' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
              onMouseLeave={e => (e.currentTarget.style.background = 'white')}
            >
              {googleLoading
                ? <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #e2e8f0', borderTopColor: '#0ea5e9', animation: 'spin 0.7s linear infinite' }} />
                : <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              }
              {googleLoading ? 'Conectando con Google...' : 'Registrarse con Google'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>o con tu correo</span>
              <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            </div>

            {authError && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.85rem', fontWeight: 500, marginBottom: '1rem' }}>
                {authError}
              </div>
            )}

            <form onSubmit={handleStep1} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '0.4rem' }}>Correo electrónico</label>
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com"
                  style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#0ea5e9')} onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '0.4rem' }}>Contraseña</label>
                <div style={{ position: 'relative' }}>
                  <input required type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres"
                    style={{ width: '100%', padding: '0.8rem 3rem 0.8rem 1rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#0ea5e9')} onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', cursor: 'pointer', background: 'none', border: 'none', display: 'flex' }}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '0.4rem' }}>Confirmar contraseña</label>
                <input required type="password" value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setPasswordError(''); }} placeholder="Repite tu contraseña"
                  style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '10px', border: `1.5px solid ${passwordError ? '#ef4444' : '#e2e8f0'}`, fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#0ea5e9')} onBlur={e => (e.currentTarget.style.borderColor = passwordError ? '#ef4444' : '#e2e8f0')}
                />
                {passwordError && <p style={{ fontSize: '0.78rem', color: '#ef4444', marginTop: '0.3rem', fontWeight: 500 }}>{passwordError}</p>}
              </div>
              <button type="submit" disabled={registerLoading} style={{ width: '100%', padding: '0.9rem', borderRadius: '12px', background: registerLoading ? '#94a3b8' : 'linear-gradient(135deg, #0369a1, #0ea5e9)', color: 'white', fontWeight: 800, fontSize: '1rem', cursor: registerLoading ? 'not-allowed' : 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(14,165,233,0.3)', marginTop: '0.5rem' }}>
                {registerLoading ? 'Creando cuenta...' : <><span>Continuar</span><ArrowRight size={18} /></>}
              </button>
            </form>
          </div>
        )}

        {/* Check Email State */}
        {checkEmail && (
          <div style={{ background: 'white', borderRadius: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.08)', padding: '2rem 1.5rem', border: '1px solid rgba(255,255,255,0.8)', textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <Mail size={40} style={{ color: '#0284c7' }} />
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
              Revisa tu correo
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              Te hemos enviado un enlace mágico a <strong>{email}</strong>. 
              Haz clic en él para confirmar tu cuenta y continuar configurando tu perfil.
            </p>
            <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#64748b' }}>
              ¿No lo encuentras? Revisa tu carpeta de Spam o Correo no deseado.
            </div>
          </div>
        )}


        {/* STEP 2: Perfil */}
        {step === 2 && (
          <div style={{ background: 'white', borderRadius: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.08)', padding: '2rem 1.5rem', border: '1px solid rgba(255,255,255,0.8)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <button onClick={() => setStep(1)} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>
                <ArrowLeft size={16} /> Volver
              </button>
              {typeof window !== 'undefined' && window.location.search.includes('step=2') && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#ecfdf5', color: '#10b981', padding: '0.4rem 0.8rem', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 700 }}>
                  <CheckCircle2 size={14} /> Correo verificado
                </span>
              )}
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.3rem' }}>Tu perfil público</h2>
            <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: '2rem', lineHeight: 1.5 }}>
              Esto es lo que verán tus pacientes al visitar tu enlace de agendamiento. Puedes editarlo en cualquier momento.
            </p>

            <form onSubmit={handleStep2} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Photo upload */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: '88px', height: '88px', borderRadius: '50%', background: photoPreview ? 'transparent' : 'linear-gradient(135deg, #e8f4fc, #dbeafe)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #e2e8f0' }}>
                    {photoPreview
                      ? <img src={photoPreview} alt="foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: '2rem', color: '#94a3b8' }}>🧑‍⚕️</span>
                    }
                  </div>
                  <label htmlFor="photo-upload" style={{ position: 'absolute', bottom: '2px', right: '2px', width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #0369a1, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid white', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>
                    <Camera size={13} style={{ color: 'white' }} />
                  </label>
                  <input id="photo-upload" type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
                </div>
                <div>
                  <p style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.2rem' }}>Foto de perfil</p>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>Una foto profesional genera más confianza en tus futuros pacientes.</p>
                  <label htmlFor="photo-upload" style={{ display: 'inline-block', marginTop: '0.4rem', fontSize: '0.78rem', fontWeight: 700, color: '#0ea5e9', cursor: 'pointer' }}>
                    {photoPreview ? 'Cambiar foto' : 'Subir foto'}
                  </label>
                </div>
              </div>

              {/* Name + Title */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.83rem', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '0.4rem' }}>Nombre completo *</label>
                  <input required value={name} onChange={e => { setName(e.target.value); if (!slug) setSlug(autoSlug(e.target.value)); }}
                    placeholder="Ej. Dra. Laura Morales"
                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.92rem', outline: 'none', boxSizing: 'border-box' }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#0ea5e9')} onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.83rem', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '0.4rem' }}>Título profesional *</label>
                  <input required value={title} onChange={e => setTitle(e.target.value)}
                    placeholder="Psicólogo/a Clínico/a"
                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.92rem', outline: 'none', boxSizing: 'border-box' }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#0ea5e9')} onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
                  />
                </div>
              </div>

              {/* WhatsApp + Years */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.83rem', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '0.4rem' }}>
                    WhatsApp *
                    <span style={{ fontSize: '0.73rem', fontWeight: 500, color: '#64748b', marginLeft: '0.3rem' }}>Para recordatorios</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                    <span style={{ padding: '0.75rem', background: '#f8fafc', color: '#64748b', fontSize: '0.88rem', fontWeight: 600, borderRight: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>+56</span>
                    <input required value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="9 1234 5678" type="tel"
                      style={{ flex: 1, padding: '0.75rem', border: 'none', outline: 'none', fontSize: '0.92rem', background: 'white' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.83rem', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '0.4rem' }}>
                    Años de experiencia
                    <span style={{ fontSize: '0.73rem', fontWeight: 500, color: '#94a3b8', marginLeft: '0.3rem' }}>Opcional</span>
                  </label>
                  <input value={yearsExp} onChange={e => setYearsExp(e.target.value)} type="number" placeholder="Ej. 8" min={0} max={50}
                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.92rem', outline: 'none', boxSizing: 'border-box' }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#0ea5e9')} onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label style={{ fontSize: '0.83rem', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '0.4rem' }}>
                  Descripción profesional *
                  <span style={{ fontSize: '0.73rem', fontWeight: 500, color: '#64748b', marginLeft: '0.3rem' }}>Visible en tu perfil público</span>
                </label>
                <textarea required value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Cuéntale a tus futuros pacientes quién eres, tu enfoque terapéutico y en qué puedes ayudarlos..."
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.92rem', outline: 'none', resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit', boxSizing: 'border-box' }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#0ea5e9')} onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
                />
              </div>

              {/* Specialties */}
              <div>
                <label style={{ fontSize: '0.83rem', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '0.5rem' }}>Especialidades</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.6rem' }}>
                  {SPECIALTIES_SUGGESTIONS.filter(s => !specialties.includes(s)).map(s => (
                    <button key={s} type="button" onClick={() => addTag(s)}
                      style={{ padding: '0.3rem 0.8rem', borderRadius: '2rem', border: '1.5px dashed #e2e8f0', background: 'transparent', color: '#64748b', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#0ea5e9'; (e.currentTarget as HTMLElement).style.color = '#0369a1'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLElement).style.color = '#64748b'; }}
                    >
                      + {s}
                    </button>
                  ))}
                </div>
                {specialties.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.6rem' }}>
                    {specialties.map(s => (
                      <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.75rem', borderRadius: '2rem', background: '#e8f4fc', color: '#0369a1', fontSize: '0.78rem', fontWeight: 700 }}>
                        {s}
                        <button type="button" onClick={() => setSpecialties(prev => prev.filter(t => t !== s))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0369a1', display: 'flex', padding: '1px' }}>
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); } }}
                    placeholder="Otra especialidad... (Enter para agregar)"
                    style={{ flex: 1, padding: '0.6rem 0.9rem', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.85rem', outline: 'none' }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#0ea5e9')} onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
                  />
                  <button type="button" onClick={() => addTag(tagInput)} style={{ padding: '0.6rem 0.9rem', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <Plus size={16} style={{ color: '#64748b' }} />
                  </button>
                </div>
              </div>

              {/* Therapies */}
              <div>
                <label style={{ fontSize: '0.83rem', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '0.5rem' }}>Tipos de Terapia</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.6rem' }}>
                  {THERAPIES_OPTIONS.filter(s => !therapies.includes(s)).map(s => (
                    <button key={s} type="button" onClick={() => addTherapy(s)}
                      style={{ padding: '0.3rem 0.8rem', borderRadius: '2rem', border: '1.5px dashed #e2e8f0', background: 'transparent', color: '#64748b', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#8b5cf6'; (e.currentTarget as HTMLElement).style.color = '#7c3aed'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLElement).style.color = '#64748b'; }}
                    >
                      + {s}
                    </button>
                  ))}
                </div>
                {therapies.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.6rem' }}>
                    {therapies.map(s => (
                      <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.75rem', borderRadius: '2rem', background: '#f3e8ff', color: '#7e22ce', fontSize: '0.78rem', fontWeight: 700 }}>
                        {s}
                        <button type="button" onClick={() => setTherapies(prev => prev.filter(t => t !== s))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7e22ce', display: 'flex', padding: '1px' }}>
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input value={therapyInput} onChange={e => setTherapyInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTherapy(therapyInput); } }}
                    placeholder="Otro tipo de terapia... (Enter para agregar)"
                    style={{ flex: 1, padding: '0.6rem 0.9rem', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.85rem', outline: 'none' }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#8b5cf6')} onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
                  />
                  <button type="button" onClick={() => addTherapy(therapyInput)} style={{ padding: '0.6rem 0.9rem', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <Plus size={16} style={{ color: '#64748b' }} />
                  </button>
                </div>
              </div>

              {/* URL slug */}
              <div>
                <label style={{ fontSize: '0.83rem', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '0.4rem' }}>
                  Tu enlace personalizado *
                </label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', background: '#f8fafc' }}
                  onFocus={() => {}} // just for visual purposes
                >
                  <span style={{ padding: '0.75rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 600, borderRight: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>teramy.cl/</span>
                  <input required value={slug} onChange={e => setSlug(autoSlug(e.target.value))}
                    placeholder="tu-nombre"
                    style={{ flex: 1, padding: '0.75rem', border: 'none', outline: 'none', fontSize: '0.92rem', background: 'white' }}
                    onFocus={e => ((e.currentTarget.parentElement as HTMLElement).style.borderColor = '#0ea5e9')}
                    onBlur={e => ((e.currentTarget.parentElement as HTMLElement).style.borderColor = '#e2e8f0')}
                  />
                </div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.3rem' }}>
                  Este será el link que compartes con tus pacientes para agendar.
                </p>
              </div>

              {authError && (
                <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.85rem', fontWeight: 500 }}>
                  {authError}
                </div>
              )}
              <button type="submit" disabled={registerLoading} style={{ width: '100%', padding: '0.9rem', borderRadius: '12px', background: registerLoading ? '#94a3b8' : 'linear-gradient(135deg, #0369a1, #0ea5e9)', color: 'white', fontWeight: 800, fontSize: '1rem', cursor: registerLoading ? 'not-allowed' : 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(14,165,233,0.3)', marginTop: '0.5rem' }}>
                {registerLoading ? 'Guardando perfil...' : <><span>Crear mi cuenta</span><ArrowRight size={18} /></>}
              </button>
            </form>
          </div>
        )}

        {/* STEP 3: Done */}
        {step === 3 && (
          <div style={{ background: 'white', borderRadius: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.08)', padding: '2rem 1.5rem', border: '1px solid rgba(255,255,255,0.8)', textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #ecfdf5, #dcfce7)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.75rem' }}>
              <CheckCircle2 size={44} style={{ color: '#10b981' }} />
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
              ¡Tu cuenta está lista, {name.split(' ')[0] || 'psicóloga'}!
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem', maxWidth: '380px', margin: '0 auto 2rem' }}>
              Tu perfil público ya está activo. Comparte tu enlace con tus pacientes para que puedan agendar.
            </p>

            {/* Link preview */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', padding: '0.9rem 1.5rem', background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: '12px', marginBottom: '2rem' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 500, color: '#0369a1' }}>🔗 teramy.cl/</span>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0369a1' }}>{slug}</span>
              <button
                onClick={() => navigator.clipboard.writeText(`https://teramy.cl/${slug}`)}
                style={{ padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid #bae6fd', background: 'white', color: '#0369a1', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Copiar
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={() => router.push('/dashboard')}
                style={{ width: '100%', padding: '0.9rem', borderRadius: '12px', background: 'linear-gradient(135deg, #0369a1, #0ea5e9)', color: 'white', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(14,165,233,0.3)' }}
              >
                Ir a mi dashboard <ArrowRight size={18} />
              </button>
              <Link href={`/${slug}`} target="_blank"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.85rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', color: '#1e293b', fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none' }}
              >
                👀 Ver cómo se ve mi perfil público
              </Link>
            </div>
          </div>
        )}

        {step === 1 && !checkEmail && (
          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: '#64748b' }}>
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" style={{ color: '#0ea5e9', fontWeight: 700, textDecoration: 'none' }}>Iniciar sesión</Link>
          </p>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>Cargando...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
