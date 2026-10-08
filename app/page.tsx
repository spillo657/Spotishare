'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';

export default function Home() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [membersCount, setMembersCount] = useState<number>(6);
  const [individualCost, setIndividualCost] = useState<number>(10.99);
  const [familyPlanCost, setFamilyPlanCost] = useState<number>(17.99);

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.push('/dashboard');
        } else {
          setCheckingSession(false);
        }
      } catch {
        setCheckingSession(false);
      }
    }
    checkAuth();
  }, [router]);

  // Calcolo Risparmio
  const quotaPerPerson = (familyPlanCost / membersCount);
  const monthlySavingsPerPerson = Math.max(0, individualCost - quotaPerPerson);
  const annualSavingsPerPerson = monthlySavingsPerPerson * 12;
  const totalGroupAnnualSavings = (individualCost * membersCount - familyPlanCost) * 12;
  const savingsPercentage = Math.round((monthlySavingsPerPerson / individualCost) * 100);

  if (checkingSession) {
    return (
      <div className="min-h-dvh bg-[#0B0B0F] flex flex-col items-center justify-center font-sans pt-safe pb-safe">
        <div className="w-12 h-12 border-4 border-[#1DB954] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-zinc-400 text-xs font-semibold tracking-wider uppercase animate-pulse">
          Caricamento SpotiShare...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#0B0B0F] text-zinc-100 font-sans selection:bg-[#1DB954] selection:text-black relative overflow-hidden pt-safe pb-safe pl-safe pr-safe">
      {/* Bagliori ambientali di sfondo */}
      <div className="absolute top-[-15%] left-[-10%] w-[55%] h-[55%] bg-[#1DB954]/15 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[55%] h-[55%] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none" />

      {/* NAVBAR */}
      <nav className="max-w-6xl mx-auto px-6 py-6 flex justify-between items-center relative z-10 border-b border-white/5">
        <div className="flex items-center gap-3">
          <img src="/icon.svg" alt="SpotiShare Logo" className="w-9 h-9 drop-shadow-[0_0_15px_rgba(29,185,84,0.5)]" />
          <span className="text-2xl font-black tracking-tighter bg-gradient-to-r from-[#1DB954] to-[#1ed760] bg-clip-text text-transparent">
            SpotiShare
          </span>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/join"
            className="text-xs font-bold text-zinc-300 hover:text-white bg-white/5 border border-white/10 px-4 py-2.5 rounded-full hover:bg-white/10 transition-all active:scale-95"
          >
            Codice Invito
          </a>
          <a
            href="/login"
            className="text-xs font-extrabold text-black bg-gradient-to-r from-[#1DB954] to-[#1ed760] px-5 py-2.5 rounded-full shadow-[0_0_20px_rgba(29,185,84,0.35)] hover:shadow-[0_0_30px_rgba(29,185,84,0.6)] hover:scale-105 active:scale-95 transition-all"
          >
            Accedi
          </a>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-12 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold uppercase tracking-widest mb-6">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
          Spotify Family Management
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-zinc-100 leading-tight mb-6">
          Gestisci le quote del tuo gruppo Spotify.{' '}
          <span className="bg-gradient-to-r from-[#1DB954] via-[#1ed760] to-emerald-400 bg-clip-text text-transparent block sm:inline">
            Senza stress.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Monitora chi ha pagato, copia le coordinate bancarie per i bonifici in 1-click, invia solleciti cordiali su WhatsApp e sincronizza l&apos;indirizzo di casa Spotify.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <a
            href="/login"
            className="w-full sm:w-auto bg-gradient-to-r from-[#1DB954] to-[#1ed760] text-black font-extrabold text-sm px-8 py-4 rounded-2xl shadow-[0_0_25px_rgba(29,185,84,0.4)] hover:shadow-[0_0_35px_rgba(29,185,84,0.7)] hover:scale-105 active:scale-95 transition-all uppercase tracking-tight flex items-center justify-center gap-2"
          >
            <span>🚀</span> Inizia Subito con Spotify
          </a>
          <a
            href="/join"
            className="w-full sm:w-auto bg-white/5 border border-white/10 hover:border-white/20 text-zinc-200 hover:text-white font-bold text-sm px-8 py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <span>🔑</span> Ho un Codice Invito
          </a>
        </div>
      </section>

      {/* CALCULATOR DI RISPARMIO INTERATTIVO */}
      <section className="max-w-4xl mx-auto px-6 mb-20 relative z-10">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl ring-1 ring-white/5 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-60 h-60 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="text-center max-w-xl mx-auto mb-8">
            <span className="text-[10px] uppercase tracking-widest font-black text-green-400 bg-green-500/15 border border-green-500/30 px-3 py-1 rounded-full inline-block mb-3">
              Calcolatore Interattivo
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-zinc-100 tracking-tight">
              Quanto risparmi con SpotiShare?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* CONTROLLI SLIDER */}
            <div className="space-y-5 md:col-span-1 bg-black/40 p-5 rounded-2xl border border-white/5">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold block mb-1">
                  Membri nel Gruppo: <strong className="text-green-400 text-sm">{membersCount}</strong>
                </label>
                <input
                  type="range"
                  min="2"
                  max="6"
                  value={membersCount}
                  onChange={(e) => setMembersCount(Number(e.target.value))}
                  className="w-full accent-green-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold block mb-1">
                  Costo Spotify Family: €{familyPlanCost.toFixed(2)}/mese
                </label>
                <div className="text-xs text-zinc-500">
                  Piano Spotify Family Italia (fino a 6 account)
                </div>
              </div>

              <div className="pt-2 border-t border-white/10">
                <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">La tua quota mensile:</p>
                <p className="text-2xl font-black text-green-400">€{quotaPerPerson.toFixed(2)}<span className="text-xs text-zinc-500 font-normal"> / mese</span></p>
              </div>
            </div>

            {/* RISULTATO RISPARMIO */}
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-green-950/40 via-white/5 to-white/5 border border-green-500/30 p-5 rounded-2xl">
                <span className="text-2xl">💰</span>
                <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mt-2">Risparmio Personale Annuo</p>
                <p className="text-3xl font-black text-green-400 mt-1">€{annualSavingsPerPerson.toFixed(2)}</p>
                <p className="text-xs text-zinc-400 mt-1">Risparmi il <strong className="text-green-300 font-bold">{savingsPercentage}%</strong> rispetto al piano Individual (€10.99/m).</p>
              </div>

              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                <span className="text-2xl">👥</span>
                <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mt-2">Risparmio Totale Gruppo</p>
                <p className="text-3xl font-black text-zinc-100 mt-1">€{totalGroupAnnualSavings.toFixed(2)}</p>
                <p className="text-xs text-zinc-400 mt-1">Denaro complessivo risparmiato dal tuo gruppo ogni anno.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE CARDS */}
      <section className="max-w-5xl mx-auto px-6 pb-20 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* FEATURE 1: COORDINATE CARTE & IBAN */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 hover:border-green-500/40 transition-all">
            <span className="text-3xl mb-3 block">💳</span>
            <h3 className="text-lg font-bold text-zinc-100 mb-2">Coordinate Carte & Bonifici</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Copia con 1-click Revtag, IBAN Revolut, Buddybank, BPER e Numero Postepay con Codice Fiscale senza commissioni o intermediari.
            </p>
          </div>

          {/* FEATURE 2: SOLLECITI SMART WHATSAPP */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 hover:border-green-500/40 transition-all">
            <span className="text-3xl mb-3 block">💬</span>
            <h3 className="text-lg font-bold text-zinc-100 mb-2">Solleciti Smart WhatsApp</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Invia messaggi cordiali precompilati ai membri che devono ancora saldare o all&apos;amministratore prima della scadenza.
            </p>
          </div>

          {/* FEATURE 3: INDIRIZZO CONDIVISO */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 hover:border-green-500/40 transition-all">
            <span className="text-3xl mb-3 block">📍</span>
            <h3 className="text-lg font-bold text-zinc-100 mb-2">Indirizzo Spotify Family</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Tutti i membri possono copiare l&apos;indirizzo di casa registrato per superare all&apos;istante i controlli di Spotify.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-8 text-center text-xs text-zinc-500 relative z-10">
        <p>SpotiShare • Gestione semplificata per gruppi Spotify Family</p>
      </footer>
    </div>
  );
}
