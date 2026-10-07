'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../utils/supabase'
import { useToast } from '@/components/ToastContext'
// OneSignal rimosso da qui perché ora è gestito globalmente in layout.tsx

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

    const { showToast } = useToast()

    // --- STATI PER la SCELTA DEL MESE/ANNO DA PAGARE ---
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth()
    const [selectedTargetMonth, setSelectedTargetMonth] = useState<number>(currentMonth)
    const [selectedTargetYear, setSelectedTargetYear] = useState<number>(currentYear)

    // Genera un array di anni dinamico: dal 2024 fino all'anno prossimo
    const startYear = 2024;
    const availableYears = Array.from({ length: (currentYear + 1) - startYear + 1 }, (_, i) => startYear + i);

    // --- STATI PER LA UI CUSTOM ---
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title: string, message: string, action: () => void } | null>(null)
    const [isManagingPlan, setIsManagingPlan] = useState(false)
    const [planCost, setPlanCost] = useState('')
    const [planMaxMembers, setPlanMaxMembers] = useState('')

    const mesi = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
    const mesiCorti = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

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
            const pDate = new Date(p.payment_date)
            return pDate.getMonth() === monthIndex && pDate.getFullYear() === targetYear
        })
    }

    const calculateUserDebt = (userId: string, allPayments: any[]) => {
        const userPayments = allPayments.filter(p => p.user_id === userId);
        let unpaidMonths = 0;
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();

        // Consideramos pagati i mesi da Gennaio fino al mese corrente
        for (let i = 0; i <= currentMonth; i++) {
            if (!checkMonthPaid(i, currentYear, userPayments)) {
                unpaidMonths++;
            }
        }
        return unpaidMonths;
    };

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
                    showToast(`💸 Pagamento per ${targetMonthName} registrato!`, 'success')
                    fetchPayments(user.id)
                    if (userRole === 'admin') fetchAllGroupPayments(userPlanId!)
                } else {
                    showToast("Errore: " + error.message, 'error')
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
                    showToast(`✅ Incasso di ${targetMonthName} registrato per ${memberName}`, 'success')
                    fetchAllGroupPayments(userPlanId!)
                } else {
                    showToast("Errore di registrazione", 'error')
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
                    showToast("🗑️ Pagamento eliminato", 'success')
                    fetchPayments(user.id)
                    if (userRole === 'admin') fetchAllGroupPayments(userPlanId!)
                } else {
                    showToast("Errore nell'eliminazione", 'error')
                }
                setConfirmModal(null)
            }
        })
    }

    const updatePlanDetails = async () => {
        if (!userPlanId) return;
        try {
            const { error } = await supabase
                .from('plans')
                .update({
                    monthly_cost: parseFloat(planCost),
                    max_members: parseInt(planMaxMembers)
                })
                .eq('id', userPlanId);

            if (error) throw error;
            showToast("Piano aggiornato con successo!", "success");
            // Refresh plans to update the UI
            const { data: plansData } = await supabase.from('plans').select('*');
            if (plansData) setPlans(plansData);
            setIsManagingPlan(false);
        } catch (error: any) {
            showToast("Errore nell'aggiornamento: " + error.message, "error");
        }
    };

    const myPlan = plans.find(p => p.id === userPlanId)

    return (
        <div className="min-h-screen bg-[#121212] text-white p-8 font-sans relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#1DB954]/5 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-500/5 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="max-w-5xl mx-auto relative z-10">

                {/* --- BANNER PROMEMORIA --- */}
                {deadline.isReminderActive && (
                    <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-2xl flex items-center gap-4 animate-pulse backdrop-blur-md">
                        <span className="text-2xl">🔔</span>
                        <div>
                            <p className="font-bold text-yellow-500">Scadenza Imminente</p>
                            <p className="text-sm text-yellow-200/80">Il rinnovo Spotify è tra {deadline.daysLeft} {deadline.daysLeft === 1 ? 'giorno' : 'giorni'}. Assicurati di avere fondi sulla carta!</p>
                        </div>
                    </div>
                )}

                <header className="flex justify-between items-center mb-10 border-b border-white/10 pb-6">
                    <h1 className="text-3xl font-black text-white tracking-tight">
                        Spoti<span className="text-[#1DB954]">Share</span>
                    </h1>
                    {user && (
                        <div className="text-right">
                            <p className="font-bold flex items-center justify-end gap-2">
                                <a href="/profile" className="hover:text-[#1DB954] transition-colors text-white/90">
                                    {user.user_metadata?.full_name || 'Utente'}
                                </a>
                                {userRole === 'admin' && (
                                    <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Admin</span>
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
                                <div className="bg-[#181818]/60 backdrop-blur-xl p-6 rounded-3xl border border-white/5 relative overflow-hidden shadow-2xl flex flex-col justify-between transition-all hover:border-white/10">
                                    {/* EFFETTO SFONDO COUNTER */}
                                    <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20 ${deadline.daysLeft <= 3 ? 'bg-red-500' : 'bg-[#1DB954]'}`}></div>

                                    <div className="relative z-10">
                                        <h2 className="text-xl font-bold text-white/70 mb-6 flex justify-between items-center">
                                            La tua Cassa
                                            <span className="text-xs bg-white/10 px-3 py-1 rounded-full text-white border border-white/10">Tot: €{totalUserPaid.toFixed(2)}</span>
                                        </h2>

                                        {/* COUNTER VISIVO */}
                                        <div className="flex items-center gap-6 mb-8">
                                            <div className={`w-24 h-24 rounded-3xl flex flex-col items-center justify-center border-2 shadow-lg transition-all
                                                ${deadline.daysLeft <= 3 ? 'border-red-500 bg-red-500/10' : 'border-[#1DB954] bg-[#1DB954]/10'}`}>
                                                <span className={`text-4xl font-black ${deadline.daysLeft <= 3 ? 'text-red-500' : 'text-[#1DB954]'}`}>
                                                    {deadline.daysLeft}
                                                </span>
                                                <span className="text-[10px] uppercase font-bold text-[#B3B3B3]">Giorni</span>
                                            </div>

                                            <div className="flex-grow">
                                                <p className="text-[#B3B3B3] text-xs uppercase tracking-widest font-bold">Prossima Scadenza</p>
                                                <p className="text-2xl font-black text-white">{deadline.dateString}</p>
                                                <p className="text-xs text-[#B3B3B3] mt-1 italic">Quota: €{(myPlan.monthly_cost / myPlan.max_members).toFixed(2)}</p>
                                            </div>
                                        </div>

                                        {/* SEZIONE DEBITO */}
                                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl backdrop-blur-sm">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-red-400 uppercase">Situazione Debiti</span>
                                                <span className={`text-sm font-bold ${calculateUserDebt(user?.id, payments) > 0 ? 'text-red-500' : 'text-[#1DB954]'}`}>
                                                    {calculateUserDebt(user?.id, payments) > 0
                                                        ? `Mancano ${calculateUserDebt(user?.id, payments)} mese${calculateUserDebt(user?.id, payments) > 1 ? 's' : ''}`
                                                        : 'Tutto in regola ✅'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* SELETTORE MESE E PAGAMENTO */}
                                        <div className="space-y-4 pt-6 border-t border-white/10">
                                            <div className="flex flex-col gap-2">
                                                <label className="text-xs font-bold text-[#B3B3B3] uppercase ml-1">Mese da saldare:</label>
                                                <div className="flex gap-2">
                                                    <select
                                                        value={selectedTargetMonth}
                                                        onChange={(e) => setSelectedTargetMonth(Number(e.target.value))}
                                                        className="flex-grow bg-black/40 border border-white/10 text-white rounded-2xl p-3 outline-none focus:border-[#1DB954] transition-colors"
                                                    >
                                                        {mesi.map((m, i) => <option key={i} value={i}>{m}</option>)}
                                                    </select>
                                                    <select
                                                        value={selectedTargetYear}
                                                        onChange={(e) => setSelectedTargetYear(Number(e.target.value))}
                                                        className="w-24 bg-black/40 border border-white/10 text-white rounded-2xl p-3 outline-none focus:border-[#1DB954] transition-colors"
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
                                                className="w-full bg-[#1DB954] text-black font-black py-4 rounded-2xl hover:scale-[1.02] transition-all shadow-lg shadow-[#1DB954]/20 disabled:opacity-50 disabled:hover:scale-100"
                                            >
                                                {isPaying ? 'ELABORAZIONE...' : `REGISTRA PAGAMENTO ${mesiCorti[selectedTargetMonth].toUpperCase()}`}
                                            </button>
                                        </div>

                                        {/* GRAFICA 12 MESI */}
                                        <h3 className="font-bold text-xs text-white/50 uppercase tracking-wider mt-8 mb-4 border-b border-white/10 pb-2">Status Pagamenti {selectedTargetYear}</h3>
                                        <div className="grid grid-cols-4 gap-2">
                                            {mesiCorti.map((mese, index) => {
                                                const isPaid = checkMonthPaid(index, selectedTargetYear, payments);
                                                const isCurrentMonth = new Date().getMonth() === index && currentYear === selectedTargetYear;

                                                return (
                                                    <div
                                                        key={mese}
                                                        className={`p-2 rounded-xl border text-center flex flex-col items-center justify-center transition-all ${isPaid
                                                            ? 'bg-[#1DB954]/20 border-[#1DB954] text-[#1DB954]'
                                                            : isCurrentMonth
                                                                ? 'bg-white/5 border-yellow-500 text-yellow-500'
                                                                : 'bg-black/20 border-white/10 text-[#555555]'
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
                                    <h2 className="text-2xl font-black mb-6 text-white/90">Membri del Gruppo</h2>
                                    <div className="bg-[#181818]/60 backdrop-blur-xl p-3 rounded-3xl border border-white/5 shadow-2xl">
                                        <ul className="divide-y divide-white/5">
                                            {members.map((member) => (
                                                <li key={member.id} className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors rounded-2xl group">
                                                    <div className="w-12 h-12 rounded-full bg-white/10 border border-white/10 text-[#1DB954] flex items-center justify-center font-bold text-xl shadow-inner group-hover:scale-110 transition-transform">
                                                        {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                                                    </div>
                                                    <div className="flex-grow">
                                                        <p className="font-bold text-lg flex items-center gap-2">
                                                            {member.name} {member.id === user?.id && <span className="text-[#1DB954] text-[10px] border border-[#1DB954] px-2 py-0.5 rounded-full font-bold uppercase">Tu</span>}
                                                        </p>
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
                                <div className="mt-12 pt-12 border-t border-white/10 relative">
                                    <div className="absolute -top-px left-0 w-full h-px bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>
                                    <div className="flex justify-between items-center mb-8">
                                        <h2 className="text-2xl font-black text-red-500 flex items-center gap-2">
                                            🛡️ Pannello Amministratore
                                        </h2>
                                        <div className="bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-2xl backdrop-blur-md">
                                            <span className="text-sm text-[#B3B3B3] mr-2">Cassa Totale:</span>
                                            <span className="text-xl font-bold text-white">€{totalGroupPaid.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="bg-[#181818]/60 backdrop-blur-xl p-6 rounded-3xl border border-red-500/20 shadow-xl">
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="font-bold text-lg text-white">Gestione Piano</h3>
                                                <button
                                                    onClick={() => {
                                                        setIsManagingPlan(!isManagingPlan);
                                                        if(!isManagingPlan) {
                                                            setPlanCost(myPlan?.monthly_cost.toString() || '');
                                                            setPlanMaxMembers(myPlan?.max_members.toString() || '');
                                                        }
                                                    }}
                                                    className="text-xs text-[#1DB954] font-bold hover:underline"
                                                >
                                                    {isManagingPlan ? 'Annulla' : 'Modifica'}
                                                </button>
                                            </div>

                                            {isManagingPlan ? (
                                                <div className="space-y-4">
                                                    <div className="flex flex-col gap-2">
                                                        <label className="text-xs font-bold text-[#B3B3B3] uppercase">Costo Mensile (€)</label>
                                                        <input
                                                            type="number"
                                                            value={planCost}
                                                            onChange={(e) => setPlanCost(e.target.value)}
                                                            className="bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-[#1DB954] transition-colors"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        <label className="text-xs font-bold text-[#B3B3B3] uppercase">Membri Max</label>
                                                        <input
                                                            type="number"
                                                            value={planMaxMembers}
                                                            onChange={(e) => setPlanMaxMembers(e.target.value)}
                                                            className="bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-[#1DB954] transition-colors"
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={updatePlanDetails}
                                                        className="w-full bg-[#1DB954] text-black font-bold py-3 rounded-xl hover:bg-[#1ed760] transition-colors"
                                                    >
                                                        Salva Modifiche
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-[#B3B3B3]">Costo Mensile:</span>
                                                        <span className="font-bold text-white">€{myPlan?.monthly_cost.toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-[#B3B3B3]">Membri Max:</span>
                                                        <span className="font-bold text-white">{myPlan?.max_members}</span>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="mt-8 pt-6 border-t border-white/10">
                                                <h3 className="font-bold text-lg mb-2 text-white">Registra Incasso Manuale</h3>
                                                <p className="text-sm text-[#B3B3B3] mb-4">Segna i pagamenti contanti per {mesi[selectedTargetMonth]} {selectedTargetYear}.</p>
                                                <ul className="space-y-3">
                                                    {members.map(member => (
                                                        <li key={member.id} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                                            <span className="font-medium text-white/90">{member.name}</span>
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
                                        </div>

                                        <div className="bg-[#181818]/60 backdrop-blur-xl p-6 rounded-3xl border border-red-500/20 shadow-xl flex flex-col justify-between">
                                            <div className="relative z-10">
                                                <h3 className="font-bold text-lg mb-4 text-white">Invita nuovi Membri</h3>
                                                <p className="text-sm text-[#B3B3B3] mb-4">Condividi questo link per permettere ad altri di unirsi al tuo gruppo.</p>
                                                <div className="flex items-center gap-2 bg-black/40 p-3 rounded-2xl border border-white/10">
                                                    <code className="flex-grow text-[#1DB954] font-mono text-sm truncate">
                                                        {`${window.location.origin}/join/${myPlan?.invite_code || 'generazione...'}`}
                                                    </code>
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(`${window.location.origin}/join/${myPlan?.invite_code}`);
                                                            showToast("Link copiato negli appunti!", "success");
                                                        }}
                                                        className="bg-[#1DB954] text-black text-xs font-bold px-3 py-2 rounded-xl hover:bg-[#1ed760] transition-colors"
                                                    >
                                                        Copia
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="mt-8">
                                                <h3 className="font-bold text-lg mb-4 text-white">Storico Generale</h3>
                                                {allGroupPayments.length > 0 ? (
                                                    <ul className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                                        {allGroupPayments.map(payment => (
                                                            <li key={payment.id} className="flex justify-between items-center text-sm bg-white/5 p-3 rounded-xl border border-white/5 group hover:border-white/10 transition-colors">
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
        </div>
    )0%] h-[50%] bg-red-500/5 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="max-w-5xl mx-auto relative z-10">

                {/* --- BANNER PROMEMORIA --- */}
                {deadline.isReminderActive && (
                    <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-2xl flex items-center gap-4 animate-pulse backdrop-blur-md">
                        <span className="text-2xl">🔔</span>
                        <div>
                            <p className="font-bold text-yellow-500">Scadenza Imminente</p>
                            <p className="text-sm text-yellow-200/80">Il rinnovo Spotify è tra {deadline.daysLeft} {deadline.daysLeft === 1 ? 'giorno' : 'giorni'}. Assicurati di avere fondi sulla carta!</p>
                        </div>
                    </div>
                )}

                <header className="flex justify-between items-center mb-10 border-b border-white/10 pb-6">
                    <h1 className="text-3xl font-black text-white tracking-tight">
                        Spoti<span className="text-[#1DB954]">Share</span>
                    </h1>
                    {user && (
                        <div className="text-right">
                            <p className="font-bold flex items-center justify-end gap-2">
                                <a href="/profile" className="hover:text-[#1DB954] transition-colors text-white/90">
                                    {user.user_metadata?.full_name || 'Utente'}
                                </a>
                                {userRole === 'admin' && (
                                    <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Admin</span>
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
                                <div className="bg-[#181818]/60 backdrop-blur-xl p-6 rounded-3xl border border-white/5 relative overflow-hidden shadow-2xl flex flex-col justify-between transition-all hover:border-white/10">
                                    {/* EFFETTO SFONDO COUNTER */}
                                    <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20 ${deadline.daysLeft <= 3 ? 'bg-red-500' : 'bg-[#1DB954]'}`}></div>

                                    <div className="relative z-10">
                                        <h2 className="text-xl font-bold text-white/70 mb-6 flex justify-between items-center">
                                            La tua Cassa
                                            <span className="text-xs bg-white/10 px-3 py-1 rounded-full text-white border border-white/10">Tot: €{totalUserPaid.toFixed(2)}</span>
                                        </h2>

                                        {/* COUNTER VISIVO */}
                                        <div className="flex items-center gap-6 mb-8">
                                            <div className={`w-24 h-24 rounded-3xl flex flex-col items-center justify-center border-2 shadow-lg transition-all
                                                ${deadline.daysLeft <= 3 ? 'border-red-500 bg-red-500/10' : 'border-[#1DB954] bg-[#1DB954]/10'}`}>
                                                <span className={`text-4xl font-black ${deadline.daysLeft <= 3 ? 'text-red-500' : 'text-[#1DB954]'}`}>
                                                    {deadline.daysLeft}
                                                </span>
                                                <span className="text-[10px] uppercase font-bold text-[#B3B3B3]">Giorni</span>
                                            </div>

                                            <div className="flex-grow">
                                                <p className="text-[#B3B3B3] text-xs uppercase tracking-widest font-bold">Prossima Scadenza</p>
                                                <p className="text-2xl font-black text-white">{deadline.dateString}</p>
                                                <p className="text-xs text-[#B3B3B3] mt-1 italic">Quota: €{(myPlan.monthly_cost / myPlan.max_members).toFixed(2)}</p>
                                            </div>
                                        </div>

                                        {/* SEZIONE DEBITO */}
                                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl backdrop-blur-sm">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-red-400 uppercase">Situazione Debiti</span>
                                                <span className={`text-sm font-bold ${calculateUserDebt(user?.id, payments) > 0 ? 'text-red-500' : 'text-[#1DB954]'}`}>
                                                    {calculateUserDebt(user?.id, payments) > 0
                                                        ? `Mancano ${calculateUserDebt(user?.id, payments)} mese${calculateUserDebt(user?.id, payments) > 1 ? 's' : ''}`
                                                        : 'Tutto in regola ✅'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* SELETTORE MESE E PAGAMENTO */}
                                        <div className="space-y-4 pt-6 border-t border-white/10">
                                            <div className="flex flex-col gap-2">
                                                <label className="text-xs font-bold text-[#B3B3B3] uppercase ml-1">Mese da saldare:</label>
                                                <div className="flex gap-2">
                                                    <select
                                                        value={selectedTargetMonth}
                                                        onChange={(e) => setSelectedTargetMonth(Number(e.target.value))}
                                                        className="flex-grow bg-black/40 border border-white/10 text-white rounded-2xl p-3 outline-none focus:border-[#1DB954] transition-colors"
                                                    >
                                                        {mesi.map((m, i) => <option key={i} value={i}>{m}</option>)}
                                                    </select>
                                                    <select
                                                        value={selectedTargetYear}
                                                        onChange={(e) => setSelectedTargetYear(Number(e.target.value))}
                                                        className="w-24 bg-black/40 border border-white/10 text-white rounded-2xl p-3 outline-none focus:border-[#1DB954] transition-colors"
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
                                                className="w-full bg-[#1DB954] text-black font-black py-4 rounded-2xl hover:scale-[1.02] transition-all shadow-lg shadow-[#1DB954]/20 disabled:opacity-50 disabled:hover:scale-100"
                                            >
                                                {isPaying ? 'ELABORAZIONE...' : `REGISTRA PAGAMENTO ${mesiCorti[selectedTargetMonth].toUpperCase()}`}
                                            </button>
                                        </div>

                                        {/* GRAFICA 12 MESI */}
                                        <h3 className="font-bold text-xs text-white/50 uppercase tracking-wider mt-8 mb-4 border-b border-white/10 pb-2">Status Pagamenti {selectedTargetYear}</h3>
                                        <div className="grid grid-cols-4 gap-2">
                                            {mesiCorti.map((mese, index) => {
                                                const isPaid = checkMonthPaid(index, selectedTargetYear, payments);
                                                const isCurrentMonth = new Date().getMonth() === index && currentYear === selectedTargetYear;

                                                return (
                                                    <div
                                                        key={mese}
                                                        className={`p-2 rounded-xl border text-center flex flex-col items-center justify-center transition-all ${isPaid
                                                            ? 'bg-[#1DB954]/20 border-[#1DB954] text-[#1DB954]'
                                                            : isCurrentMonth
                                                                ? 'bg-white/5 border-yellow-500 text-yellow-500'
                                                                : 'bg-black/20 border-white/10 text-[#555555]'
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
                                    <h2 className="text-2xl font-black mb-6 text-white/90">Membri del Gruppo</h2>
                                    <div className="bg-[#181818]/60 backdrop-blur-xl p-3 rounded-3xl border border-white/5 shadow-2xl">
                                        <ul className="divide-y divide-white/5">
                                            {members.map((member) => (
                                                <li key={member.id} className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors rounded-2xl group">
                                                    <div className="w-12 h-12 rounded-full bg-white/10 border border-white/10 text-[#1DB954] flex items-center justify-center font-bold text-xl shadow-inner group-hover:scale-110 transition-transform">
                                                        {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                                                    </div>
                                                    <div className="flex-grow">
                                                        <p className="font-bold text-lg flex items-center gap-2">
                                                            {member.name} {member.id === user?.id && <span className="text-[#1DB954] text-[10px] border border-[#1DB954] px-2 py-0.5 rounded-full font-bold uppercase">Tu</span>}
                                                        </p>
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
                                <div className="mt-12 pt-12 border-t border-white/10 relative">
                                    <div className="absolute -top-px left-0 w-full h-px bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>
                                    <div className="flex justify-between items-center mb-8">
                                        <h2 className="text-2xl font-black text-red-500 flex items-center gap-2">
                                            🛡️ Pannello Amministratore
                                        </h2>
                                        <div className="bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-2xl backdrop-blur-md">
                                            <span className="text-sm text-[#B3B3B3] mr-2">Cassa Totale:</span>
                                            <span className="text-xl font-bold text-white">€{totalGroupPaid.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="bg-[#181818]/60 backdrop-blur-xl p-6 rounded-3xl border border-red-500/20 shadow-xl">
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="font-bold text-lg text-white">Gestione Piano</h3>
                                                <button
                                                    onClick={() => {
                                                        setIsManagingPlan(!isManagingPlan);
                                                        if(!isManagingPlan) {
                                                            setPlanCost(myPlan?.monthly_cost.toString() || '');
                                                            setPlanMaxMembers(myPlan?.max_members.toString() || '');
                                                        }
                                                    }}
                                                    className="text-xs text-[#1DB954] font-bold hover:underline"
                                                >
                                                    {isManagingPlan ? 'Annulla' : 'Modifica'}
                                                </button>
                                            </div>

                                            {isManagingPlan ? (
                                                <div className="space-y-4">
                                                    <div className="flex flex-col gap-2">
                                                        <label className="text-xs font-bold text-[#B3B3B3] uppercase">Costo Mensile (€)</label>
                                                        <input
                                                            type="number"
                                                            value={planCost}
                                                            onChange={(e) => setPlanCost(e.target.value)}
                                                            className="bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-[#1DB954] transition-colors"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        <label className="text-xs font-bold text-[#B3B3B3] uppercase">Membri Max</label>
                                                        <input
                                                            type="number"
                                                            value={planMaxMembers}
                                                            onChange={(e) => setPlanMaxMembers(e.target.value)}
                                                            className="bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-[#1DB954] transition-colors"
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={updatePlanDetails}
                                                        className="w-full bg-[#1DB954] text-black font-bold py-3 rounded-xl hover:bg-[#1ed760] transition-colors"
                                                    >
                                                        Salva Modifiche
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-[#B3B3B3]">Costo Mensile:</span>
                                                        <span className="font-bold text-white">€{myPlan?.monthly_cost.toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-[#B3B3B3]">Membri Max:</span>
                                                        <span className="font-bold text-white">{myPlan?.max_members}</span>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="mt-8 pt-6 border-t border-white/10">
                                                <h3 className="font-bold text-lg mb-2 text-white">Registra Incasso Manuale</h3>
                                                <p className="text-sm text-[#B3B3B3] mb-4">Segna i pagamenti contanti per {mesi[selectedTargetMonth]} {selectedTargetYear}.</p>
                                                <ul className="space-y-3">
                                                    {members.map(member => (
                                                        <li key={member.id} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                                            <span className="font-medium text-white/90">{member.name}</span>
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
                                        </div>

                                        <div className="bg-[#181818]/60 backdrop-blur-xl p-6 rounded-3xl border border-red-500/20 shadow-xl flex flex-col justify-between">
                                            <div className="relative z-10">
                                                <h3 className="font-bold text-lg mb-4 text-white">Invita nuovi Membri</h3>
                                                <p className="text-sm text-[#B3B3B3] mb-4">Condividi questo link per permettere ad altri di unirsi al tuo gruppo.</p>
                                                <div className="flex items-center gap-2 bg-black/40 p-3 rounded-2xl border border-white/10">
                                                    <code className="flex-grow text-[#1DB954] font-mono text-sm truncate">
                                                        {`${window.location.origin}/join/${myPlan?.invite_code || 'generazione...'}`}
                                                    </code>
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(`${window.location.origin}/join/${myPlan?.invite_code}`);
                                                            showToast("Link copiato negli appunti!", "success");
                                                        }}
                                                        className="bg-[#1DB954] text-black text-xs font-bold px-3 py-2 rounded-xl hover:bg-[#1ed760] transition-colors"
                                                    >
                                                        Copia
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="mt-8">
                                                <h3 className="font-bold text-lg mb-4 text-white">Storico Generale</h3>
                                                {allGroupPayments.length > 0 ? (
                                                    <ul className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                                        {allGroupPayments.map(payment => (
                                                            <li key={payment.id} className="flex justify-between items-center text-sm bg-white/5 p-3 rounded-xl border border-white/5 group hover:border-white/10 transition-colors">
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
        </div>
    )
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
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="font-bold text-lg text-white">Gestione Piano</h3>
                                                <button
                                                    onClick={() => {
                                                        setIsManagingPlan(!isManagingPlan);
                                                        if(!isManagingPlan) {
                                                            setPlanCost(myPlan?.monthly_cost.toString() || '');
                                                            setPlanMaxMembers(myPlan?.max_members.toString() || '');
                                                        }
                                                    }}
                                                    className="text-xs text-[#1DB954] hover:underline"
                                                >
                                                    {isManagingPlan ? 'Annulla' : 'Modifica'}
                                                </button>
                                            </div>

                                            {isManagingPlan ? (
                                                <div className="space-y-4">
                                                    <div className="flex flex-col gap-2">
                                                        <label className="text-xs font-bold text-[#B3B3B3] uppercase">Costo Mensile (€)</label>
                                                        <input
                                                            type="number"
                                                            value={planCost}
                                                            onChange={(e) => setPlanCost(e.target.value)}
                                                            className="bg-[#121212] border border-[#3E3E3E] text-white rounded-lg p-2 outline-none focus:border-[#1DB954]"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        <label className="text-xs font-bold text-[#B3B3B3] uppercase">Membri Max</label>
                                                        <input
                                                            type="number"
                                                            value={planMaxMembers}
                                                            onChange={(e) => setPlanMaxMembers(e.target.value)}
                                                            className="bg-[#121212] border border-[#3E3E3E] text-white rounded-lg p-2 outline-none focus:border-[#1DB954]"
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={updatePlanDetails}
                                                        className="w-full bg-[#1DB954] text-black font-bold py-2 rounded-lg hover:bg-[#1ed760] transition-colors"
                                                    >
                                                        Salva Modifiche
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-[#B3B3B3]">Costo Mensile:</span>
                                                        <span className="font-bold">€{myPlan?.monthly_cost.toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-[#B3B3B3]">Membri Max:</span>
                                                        <span className="font-bold">{myPlan?.max_members}</span>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="mt-6 pt-6 border-t border-[#282828]">
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
                                        </div>

                                        <div className="bg-[#181818] p-6 rounded-xl border border-red-900/30 flex flex-col justify-between">
                                            <div>
                                                <h3 className="font-bold text-lg mb-4 text-white">Invita nuovi Membri</h3>
                                                <p className="text-sm text-[#B3B3B3] mb-4">Condividi questo link per permettere ad altri di unirsi al tuo gruppo.</p>
                                                <div className="flex items-center gap-2 bg-[#121212] p-3 rounded-xl border border-[#3E3E3E]">
                                                    <code className="flex-grow text-[#1DB954] font-mono text-sm truncate">
                                                        {`${window.location.origin}/join/${myPlan?.invite_code || 'generazione...'}`}
                                                    </code>
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(`${window.location.origin}/join/${myPlan?.invite_code}`);
                                                            showToast("Link copiato negli appunti!", "success");
                                                        }}
                                                        className="bg-[#1DB954] text-black text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#1ed760] transition-colors"
                                                    >
                                                        Copia
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="mt-6">
                                                <h3 className="font-bold text-lg mb-4 text-white">Storico Generale</h3>
                                                {allGroupPayments.length > 0 ? (
                                                    <ul className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
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
        </div>
    )
}
