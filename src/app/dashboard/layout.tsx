"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Calendar, User, Clock, FileText, Home, UserCircle, BarChart2, Zap, Settings2, Menu, X, LogOut, type LucideIcon } from 'lucide-react';
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/utils/supabase';
import {
  DashboardDataProvider, usePsychologist, useDashboardCache,
} from '@/lib/dashboard-context';

// ── Inner layout: needs the provider in scope, so lives in a child component ──
function DashboardChrome({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { psychologist, loading } = usePsychologist();
  const { prefetch } = useDashboardCache();

  const isPaymentSuccess = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('payment') === 'success';
  const isTrialExpired = psychologist?.trial_ends_at ? new Date(psychologist.trial_ends_at) < new Date() : false;
  const isBlocked = !loading && !!psychologist && psychologist.subscription_status !== 'active' && (
    psychologist.subscription_status === 'paused' ||
    psychologist.subscription_status === 'cancelled' ||
    (psychologist.subscription_status === 'trialing' && isTrialExpired)
  );

  // Redirect to /login if no auth, or /subscribe if trial expired
  useEffect(() => {
    if (loading) return;
    if (!psychologist) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.user) router.replace('/login');
      });
      return;
    }

    if (isBlocked && !isPaymentSuccess) {
      router.replace('/subscribe');
    }
  }, [loading, psychologist, isBlocked, isPaymentSuccess, router]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const userName     = psychologist?.name ?? '';
  const userTitle    = psychologist?.title ?? 'Psicólogo/a';
  const userPhoto    = psychologist?.photo_url ?? null;
  const userInitials = userName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const psychId = psychologist?.id;

  // ── Prefetchers per route — fire on hover so target page renders instantly ──
  const prefetchers: Record<string, () => void> = {
    '/dashboard': () => {
      if (!psychId) return;
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);
      prefetch(`home:today:${psychId}`, async () => {
        const { data } = await supabase
          .from('appointments')
          .select('id, start_time, status, patients(name, email, phone), event_types(title, mode, price)')
          .eq('psychologist_id', psychId)
          .in('status', ['pending', 'confirmed', 'scheduled'])
          .gte('start_time', todayStart.toISOString())
          .lte('start_time', todayEnd.toISOString())
          .order('start_time');
        return data ?? [];
      });
    },
    '/dashboard/appointments': () => {
      if (!psychId) return;
      prefetch(`appts:all:${psychId}`, async () => {
        const { data } = await supabase
          .from('appointments')
          .select('*, patients(id, name, email, phone), event_types(id, title, mode, duration_minutes, price)')
          .eq('psychologist_id', psychId)
          .order('start_time', { ascending: false });
        return data ?? [];
      });
    },
    '/dashboard/patients': () => {
      if (!psychId) return;
      prefetch(`patients:all:${psychId}`, async () => {
        const { data } = await supabase
          .from('patients')
          .select('*')
          .eq('psychologist_id', psychId)
          .order('name');
        return data ?? [];
      });
    },
    '/dashboard/services': () => {
      if (!psychId) return;
      prefetch(`services:all:${psychId}`, async () => {
        const { data } = await supabase
          .from('event_types')
          .select('*')
          .eq('psychologist_id', psychId)
          .order('created_at');
        return data ?? [];
      });
    },
    '/dashboard/availability': () => {
      if (!psychId) return;
      prefetch(`avail:all:${psychId}`, async () => {
        const [a, b, s] = await Promise.all([
          supabase.from('availability').select('*').eq('psychologist_id', psychId),
          supabase.from('blocked_dates').select('*').eq('psychologist_id', psychId).order('date'),
          supabase.from('availability_settings')
            .select('buffer_minutes, min_notice_hours, max_sessions_per_day')
            .eq('psychologist_id', psychId).maybeSingle(),
        ]);
        return { availability: a.data ?? [], blocked: b.data ?? [], settings: s.data };
      });
    },
  };

  const handleHover = (href: string) => prefetchers[href]?.();

  const mainLinks = [
    { name: 'Dashboard',  href: '/dashboard',              icon: Home },
    { name: 'Sesiones',   href: '/dashboard/appointments', icon: Calendar },
    { name: 'Pacientes',  href: '/dashboard/patients',     icon: User },
    { name: 'Analíticas', href: '/dashboard/analytics',    icon: BarChart2 },
  ];

  const configLinks = [
    { name: 'Mis Servicios',   href: '/dashboard/services',     icon: FileText },
    { name: 'Disponibilidad',  href: '/dashboard/availability', icon: Clock },
    { name: 'Integraciones',   href: '/dashboard/automations',  icon: Zap },
    { name: 'Mi Perfil',       href: '/dashboard/profile',      icon: UserCircle },
    { name: 'Configuración',   href: '/dashboard/settings',     icon: Settings2 },
  ];

  const renderLink = (link: { name: string; href: string; icon: LucideIcon }) => {
    const Icon = link.icon;
    const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
    return (
      <Link
        key={link.name}
        href={link.href}
        prefetch={true}
        onMouseEnter={() => handleHover(link.href)}
        onFocus={()       => handleHover(link.href)}
        onClick={() => setIsMobileMenuOpen(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-md)',
          backgroundColor: isActive ? 'var(--primary-light-blue)' : 'transparent',
          color: isActive ? 'var(--primary-dark-blue)' : 'var(--text-muted)',
          fontWeight: isActive ? 600 : 500,
          fontSize: '0.92rem',
          transition: 'all 0.2s ease',
          border: isActive ? '1px solid rgba(14, 165, 233, 0.2)' : '1px solid transparent',
        }}
      >
        <Icon size={18} style={{ opacity: isActive ? 1 : 0.65 }} />
        {link.name}
      </Link>
    );
  };

  if (!loading && isBlocked && !isPaymentSuccess) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f0f7ff, #f8fafc)',
        padding: '2rem',
        textAlign: 'center',
        fontFamily: 'Outfit, sans-serif',
      }}>
        <div style={{
          background: 'white',
          borderRadius: '24px',
          padding: '3rem 2.5rem',
          maxWidth: '480px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0',
        }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%', background: '#fef2f2',
            color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.25rem', border: '2px solid #fecaca'
          }}>
            <Clock size={32} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
            Tu período de prueba ha finalizado
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
            Para seguir utilizando Teramy y acceder a tu agenda, pacientes y notas de sesión, activa tu suscripción.
          </p>
          <button
            onClick={() => router.push('/subscribe')}
            style={{
              width: '100%', padding: '0.95rem', borderRadius: '14px',
              background: 'linear-gradient(135deg, #0369a1, #0ea5e9)', color: 'white',
              fontWeight: 800, fontSize: '1.05rem', border: 'none', cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(14,165,233,0.3)', transition: 'all 0.2s',
            }}
          >
            Activar mi suscripción
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .layout-container {
          display: flex;
          min-height: 100vh;
          background-color: var(--bg-main);
        }
        .desktop-sidebar {
          width: 280px;
          background-color: var(--bg-white);
          border-right: 1px solid var(--border-light);
          padding: 2rem 1.5rem;
          display: flex;
          flex-direction: column;
          box-shadow: 4px 0 24px rgba(0,0,0,0.02);
          position: sticky;
          top: 0;
          height: 100vh;
        }
        .mobile-header {
          display: none;
        }
        .main-content {
          flex: 1;
          padding: 3rem 4rem;
          overflow-y: auto;
          width: 100%;
        }
        .mobile-overlay {
          display: none;
        }
        .mobile-close-btn {
          display: none;
        }
        @media (max-width: 1024px) {
          .layout-container {
            flex-direction: column;
          }
          .desktop-sidebar {
            display: ${isMobileMenuOpen ? 'flex' : 'none'};
            position: fixed;
            top: 0;
            left: 0;
            z-index: 100;
            box-shadow: 4px 0 24px rgba(0,0,0,0.1);
          }
          .mobile-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1rem 1.5rem;
            background: white;
            border-bottom: 1px solid var(--border-light);
            position: sticky;
            top: 0;
            z-index: 90;
          }
          .main-content {
            padding: 1.5rem 1rem;
          }
          .mobile-overlay {
            display: ${isMobileMenuOpen ? 'block' : 'none'};
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.4);
            z-index: 99;
          }
          .mobile-close-btn {
            display: block;
            position: absolute;
            top: 1.5rem;
            right: 1.5rem;
            background: none;
            border: none;
            cursor: pointer;
            color: var(--text-muted);
          }
        }
      `}</style>
      <div className="layout-container">
        {/* Mobile Header */}
        <div className="mobile-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <img src="/fondo%20blanco.png" alt="Teramy Logo" style={{ width: '32px', height: '32px', mixBlendMode: 'multiply', objectFit: 'contain' }} />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, background: 'var(--primary-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0, letterSpacing: '-0.5px' }}>Teramy</h2>
          </div>
          <button onClick={() => setIsMobileMenuOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem' }}>
            <Menu size={26} style={{ color: 'var(--text-dark)' }} />
          </button>
        </div>

        {/* Mobile Overlay */}
        <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)} />

        <aside className="desktop-sidebar">
          <button className="mobile-close-btn" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={24} />
          </button>
        <div style={{ marginBottom: '3rem', paddingLeft: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <img src="/fondo%20blanco.png" alt="Teramy Logo" style={{ width: '42px', height: '42px', mixBlendMode: 'multiply', objectFit: 'contain' }} />
            <h2 style={{
              fontSize: '1.8rem',
              fontWeight: 800,
              background: 'var(--primary-gradient)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.5px',
            }}>
              Teramy
            </h2>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem', fontWeight: 500 }}>Panel del Profesional</p>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {mainLinks.map(renderLink)}

          <div style={{ margin: '0.75rem 0', borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem' }}>
            <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', paddingLeft: '0.5rem', marginBottom: '0.35rem', opacity: 0.7 }}>Configuración</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {configLinks.map(renderLink)}
            </div>
          </div>
        </nav>

        <div ref={profileMenuRef} style={{ marginTop: 'auto', position: 'relative' }}>
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            style={{
              width: '100%',
              padding: '1.15rem 1rem',
              background: 'var(--bg-main)',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              textAlign: 'left',
              border: '1px solid var(--border-light)',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = 'var(--primary-blue)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border-light)'; }}
          >
            {userPhoto ? (
              <img src={userPhoto} alt={userName} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
            ) : (
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0, border: '2px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                {userInitials || '?'}
              </div>
            )}
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{userName || 'Mi perfil'}</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.1rem 0 0', fontWeight: 500 }}>{userTitle || 'Psicólogo/a'}</p>
            </div>
          </button>

          {isProfileMenuOpen && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              width: '100%',
              marginBottom: '0.75rem',
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
              border: '1px solid var(--border-light)',
              overflow: 'hidden',
              zIndex: 50,
            }}>
              <Link
                href="/dashboard/profile"
                onClick={() => { setIsProfileMenuOpen(false); setIsMobileMenuOpen(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.85rem 1rem',
                  color: 'var(--text-dark)',
                  textDecoration: 'none',
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f8fafc'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'white'; }}
              >
                <UserCircle size={18} />
                Ver perfil
              </Link>
              <button
                onClick={() => { setIsProfileMenuOpen(false); setShowLogoutModal(true); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.85rem 1rem',
                  width: '100%',
                  textAlign: 'left',
                  border: 'none',
                  background: 'white',
                  color: '#ef4444',
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  borderTop: '1px solid var(--border-light)',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fef2f2'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'white'; }}
              >
                <LogOut size={18} />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="main-content">
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          {children}
        </div>
      </main>

      {showLogoutModal && (
        <>
          <div onClick={() => setShowLogoutModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', zIndex: 1000 }} />
          <div className="animate-slide-up" style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            background: 'white', borderRadius: '20px', padding: '2.5rem', maxWidth: '440px', width: '90%',
            boxShadow: '0 24px 64px rgba(0,0,0,0.14)', zIndex: 1001,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LogOut size={22} style={{ color: '#0ea5e9', marginLeft: '3px' }} />
              </div>
              <button onClick={() => setShowLogoutModal(false)} style={{ color: '#94a3b8', cursor: 'pointer', background: 'none', border: 'none', padding: '0.2rem' }}>
                <X size={20} />
              </button>
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>¿Cerrar sesión?</h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Saldrás de tu cuenta en este dispositivo. Puedes volver a ingresar en cualquier momento.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setShowLogoutModal(false)} style={{ flex: 1, padding: '0.8rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button
                onClick={() => { setShowLogoutModal(false); handleLogout(); }}
                style={{
                  flex: 1, padding: '0.8rem', borderRadius: '10px', border: 'none',
                  background: 'linear-gradient(135deg,#0369a1,#0ea5e9)',
                  color: 'white', fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(14,165,233,0.3)',
                }}
              >
                Sí, cerrar sesión
              </button>
            </div>
          </div>
        </>
      )}
    </div>
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardDataProvider>
      <DashboardChrome>{children}</DashboardChrome>
    </DashboardDataProvider>
  );
}
