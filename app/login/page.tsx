'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '../../utils/supabase';
import { useToast } from '@/components/ToastContext';

function LoginContent() {
    const [loading, setLoading] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const searchParams = useSearchParams();
    const router = useRouter();
    const { showToast } = useToast();

    useEffect(() => {
        const errorParam = searchParams.get('error');
        if (errorParam) {
            if (errorParam === 'auth-failed') {
                setAuthError("Autenticazione con Spotify non riuscita o annullata. Riprova.");
            } else {
                setAuthError(`Errore durante l'accesso: ${errorParam}`);
            }
            showToast("Accesso non riuscito", "error");
        }

        // Se l'utente è già loggato, reindirizza
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                const redirect = searchParams.get('redirect') || '/dashboard';
                router.push(redirect);
            }
        });
    }, [searchParams, router, showToast]);

    const handleSpotifyLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setAuthError(null);

        const redirectParam = searchParams.get('redirect') || '/dashboard';

        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'spotify',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectParam)}`
                }
            });

            if (error) {
                setAuthError(error.message);
                showToast("Errore da Supabase: " + error.message, 'error');
                setLoading(false);
            } else if (data?.url) {
                window.location.href = data.url;
            } else {
                setAuthError("Nessun URL di autenticazione ricevuto da Spotify.");
                showToast("Errore di configurazione", 'error');
                setLoading(false);
            }
        } catch (err: any) {
            setAuthError(err.message);
            showToast("Errore imprevisto: " + err.message, 'error');
            setLoading(false);
        }
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center bg-[#0B0B0F] p-4 text-zinc-100 overflow-hidden font-sans">
            {/* Bagliori ambientali */}
            <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full bg-green-500/10 blur-[130px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-indigo-500/10 blur-[130px] pointer-events-none" />

            <div className="relative z-10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl ring-1 ring-white/5 p-8 sm:p-10 text-center max-w-md w-full mx-auto transition-all duration-300">
                {/* Bagliore superiore */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#1DB954] to-transparent" />

                <div className="flex justify-center mb-5">
                    <img src="/icon.svg" alt="SpotiShare Logo" className="w-16 h-16 drop-shadow-[0_0_20px_rgba(29,185,84,0.5)]" />
                </div>

                <h1 className="text-3xl font-black tracking-tight text-zinc-100 mb-2">
                    Accedi a SpotiShare
                </h1>
                <p className="text-sm leading-relaxed text-zinc-400 mb-6">
                    Gestisci il tuo piano Spotify Family e sincronizza le quote con il tuo gruppo.
                </p>

                {authError && (
                    <div className="mb-6 p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs text-red-400 font-medium leading-relaxed">
                        ⚠️ {authError}
                    </div>
                )}

                <button
                    onClick={handleSpotifyLogin}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-[#1DB954] to-[#1ed760] text-black font-extrabold rounded-2xl px-6 py-4 shadow-[0_0_20px_rgba(29,185,84,0.35)] hover:shadow-[0_0_30px_rgba(29,185,84,0.6)] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 uppercase tracking-tight text-sm flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Connessione a Spotify...
                        </span>
                    ) : (
                        <>
                            <span>🎧</span> Accedi con Spotify
                        </>
                    )}
                </button>

                <div className="relative py-6">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10"></span></div>
                    <div className="relative flex justify-center text-[10px] uppercase tracking-widest"><span className="bg-[#0B0B0F] px-3 text-zinc-500 font-bold">Oppure</span></div>
                </div>

                <div className="flex flex-col gap-3">
                    <a
                        href="/join"
                        className="w-full bg-white/5 border border-white/10 hover:border-green-500/40 text-zinc-200 hover:text-white font-bold py-3 rounded-2xl transition-all text-xs active:scale-95 flex items-center justify-center gap-1.5"
                    >
                        <span>🔑</span> Ho un codice invito
                    </a>
                    <a
                        href="/"
                        className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors py-1"
                    >
                        ← Torna alla Home
                    </a>
                </div>
            </div>
        </div>
    );
}

export default function Login() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-[#1DB954] border-t-transparent rounded-full animate-spin"></div>
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
