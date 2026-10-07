'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // Handle the callback from Supabase OAuth
    const handleAuthCallback = async () => {
      try {
        // Exchange the code for a session
        const { data, error } = await supabase.auth.exchangeCodeForSession(
          window.location.search
        );

        if (error) {
          console.error('Error exchanging code for session:', error);
          alert('Errore durante l\'autenticazione: ' + error.message);
          router.push('/login');
          return;
        }

        // Check if we have a valid session
        if (data.session) {
          // Redirect to dashboard after successful auth
          router.push('/dashboard');
        } else {
          // No session, redirect to login
          router.push('/login');
        }
      } catch (err) {
        console.error('Exception during auth callback:', err);
        alert('Errore imprevisto durante l\'autenticazione');
        router.push('/login');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#121212]">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-4">SpotiShare</h1>
        <p className="text-[#B3B3B3] mb-6">Elaborazione dell'accesso...</p>
        <div className="flex items-center justify-center space-x-2">
          <div className="w-4 h-4 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#1DB954] font-medium">Redirezione in corso...</p>
        </div>
      </div>
    </div>
  );
}