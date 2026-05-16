"use client";

import React, { useState, useEffect } from 'react';
import { Save, ExternalLink, Camera, CheckCircle2, Link as LinkIcon, Copy, Check, Instagram, Globe, Award, User, Loader2, Phone, Zap } from 'lucide-react';
import type { Psychologist } from '@/lib/types';
import Link from 'next/link';
import { supabase } from '@/utils/supabase';

const EMPTY_PROFILE: Psychologist = {
  id: '', user_id: '', slug: '', name: '', title: '', description: '',
  specialties: [], therapies: [], languages: ['Español'], timezone: 'America/Santiago', created_at: '',
  subscription_status: 'trialing', trial_ends_at: '',
};

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-dark)' }}>{label}</label>
    {children}
    {hint && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{hint}</span>}
  </div>
);

export default function ProfilePage() {
  const [profile, setProfile] = useState<Psychologist>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [tagInput, setTagInput] = useState('');
  const [therapyInput, setTherapyInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from('psychologists')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data) setProfile(data as Psychologist);
    setLoading(false);
  }

  const set = (field: keyof Psychologist, value: unknown) =>
    setProfile(prev => ({ ...prev, [field]: value }));

  const addTag = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      const tag = tagInput.trim().replace(/,$/, '');
      if (tag && !profile.specialties.includes(tag)) set('specialties', [...profile.specialties, tag]);
      setTagInput('');
    }
  };
  const removeTag = (tag: string) => set('specialties', profile.specialties.filter(t => t !== tag));

  const addTherapy = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ',') && therapyInput.trim()) {
      e.preventDefault();
      const tag = therapyInput.trim().replace(/,$/, '');
      if (tag && !(profile.therapies || []).includes(tag)) set('therapies', [...(profile.therapies || []), tag]);
      setTherapyInput('');
    }
  };
  const removeTherapy = (tag: string) => set('therapies', (profile.therapies || []).filter(t => t !== tag));

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true);
    let photo_url = profile.photo_url;

    // Upload photo if changed
    if (photoFile && profile.id) {
      const ext = photoFile.name.split('.').pop();
      const path = `${profile.id}/avatar.${ext}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('psychologist-photos')
        .upload(path, photoFile, { upsert: true });
        
      if (uploadError) {
        console.error("Error al subir foto:", uploadError);
        alert("Hubo un error al subir la foto. Asegúrate de que el bucket 'psychologist-photos' exista en Supabase y tenga los permisos públicos correctos.");
        setSaving(false);
        return;
      }
      
      if (uploadData) {
        const { data: urlData } = supabase.storage.from('psychologist-photos').getPublicUrl(path);
        photo_url = urlData.publicUrl;
      }
    }

    const updatePayload: Partial<Psychologist> = {
      name: profile.name,
      title: profile.title,
      description: profile.description,
      slug: profile.slug,
      years_experience: profile.years_experience,
      specialties: profile.specialties,
      therapies: profile.therapies || [],
      languages: profile.languages,
      instagram_url: profile.instagram_url,
      phone: profile.phone,
      registration_number: profile.registration_number,
      timezone: profile.timezone,
      photo_url,
    };

    await supabase.from('psychologists').update(updatePayload).eq('id', profile.id);
    if (photo_url !== profile.photo_url) set('photo_url', photo_url);

    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleCopy = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://teramy.cl';
    navigator.clipboard.writeText(`${origin}/${profile.slug}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };


  if (loading) {
    return (
      <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem', color: 'var(--text-muted)' }}>
        <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary-blue)' }} />
        <p style={{ fontWeight: 500 }}>Cargando perfil...</p>
      </div>
    );
  }

  const originDomain = typeof window !== 'undefined' ? window.location.host : 'teramy.cl';
  const publicUrl = `${originDomain}/${profile.slug}`;
  const photoSrc = photoPreview || profile.photo_url || '/psychologist_avatar.png';

  return (
    <>
      <style>{`
        .profile-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
          gap: 1rem;
        }
        .profile-url-banner {
          margin-bottom: 1.75rem;
          padding: 1rem 1.5rem;
          background: var(--primary-light-blue);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }
        .profile-main-grid {
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 1.5rem;
          align-items: start;
        }
        .form-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .profile-save-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          background: var(--bg-white);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-light);
        }

        @media (max-width: 1024px) {
          .profile-main-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .profile-header {
            flex-direction: column;
          }
          .profile-header div:last-child {
            display: flex;
            width: 100%;
            gap: 0.5rem;
          }
          .profile-header a, .profile-header button {
            flex: 1;
            justify-content: center;
            padding: 0.65rem 0.5rem !important;
            font-size: 0.8rem !important;
          }
          .profile-url-banner {
            flex-direction: column;
            align-items: flex-start;
          }
          .profile-url-banner button {
            width: 100%;
          }
          .form-grid-2 {
            grid-template-columns: 1fr;
          }
          .profile-save-bar {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }
          .profile-save-bar button {
            width: 100%;
          }
        }
      `}</style>
      <div className="animate-slide-up">
      
      {profile.subscription_status === 'trialing' && profile.trial_ends_at && (
        <div style={{ 
          background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)', 
          border: '1px solid #bae6fd', 
          borderRadius: '16px', 
          padding: '1rem 1.5rem', 
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)'
        }}>
          <Zap size={20} style={{ color: '#0284c7' }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.88rem', color: '#0c4a6e', fontWeight: 700 }}>
              Tu periodo de prueba termina el {new Date(profile.trial_ends_at).toLocaleDateString('es-CL')}. 
              <span style={{ fontWeight: 500, marginLeft: '0.5rem', color: '#0369a1' }}>Suscríbete ahora para mantener todas las funciones Pro.</span>
            </p>
          </div>
          <Link href="/dashboard/settings" style={{ 
            padding: '0.5rem 1rem', borderRadius: '8px', background: '#0284c7', color: 'white', 
            fontWeight: 700, fontSize: '0.8rem', textDecoration: 'none',
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.2)'
          }}>
            Ver planes
          </Link>
        </div>
      )}

      <div className="profile-header">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.2rem' }}>Mi Perfil Público</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Lo que verán tus pacientes al visitar tu enlace.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {profile.slug && (
            <Link href={`/${profile.slug}`} target="_blank" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.2rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', background: 'var(--bg-white)', color: 'var(--text-dark)', fontWeight: 600, fontSize: '0.88rem', boxShadow: 'var(--shadow-sm)' }}>
              Ver perfil <ExternalLink size={15} />
            </Link>
          )}
          <button onClick={handleSave} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.5rem', fontSize: '0.88rem' }}>
            {saved ? <><CheckCircle2 size={17} /> Guardado</> : saving ? <><Loader2 size={17} /> Guardando...</> : <><Save size={17} /> Guardar Cambios</>}
          </button>
        </div>
      </div>

      {/* Public URL Banner */}
      {profile.slug && (
        <div className="profile-url-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <LinkIcon size={18} style={{ color: 'var(--primary-blue)' }} />
            <div>
              <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--primary-dark-blue)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tu enlace de agendamiento</p>
              <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary-dark-blue)' }}>{publicUrl}</p>
            </div>
          </div>
          <button onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(14,165,233,0.3)', background: 'white', color: 'var(--primary-dark-blue)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}>
            {copied ? <><Check size={15} /> Copiado!</> : <><Copy size={15} /> Copiar</>}
          </button>
        </div>
      )}

      <div className="profile-main-grid">
        {/* Photo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="premium-card" style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ position: 'relative', width: '140px', height: '140px', margin: '0 auto 1.25rem auto' }}>
              <img src={photoSrc} alt="Foto profesional" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', border: '4px solid var(--bg-main)' }} />
              <label htmlFor="photo-upload" style={{ position: 'absolute', bottom: '6px', right: '6px', width: '38px', height: '38px', borderRadius: '50%', background: 'var(--primary-blue)', color: 'white', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}>
                <Camera size={17} />
              </label>
              <input id="photo-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
            </div>
            <p style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-dark)' }}>{profile.name || 'Tu nombre'}</p>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{profile.title || 'Tu título'}</p>
            <div style={{ marginTop: '1.25rem', textAlign: 'left', background: 'var(--bg-main)', padding: '0.9rem', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              📸 Usa una foto de frente con buena iluminación. El fondo neutro genera más confianza.
            </div>
          </div>
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Información básica */}
          <div className="premium-card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-light)' }}>
              <User size={18} style={{ color: 'var(--primary-blue)' }} />
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-dark)', margin: 0 }}>Información Profesional</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-grid-2">
                <Field label="Nombre para mostrar"><input type="text" value={profile.name} onChange={e => set('name', e.target.value)} /></Field>
                <Field label="Título profesional"><input type="text" value={profile.title} onChange={e => set('title', e.target.value)} /></Field>
              </div>
              <div className="form-grid-2">
                <Field label="URL pública (slug)" hint="Ej: maria-garcia → teramy.cl/maria-garcia">
                  <input type="text" value={profile.slug} onChange={e => {
                    const formatted = e.target.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
                    set('slug', formatted);
                  }} />
                </Field>
                <Field label="Años de experiencia" hint="Opcional — 0 para no mostrar">
                  <input type="number" value={profile.years_experience || ''} onChange={e => set('years_experience', Number(e.target.value))} placeholder="Ej. 10" min={0} max={50} />
                </Field>
              </div>
              <Field label="Descripción / Sobre mí" hint="Esta es la primera impresión de tus pacientes. Sé cálido/a y claro/a.">
                <textarea rows={4} value={profile.description} onChange={e => set('description', e.target.value)} style={{ resize: 'vertical' }} />
                <span style={{ fontSize: '0.75rem', color: profile.description.length > 400 ? '#ef4444' : 'var(--text-muted)', alignSelf: 'flex-end' }}>
                  {profile.description.length}/400 caracteres
                </span>
              </Field>
            </div>
          </div>

          {/* Especialidades */}
          <div className="premium-card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-light)' }}>
              <Award size={18} style={{ color: 'var(--primary-blue)' }} />
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-dark)', margin: 0 }}>Especialidades e Idiomas</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-dark)', display: 'block', marginBottom: '0.6rem' }}>
                  Especialidades <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.8rem' }}>— Aparecen como etiquetas en tu perfil</span>
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0.65rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-white)', minHeight: '48px', cursor: 'text' }}
                  onClick={() => document.getElementById('tag-input')?.focus()}>
                  {profile.specialties.map(tag => (
                    <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.7rem', background: 'var(--primary-light-blue)', color: 'var(--primary-dark-blue)', borderRadius: '2rem', fontSize: '0.82rem', fontWeight: 600 }}>
                      {tag}
                      <button onClick={(e) => { e.stopPropagation(); removeTag(tag); }} style={{ color: 'var(--primary-blue)', cursor: 'pointer', lineHeight: 1, fontSize: '1rem' }}>×</button>
                    </span>
                  ))}
                  <input id="tag-input" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={addTag} placeholder={profile.specialties.length === 0 ? 'Escribe y presiona Enter...' : ''} style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.88rem', minWidth: '140px', flex: 1, padding: '0.1rem' }} />
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>Presiona Enter o coma para agregar cada especialidad.</p>
              </div>
              
              {/* Therapies */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-dark)', display: 'block', marginBottom: '0.6rem' }}>
                  Tipos de Terapia
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0.65rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-white)', minHeight: '48px', cursor: 'text' }}
                  onClick={() => document.getElementById('therapy-input')?.focus()}>
                  {(profile.therapies || []).map(tag => (
                    <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.7rem', background: '#f3e8ff', color: '#7e22ce', borderRadius: '2rem', fontSize: '0.82rem', fontWeight: 600 }}>
                      {tag}
                      <button onClick={(e) => { e.stopPropagation(); removeTherapy(tag); }} style={{ color: '#9333ea', cursor: 'pointer', lineHeight: 1, fontSize: '1rem', border: 'none', background: 'transparent', padding: 0 }}>×</button>
                    </span>
                  ))}
                  <input id="therapy-input" value={therapyInput} onChange={e => setTherapyInput(e.target.value)} onKeyDown={addTherapy} placeholder={(profile.therapies || []).length === 0 ? 'Escribe y presiona Enter...' : ''} style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.88rem', minWidth: '140px', flex: 1, padding: '0.1rem' }} />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                  {['Terapia individual', 'Terapia de pareja', 'Terapia familiar', 'Terapia infantil', 'Terapia adolescente', 'Terapia para adultos', 'Terapia grupal'].filter(t => !(profile.therapies || []).includes(t)).map(th => (
                    <button key={th} onClick={() => set('therapies', [...(profile.therapies || []), th])}
                      style={{ padding: '0.3rem 0.8rem', borderRadius: '2rem', border: '1.5px dashed var(--border-light)', background: 'transparent', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#a855f7'; e.currentTarget.style.color = '#9333ea'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
                      + {th}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-dark)', display: 'block', marginBottom: '0.6rem' }}>Idiomas de atención</label>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {['Español', 'Inglés', 'Portugués', 'Francés'].map(lang => {
                    const active = profile.languages.includes(lang);
                    return (
                      <button key={lang} onClick={() => set('languages', active ? profile.languages.filter(l => l !== lang) : [...profile.languages, lang])}
                        style={{ padding: '0.45rem 1rem', borderRadius: '2rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', border: `1.5px solid ${active ? 'var(--primary-blue)' : 'var(--border-light)'}`, background: active ? 'var(--primary-light-blue)' : 'transparent', color: active ? 'var(--primary-dark-blue)' : 'var(--text-muted)' }}>
                        {lang}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="premium-card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-light)' }}>
              <Globe size={18} style={{ color: 'var(--primary-blue)' }} />
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-dark)', margin: 0 }}>Links y Redes Sociales</h2>
            </div>
            <div className="form-grid-2">
              <Field label="Instagram" hint="Ej. @dralaura.psicologa">
                <div style={{ position: 'relative' }}>
                  <Instagram size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type="text" value={profile.instagram_url || ''} onChange={e => set('instagram_url', e.target.value)} placeholder="instagram.com/tu-usuario" style={{ paddingLeft: '2.5rem' }} />
                </div>
              </Field>
              <Field label="WhatsApp" hint="Ej. +56912345678 (Opcional)">
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type="tel" value={profile.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="+569" style={{ paddingLeft: '2.5rem' }} />
                </div>
              </Field>
            </div>
          </div>

          {/* Save row */}
          <div className="profile-save-bar">
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Los cambios se reflejan en tu enlace público al guardar.</p>
            <button onClick={handleSave} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 2rem' }}>
              {saved ? <><CheckCircle2 size={17} /> ¡Guardado!</> : saving ? <><Loader2 size={17} /> Guardando...</> : <><Save size={17} /> Guardar Cambios</>}
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
