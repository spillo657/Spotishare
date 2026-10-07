'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { useToast } from '@/components/ToastContext';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const { showToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    async function fetchProfile() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          router.push('/login');
          return;
        }

        const { data: userData, error: dbError } = await supabase
          .from('users')
          .select('name, email')
          .eq('id', user.id)
          .single();

        if (dbError) throw dbError;
        if (userData) {
          setUserName(userData.name || '');
          setUserEmail(userData.email || '');
        }
      } catch (error: any) {
        showToast("Errore nel caricamento del profilo: " + error.message, 'error');
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [router, showToast]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utente non trovato");

      const { error } = await supabase
        .from('users')
        .update({ name: userName })
        .eq('id', user.id);

      if (error) throw error;

      showToast("Profilo aggiornato con successo!", 'success');
    } catch (error: any) {
      showToast("Errore durante l'aggiornamento: " + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] text-zinc-100 flex items-center justify-center">
        <p className="animate-pulse text-[#1DB954] font-medium">Caricamento profilo...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-zinc-100 p-8 font-sans selection:bg-[#1DB954]/30">
      <div className="max-w-2xl mx-auto">
        <header className="flex justify-between items-center mb-10 border-b border-white/10 pb-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100">Il Mio Profilo</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            Torna alla Dashboard
          </button>
        </header>

        <main className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl ring-1 ring-white/5 p-8">
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div className="group">
              <label className="block text-[10px] uppercase tracking-widest font-semibold text-zinc-500 mb-2 group-focus-within:text-[#1DB954] transition-colors">
                Nome Visualizzato
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full bg-black/20 border border-white/10 text-zinc-100 rounded-xl p-4 outline-none focus:ring-2 focus:ring-[#1DB954]/50 transition-all shadow-inner placeholder:text-zinc-600"
                placeholder="Inserisci il tuo nome..."
                required
              />
            </div>

            <div className="group">
              <label className="block text-[10px] uppercase tracking-widest font-semibold text-zinc-500 mb-2">
                Email (Non modificabile)
              </label>
              <input
                type="email"
                value={userEmail}
                disabled
                className="w-full bg-white/5 border border-white/5 text-zinc-500 rounded-xl p-4 outline-none cursor-not-allowed shadow-inner"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#1DB954] to-[#1ed760] text-black font-bold py-4 rounded-full shadow-[0_0_20px_rgba(29,185,84,0.4)] hover:shadow-[0_0_30px_rgba(29,185,84,0.6)] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
            >
              {loading ? 'Aggiornamento...' : 'Salva Modifiche'}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}
