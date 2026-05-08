"use client";

import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, DollarSign, Calendar, ArrowUpRight, ArrowDownRight, BarChart2, Clock, Loader2 } from 'lucide-react';
import { supabase } from '@/utils/supabase';
import { usePsychologist, useCachedQuery } from '@/lib/dashboard-context';

interface MonthData { month: string; sessions: number; income: number; new: number; }
interface WeekdayData { day: string; sessions: number; }
interface StatusData { label: string; count: number; color: string; pct: number; }
interface ServiceData { name: string; sessions: number; income: number; pct: number; }

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const DAY_NAMES = ['Lun','Mar','Mié','Jue','Vie'];

const fmt = (n: number) => `$${new Intl.NumberFormat('es-CL').format(Math.round(n))}`;

type AnalyticsBundle = {
  monthlyData:    MonthData[];
  weekdayLoad:    WeekdayData[];
  patientStatus:  StatusData[];
  topServices:    ServiceData[];
  totalPatients:  number;
  attendanceRate: number;
};

export default function AnalyticsPage() {
  const { psychologist } = usePsychologist();
  const psychId = psychologist?.id ?? null;

  const { data: bundle, loading } = useCachedQuery<AnalyticsBundle>(
    psychId ? `analytics:${psychId}` : null,
    async () => {
      const empty: AnalyticsBundle = { monthlyData: [], weekdayLoad: [], patientStatus: [], topServices: [], totalPatients: 0, attendanceRate: 0 };
      const { data: appts } = await supabase
        .from('appointments')
        .select('id, start_time, status, patient_id, event_types(title, price)')
        .eq('psychologist_id', psychId!);

      const allPatientIds = (appts ?? []).map((a: any) => a.patient_id).filter(Boolean);
      const patientIds = allPatientIds.filter((id: string, idx: number) => allPatientIds.indexOf(id) === idx);
      const { data: patients } = patientIds.length > 0
        ? await supabase.from('patients').select('id, created_at, status').in('id', patientIds)
        : { data: [] as { id: string; created_at: string; status: string }[] };

      if (!appts || !patients) return empty;

      const now = new Date();
      const monthly: MonthData[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
        const monthEnd   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();
        const monthAppts = appts.filter(a => a.start_time >= monthStart && a.start_time <= monthEnd && a.status === 'completed');
        const monthPats  = (patients ?? []).filter(p => p.created_at >= monthStart && p.created_at <= monthEnd);
        const income = monthAppts.reduce((sum, a) => {
          const et = a.event_types;
          const price = Array.isArray(et) ? et[0]?.price : (et as any)?.price;
          return sum + (price ?? 0);
        }, 0);
        monthly.push({ month: MONTH_NAMES[d.getMonth()], sessions: monthAppts.length, income, new: monthPats.length });
      }

      const dayCounts = [0, 0, 0, 0, 0];
      appts.filter(a => a.status === 'completed').forEach(a => {
        const day = new Date(a.start_time).getDay();
        const idx = day === 0 ? -1 : day - 1;
        if (idx >= 0 && idx < 5) dayCounts[idx]++;
      });
      const weekdayLoad: WeekdayData[] = DAY_NAMES.map((d, i) => ({ day: d, sessions: dayCounts[i] }));

      const total = (patients ?? []).length;
      const statusCounts: Record<string, number> = { 'En proceso': 0, 'En pausa': 0, 'Alta': 0, 'Evaluación': 0 };
      (patients ?? []).forEach(p => {
        if (statusCounts[p.status] !== undefined) statusCounts[p.status]++;
        else statusCounts['En proceso']++;
      });
      const statusColors: Record<string, string> = { 'En proceso': '#10b981', 'En pausa': '#f59e0b', 'Alta': '#3b82f6', 'Evaluación': '#94a3b8' };
      const patientStatus: StatusData[] = Object.entries(statusCounts).map(([label, count]) => ({
        label, count, color: statusColors[label], pct: total > 0 ? Math.round((count / total) * 100) : 0,
      }));

      const svcMap: Record<string, { sessions: number; income: number }> = {};
      appts.filter(a => a.status === 'completed').forEach(a => {
        const name = (a.event_types as any)?.title ?? 'Sin servicio';
        const price = (a.event_types as any)?.price ?? 0;
        if (!svcMap[name]) svcMap[name] = { sessions: 0, income: 0 };
        svcMap[name].sessions++;
        svcMap[name].income += price;
      });
      const totalSessions = appts.filter(a => a.status === 'completed').length;
      const topServices: ServiceData[] = Object.entries(svcMap)
        .map(([name, v]) => ({ name, ...v, pct: totalSessions > 0 ? Math.round((v.sessions / totalSessions) * 100) : 0 }))
        .sort((a, b) => b.sessions - a.sessions)
        .slice(0, 4);

      const total2 = appts.length;
      const cancelled = appts.filter(a => a.status === 'cancelled').length;
      const attendanceRate = total2 > 0 ? Math.round(((total2 - cancelled) / total2) * 100) : 0;

      return { monthlyData: monthly, weekdayLoad, patientStatus, topServices, totalPatients: total, attendanceRate };
    },
  );

  const monthlyData    = bundle?.monthlyData    ?? [];
  const weekdayLoad    = bundle?.weekdayLoad    ?? [];
  const patientStatus  = bundle?.patientStatus  ?? [];
  const topServices    = bundle?.topServices    ?? [];
  const totalPatients  = bundle?.totalPatients  ?? 0;
  const attendanceRate = bundle?.attendanceRate ?? 0;

  if (loading) {
    return (
      <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem', color: 'var(--text-muted)' }}>
        <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary-blue)' }} />
        <p style={{ fontWeight: 500 }}>Cargando analíticas...</p>
      </div>
    );
  }

  if (monthlyData.length === 0) {
    return (
      <div className="animate-slide-up">
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.5rem' }}>Analíticas</h1>
        <div className="premium-card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <BarChart2 size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
          <p style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.5rem' }}>Sin datos aún</p>
          <p style={{ fontSize: '0.9rem' }}>Las analíticas aparecerán cuando tengas sesiones y pacientes registrados.</p>
        </div>
      </div>
    );
  }

  const currentMonth = monthlyData[monthlyData.length - 1];
  const prevMonth    = monthlyData[monthlyData.length - 2] ?? monthlyData[0];
  const sessionsDiff = prevMonth.sessions > 0 ? Math.round(((currentMonth.sessions - prevMonth.sessions) / prevMonth.sessions) * 100) : 0;
  const incomeDiff   = prevMonth.income   > 0 ? Math.round(((currentMonth.income   - prevMonth.income)   / prevMonth.income)   * 100) : 0;
  const maxIncome   = Math.max(...monthlyData.map(d => d.income), 1);
  const maxSessions = Math.max(...weekdayLoad.map(d => d.sessions), 1);
  const busiest     = weekdayLoad.reduce((a, b) => b.sessions > a.sessions ? b : a, weekdayLoad[0]);

  return (
    <>
      <style>{`
        .analytics-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 2rem;
          gap: 1rem;
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.25rem;
          margin-bottom: 1.75rem;
        }
        .charts-row {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1.25rem;
          margin-bottom: 1.25rem;
        }
        .bottom-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
        }
        .income-chart-bars {
          display: flex;
          gap: 0.75rem;
          align-items: flex-end;
          height: 160px;
        }

        @media (max-width: 1024px) {
          .kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .charts-row, .bottom-row {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .analytics-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .kpi-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
          .income-chart-bars {
            gap: 0.35rem;
          }
          .income-chart-bars span {
            font-size: 0.65rem !important;
          }
        }
      `}</style>
      <div className="animate-slide-up">
      {/* Header */}
      <div className="analytics-header">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.2rem' }}>Analíticas</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Resumen de tu consulta · Actualizado ahora</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        {[
          { label: `Sesiones (${currentMonth.month})`, value: `${currentMonth.sessions}`, sub: `${sessionsDiff >= 0 ? '+' : ''}${sessionsDiff}% vs mes anterior`, up: sessionsDiff >= 0, icon: Calendar, iconBg: '#e8f4fc', iconColor: '#0ea5e9' },
          { label: `Ingresos (${currentMonth.month})`, value: fmt(currentMonth.income), sub: `${incomeDiff >= 0 ? '+' : ''}${incomeDiff}% vs mes anterior`, up: incomeDiff >= 0, icon: DollarSign, iconBg: '#fef9ee', iconColor: '#d97706' },
          { label: 'Pacientes activos', value: `${totalPatients}`, sub: `${currentMonth.new} nuevos este mes`, up: currentMonth.new > 0, icon: Users, iconBg: '#ecfdf5', iconColor: '#10b981' },
          { label: 'Tasa de asistencia', value: `${attendanceRate}%`, sub: `${100 - attendanceRate}% cancelaciones`, up: attendanceRate >= 80, icon: TrendingUp, iconBg: '#f5f3ff', iconColor: '#7c3aed' },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className="premium-card" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: '70px', height: '70px', background: `${kpi.iconBg}80`, borderRadius: '0 var(--radius-md) 0 70px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>{kpi.label}</span>
                <span style={{ padding: '0.4rem', background: kpi.iconBg, color: kpi.iconColor, borderRadius: '8px' }}><Icon size={16} /></span>
              </div>
              <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-dark)', lineHeight: 1, marginBottom: '0.5rem' }}>{kpi.value}</p>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: kpi.up ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                {kpi.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{kpi.sub}
              </p>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="charts-row">
        <div className="premium-card" style={{ padding: '1.75rem 2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-dark)', margin: 0 }}>Ingresos mensuales</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Últimos 7 meses</p>
            </div>
          </div>
          <div className="income-chart-bars">
            {monthlyData.map((d, i) => {
              const h = Math.max((d.income / maxIncome) * 140, 4);
              const isCurrent = i === monthlyData.length - 1;
              const isLast    = false; // previously was comparing to -1, redundant now
              return (
                <div key={d.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: isCurrent ? 'var(--primary-blue)' : 'var(--text-muted)' }}>{!isLast ? fmt(d.income) : ''}</span>
                  <div style={{ height: `${h}px`, width: '100%', borderRadius: '6px 6px 0 0', background: isLast ? 'linear-gradient(180deg,rgba(14,165,233,0.3) 0%,rgba(14,165,233,0.1) 100%)' : isCurrent ? 'var(--primary-gradient)' : 'linear-gradient(180deg,#e2e8f0 0%,#cbd5e1 100%)', transition: 'all 0.3s' }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? 'var(--primary-blue)' : 'var(--text-muted)' }}>{d.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="premium-card" style={{ padding: '1.75rem 2rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-dark)', margin: 0 }}>Carga semanal</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Sesiones por día</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {weekdayLoad.map(d => (
              <div key={d.day} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', width: '30px' }}>{d.day}</span>
                <div style={{ flex: 1, height: '10px', background: 'var(--bg-main)', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: '5px', width: `${(d.sessions / maxSessions) * 100}%`, background: 'var(--primary-gradient)', transition: 'width 0.5s ease' }} />
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-dark)', width: '20px', textAlign: 'right' }}>{d.sessions}</span>
              </div>
            ))}
          </div>
          {busiest && busiest.sessions > 0 && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                <Clock size={13} /> <strong>{busiest.day}</strong> es tu día más demandado
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="bottom-row">
        <div className="premium-card" style={{ padding: '1.75rem 2rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '1.5rem' }}>Estado de pacientes</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            {patientStatus.map(ps => (
              <div key={ps.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: ps.color }} />
                    <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-dark)' }}>{ps.label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-dark)' }}>{ps.count}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{ps.pct}%</span>
                  </div>
                </div>
                <div style={{ height: '7px', background: 'var(--bg-main)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: '4px', width: `${ps.pct}%`, background: ps.color, transition: 'width 0.6s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="premium-card" style={{ padding: '1.75rem 2rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '1.5rem' }}>Servicios más usados</h3>
          {topServices.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Sin datos de servicios aún.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {topServices.map((svc, i) => (
                <div key={svc.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                    <div>
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-dark)' }}>{svc.name}</span>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        {svc.sessions} sesiones · {svc.income > 0 ? fmt(svc.income) : 'Gratuito'}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary-blue)' }}>{svc.pct}%</span>
                  </div>
                  <div style={{ height: '7px', background: 'var(--bg-main)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: '4px', width: `${svc.pct}%`, background: i === 0 ? 'var(--primary-gradient)' : i === 1 ? 'linear-gradient(90deg,#f59e0b,#f97316)' : '#e2e8f0', transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
