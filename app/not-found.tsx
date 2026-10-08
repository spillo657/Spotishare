'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-[#0B0B0F] p-4 pt-safe pb-safe pl-safe pr-safe text-zinc-100 overflow-hidden font-sans">
      {/* Bagliori ambientali */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-green-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-indigo-500/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="relative z-10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8 sm:p-10 max-w-md w-full text-center ring-1 ring-white/5">
        <div className="flex justify-center mb-6">
          <img src="/icon.svg" alt="SpotiShare Logo" className="w-16 h-16 drop-shadow-[0_0_20px_rgba(29,185,84,0.5)] opacity-80" />
        </div>

        <span className="text-[10px] uppercase tracking-widest font-black text-green-400 bg-green-500/15 border border-green-500/30 px-3 py-1 rounded-full inline-block mb-3">
          Errore 404
        </span>

        <h1 className="text-3xl font-black tracking-tight text-zinc-100 mb-2">
          Traccia Non Trovata
        </h1>
        <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
          La pagina che stai cercando non esiste o è stata spostata.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/dashboard"
            className="w-full bg-gradient-to-r from-[#1DB954] to-[#1ed760] text-black font-extrabold py-3.5 rounded-2xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-tight"
          >
            Vai alla Dashboard 🚀
          </Link>
          <Link
            href="/"
            className="w-full bg-white/5 border border-white/10 text-zinc-300 hover:text-white font-bold py-3 rounded-2xl hover:bg-white/10 transition-all text-xs active:scale-95"
          >
            Torna alla Home
          </Link>
        </div>
      </div>
    </div>
  );
}
