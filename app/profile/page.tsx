'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { useToast } from '@/components/ToastContext';
import { useRouter } from 'next/navigation';
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendLocalNotification,
  isNotificationSupported
} from '@/utils/notifications';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<string>('user');
  const [planName, setPlanName] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [supportsNotifications, setSupportsNotifications] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
  } | null>(null);

  const { showToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    setSupportsNotifications(isNotificationSupported());
    setNotificationPermission(getNotificationPermission());

    async function fetchProfile() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          router.push('/login');
          return;
        }

        const { data: userData, error: dbError } = await supabase
          .from('users')
          .select('name, email, role, plan_id, plans ( name )')
          .eq('id', user.id)
          .single();

        if (dbError && dbError.code !== 'PGRST116') throw dbError;

        if (userData) {
          setUserName(userData.name || user.user_metadata?.full_name || '');
          setUserEmail(userData.email || user.email || '');
          setUserRole(userData.role || 'user');
          setPlanId(userData.plan_id);
          if (userData.plans) {
            setPlanName((userData.plans as any).name || 'Gruppo Spotify Family');
          }
        }
      } catch (error: any) {
        showToast("Errore nel caricamento del profilo: " + error.message, 'error');
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [router, showToast]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utente non trovato");

      const { error } = await supabase
        .from('users')
        .update({ name: userName })
        .eq('id', user.id);

      if (error) throw error;

      showToast("Profilo aggiornato con successo!", 'success');
    } catch (error: any) {
      showToast("Errore durante l'aggiornamento: " + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableNotifications = async () => {
    const result = await requestNotificationPermission();
    setNotificationPermission(result);
    if (result === 'granted') {
      showToast('🔔 Notifiche push attivate con successo!', 'success');
      await sendLocalNotification('🎵 SpotiShare Notifiche Attive', {
        body: 'Riceverai promemoria automatici prima di ogni rinnovo del tuo piano Family.'
      });
    } else if (result === 'denied') {
      showToast('⚠️ Notifiche bloccate nelle impostazioni del browser.', 'error');
    }
  };

  const handleTestNotification = async () => {
    const success = await sendLocalNotification('🧪 Test Notifica SpotiShare', {
      body: 'Le notifiche push funzionano correttamente sul tuo dispositivo!'
    });
    if (success) {
      showToast('Notifica di prova inviata!', 'success');
    } else {
      showToast('Abilita prima le notifiche per ricevere i promemoria.', 'info');
    }
  };

  const handleLogout = () => {
    setConfirmModal({
      isOpen: true,
      title: "Disconnetti Account",
      message: "Vuoi davvero uscire dal tuo account SpotiShare?",
      action: async () => {
        try {
          await supabase.auth.signOut();
          showToast("Disconnessione effettuata", "info");
          router.push('/login');
        } catch (err: any) {
          showToast("Errore durante il logout", "error");
        }
        setConfirmModal(null);
      }
    });
  };

  const handleLeaveGroup = () => {
    setConfirmModal({
      isOpen: true,
      title: "Abbandona Gruppo",
      message: "Sei sicuro di voler abbandonare il gruppo attuale? Perderai l'accesso alla cassa e allo storico condiviso.",
      action: async () => {
        setLoading(true);
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { error } = await supabase
            .from('users')
            .update({ plan_id: null })
            .eq('id', user.id);

          if (error) throw error;

          showToast("Hai abbandonato il gruppo.", "info");
          setPlanId(null);
          setPlanName(null);
          router.push('/dashboard');
        } catch (error: any) {
          showToast("Errore durante l'uscita: " + error.message, "error");
        } finally {
          setLoading(false);
          setConfirmModal(null);
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-[#0B0B0F] text-zinc-100 flex items-center justify-center font-sans pt-safe pb-safe">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-[#1DB954] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-zinc-400 text-xs">Caricamento impostazioni profilo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#0B0B0F] text-zinc-100 p-4 sm:p-8 pt-safe pb-safe pl-safe pr-safe font-sans relative overflow-hidden">
      {/* Bagliori ambientali */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-green-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-indigo-500/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="max-w-2xl mx-auto relative z-10">
        <header className="flex justify-between items-center mb-8 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <img src="/icon.svg" alt="SpotiShare Logo" className="w-8 h-8 drop-shadow-[0_0_12px_rgba(29,185,84,0.4)]" />
            <h1 className="text-2xl font-black tracking-tight text-zinc-100">
              Impostazioni Profilo
            </h1>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-xs bg-white/5 border border-white/10 hover:border-green-500/40 text-zinc-300 hover:text-white px-4 py-2 rounded-full transition-all active:scale-95"
          >
            ← Torna alla Dashboard
          </button>
        </header>

        <main className="space-y-6">
          {/* CARD INFO UTENTE */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl ring-1 ring-white/5">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/10">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1DB954] to-[#1ed760] text-black font-black text-2xl flex items-center justify-center shadow-lg shadow-green-500/20">
                {userName ? userName.charAt(0).toUpperCase() : '?'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-extrabold text-zinc-100">{userName || 'Utente Spotify'}</h2>
                  {userRole === 'admin' ? (
                    <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-red-500/30 uppercase tracking-widest">Admin</span>
                  ) : (
                    <span className="bg-green-500/20 text-green-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-green-500/30 uppercase tracking-widest">Membro</span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">{userEmail}</p>
                {planName && (
                  <p className="text-xs text-zinc-500 mt-1 font-medium">
                    Gruppo attuale: <span className="text-zinc-300 font-semibold">{planName}</span>
                  </p>
                )}
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-5">
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-2">
                  Nome Visualizzato nel Gruppo
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 text-zinc-100 rounded-2xl p-3.5 outline-none focus:ring-2 focus:ring-green-500/50 transition-all text-sm shadow-inner"
                  placeholder="Inserisci il tuo nome..."
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-2">
                  Email Spotify OAuth (Non modificabile)
                </label>
                <input
                  type="email"
                  value={userEmail}
                  disabled
                  className="w-full bg-white/5 border border-white/5 text-zinc-500 rounded-2xl p-3.5 outline-none cursor-not-allowed text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#1DB954] to-[#1ed760] text-black font-extrabold py-3.5 rounded-2xl shadow-lg hover:scale-[1.01] active:scale-95 transition-all text-sm uppercase tracking-tight"
              >
                Salva Modifiche
              </button>
            </form>
          </div>

          {/* CARD NOTIFICHE PUSH & PROMEMORIA */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl ring-1 ring-white/5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-zinc-300 flex items-center gap-2">
                <span>🔔</span> Notifiche & Promemoria Scadenze
              </h3>
              <span className={`text-[10px] uppercase tracking-widest font-bold px-2.5 py-0.5 rounded-full border ${
                notificationPermission === 'granted'
                  ? 'bg-green-500/10 text-green-400 border-green-500/30'
                  : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30'
              }`}>
                {notificationPermission === 'granted' ? 'Attive ✅' : 'Non Attive'}
              </span>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Ricevi avvisi automatici direttamente sul tuo smartphone o PC 4 giorni prima del 24 del mese per ricordarti di saldare la quota o verificare i pagamenti del gruppo.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {notificationPermission !== 'granted' ? (
                <button
                  onClick={handleEnableNotifications}
                  className="w-full sm:w-auto bg-green-500 hover:bg-green-400 text-black font-bold px-5 py-2.5 rounded-xl text-xs transition-all active:scale-95 shadow-md flex items-center justify-center gap-2"
                >
                  <span>🔔</span> Abilita Notifiche Push
                </button>
              ) : (
                <button
                  onClick={handleTestNotification}
                  className="w-full sm:w-auto bg-white/5 hover:bg-white/10 border border-white/15 text-zinc-200 hover:text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <span>🧪</span> Invia Notifica di Prova
                </button>
              )}
            </div>
          </div>

          {/* CARD GESTIONE GRUPPO & LOGOUT */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl ring-1 ring-white/5 space-y-4">
            <h3 className="text-sm font-extrabold uppercase tracking-widest text-zinc-400">
              Azioni Account & Gruppo
            </h3>

            {planId && userRole !== 'admin' && (
              <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-zinc-200">Abbandona il Gruppo Attuale</p>
                  <p className="text-xs text-zinc-500">Rimuove la tua associazione dal piano Spotify Family condiviso.</p>
                </div>
                <button
                  onClick={handleLeaveGroup}
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl font-bold text-xs border border-red-500/30 transition-all shrink-0 active:scale-95"
                >
                  Abbandona Gruppo
                </button>
              </div>
            )}

            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-zinc-200">Disconnetti Sessione</p>
                <p className="text-xs text-zinc-500">Esci dal tuo account SpotiShare su questo dispositivo.</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white rounded-xl font-bold text-xs border border-white/10 transition-all shrink-0 active:scale-95"
              >
                Disconnetti
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* MODALE DI CONFERMA */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-[#121218] border border-white/15 rounded-3xl p-6 shadow-2xl max-w-md w-full relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 to-rose-600"></div>
            <h3 className="text-xl font-extrabold text-zinc-100 mb-2">
              {confirmModal.title}
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed mb-6">
              {confirmModal.message}
            </p>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 w-full">
              <button
                onClick={() => setConfirmModal(null)}
                className="w-full sm:w-auto px-5 py-3 rounded-xl border border-white/10 text-zinc-300 hover:text-white hover:bg-white/5 font-semibold text-sm transition-all active:scale-95 min-h-[44px]"
              >
                Annulla
              </button>
              <button
                onClick={() => confirmModal.action()}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold text-sm transition-all shadow-lg active:scale-95 shadow-red-500/20 min-h-[44px]"
              >
                Conferma
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
