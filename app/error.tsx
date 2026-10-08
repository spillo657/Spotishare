'use client';

import { useEffect } from 'react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('SpotiShare Runtime Error:', error);
  }, [error]);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#0B0B0F] p-4 text-zinc-100 overflow-hidden font-sans">
      {/* Bagliori ambientali */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-red-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-indigo-500/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="relative z-10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8 sm:p-10 max-w-md w-full text-center ring-1 ring-white/5">
        <div className="text-4xl mb-4">⚠️</div>

        <span className="text-[10px] uppercase tracking-widest font-black text-red-400 bg-red-500/15 border border-red-500/30 px-3 py-1 rounded-full inline-block mb-3">
          Si è verificato un errore
        </span>

        <h1 className="text-2xl font-black tracking-tight text-zinc-100 mb-2">
          Qualcosa è andato storto
        </h1>
        <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
          {error?.message || "Impossibile completare l'operazione richiesta. Riprova tra qualche istante."}
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="w-full bg-gradient-to-r from-[#1DB954] to-[#1ed760] text-black font-extrabold py-3.5 rounded-2xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-tight"
          >
            Riprova 🔄
          </button>
          <a
            href="/dashboard"
            className="w-full bg-white/5 border border-white/10 text-zinc-300 hover:text-white font-bold py-3 rounded-2xl hover:bg-white/10 transition-all text-xs active:scale-95 text-center"
          >
            Ricarica Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
