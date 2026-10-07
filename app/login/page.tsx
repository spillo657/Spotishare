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
                    redirectTo: `${window.location.origin}/dashboard`
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
        <div className="flex min-h-screen items-center justify-center bg-[#121212] relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#1DB954]/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#1DB954]/10 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="bg-[#181818]/80 backdrop-blur-xl p-10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-center max-w-sm w-full border border-white/5 relative z-10">
                <div className="mb-8">
                    <h1 className="text-4xl font-black text-white mb-3 tracking-tight">
                        Spoti<span className="text-[#1DB954]">Share</span>
                    </h1>
                    <p className="text-[#B3B3B3] text-sm font-medium">
                        Gestisci il tuo abbonamento in modo semplice e intelligente.
                    </p>
                </div>

                <button
                    onClick={handleSpotifyLogin}
                    disabled={loading}
                    className="group relative w-full bg-[#1DB954] text-black px-6 py-4 rounded-2xl font-bold text-lg transition-all duration-300 hover:bg-[#1ed760] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 overflow-hidden shadow-lg shadow-[#1DB954]/20"
                >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                        {loading ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.929l3-2.638z"></path>
                                </svg>
                                Reindirizzamento...
                            </>
                        ) : (
                            'Accedi con Spotify'
                        )}
                    </span>
                </button>

                <p className="mt-8 text-xs text-[#727272]">
                    Accedendo, accetti i termini di servizio di SpotiShare.
                </p>
            </div>
        </div>
    )
}
