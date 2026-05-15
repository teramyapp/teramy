import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Routes that always stay accessible (never redirected)
const PUBLIC_PATHS = ['/login', '/register', '/subscribe', '/', '/psicologo-prueba'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only guard /dashboard routes
  if (!pathname.startsWith('/dashboard')) {
    return NextResponse.next();
  }

  // ── 1. Extract session from cookie ──────────────────────────────────────────
  // Supabase stores the session as a JSON string in the cookie named
  // "sb-<project-ref>-auth-token". We parse it to get user.id.
  let userId: string | null = null;

  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.includes('auth-token') && cookie.name.startsWith('sb-')) {
      try {
        const parsed = JSON.parse(cookie.value);
        userId = parsed?.user?.id ?? null;
      } catch {
        // malformed cookie — treat as unauthenticated
      }
      break;
    }
  }

  // No session → go to login
  if (!userId) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── 2. Check subscription status via service-role client (bypasses RLS) ─────
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: psych, error } = await supabase
    .from('psychologists')
    .select('subscription_status, trial_ends_at')
    .eq('user_id', userId)
    .single();

  // If no psychologist record yet (e.g. they logged in with Google but haven't created a profile)
  if (error || !psych) {
    const setupUrl = new URL('/register', request.url);
    setupUrl.searchParams.set('step', '2');
    return NextResponse.redirect(setupUrl);
  }

  const { subscription_status, trial_ends_at } = psych;

  // ── 3. Determine access ──────────────────────────────────────────────────────
  const trialExpired = trial_ends_at ? new Date(trial_ends_at) < new Date() : false;

  const isBlocked =
    subscription_status === 'paused' ||
    subscription_status === 'cancelled' ||
    (subscription_status === 'trialing' && trialExpired);

  if (isBlocked) {
    const subscribeUrl = new URL('/subscribe', request.url);
    return NextResponse.redirect(subscribeUrl);

    // Auto-update status to 'paused' if trial just expired
    if (subscription_status === 'trialing' && trialExpired) {
      await supabase
        .from('psychologists')
        .update({ subscription_status: 'paused' })
        .eq('user_id', userId);
    }

    const subscribeUrl = new URL('/subscribe', request.url);
    return NextResponse.redirect(subscribeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
