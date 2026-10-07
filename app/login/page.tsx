'use client'

import { useState } from 'react'
import { supabase } from '../../utils/supabase'
import { useToast } from '@/components/ToastContext'

export default function Login() {
    const [loading, setLoading] = useState(false)
    const { showToast } = useToast()

    const handleSpotifyLogin = async (e: any) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'spotify',
                options: {
                    skipBrowserRedirect: true,
                    redirectTo: `${window.location.origin}/auth/callback`
                }
            })

            if (error) {
                showToast("Errore da Supabase: " + error.message, 'error')
                setLoading(false)
            } else if (data?.url) {
                window.location.href = data.url
            } else {
                showToast("Errore strano: Nessun link ricevuto.", 'error')
                setLoading(false)
            }
        } catch (err: any) {
            showToast("Errore nel codice: " + err.message, 'error')
            setLoading(false)
        }
    }

    return (
        <div className="relative flex min-h-screen items-center justify-center bg-[#0B0B0F] overflow-hidden">
            {/* Depth Elements - Atmospheric Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-green-500/10 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />

            <div className="relative z-10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl ring-1 ring-white/5 p-10 text-center max-w-sm w-full mx-4 transition-all duration-500 hover:border-white/20">
                {/* Subtle Top Gradient for simulated light source */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100 mb-2">
                    SpotiShare
                </h1>
                <p className="text-sm leading-relaxed text-zinc-400 mb-8">
                    Gestisci il tuo abbonamento con stile.
                </p>

                <button
                    onClick={handleSpotifyLogin}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-[#1DB954] to-[#1ed760] text-black font-bold rounded-full px-6 py-3 shadow-[0_0_20px_rgba(29,185,84,0.4)] hover:shadow-[0_0_30px_rgba(29,185,84,0.6)] transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none"
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Reindirizzamento...
                        </span>
                    ) : 'Accedi con Spotify'}
                </button>
            </div>
        </div>
    )
}
