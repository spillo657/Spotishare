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
        <div className="flex min-h-screen items-center justify-center bg-[#121212]">
            <div className="bg-[#181818] p-10 rounded-xl shadow-2xl text-center max-w-sm w-full">
                <h1 className="text-3xl font-bold text-white mb-2">SpotiShare</h1>
                <p className="text-[#B3B3B3] mb-8">Gestisci il tuo abbonamento.</p>

                <button
                    onClick={handleSpotifyLogin}
                    disabled={loading}
                    className="w-full bg-[#1DB954] text-white px-6 py-3 rounded-full font-bold text-lg hover:bg-[#1ed760] disabled:opacity-50 transition-colors"
                >
                    {loading ? 'Reindirizzamento...' : 'Accedi con Spotify'}
                </button>
            </div>
        </div>
    )
}
