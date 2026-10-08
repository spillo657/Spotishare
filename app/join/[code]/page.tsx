'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { useToast } from '@/components/ToastContext';

export default function JoinPlanPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'checking' | 'valid' | 'invalid' | 'full'>('checking');

  useEffect(() => {
    async function handleJoin() {
      const code = (params.code as string)?.toUpperCase();
      if (!code) {
        setStatus('invalid');
        setLoading(false);
        return;
      }

      try {
        console.log('Checking invite code:', code);
        // 1. Verify the invite code exists and get plan details
        const { data: plan, error: planError } = await supabase
          .from('plans')
          .select('id, name, max_members')
          .eq('invite_code', code)
          .maybeSingle();

        if (planError || !plan) {
          console.error('Plan search error:', planError);
          setStatus('invalid');
          setLoading(false);
          return;
        }

        // 2. Check if the plan is full
        const { count: memberCount, error: countError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('plan_id', plan.id);

        if (countError) throw countError;

        if (memberCount && memberCount >= plan.max_members) {
          setStatus('full');
          setLoading(false);
          return;
        }

        // 3. Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          showToast("Devi effettuare l'accesso per unirti a un gruppo", "error");
          router.push('/login');
          return;
        }

        // 4. Join the plan
        const { error: joinError } = await supabase
          .from('users')
          .update({ plan_id: plan.id })
          .eq('id', user.id);

        if (joinError) throw joinError;

        setStatus('valid');
        showToast(`Benvenuto nel gruppo ${plan.name}!`, "success");

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);

      } catch (error: any) {
        console.error("Join error:", error);
        showToast("Errore durante l'unione al gruppo: " + error.message, "error");
        setStatus('invalid');
      } finally {
        setLoading(false);
      }
    }

    handleJoin();
  }, [params.code, router, showToast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121212] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#1DB954] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="animate-pulse">Verifica invito in corso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white flex items-center justify-center p-4">
      <div className="bg-[#181818] p-8 rounded-2xl border border-[#282828] shadow-2xl max-w-md w-full text-center">
        {status === 'valid' && (
          <>
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold mb-2">Unione Riuscita!</h1>
            <p className="text-[#B3B3B3] mb-6">Sei stato aggiunto al gruppo. Verrai reindirizzato alla dashboard...</p>
          </>
        )}

        {status === 'invalid' && (
          <>
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold mb-2">Codice Non Valido</h1>
            <p className="text-[#B3B3B3] mb-6">Il codice d'invito inserito non esiste o è scaduto.</p>
          </>
        )}

        {status === 'full' && (
          <>
            <div className="text-6xl mb-4">🚫</div>
            <h1 className="text-2xl font-bold mb-2">Gruppo Pieno</h1>
            <p className="text-[#B3B3B3] mb-6">Spiacenti, questo gruppo ha già raggiunto il numero massimo di membri.</p>
          </>
        )}

        <button
          onClick={() => router.push('/login')}
          className="w-full bg-[#1DB954] text-black font-bold py-3 rounded-xl hover:scale-[1.02] transition-transform"
        >
          Torna all'accesso
        </button>
      </div>
    </div>
  );
}
