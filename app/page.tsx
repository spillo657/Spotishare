'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Appena si apre questa pagina, spara l'utente verso la dashboard
    router.push('/dashboard');
  }, [router]);

  return (
    <div style={{ height: '100vh', width: '100%', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#fff', fontFamily: 'sans-serif' }}>Caricamento in corso...</p>
    </div>
  );
}