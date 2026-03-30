'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../utils/supabase'
import OneSignal from 'react-onesignal' // IMPORT ONESIGNAL AGGIUNTO

export default function Dashboard() {
    // --- STATI PRINCIPALI ---
    const [user, setUser] = useState<any>(null)
    const [userRole, setUserRole] = useState<string>('user')
    const [dbStatus, setDbStatus] = useState("")
    const [plans, setPlans] = useState<any[]>([])
    const [loadingPlans, setLoadingPlans] = useState(true)

    const [userPlanId, setUserPlanId] = useState<string | null>(null)
    const [members, setMembers] = useState<any[]>([])
    const [payments, setPayments] = useState<any[]>([])
    const [allGroupPayments, setAllGroupPayments] = useState<any[]>([])
    const [isPaying, setIsPaying] = useState(false)

    // --- STATI PER LA SCELTA DEL MESE/ANNO DA PAGARE ---
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth()
    const [selectedTargetMonth, setSelectedTargetMonth] = useState<number>(currentMonth)
    const [selectedTargetYear, setSelectedTargetYear] = useState<number>(currentYear)

    // Genera un array di anni dinamico: dal 2024 fino all'anno prossimo
    const startYear = 2024;
    const availableYears = Array.from({ length: (currentYear + 1) - startYear + 1 }, (_, i) => startYear + i);

    // --- STATI PER LA UI CUSTOM ---
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title: string, message: string, action: () => void } | null>(null)

    const mesi = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
    const mesiCorti = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

    // --- UTILITY NOTIFICHE ---
    const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3500)
    }

    // --- LOGICA DEL COUNTER (SCADENZA AL 24) ---
    const getDeadlineInfo = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset orario per calcolo giorni esatti

        let targetMonth = today.getMonth();
        let targetYear = today.getFullYear();

        // Se oggi è oltre il 24, puntiamo al 24 del mese prossimo
        if (today.getDate() > 24) {
            targetMonth += 1;
            if (targetMonth > 11) {
                targetMonth = 0;
                targetYear += 1;
            }
        }

        const targetDate = new Date(targetYear, targetMonth, 24);
        const diffTime = targetDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
            dateString: targetDate.toLocaleDateString('it-IT', { day: '2-digit', month: 'long' }),
            daysLeft: diffDays,
            isReminderActive: diffDays <= 3 && diffDays >= 0
        };
    };

    const deadline = getDeadlineInfo();

    // --- CALCOLI TOTALI ---
    const totalUserPaid = payments.reduce((acc, curr) => acc + curr.amount, 0)
    const totalGroupPaid = allGroupPayments.reduce((acc, curr) => acc + curr.amount, 0)

    // --- FETCH DATI SUPABASE ---
    const fetchGroupMembers = async (planId: string) => {
        const { data } = await supabase.from('users').select('*').eq('plan_id', planId)
        if (data) setMembers(data)
    }

    const fetchPayments = async (userId: string) => {
        const { data } = await supabase.from('payments').select('*').eq('user_id', userId).order('payment_date', { ascending: false })
        if (data) setPayments(data)
    }

    const fetchAllGroupPayments = async (planId: string) => {
        const { data } = await supabase.from('payments').select(`*, users ( name )`).eq('plan_id', planId).order('payment_date', { ascending: false })
        if (data) setAllGroupPayments(data)
    }

    useEffect(() => {
        // --- INIZIALIZZAZIONE ONESIGNAL ---
        const setupOneSignal = async (userId: string) => {
            try {
                await OneSignal.init({
                    appId: "a392ce28-3295-4c14-b7a7-cf7833e00720", // SOSTITUISCI CON IL TUO APP ID!
                    allowLocalhostAsSecureOrigin: true
                });

                // Chiede il permesso per le notifiche
                await OneSignal.Slidedown.promptPush();

                // Ascolta quando l'utente accetta
                OneSignal.User.PushSubscription.addEventListener('change', async (subscription) => {
                    if (subscription.current.optedIn) {
                        const pushToken = subscription.current.id;

                        if (pushToken) {
                            await supabase
                                .from('users')
                                .update({ onesignal_id: pushToken })
                                .eq('id', userId);
                            console.log("Notifiche attivate! Token salvato:", pushToken);
                        }
                    }
                });
            } catch (error) {
                console.error("Errore OneSignal:", error);
            }
        };

        const fetchUserDataAndPlans = async (authUser: any) => {
            const { data: userData } = await supabase
                .from('users')
                .upsert({
                    id: authUser.id,
                    email: authUser.email,
                    name: authUser.user_metadata?.full_name || 'Utente Spotify',
                    spotify_id: authUser.user_metadata?.provider_id || null
                }, { onConflict: 'id' })
                .select('plan_id, role')
                .single()

            if (userData) {
                setDbStatus("✅ Online")
                setUserPlanId(userData.plan_id)
                setUserRole(userData.role || 'user')

                if (userData.plan_id) {
                    fetchGroupMembers(userData.plan_id)
                    if (userData.role === 'admin') fetchAllGroupPayments(userData.plan_id)
                }
            }
            fetchPayments(authUser.id)
            const { data: plansData } = await supabase.from('plans').select('*')
            if (plansData) setPlans(plansData)
            setLoadingPlans(false)

            // Avvia OneSignal dopo aver caricato/creato l'utente nel database
            setupOneSignal(authUser.id);
        }

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                setUser(session.user)
                fetchUserDataAndPlans(session.user)
            } else {
                setLoadingPlans(false)
            }
        })
    }, [])

    // --- CONTROLLO MESI PAGATI ---
    const checkMonthPaid = (monthIndex: number, targetYear: number, userPayments: any[]) => {
        return userPayments.some(p => {
            if (p.target_month !== undefined && p.target_month !== null) {
                return p.target_month === monthIndex && p.target_year === targetYear
            }
            // Fallback per vecchi pagamenti senza le nuove colonne
            const pDate = new Date(p.payment_date)
            return pDate.getMonth() === monthIndex && pDate.getFullYear() === targetYear
        })
    }

    // --- AZIONI DATABASE CON MODAL ---
    const requestPayment = () => {
        const currentPlan = plans.find(p => p.id === userPlanId)
        if (!currentPlan) return;

        const quota = (currentPlan.monthly_cost / currentPlan.max_members).toFixed(2)
        const targetMonthName = mesi[selectedTargetMonth]

        setConfirmModal({
            isOpen: true,
            title: "Conferma Pagamento",
            message: `Stai per versare la quota di €${quota} per saldare il mese di ${targetMonthName} ${selectedTargetYear}. Confermi?`,
            action: async () => {
                setIsPaying(true)
                const { error } = await supabase.from('payments').insert({
                    user_id: user.id,
                    plan_id: userPlanId,
                    amount: parseFloat(quota),
                    target_month: selectedTargetMonth,
                    target_year: selectedTargetYear
                })

                if (!error) {
                    showNotification(`💸 Pagamento per ${targetMonthName} registrato!`)
                    fetchPayments(user.id)
                    if (userRole === 'admin') fetchAllGroupPayments(userPlanId!)
                } else {
                    showNotification("Errore: " + error.message, 'error')
                }
                setIsPaying(false)
                setConfirmModal(null)
            }
        })
    }

    const requestAdminAddPayment = (memberId: string, memberName: string) => {
        const currentPlan = plans.find(p => p.id === userPlanId)
        if (!currentPlan) return;

        const quota = (currentPlan.monthly_cost / currentPlan.max_members).toFixed(2)
        const targetMonthName = mesi[selectedTargetMonth]

        setConfirmModal({
            isOpen: true,
            title: "Registra Incasso Manuale",
            message: `Vuoi confermare di aver ricevuto €${quota} da ${memberName} per il mese di ${targetMonthName} ${selectedTargetYear}?`,
            action: async () => {
                const { error } = await supabase.from('payments').insert({
                    user_id: memberId,
                    plan_id: userPlanId,
                    amount: parseFloat(quota),
                    target_month: selectedTargetMonth,
                    target_year: selectedTargetYear
                })
                if (!error) {
                    showNotification(`✅ Incasso di ${targetMonthName} registrato per ${memberName}`)
                    fetchAllGroupPayments(userPlanId!)
                } else {
                    showNotification("Errore di registrazione", 'error')
                }
                setConfirmModal(null)
            }
        })
    }

    const requestDeletePayment = (paymentId: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Annulla Pagamento",
            message: "Sei sicuro di voler eliminare questo incasso? L'operazione rimuoverà il pagamento dallo storico.",
            action: async () => {
                const { error } = await supabase.from('payments').delete().eq('id', paymentId)
                if (!error) {
                    showNotification("🗑️ Pagamento eliminato", 'success')
                    fetchPayments(user.id)
                    if (userRole === 'admin') fetchAllGroupPayments(userPlanId!)
                } else {
                    showNotification("Errore nell'eliminazione", 'error')
                }
                setConfirmModal(null)
            }
        })
    }

    const myPlan = plans.find(p => p.id === userPlanId)

    return (
        <div className="min-h-screen bg-[#121212] text-white p-8 font-sans relative">
            <div className="max-w-5xl mx-auto">

                {/* --- BANNER PROMEMORIA --- */}
                {deadline.isReminderActive && (
                    <div className="mb-6 bg-yellow-500/10 border border-yellow-500/50 p-4 rounded-xl flex items-center gap-4 animate-pulse">
                        <span className="text-2xl font-bold text-yellow-500">🔔</span>
                        <div>
                            <p className="font-bold text-yellow-500">Scadenza Imminente</p>
                            <p className="text-sm text-yellow-200/80">Il rinnovo Spotify è tra {deadline.daysLeft} {deadline.daysLeft === 1 ? 'giorno' : 'giorni'}. Assicurati di avere fondi sulla carta!</p>
                        </div>
                    </div>
                )}

                <header className="flex justify-between items-center mb-10 border-b border-[#282828] pb-6">
                    <h1 className="text-3xl font-bold text-[#1DB954]">SpotiShare</h1>
                    {user && (
                        <div className="text-right">
                            <p className="font-bold flex items-center justify-end gap-2">
                                {user.user_metadata?.full_name || 'Utente'}
                                {userRole === 'admin' && (
                                    <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">Admin</span>
                                )}
                            </p>
                            <p className="text-xs text-[#B3B3B3] flex items-center justify-end gap-1">
                                <span className="w-2 h-2 rounded-full bg-[#1DB954] animate-pulse"></span> {dbStatus}
                            </p>
                        </div>
                    )}
                </header>

                <main>
                    {userPlanId && myPlan ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">

                                {/* --- LA TUA CASSA --- */}
                                <div className="bg-[#181818] p-6 rounded-2xl border border-[#282828] relative overflow-hidden shadow-2xl flex flex-col justify-between">
                                    {/* EFFETTO SFONDO COUNTER */}
                                    <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20 ${deadline.daysLeft <= 3 ? 'bg-red-500' : 'bg-[#1DB954]'}`}></div>

                                    <div className="relative z-10">
                                        <h2 className="text-xl font-bold text-[#B3B3B3] mb-6 flex justify-between items-center">
                                            La tua Cassa
                                            <span className="text-xs bg-[#282828] px-3 py-1 rounded-full text-white border border-[#3E3E3E]">Tot: €{totalUserPaid.toFixed(2)}</span>
                                        </h2>

                                        {/* COUNTER VISIVO */}
                                        <div className="flex items-center gap-6 mb-8">
                                            <div className={`w-24 h-24 rounded-2xl flex flex-col items-center justify-center border-2 shadow-lg transition-all
                                                ${deadline.daysLeft <= 3 ? 'border-red-500 bg-red-500/10' : 'border-[#1DB954] bg-[#1DB954]/10'}`}>
                                                <span className={`text-4xl font-black ${deadline.daysLeft <= 3 ? 'text-red-500' : 'text-[#1DB954]'}`}>
                                                    {deadline.daysLeft}
                                                </span>
                                                <span className="text-[10px] uppercase font-bold text-[#B3B3B3]">Giorni</span>
                                            </div>

                                            <div>
                                                <p className="text-[#B3B3B3] text-sm uppercase tracking-widest font-bold">Prossima Scadenza</p>
                                                <p className="text-2xl font-black text-white">{deadline.dateString}</p>
                                                <p className="text-xs text-[#B3B3B3] mt-1 italic">Quota: €{(myPlan.monthly_cost / myPlan.max_members).toFixed(2)}</p>
                                            </div>
                                        </div>

                                        {/* SELETTORE MESE E PAGAMENTO CON ANNI DINAMICI */}
                                        <div className="space-y-4 pt-4 border-t border-[#282828]">
                                            <div className="flex flex-col gap-2">
                                                <label className="text-xs font-bold text-[#B3B3B3] uppercase">Mese da saldare:</label>
                                                <div className="flex gap-2">
                                                    <select
                                                        value={selectedTargetMonth}
                                                        onChange={(e) => setSelectedTargetMonth(Number(e.target.value))}
                                                        className="flex-grow bg-[#121212] border border-[#3E3E3E] text-white rounded-xl p-3 outline-none focus:border-[#1DB954]"
                                                    >
                                                        {mesi.map((m, i) => <option key={i} value={i}>{m}</option>)}
                                                    </select>
                                                    <select
                                                        value={selectedTargetYear}
                                                        onChange={(e) => setSelectedTargetYear(Number(e.target.value))}
                                                        className="w-24 bg-[#121212] border border-[#3E3E3E] text-white rounded-xl p-3 outline-none focus:border-[#1DB954]"
                                                    >
                                                        {availableYears.map(year => (
                                                            <option key={year} value={year}>{year}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            <button
                                                onClick={requestPayment}
                                                disabled={isPaying}
                                                className="w-full bg-[#1DB954] text-black font-black py-4 rounded-xl hover:scale-[1.02] transition-transform shadow-lg shadow-[#1DB954]/20 disabled:opacity-50 disabled:hover:scale-100"
                                            >
                                                {isPaying ? 'ELABORAZIONE...' : `REGISTRA PAGAMENTO ${mesiCorti[selectedTargetMonth].toUpperCase()}`}
                                            </button>
                                        </div>

                                        {/* GRAFICA 12 MESI */}
                                        <h3 className="font-bold text-sm text-[#B3B3B3] uppercase tracking-wider mt-8 mb-4 border-b border-[#282828] pb-2">Status Pagamenti {selectedTargetYear}</h3>
                                        <div className="grid grid-cols-4 gap-2">
                                            {mesiCorti.map((mese, index) => {
                                                const isPaid = checkMonthPaid(index, selectedTargetYear, payments);
                                                const isCurrentMonth = new Date().getMonth() === index && currentYear === selectedTargetYear;

                                                return (
                                                    <div
                                                        key={mese}
                                                        className={`p-2 rounded-lg border text-center flex flex-col items-center justify-center transition-all ${isPaid
                                                            ? 'bg-[#1DB954]/20 border-[#1DB954] text-[#1DB954]'
                                                            : isCurrentMonth
                                                                ? 'bg-[#282828] border-yellow-500 text-yellow-500 shadow-inner'
                                                                : 'bg-[#121212] border-[#282828] text-[#555555]'
                                                            }`}
                                                    >
                                                        <span className="text-[10px] uppercase font-bold mb-1">{mese}</span>
                                                        <span className="text-lg">{isPaid ? '✅' : isCurrentMonth ? '🔔' : '⏳'}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* --- IL GRUPPO --- */}
                                <div>
                                    <h2 className="text-2xl font-bold mb-6">Membri del Gruppo</h2>
                                    <div className="bg-[#181818] p-2 rounded-xl border border-[#282828]">
                                        <ul className="divide-y divide-[#282828]">
                                            {members.map((member) => (
                                                <li key={member.id} className="p-4 flex items-center gap-4 hover:bg-[#282828] transition-colors rounded-lg">
                                                    <div className="w-12 h-12 rounded-full bg-[#282828] border border-[#3E3E3E] text-[#1DB954] flex items-center justify-center font-bold text-xl shadow-inner">
                                                        {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-lg">{member.name} {member.id === user?.id && <span className="text-[#1DB954] text-[10px] ml-2 border border-[#1DB954] px-2 py-0.5 rounded-full">TU</span>}</p>
                                                        <p className="text-[#B3B3B3] text-sm">{member.email}</p>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* --- SEZIONE ADMIN --- */}
                            {userRole === 'admin' && (
                                <div className="mt-12 pt-12 border-t border-[#282828]">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-2xl font-black text-red-500 flex items-center gap-2">
                                            🛡️ Pannello Amministratore
                                        </h2>
                                        <div className="bg-red-900/20 border border-red-900/50 px-4 py-2 rounded-lg">
                                            <span className="text-sm text-[#B3B3B3] mr-2">Cassa Totale:</span>
                                            <span className="text-xl font-bold text-white">€{totalGroupPaid.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="bg-[#181818] p-6 rounded-xl border border-red-900/30">
                                            <h3 className="font-bold text-lg mb-2 text-white">Registra Incasso Manuale</h3>
                                            <p className="text-sm text-[#B3B3B3] mb-4">Segna i pagamenti contanti per il mese selezionato nella tua cassa ({mesi[selectedTargetMonth]} {selectedTargetYear}).</p>
                                            <ul className="space-y-3">
                                                {members.map(member => (
                                                    <li key={member.id} className="flex justify-between items-center bg-[#282828] p-3 rounded-lg border border-[#3E3E3E]">
                                                        <span className="font-medium">{member.name}</span>
                                                        <button
                                                            onClick={() => requestAdminAddPayment(member.id, member.name)}
                                                            className="text-xs bg-transparent border border-[#1DB954] text-[#1DB954] font-bold px-3 py-1.5 rounded-full hover:bg-[#1DB954] hover:text-black transition-colors"
                                                        >
                                                            + Segna Pagato
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="bg-[#181818] p-6 rounded-xl border border-red-900/30">
                                            <h3 className="font-bold text-lg mb-4 text-white">Storico Generale</h3>
                                            {allGroupPayments.length > 0 ? (
                                                <ul className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                                    {allGroupPayments.map(payment => (
                                                        <li key={payment.id} className="flex justify-between items-center text-sm bg-[#282828] p-3 rounded-lg border border-[#3E3E3E] group">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-white">{payment.users?.name || 'Utente'}</span>
                                                                <span className="text-[10px] text-[#B3B3B3]">
                                                                    Data: {new Date(payment.payment_date).toLocaleDateString('it-IT')}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-[10px] font-bold text-[#1DB954] bg-[#1DB954]/10 px-2 py-1 rounded-md border border-[#1DB954]/20">
                                                                    Per: {payment.target_month !== null && payment.target_month !== undefined ? mesiCorti[payment.target_month] : 'N/D'} {payment.target_year || ''}
                                                                </span>
                                                                <span className="text-[#1DB954] font-bold">€{payment.amount.toFixed(2)}</span>
                                                                <button
                                                                    onClick={() => requestDeletePayment(payment.id)}
                                                                    className="text-red-500 bg-red-500/10 p-2 rounded-full hover:bg-red-500 hover:text-white transition-all"
                                                                    title="Annulla incasso"
                                                                >
                                                                    🗑️
                                                                </button>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="text-sm text-[#B3B3B3]">Nessun incasso registrato.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="text-center mt-10 text-[#B3B3B3]">
                            {loadingPlans ? 'Caricamento dashboard in corso...' : 'Nessun piano associato trovato.'}
                        </p>
                    )}
                </main>
            </div>

            {/* --- MODAL DI CONFERMA --- */}
            {confirmModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-[#181818] border border-[#3E3E3E] p-8 rounded-2xl max-w-md w-full shadow-2xl">
                        <h3 className="text-2xl font-bold text-white mb-3">{confirmModal.title}</h3>
                        <p className="text-[#B3B3B3] text-md mb-8">{confirmModal.message}</p>
                        <div className="flex gap-4 justify-end">
                            <button
                                onClick={() => setConfirmModal(null)}
                                className="px-6 py-2 rounded-full text-sm font-bold text-white bg-[#282828] hover:bg-[#3E3E3E] transition-colors"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={confirmModal.action}
                                className="px-6 py-2 rounded-full text-sm font-bold text-black bg-[#1DB954] hover:bg-[#1ed760] transition-colors shadow-[0_0_10px_rgba(29,185,84,0.4)]"
                            >
                                Conferma
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TOAST NOTIFICATIONS --- */}
            {toast && (
                <div className={`fixed bottom-8 right-8 px-6 py-4 rounded-xl shadow-2xl border z-50 flex items-center gap-3 transition-all animate-bounce ${toast.type === 'success' ? 'bg-[#181818] border-[#1DB954] text-[#1DB954]' : 'bg-red-950 border-red-500 text-red-200'}`}>
                    <span className="text-2xl">{toast.type === 'success' ? '✅' : '⚠️'}</span>
                    <p className="font-bold text-md">{toast.message}</p>
                </div>
            )}
        </div>
    )
}