import React from 'react';
import { Clock, DollarSign, Video, Plus, MoreVertical } from 'lucide-react';

export default function EventTypesPage() {
  const eventTypes = [
    { title: 'Evaluación Inicial', duration: 30, price: 0, mode: 'Online', description: 'Primera sesión para evaluar motivos de consulta.' },
    { title: 'Terapia Psicológica', duration: 50, price: 45000, mode: 'Online', description: 'Sesión regular de seguimiento y trabajo terapéutico.' }
  ];

  return (
    <div className="animate-slide-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-dark)' }}>Tipos de Evento</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Gestiona los servicios que ofreces a tus pacientes</p>
        </div>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} /> Nuevo Evento
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {eventTypes.map((event, idx) => (
          <div key={idx} className="premium-card" style={{ padding: '2rem', borderTop: '4px solid var(--primary-blue)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-dark)' }}>{event.title}</h3>
              <button style={{ color: 'var(--text-muted)' }}><MoreVertical size={20} /></button>
            </div>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.5, minHeight: '40px' }}>
              {event.description}
            </p>

            <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-light)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 500 }}><Clock size={16} style={{color: 'var(--primary-blue)'}}/> {event.duration} min</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 500 }}><DollarSign size={16} style={{color: 'var(--primary-blue)'}}/> {event.price === 0 ? 'Gratis' : `$${event.price.toLocaleString()}`}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 500 }}><Video size={16} style={{color: 'var(--primary-blue)'}}/> {event.mode}</span>
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
              <button style={{ flex: 1, padding: '0.75rem', fontWeight: 600, color: 'var(--primary-dark-blue)', backgroundColor: 'var(--primary-light-blue)', borderRadius: 'var(--radius-sm)' }}>
                Copiar Enlace
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
