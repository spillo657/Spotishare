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
      <div className="min-h-screen bg-[#121212] text-white flex items-center justify-center">
        <p className="animate-pulse text-[#1DB954]">Caricamento profilo...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white p-8 font-sans">
      <div className="max-w-2xl mx-auto">
        <header className="flex justify-between items-center mb-10 border-b border-[#282828] pb-6">
          <h1 className="text-3xl font-bold text-[#1DB954]">Il Mio Profilo</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-[#B3B3B3] hover:text-white transition-colors"
          >
            Torna alla Dashboard
          </button>
        </header>

        <main className="bg-[#181818] p-8 rounded-2xl border border-[#282828] shadow-2xl">
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-[#B3B3B3] uppercase mb-2">Nome Visualizzato</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full bg-[#121212] border border-[#3E3E3E] text-white rounded-xl p-4 outline-none focus:border-[#1DB954] transition-colors"
                placeholder="Inserisci il tuo nome..."
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#B3B3B3] uppercase mb-2">Email (Non modificabile)</label>
              <input
                type="email"
                value={userEmail}
                disabled
                className="w-full bg-[#282828] border border-[#3E3E3E] text-[#B3B3B3] rounded-xl p-4 outline-none cursor-not-allowed"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1DB954] text-black font-black py-4 rounded-xl hover:scale-[1.02] transition-transform shadow-lg shadow-[#1DB954]/20 disabled:opacity-50"
            >
              {loading ? 'Aggiornamento...' : 'Salva Modifiche'}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}
