'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { supabase } from '@/utils/supabase';
import { useToast } from '@/components/ToastContext';

export default function JoinPlanPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'checking' | 'valid' | 'invalid' | 'full'>('checking');
  const [planName, setPlanName] = useState<string>('');

  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#1DB954', '#1ed760', '#ffffff', '#22e569', '#FFD700']
      });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    async function handleJoin() {
      const code = (params.code as string)?.toUpperCase();
      if (!code) {
        setStatus('invalid');
        setLoading(false);
        return;
      }

      try {
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

        setPlanName(plan.name);

        // 2. Check if the plan is full
        const { count: memberCount, error: countError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('plan_id', plan.id);

        if (countError) throw countError;

        if (memberCount !== null && memberCount >= plan.max_members) {
          setStatus('full');
          setLoading(false);
          return;
        }

        // 3. Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          showToast("Effettua l'accesso con Spotify per unirti al gruppo", "info");
          router.push(`/login?redirect=/join/${code}`);
          return;
        }

        // 4. Join the plan
        const { error: joinError } = await supabase
          .from('users')
          .update({ plan_id: plan.id })
          .eq('id', user.id);

        if (joinError) throw joinError;

        setStatus('valid');
        triggerCelebration();
        showToast(`Benvenuto nel gruppo ${plan.name}! 🎉`, "success");

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 1800);

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

  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-[#0B0B0F] p-4 pt-safe pb-safe pl-safe pr-safe text-zinc-100 overflow-hidden font-sans">
      {/* Sfondi con bagliori ambientali */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-green-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-indigo-500/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="relative z-10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8 sm:p-10 max-w-md w-full text-center ring-1 ring-white/5">
        <div className="flex justify-center mb-6">
          <img src="/icon.svg" alt="SpotiShare Logo" className="w-16 h-16 drop-shadow-[0_0_20px_rgba(29,185,84,0.5)]" />
        </div>

        {loading && (
          <div className="py-8">
            <div className="w-12 h-12 border-4 border-[#1DB954] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-xl font-bold text-zinc-100 mb-1">Verifica Invito</h2>
            <p className="text-xs text-zinc-400 animate-pulse">Sincronizzazione con il gruppo Spotify...</p>
          </div>
        )}

        {!loading && status === 'valid' && (
          <div className="py-4 animate-in zoom-in-95 duration-200">
            <div className="text-5xl mb-4">🎉</div>
            <h1 className="text-2xl font-black text-zinc-100 mb-2">Unione Riuscita!</h1>
            <p className="text-sm text-zinc-300 mb-2">
              Sei ora membro del gruppo <span className="text-green-400 font-bold">{planName}</span>.
            </p>
            <p className="text-xs text-zinc-500 mb-6">Reindirizzamento alla tua Dashboard in corso...</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-gradient-to-r from-[#1DB954] to-[#1ed760] text-black font-extrabold py-3.5 rounded-2xl shadow-lg hover:scale-[1.02] transition-all text-sm uppercase"
            >
              Vai alla Dashboard 🚀
            </button>
          </div>
        )}

        {!loading && status === 'invalid' && (
          <div className="py-4 animate-in zoom-in-95 duration-200">
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-2xl font-black text-zinc-100 mb-2">Codice Non Valido</h1>
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
              Il codice d&apos;invito inserito non esiste o non è più attivo. Chiedi un nuovo codice all&apos;amministratore.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => router.push('/join')}
                className="w-full bg-gradient-to-r from-[#1DB954] to-[#1ed760] text-black font-bold py-3.5 rounded-2xl hover:scale-[1.02] transition-all text-sm"
              >
                Inserisci un altro codice
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full bg-white/5 border border-white/10 text-zinc-300 font-bold py-3 rounded-2xl hover:bg-white/10 transition-all text-xs"
              >
                Torna alla Dashboard
              </button>
            </div>
          </div>
        )}

        {!loading && status === 'full' && (
          <div className="py-4 animate-in zoom-in-95 duration-200">
            <div className="text-5xl mb-4">🚫</div>
            <h1 className="text-2xl font-black text-zinc-100 mb-2">Gruppo al Completo</h1>
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
              Questo gruppo ha già raggiunto il numero massimo di partecipanti consentiti dal piano Spotify Family.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-white/5 border border-white/10 text-zinc-100 font-bold py-3.5 rounded-2xl hover:bg-white/10 transition-all text-sm"
            >
              Torna alla Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
