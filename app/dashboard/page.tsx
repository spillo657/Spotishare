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
    const createPlan = async (cost: number, maxMembers: number) => {
        try {
            setIsPaying(true);
            const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const { data: planData, error: planError } = await supabase
                .from('plans')
                .insert({
                    name: `${user?.user_metadata?.full_name || 'Il Mio'} Gruppo`,
                    monthly_cost: cost,
                    max_members: maxMembers,
                    invite_code: inviteCode
                })
                .select()
                .single();

            if (planError) throw planError;

            const { error: userError } = await supabase
                .from('users')
                .update({ plan_id: planData.id, role: 'admin' })
                .eq('id', user.id);

            if (userError) throw userError;

            showToast("🚀 Gruppo creato con successo!", 'success');
            setUserPlanId(planData.id);
            setUserRole('admin');
            setPlans([planData, ...plans]);

            const { data: membersData } = await supabase.from('users').select('*').eq('plan_id', planData.id);
            if (membersData) setMembers(membersData);

            const { data: paymentsData } = await supabase.from('payments').select(`*, users ( name )`).eq('plan_id', planData.id).order('payment_date', { ascending: false });
            if (paymentsData) setAllGroupPayments(paymentsData);

        } catch (error: any) {
            showToast("Errore creazione gruppo: " + error.message, 'error');
        } finally {
            setIsPaying(false);
        }
    }

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
            const { data: plansData } = await supabase.from('plans').select('*');
            if (plansData) setPlans(plansData);
            setIsManagingPlan(false);
        } catch (error: any) {
            showToast("Errore nell'aggiornamento: " + error.message, "error");
        }
    };

    const myPlan = plans.find(p => p.id === userPlanId)

    // --- RING PROGRESS CALCULATION ---
    const ringRadius = 36;
    const circumference = 2 * Math.PI * ringRadius;
    const progress = Math.max(0, Math.min(1, deadline.daysLeft / 30));
    const offset = circumference - progress * circumference;

    return (
        <div className="min-h-screen bg-[#0B0B0F] text-zinc-100 p-8 font-sans relative overflow-hidden">
            {/* Background Atmospheric Blurs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-500/10 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none"></div>

            <style jsx>{`
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                .animate-shimmer {
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                    background-size: 200% 100%;
                    animation: shimmer 3s infinite linear;
                }
            `}</style>

            <div className="max-w-5xl mx-auto relative z-10">

                {/* --- BANNER PROMEMORIA --- */}
                {deadline.isReminderActive && (
                    <div className="mb-8 bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex items-center gap-4 animate-pulse backdrop-blur-md">
                        <span className="text-2xl">🔔</span>
                        <div>
                            <p className="font-extrabold tracking-tight text-amber-500 text-sm">Scadenza Imminente</p>
                            <p className="text-xs text-zinc-400 leading-relaxed">Il rinnovo Spotify è tra {deadline.daysLeft} {deadline.daysLeft === 1 ? 'giorno' : 'giorni'}. Assicurati di avere fondi sulla carta!</p>
                        </div>
                    </div>
                )}

                <header className="flex justify-between items-center mb-12 border-b border-white/10 pb-8">
                    <h1 className="text-3xl font-extrabold tracking-tighter bg-gradient-to-r from-[#1DB954] to-[#1ed760] bg-clip-text text-transparent">
                        SpotiShare
                    </h1>
                    {user && (
                        <div className="text-right">
                            <p className="font-bold flex items-center justify-end gap-2 text-zinc-100">
                                <a href="/profile" className="hover:text-green-400 transition-colors">
                                    {user.user_metadata?.full_name || 'Utente'}
                                </a>
                                {userRole === 'admin' && (
                                    <span className="bg-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest font-semibold border border-red-500/30">Admin</span>
                                )}
                            </p>
                            <p className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500 flex items-center justify-end gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> {dbStatus}
                            </p>
                        </div>
                    )}
                </header>

                <main>
                    {userPlanId && myPlan ? (
                        <>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-16">

                                {/* --- LA TUA CASSA (Hero Element) --- */}
                                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl ring-1 ring-white/5 p-8 relative overflow-hidden flex flex-col justify-between shadow-[0_0_40px_-10px_rgba(29,185,84,0.3)]">
                                    <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20 ${deadline.daysLeft <= 3 ? 'bg-red-500' : 'bg-green-500'}`}></div>

                                    <div className="relative z-10">
                                        <div className="flex justify-between items-center mb-8">
                                            <h2 className="text-xl font-extrabold tracking-tight text-zinc-100">La tua Cassa</h2>
                                            <span className="text-[10px] uppercase tracking-widest font-semibold bg-white/10 px-3 py-1 rounded-full text-zinc-400 border border-white/10">
                                                Tot: €{totalUserPaid.toFixed(2)}
                                            </span>
                                        </div>

                                        {/* VISUAL COUNTER WITH RING */}
                                        <div className="flex items-center gap-8 mb-10">
                                            <div className="relative flex items-center justify-center w-28 h-28">
                                                <svg className="w-full h-full transform -rotate-90">
                                                    <circle
                                                        cx="56"
                                                        cy="56"
                                                        r={ringRadius}
                                                        stroke="currentColor"
                                                        strokeWidth="6"
                                                        fill="transparent"
                                                        className="text-white/10"
                                                    />
                                                    <circle
                                                        cx="56"
                                                        cy="56"
                                                        r={ringRadius}
                                                        stroke="currentColor"
                                                        strokeWidth="6"
                                                        fill="transparent"
                                                        strokeDasharray={circumference}
                                                        strokeDashoffset={offset}
                                                        strokeLinecap="round"
                                                        className={`${deadline.daysLeft <= 3 ? 'text-red-500' : 'text-green-500'} transition-all duration-1000 ease-in-out`}
                                                    />
                                                </svg>
                                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                    <span className={`text-4xl font-black ${deadline.daysLeft <= 3 ? 'text-red-500' : 'text-zinc-100'}`}>
                                                        {deadline.daysLeft}
                                                    </span>
                                                    <span className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500">Giorni</span>
                                                </div>
                                            </div>

                                            <div>
                                                <p className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500 mb-1">Prossima Scadenza</p>
                                                <p className="text-2xl font-extrabold tracking-tight text-zinc-100">{deadline.dateString}</p>
                                                <p className="text-sm text-zinc-400 mt-1 italic">Quota: €{(myPlan.monthly_cost / myPlan.max_members).toFixed(2)}</p>
                                            </div>
                                        </div>

                                        {/* SEZIONE DEBITO */}
                                        <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl backdrop-blur-md">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] uppercase tracking-widest font-semibold text-red-400">Situazione Debiti</span>
                                                <span className={`text-xs font-bold ${calculateUserDebt(user?.id, payments) > 0 ? 'text-red-500' : 'text-green-400'}`}>
                                                    {calculateUserDebt(user?.id, payments) > 0
                                                        ? `Mancano ${calculateUserDebt(user?.id, payments)} mese${calculateUserDebt(user?.id, payments) > 1 ? 's' : ''}`
                                                        : 'Tutto in regola ✅'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* SELETTORE MESE E PAGAMENTO */}
                                        <div className="space-y-5 pt-6 border-t border-white/10">
                                            <div className="flex flex-col gap-3">
                                                <label className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500">Mese da saldare:</label>
                                                <div className="flex gap-3">
                                                    <select
                                                        value={selectedTargetMonth}
                                                        onChange={(e) => setSelectedTargetMonth(Number(e.target.value))}
                                                        className="flex-grow bg-white/5 border border-white/10 text-zinc-100 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500/50 transition-all backdrop-blur-md"
                                                    >
                                                        {mesi.map((m, i) => <option key={i} value={i} className="bg-[#0B0B0F]">{m}</option>)}
                                                    </select>
                                                    <select
                                                        value={selectedTargetYear}
                                                        onChange={(e) => setSelectedTargetYear(Number(e.target.value))}
                                                        className="w-28 bg-white/5 border border-white/10 text-zinc-100 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500/50 transition-all backdrop-blur-md"
                                                    >
                                                        {availableYears.map(year => (
                                                            <option key={year} value={year} className="bg-[#0B0B0F]">{year}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            <button
                                                onClick={requestPayment}
                                                disabled={isPaying}
                                                className="relative group w-full bg-gradient-to-r from-[#1DB954] to-[#1ed760] text-black font-bold rounded-full px-6 py-4 shadow-[0_0_20px_rgba(29,185,84,0.4)] hover:shadow-[0_0_30px_rgba(29,185,84,0.6)] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 overflow-hidden"
                                            >
                                                <div className="absolute inset-0 animate-shimmer pointer-events-none"></div>
                                                <span className="relative z-10 uppercase tracking-tighter">
                                                    {isPaying ? 'ELABORAZIONE...' : `REGISTRA PAGAMENTO ${mesiCorti[selectedTargetMonth].toUpperCase()}`}
                                                </span>
                                            </button>
                                        </div>

                                        {/* GRAFICA 12 MESI (Pills) */}
                                        <h3 className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500 mt-10 mb-4 border-b border-white/10 pb-2">Status Pagamenti {selectedTargetYear}</h3>
                                        <div className="flex overflow-x-auto pb-4 gap-3 custom-scrollbar snap-x">
                                            {mesiCorti.map((mese, index) => {
                                                const isPaid = checkMonthPaid(index, selectedTargetYear, payments);
                                                const isCurrentMonth = new Date().getMonth() === index && currentYear === selectedTargetYear;

                                                return (
                                                    <div
                                                        key={mese}
                                                        className={`snap-start min-w-[80px] p-3 rounded-full border text-center flex flex-col items-center justify-center transition-all
                                                            ${isPaid
                                                                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                                                : isCurrentMonth
                                                                    ? 'animate-pulse bg-amber-500/10 text-amber-500 border-amber-500/30'
                                                                    : 'bg-transparent text-zinc-600 border-white/10'
                                                            }`}
                                                    >
                                                        <span className="text-[9px] uppercase font-bold mb-1">{mese}</span>
                                                        <span className="text-lg">{isPaid ? '✅' : isCurrentMonth ? '🔔' : '⏳'}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* --- IL GRUPPO --- */}
                                <div>
                                    <h2 className="text-2xl font-extrabold tracking-tight text-zinc-100 mb-6">Membri del Gruppo</h2>
                                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-3 shadow-xl">
                                        <ul className="divide-y divide-white/10">
                                            {members.map((member) => (
                                                <li key={member.id} className="p-4 flex items-center gap-4 hover:bg-white/5 transition-all rounded-2xl group">
                                                    <div className="w-12 h-12 rounded-full bg-white/10 border border-white/10 text-green-400 flex items-center justify-center font-bold text-xl shadow-inner group-hover:scale-110 transition-transform">
                                                        {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                                                    </div>
                                                    <div className="flex-grow">
                                                        <p className="font-bold text-zinc-100 flex items-center gap-2">
                                                            {member.name} {member.id === user?.id && <span className="text-green-400 text-[9px] border border-green-400/50 px-2 py-0.5 rounded-full uppercase tracking-widest">Tu</span>}
                                                        </p>
                                                        <p className="text-zinc-400 text-xs">{member.email}</p>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* --- SEZIONE ADMIN --- */}
                            {userRole === 'admin' && (
                                <div className="mt-16 pt-16 border-t border-white/10">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                                        <h2 className="text-2xl font-extrabold tracking-tight text-red-500 flex items-center gap-3">
                                            <span className="p-2 bg-red-500/20 rounded-lg">🛡️</span> Pannello Amministratore
                                        </h2>
                                        <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl backdrop-blur-md shadow-lg">
                                            <span className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500 mr-3">Cassa Totale:</span>
                                            <span className="text-2xl font-black text-zinc-100">€{totalGroupPaid.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-xl">
                                            <div className="flex justify-between items-center mb-6">
                                                <h3 className="font-extrabold text-lg text-zinc-100">Gestione Piano</h3>
                                                <button
                                                    onClick={() => {
                                                        setIsManagingPlan(!isManagingPlan);
                                                        if(!isManagingPlan) {
                                                            setPlanCost(myPlan?.monthly_cost.toString() || '');
                                                            setPlanMaxMembers(myPlan?.max_members.toString() || '');
                                                        }
                                                    }}
                                                    className="text-xs text-green-400 hover:text-green-300 font-semibold transition-colors"
                                                >
                                                    {isManagingPlan ? 'Annulla' : 'Modifica'}
                                                </button>
                                            </div>

                                            {isManagingPlan ? (
                                                <div className="space-y-6">
                                                    <div className="flex flex-col gap-2">
                                                        <label className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500">Costo Mensile (€)</label>
                                                        <input
                                                            type="number"
                                                            value={planCost}
                                                            onChange={(e) => setPlanCost(e.target.value)}
                                                            className="bg-white/5 border border-white/10 text-zinc-100 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500/50 transition-all shadow-inner"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        <label className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500">Membri Max</label>
                                                        <input
                                                            type="number"
                                                            value={planMaxMembers}
                                                            onChange={(e) => setPlanMaxMembers(e.target.value)}
                                                            className="bg-white/5 border border-white/10 text-zinc-100 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500/50 transition-all shadow-inner"
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={updatePlanDetails}
                                                        className="w-full bg-green-500 text-black font-bold py-3 rounded-xl hover:bg-green-400 transition-all active:scale-95"
                                                    >
                                                        Salva Modifiche
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <div className="flex justify-between text-sm p-3 bg-white/5 rounded-xl border border-white/5">
                                                        <span className="text-zinc-400">Costo Mensile:</span>
                                                        <span className="font-bold text-zinc-100">€{myPlan?.monthly_cost.toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm p-3 bg-white/5 rounded-xl border border-white/5">
                                                        <span className="text-zinc-400">Membri Max:</span>
                                                        <span className="font-bold text-zinc-100">{myPlan?.max_members}</span>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="mt-10 pt-8 border-t border-white/10">
                                                <h3 className="font-extrabold text-lg mb-2 text-zinc-100">Registra Incasso Manuale</h3>
                                                <p className="text-xs text-zinc-400 mb-6 leading-relaxed">Segna i pagamenti contanti per il mese selezionato nella tua cassa ({mesi[selectedTargetMonth]} {selectedTargetYear}).</p>
                                                <ul className="space-y-3">
                                                    {members.map(member => (
                                                        <li key={member.id} className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-green-500/30 transition-all group">
                                                            <span className="font-semibold text-zinc-200">{member.name}</span>
                                                            <button
                                                                onClick={() => requestAdminAddPayment(member.id, member.name)}
                                                                className="text-[10px] bg-transparent border border-green-500/50 text-green-400 font-bold px-4 py-2 rounded-full hover:bg-green-500 hover:text-black transition-all active:scale-95"
                                                            >
                                                                + Segna Pagato
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>

                                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-xl flex flex-col justify-between">
                                            <div className="space-y-8">
                                                <div>
                                                    <h3 className="font-extrabold text-lg mb-3 text-zinc-100">Invita nuovi Membri</h3>
                                                    <p className="text-xs text-zinc-400 mb-4 leading-relaxed">Condividi questo link per permettere ad altri di unirsi al tuo gruppo.</p>
                                                    <div className="flex items-center gap-2 bg-black/40 p-3 rounded-2xl border border-white/10 shadow-inner">
                                                        <code className="flex-grow text-green-400 font-mono text-xs truncate">
                                                            {`${window.location.origin}/join/${myPlan?.invite_code || 'generazione...'}`}
                                                        </code>
                                                        <button
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(`${window.location.origin}/join/${myPlan?.invite_code}`);
                                                                showToast("Link copiato negli appunti!", "success");
                                                            }}
                                                            className="bg-green-500 text-black text-[10px] font-bold px-4 py-2 rounded-xl hover:bg-green-400 transition-all active:scale-95"
                                                        >
                                                            Copia
                                                        </button>
                                                    </div>
                                                </div>
                                                <div>
                                                    <h3 className="font-extrabold text-lg mb-4 text-zinc-100">Storico Generale</h3>
                                                    {allGroupPayments.length > 0 ? (
                                                        <ul className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                                            {allGroupPayments.map(payment => (
                                                                <li key={payment.id} className="flex justify-between items-center text-sm bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-all group">
                                                                    <div className="flex flex-col">
                                                                        <span className="font-bold text-zinc-100">{payment.users?.name || 'Utente'}</span>
                                                                        <span className="text-[10px] text-zinc-500">
                                                                            Data: {new Date(payment.payment_date).toLocaleDateString('it-IT')}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-4">
                                                                        <span className="text-[9px] font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded-md border border-green-500/20 uppercase tracking-widest">
                                                                            {payment.target_month !== null && payment.target_month !== undefined ? mesiCorti[payment.target_month] : 'N/D'} {payment.target_year || ''}
                                                                        </span>
                                                                        <span className="text-green-400 font-black">€{payment.amount.toFixed(2)}</span>
                                                                        <button
                                                                            onClick={() => requestDeletePayment(payment.id)}
                                                                            className="text-red-400 bg-red-500/10 p-2 rounded-full hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                                                            title="Annulla incasso"
                                                                        >
                                                                            🗑️
                                                                        </button>
                                                                    </div>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <p className="text-xs text-zinc-500 text-center p-4 bg-white/5 rounded-2xl border border-white/5">Nessun incasso registrato.</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-3xl mb-4 animate-bounce">⏳</div>
                            <p className="text-zinc-400 font-medium">
                                {loadingPlans ? 'Sincronizzazione dashboard...' : 'Nessun piano associato trovato.'}
                            </p>
                            {userRole === 'admin' && !userPlanId && (
                                <div className="mt-6 p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md max-w-md">
                                    <h3 className="text-xl font-bold text-zinc-100 mb-2">Crea il tuo Gruppo</h3>
                                    <p className="text-sm text-zinc-400 mb-6">Sei l'amministratore ma non hai ancora un gruppo. Creane uno ora per iniziare a invitare i membri.</p>
                                    <div className="flex flex-col gap-4">
                                        <div className="flex gap-3">
                                            <div className="flex-grow text-left">
                                                <label className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500 ml-1">Costo Mensile (€)</label>
                                                <input
                                                    type="number"
                                                    placeholder="es. 15.00"
                                                    id="newPlanCost"
                                                    className="w-full bg-black/40 border border-white/10 text-zinc-100 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500/50"
                                                />
                                            </div>
                                            <div className="w-32 text-left">
                                                <label className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500 ml-1">Membri Max</label>
                                                <input
                                                    type="number"
                                                    placeholder="6"
                                                    id="newPlanMax"
                                                    className="w-full bg-black/40 border border-white/10 text-zinc-100 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500/50"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                const cost = parseFloat((document.getElementById('newPlanCost') as HTMLInputElement).value);
                                                const max = parseInt((document.getElementById('newPlanMax') as HTMLInputElement).value);
                                                if (isNaN(cost) || isNaN(max)) {
                                                    showToast("Inserisci valori validi", "error");
                                                    return;
                                                }
                                                await createPlan(cost, max);
                                            }}
                                            className="bg-gradient-to-r from-[#1DB954] to-[#1ed760] text-black font-bold py-3 rounded-xl hover:scale-[1.02] transition-all shadow-lg shadow-green-500/20"
                                        >
                                            Crea Gruppo Ora
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                }
            </main>
        </div>
    )
}
