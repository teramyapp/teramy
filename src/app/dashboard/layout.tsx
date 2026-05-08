"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Calendar, User, Clock, FileText, Home, UserCircle, BarChart2, Zap, Settings2, Menu, X, type LucideIcon } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import {
  DashboardDataProvider, usePsychologist, useDashboardCache,
} from '@/lib/dashboard-context';

// ── Inner layout: needs the provider in scope, so lives in a child component ──
function DashboardChrome({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { psychologist, loading } = usePsychologist();
  const { prefetch } = useDashboardCache();

  // Redirect to /login if no auth (handled here so the provider above us has run).
  useEffect(() => {
    if (loading) return;
    if (!psychologist) {
      // double-check session before bouncing — psychologist could be missing yet
      // but session valid (e.g. profile not created yet)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.user) router.replace('/login');
      });
    }
  }, [loading, psychologist, router]);

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

        <Link
          href="/dashboard/profile"
          prefetch={true}
          onClick={() => setIsMobileMenuOpen(false)}
          style={{
            marginTop: 'auto',
            padding: '1.15rem 1rem',
            background: 'var(--bg-main)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            textDecoration: 'none',
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
        </Link>
      </aside>

      <main className="main-content">
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          {children}
        </div>
      </main>
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
