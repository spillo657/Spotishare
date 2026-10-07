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
      <div className="min-h-screen bg-[#121212] text-white flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#1DB954]/10 rounded-full blur-[120px] pointer-events-none"></div>
        <p className="animate-pulse text-[#1DB954] font-bold text-xl z-10">Caricamento profilo...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white p-8 font-sans relative overflow-hidden">
      {/* Ambient Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#1DB954]/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#1DB954]/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-2xl mx-auto relative z-10">
        <header className="flex justify-between items-center mb-10 border-b border-white/10 pb-6">
          <h1 className="text-3xl font-black text-white tracking-tight">
            Il Mio <span className="text-[#1DB954]">Profilo</span>
          </h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-[#B3B3B3] hover:text-white transition-colors font-medium"
          >
            Torna alla Dashboard
          </button>
        </header>

        <main className="bg-[#181818]/60 backdrop-blur-xl p-8 rounded-3xl border border-white/5 shadow-2xl transition-all hover:border-white/10">
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div className="group">
              <label className="block text-xs font-bold text-[#B3B3B3] uppercase mb-2 ml-1 group-focus-within:text-[#1DB954] transition-colors">Nome Visualizzato</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full bg-black/40 border border-white/10 text-white rounded-2xl p-4 outline-none focus:border-[#1DB954] transition-all placeholder:text-[#555555]"
                placeholder="Inserisci il tuo nome..."
                required
              />
            </div>

            <div className="group">
              <label className="block text-xs font-bold text-[#B3B3B3] uppercase mb-2 ml-1">Email (Non modificabile)</label>
              <input
                type="email"
                value={userEmail}
                disabled
                className="w-full bg-white/5 border border-white/5 text-[#B3B3B3] rounded-2xl p-4 outline-none cursor-not-allowed opacity-60"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1DB954] text-black font-black py-4 rounded-2xl hover:scale-[1.02] transition-all shadow-lg shadow-[#1DB954]/20 disabled:opacity-50 disabled:hover:scale-100"
            >
              {loading ? 'Aggiornamento...' : 'Salva Modifiche'}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}
