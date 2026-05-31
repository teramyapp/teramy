// ─────────────────────────────────────────────
// Teramy — Shared Types
// Aligned with Supabase schema for DB integration
// ─────────────────────────────────────────────

export type ServiceModality = 'online' | 'presencial';

export interface Service {
  id: string;
  psychologist_id: string;        // FK → psychologists.id
  name: string;
  description: string;
  modality: ServiceModality;
  duration_minutes: number;
  price: number;                  // 0 = gratis
  address?: string;               // only for presencial
  is_first_session_only?: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Psychologist {
  id: string;
  user_id: string;                // FK → auth.users.id
  slug: string;                   // unique, e.g. "laura-morales"
  name: string;
  title: string;                  // "Psicóloga Clínica"
  registration_number?: string;   // N° Registro SPS
  years_experience?: number;
  description: string;
  photo_url?: string;
  specialties: string[];          // ["Ansiedad", "Depresión"]
  therapies?: string[];           // ["Terapia individual", "Terapia de pareja"]
  languages: string[];            // ["Español", "Inglés"]
  instagram_url?: string;
  phone?: string;
  timezone: string;               // "America/Santiago"
  subscription_status: 'trialing' | 'active' | 'paused' | 'cancelled';
  trial_ends_at: string;
  video_meeting_url?: string;
  video_meeting_type?: 'meet' | 'zoom';
  office_street?: string;
  office_suite?: string;
  office_commune?: string;
  office_city?: string;
  whatsapp_reminder_template?: string;
  whatsapp_reschedule_template?: string;
  whatsapp_cancel_template?: string;
  created_at: string;
}

export interface AvailabilitySlot {
  id: string;
  psychologist_id: string;
  day_of_week: number;            // 0=Dom, 1=Lun ... 6=Sáb
  start_time: string;             // "09:00"
  end_time: string;               // "13:00"
}

export interface AvailabilitySettings {
  timezone: string;
  buffer_minutes: number;         // time between sessions
  min_notice_hours: number;       // min advance booking
  max_sessions_per_day: number;
  booking_window_days: number;    // how far in the future patients can book
  allow_overtime?: boolean;       // allow sessions to end after shift if they start within it
}

export interface BlockedDate {
  id: string;
  psychologist_id: string;
  date: string;                   // "2025-12-25"
  reason?: string;
}

// ─── Local state shapes for the UI ───────────
export interface DaySchedule {
  day: string;
  day_index: number;             // matches day_of_week
  active: boolean;
  slots: { start: string; end: string }[];
}
