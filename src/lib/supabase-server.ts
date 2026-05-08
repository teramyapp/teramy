import { createClient } from '@supabase/supabase-js';

// Server-side client with service_role key — bypasses RLS
// Only use in API routes (server-side), never expose to the browser
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}
