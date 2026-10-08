'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastContext';

export default function JoinManualPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();

    if (!cleanCode || cleanCode.length < 4) {
      showToast('Inserisci un codice invito valido a 6 caratteri', 'error');
      return;
    }

    setLoading(true);
    router.push(`/join/${cleanCode}`);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#0B0B0F] p-4 text-zinc-100 overflow-hidden font-sans">
      {/* Bagliori ambientali */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-green-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-indigo-500/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="relative z-10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8 sm:p-10 max-w-md w-full text-center ring-1 ring-white/5">
        <div className="flex justify-center mb-6">
          <img src="/icon.svg" alt="SpotiShare Logo" className="w-16 h-16 drop-shadow-[0_0_20px_rgba(29,185,84,0.5)]" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-100 mb-2">
          Unisciti a un Gruppo
        </h1>
        <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
          Inserisci il codice invito a 6 caratteri fornito dall&apos;amministratore del tuo gruppo Spotify Family.
        </p>

        <form onSubmit={handleJoin} className="space-y-6">
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-2 text-left">
              Codice Invito
            </label>
            <input
              type="text"
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ES. AB12CD"
              required
              className="w-full bg-black/40 border border-white/15 text-green-400 font-mono text-2xl font-bold tracking-widest text-center rounded-2xl p-4 outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all placeholder:text-zinc-700 uppercase shadow-inner"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full bg-gradient-to-r from-[#1DB954] to-[#1ed760] text-black font-extrabold py-4 rounded-2xl shadow-[0_0_20px_rgba(29,185,84,0.35)] hover:shadow-[0_0_30px_rgba(29,185,84,0.6)] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 uppercase tracking-tight text-sm"
          >
            {loading ? 'Verifica in corso...' : 'Entra nel Gruppo 🚀'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center text-xs">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            ← Torna alla Dashboard
          </button>
          <button
            onClick={() => router.push('/login')}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            Cambia Account
          </button>
        </div>
      </div>
    </div>
  );
}
