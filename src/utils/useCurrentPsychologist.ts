/**
 * Hook that returns the current psychologist's ID using getSession()
 * instead of getUser() to avoid navigator.locks contention.
 *
 * getSession() reads from in-memory cache / localStorage — no lock needed.
 * Only the layout.tsx uses getUser() (once, for auth verification).
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';

interface PsychologistSession {
  psychologistId: string | null;
  userId: string | null;
  loading: boolean;
}

export function useCurrentPsychologist(): PsychologistSession {
  const [state, setState] = useState<PsychologistSession>({
    psychologistId: null,
    userId: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // getSession() does NOT use navigator.locks → safe to call from many components
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        if (!cancelled) setState({ psychologistId: null, userId: null, loading: false });
        return;
      }

      const { data: psych } = await supabase
        .from('psychologists')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

      if (!cancelled) {
        setState({
          psychologistId: psych?.id ?? null,
          userId: session.user.id,
          loading: false,
        });
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return state;
}
