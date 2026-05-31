import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Cliente Supabase para el frontend.
 *
 * persistSession: true  → guarda la sesión entre recargas y cierres de pestaña
 * storageKey           → nombre de la clave en localStorage
 * autoRefreshToken: true → renueva el token automáticamente antes de que expire
 * detectSessionInUrl: true → maneja el callback de OAuth (Google login)
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'teramy-auth-session',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});
