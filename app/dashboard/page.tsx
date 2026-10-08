'use client'

import { useEffect, useState } from 'react'
import confetti from 'canvas-confetti'
import { supabase } from '../../utils/supabase'
import { useToast } from '@/components/ToastContext'

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

    // --- STATI PER LA SCELTA DEL MESE/ANNO DA PAGARE ---
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth()
    const [selectedTargetMonth, setSelectedTargetMonth] = useState<number>(currentMonth)
    const [selectedTargetYear, setSelectedTargetYear] = useState<number>(currentYear)

    const startYear = 2024;
    const availableYears = Array.from({ length: (currentYear + 1) - startYear + 1 }, (_, i) => startYear + i);

    // --- STATI PER LA UI CUSTOM E MODALI ---
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title: string, message: string, action: () => void } | null>(null)
    const [isManagingPlan, setIsManagingPlan] = useState(false)
    const [planCost, setPlanCost] = useState('')
    const [planMaxMembers, setPlanMaxMembers] = useState('')

    // --- STATI PER LE FUNZIONALITA' AVANZATE ---
    // 1. PWA Install
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
    const [isInstallable, setIsInstallable] = useState(false)
    const [isAppInstalled, setIsAppInstalled] = useState(false)
    const [showIOSInstallModal, setShowIOSInstallModal] = useState(false)

    // 2. Playlist Hub
    const [playlistUrl, setPlaylistUrl] = useState<string>('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M')
    const [isEditingPlaylist, setIsEditingPlaylist] = useState(false)
    const [customPlaylistInput, setCustomPlaylistInput] = useState('')

    const mesi = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
    const mesiCorti = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

    // --- MICRO-INTERAZIONE: EFFETTO CONFETTI ---
    const triggerConfetti = () => {
        try {
            confetti({
                particleCount: 75,
                spread: 65,
                origin: { y: 0.65 },
                colors: ['#1DB954', '#1ed760', '#ffffff', '#22e569', '#FFD700']
            })
            setTimeout(() => {
                confetti({
                    particleCount: 45,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: ['#1DB954', '#1ed760', '#FFD700']
                })
                confetti({
                    particleCount: 45,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: ['#1DB954', '#1ed760', '#FFD700']
                })
            }, 200)
        } catch (e) {
            console.error("Confetti error:", e)
        }
    }

    // --- LOGICA PWA (PROGRESSIVE WEB APP) ---
    useEffect(() => {
        if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
            setIsAppInstalled(true)
        }

        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault()
            setDeferredPrompt(e)
            setIsInstallable(true)
        }

        const handleAppInstalled = () => {
            setIsAppInstalled(true)
            setIsInstallable(false)
            setDeferredPrompt(null)
            showToast('🎉 SpotiShare installata sulla tua schermata!', 'success')
            triggerConfetti()
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        window.addEventListener('appinstalled', handleAppInstalled)

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
            window.removeEventListener('appinstalled', handleAppInstalled)
        }
    }, [])

    const handleInstallPWA = async () => {
        if (typeof window === 'undefined') return
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
        if (isIOS) {
            setShowIOSInstallModal(true)
            return
        }
        if (deferredPrompt) {
            deferredPrompt.prompt()
            const { outcome } = await deferredPrompt.userChoice
            if (outcome === 'accepted') {
                showToast('🚀 Installazione di SpotiShare avviata!', 'success')
            }
            setDeferredPrompt(null)
            setIsInstallable(false)
        } else {
            showToast('💡 Clicca sui 3 puntini del browser e seleziona "Installa SpotiShare"', 'info')
        }
    }

    // --- LOGICA PLAYLIST HUB ---
    useEffect(() => {
        if (userPlanId && typeof window !== 'undefined') {
            const saved = localStorage.getItem(`spotishare_playlist_${userPlanId}`)
            if (saved) setPlaylistUrl(saved)
        }
    }, [userPlanId])

    const getSpotifyEmbedUrl = (url: string) => {
        try {
            if (!url) return 'https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?utm_source=generator&theme=0'
            if (url.includes('/embed/')) return url
            if (url.includes('open.spotify.com/playlist/')) {
                const id = url.split('playlist/')[1]?.split('?')[0]
                return `https://open.spotify.com/embed/playlist/${id}?utm_source=generator&theme=0`
            }
            if (url.includes('open.spotify.com/album/')) {
                const id = url.split('album/')[1]?.split('?')[0]
                return `https://open.spotify.com/embed/album/${id}?utm_source=generator&theme=0`
            }
            if (url.includes('open.spotify.com/track/')) {
                const id = url.split('track/')[1]?.split('?')[0]
                return `https://open.spotify.com/embed/track/${id}?utm_source=generator&theme=0`
            }
            return url
        } catch {
            return url
        }
    }

    const saveCustomPlaylist = (newUrl?: string) => {
        const targetUrl = newUrl || customPlaylistInput.trim()
        if (!targetUrl) return
        let finalUrl = targetUrl
        if (!finalUrl.startsWith('http')) {
            finalUrl = `https://open.spotify.com/playlist/${finalUrl}`
        }
        setPlaylistUrl(finalUrl)
        if (userPlanId && typeof window !== 'undefined') {
            localStorage.setItem(`spotishare_playlist_${userPlanId}`, finalUrl)
        }
        setIsEditingPlaylist(false)
        setCustomPlaylistInput('')
        showToast('🎵 Playlist condivisa aggiornata!', 'success')
    }

    // --- LOGICA DEL COUNTER (SCADENZA AL 24) ---
    const getDeadlineInfo = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let targetMonth = today.getMonth();
        let targetYear = today.getFullYear();
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
            isReminderActive: diffDays <= 4 && diffDays >= 0
        };
    };

    const deadline = getDeadlineInfo();
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
        const { data } = await supabase.from('payments').select('*, users ( name )').eq('plan_id', planId).order('payment_date', { ascending: false })
        if (data) setAllGroupPayments(data)
    }

    const ensureInviteCode = async (plan: any) => {
        if (plan?.invite_code) return plan.invite_code;
        try {
            const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const { data, error } = await supabase
                .from('plans')
                .update({ invite_code: newCode })
                .eq('id', plan.id)
                .select()
                .single();
            if (error) throw error;
            setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, invite_code: newCode } : p));
            return newCode;
        } catch (error: any) {
            showToast("Errore Supabase: " + (error.message || "Permessi insufficienti"), 'error');
            return null;
        }
    }

    useEffect(() => {
        const fetchUserDataAndPlans = async (authUser: any) => {
            try {
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('plan_id, role')
                    .eq('id', authUser.id)
                    .single();

                if (userError && userError.code !== 'PGRST116') {
                    console.error("Error fetching user:", userError);
                }

                let currentUserData = userData;

                if (!userData) {
                    const { data: newUser, error: insertError } = await supabase
                        .from('users')
                        .insert({
                            id: authUser.id,
                            email: authUser.email,
                            name: authUser.user_metadata?.full_name || 'Utente Spotify',
                            spotify_id: authUser.user_metadata?.provider_id || null
                        })
                        .select('plan_id, role')
                        .single();

                    if (insertError) {
                        console.error("Error creating user record:", insertError);
                    } else {
                        currentUserData = newUser;
                    }
                }

                if (currentUserData) {
                    setDbStatus("✅ Online")
                    setUserPlanId(currentUserData.plan_id)
                    setUserRole(currentUserData.role || 'user')

                    if (currentUserData.plan_id) {
                        fetchGroupMembers(currentUserData.plan_id)
                        if (currentUserData.role === 'admin') fetchAllGroupPayments(currentUserData.plan_id)
                    }
                }
                fetchPayments(authUser.id)
                const { data: plansData } = await supabase.from('plans').select('*')
                if (plansData) setPlans(plansData)
            } catch (error: any) {
                console.error("Unexpected error in fetchUserDataAndPlans:", error);
                showToast("Errore imprevisto nel caricamento dati", "error");
            } finally {
                setLoadingPlans(false)
            }
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

    const checkMonthPaid = (monthIndex: number, targetYear: number, userPayments: any[]) => {
        return userPayments.some(p => {
            if (p.target_month !== undefined && p.target_month !== null) {
                return p.target_month === monthIndex && p.target_year === targetYear
            }
            const pDate = new Date(p.payment_date)
            return pDate.getMonth() === monthIndex && pDate.getFullYear() === targetYear
        })
    }

    const calculateUserDebt = (userId: string, paymentList: any[]) => {
        const userPayments = paymentList.filter(p => p.user_id === userId);
        let unpaidMonths = 0;
        const today = new Date();
        const currentYearNum = today.getFullYear();
        const currentMonthNum = today.getMonth();
        for (let i = 0; i <= currentMonthNum; i++) {
            if (!checkMonthPaid(i, currentYearNum, userPayments)) {
                unpaidMonths++;
            }
        }
        return unpaidMonths;
    };

    // --- SOLLECITI SMART WHATSAPP (BIDIREZIONALI) ---
    // 1. Admin sollecita Membro moroso
    const sendWhatsAppMemberReminder = (member: any, debtCount: number, quota: string) => {
        const totalDue = (debtCount * parseFloat(quota)).toFixed(2)
        const text = `Ciao ${member.name || 'amico'}! 🎵 Ti ricordo che su SpotiShare risultano ${debtCount} quota/e in sospeso (totale: €${totalDue}) per il nostro gruppo Spotify Family. Fammi sapere quando riesci a saldare! 🙌`
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`
        window.open(url, '_blank')
    }

    // 2. Membro sollecita Admin a rinnovare Spotify
    const sendWhatsAppAdminReminder = () => {
        const admin = members.find(m => m.role === 'admin') || { name: 'Admin' }
        const text = `Ciao ${admin.name}! 🎵 Ti ricordo che la scadenza per il rinnovo del nostro abbonamento Spotify Family è il ${deadline.dateString} (tra ${deadline.daysLeft} giorni). Il gruppo SpotiShare è pronto! 🎶`
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`
        window.open(url, '_blank')
    }

    // --- ESPORTAZIONE REPORT FINANZIARIO CSV ---
    const exportPaymentsCSV = () => {
        const dataToExport = userRole === 'admin' ? (allGroupPayments.length > 0 ? allGroupPayments : payments) : payments
        if (!dataToExport || dataToExport.length === 0) {
            showToast('Nessun pagamento registrato da esportare.', 'info')
            return
        }

        const headers = ['ID Pagamento', 'Data Registrazione', 'Membro', 'Mese di Riferimento', 'Anno', 'Importo (€)', 'Gruppo']
        const rows = dataToExport.map((p: any) => [
            p.id,
            new Date(p.payment_date).toLocaleDateString('it-IT'),
            p.users?.name || user?.user_metadata?.full_name || 'Utente',
            p.target_month !== null && p.target_month !== undefined ? mesi[p.target_month] : 'N/D',
            p.target_year || new Date(p.payment_date).getFullYear(),
            p.amount.toFixed(2),
            myPlan?.name || 'SpotiShare Family'
        ])

        const csvContent = '﻿' + [
            headers.join(';'),
            ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))
        ].join('\r\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.setAttribute('href', url)
        link.setAttribute('download', `SpotiShare_Report_${(myPlan?.name || 'Gruppo').replace(/\s+/g, '_')}_${new Date().getFullYear()}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        showToast('📊 Report CSV scaricato con successo!', 'success')
    }

    const createPlan = async (cost: number, maxMembers: number) => {
        try {
            setIsPaying(true);
            const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const { data: planData, error: planError } = await supabase
                .from('plans')
                .insert({
                    name: user?.user_metadata?.full_name ? user.user_metadata.full_name + ' Gruppo' : 'Il Mio Gruppo',
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
            triggerConfetti();
            setUserPlanId(planData.id);
            setUserRole('admin');
            setPlans([planData, ...plans]);

            const { data: membersData } = await supabase.from('users').select('*').eq('plan_id', planData.id);
            if (membersData) setMembers(membersData);

            const { data: paymentsData } = await supabase.from('payments').select('*, users ( name )').eq('plan_id', planData.id).order('payment_date', { ascending: false });
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
            message: 'Stai per versare la quota di €' + quota + ' per saldare il mese di ' + targetMonthName + ' ' + selectedTargetYear + '. Confermi?',
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
                    showToast('💸 Pagamento per ' + targetMonthName + ' registrato!', 'success')
                    triggerConfetti()
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
            message: 'Vuoi confermare di aver ricevuto €' + quota + ' da ' + memberName + ' per il mese di ' + targetMonthName + ' ' + selectedTargetYear + '?',
            action: async () => {
                const { error } = await supabase.from('payments').insert({
                    user_id: memberId,
                    plan_id: userPlanId,
                    amount: parseFloat(quota),
                    target_month: selectedTargetMonth,
                    target_year: selectedTargetYear
                })
                if (!error) {
                    showToast('✅ Incasso di ' + targetMonthName + ' registrato per ' + memberName, 'success')
                    triggerConfetti()
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

    const removeMember = async (memberId: string, memberName: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Rimuovi Membro",
            message: 'Sei sicuro di voler rimuovere ' + memberName + ' dal gruppo? L\'utente non avrà più accesso alla dashboard del gruppo.',
            action: async () => {
                setIsPaying(true)
                const { error } = await supabase
                    .from('users')
                    .update({ plan_id: null })
                    .eq('id', memberId)

                if (!error) {
                    showToast(memberName + ' rimosso dal gruppo', 'success')
                    fetchGroupMembers(userPlanId!)
                } else {
                    showToast("Errore durante la rimozione: " + error.message, 'error')
                }
                setIsPaying(false)
                setConfirmModal(null)
            }
        })
    }

    const myPlan = plans.find(p => p.id === userPlanId)
    const ringRadius = 36;
    const circumference = 2 * Math.PI * ringRadius;
    const progress = Math.max(0, Math.min(1, deadline.daysLeft / 30));
    const offset = circumference - progress * circumference;

    // --- CALCOLO RISPARMIO DI GRUPPO ---
    const individualSpotifyPrice = 10.99
    const memberQuota = myPlan ? (myPlan.monthly_cost / myPlan.max_members) : 2.99
    const personalMonthlySavings = Math.max(0, individualSpotifyPrice - memberQuota)
    const personalAnnualSavings = personalMonthlySavings * 12
    const groupAnnualSavings = myPlan ? Math.max(0, (individualSpotifyPrice * myPlan.max_members - myPlan.monthly_cost) * 12) : 0
    const savingsPercent = Math.round((personalMonthlySavings / individualSpotifyPrice) * 100)

    const userDebtCount = calculateUserDebt(user?.id, payments)

    return (
        <div className="min-h-screen bg-[#0B0B0F] text-zinc-100 p-4 sm:p-8 font-sans relative overflow-hidden">
            {/* Sfondi con bagliori ambientali */}
            <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-green-500/10 blur-[130px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-indigo-500/10 blur-[130px] rounded-full pointer-events-none"></div>

            <div className="max-w-5xl mx-auto relative z-10">
                {/* BANNER NOTIFICA SCADENZA / SOLLECITO ADMIN */}
                {deadline.isReminderActive && (
                    <div className="mb-8 bg-amber-500/10 border border-amber-500/30 p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse backdrop-blur-xl shadow-xl shadow-amber-500/5">
                        <div className="flex items-center gap-4">
                            <span className="text-3xl">🔔</span>
                            <div>
                                <p className="font-black tracking-tight text-amber-400 text-sm uppercase">Scadenza Spotify Imminente</p>
                                <p className="text-xs text-zinc-300 leading-relaxed">
                                    Il rinnovo del piano è tra <span className="font-bold text-amber-300">{deadline.daysLeft} {deadline.daysLeft === 1 ? 'giorno' : 'giorni'}</span> ({deadline.dateString}). Assicurati che tutti abbiano saldato!
                                </p>
                            </div>
                        </div>
                        {userRole !== 'admin' && (
                            <button
                                onClick={sendWhatsAppAdminReminder}
                                className="inline-flex items-center justify-center gap-2 bg-[#25D366]/20 border border-[#25D366]/40 text-[#25D366] hover:bg-[#25D366] hover:text-black font-bold text-xs px-4 py-2.5 rounded-full transition-all active:scale-95 shadow-lg whitespace-nowrap"
                                title="Invia un sollecito cordiale all'amministratore del gruppo su WhatsApp"
                            >
                                <span>💬</span> Ricorda all&apos;Admin su WhatsApp
                            </button>
                        )}
                    </div>
                )}

                {/* HEADER CON LOGO SPOTISHARE E AZIONI RAPIDE */}
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10 border-b border-white/10 pb-6">
                    <div className="flex items-center gap-3">
                        <img src="/icon.svg" alt="SpotiShare Logo" className="w-10 h-10 drop-shadow-[0_0_15px_rgba(29,185,84,0.5)] transition-transform hover:scale-110" />
                        <div>
                            <h1 className="text-3xl font-black tracking-tighter bg-gradient-to-r from-[#1DB954] to-[#1ed760] bg-clip-text text-transparent">
                                SpotiShare
                            </h1>
                            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
                                Family Sharing Hub
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center flex-wrap gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        {/* TASTO INSTALLAZIONE PWA */}
                        {!isAppInstalled && (
                            <button
                                onClick={handleInstallPWA}
                                className="inline-flex items-center gap-1.5 bg-white/5 border border-white/15 hover:border-green-500/50 hover:bg-green-500/10 text-zinc-200 hover:text-green-400 text-xs font-bold px-3.5 py-2 rounded-full transition-all active:scale-95 shadow-sm"
                                title="Installa SpotiShare come App nativa sul tuo dispositivo"
                            >
                                <span>📲</span>
                                <span>Installa App</span>
                            </button>
                        )}

                        {user && (
                            <div className="text-right flex items-center gap-3">
                                <div className="text-right">
                                    <p className="font-bold flex items-center justify-end gap-2 text-zinc-100 text-sm">
                                        <a href="/profile" className="hover:text-green-400 transition-colors">
                                            {user.user_metadata?.full_name || 'Utente'}
                                        </a>
                                        {userRole === 'admin' && (
                                            <span className="bg-red-500/20 text-red-400 text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest font-bold border border-red-500/30">Admin</span>
                                        )}
                                    </p>
                                    <p className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500 flex items-center justify-end gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> {dbStatus}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </header>

                <main>
                    {userPlanId && myPlan ? (
                        <>
                            {/* GRIGLIA PRINCIPALE: CASSA UTENTE + MEMBRI */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                                {/* CARD 1: LA TUA CASSA PERSONALE */}
                                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-6 sm:p-8 relative overflow-hidden flex flex-col justify-between shadow-[0_0_40px_-10px_rgba(29,185,84,0.25)] ring-1 ring-white/5">
                                    <div className={"absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20 " + (deadline.daysLeft <= 4 ? 'bg-red-500' : 'bg-green-500')}></div>
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-center mb-6">
                                            <h2 className="text-xl font-extrabold tracking-tight text-zinc-100 flex items-center gap-2">
                                                <span>💳</span> La tua Cassa
                                            </h2>
                                            <span className="text-[10px] uppercase tracking-widest font-bold bg-white/10 px-3 py-1 rounded-full text-zinc-300 border border-white/10">
                                                Totale Versato: €{totalUserPaid.toFixed(2)}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-6 sm:gap-8 mb-8">
                                            <div className="relative flex items-center justify-center w-28 h-28 shrink-0">
                                                <svg className="w-full h-full transform -rotate-90">
                                                    <circle cx="56" cy="56" r={ringRadius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/10" />
                                                    <circle cx="56" cy="56" r={ringRadius} stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className={" " + (deadline.daysLeft <= 4 ? 'text-red-500' : 'text-green-500') + " transition-all duration-1000 ease-in-out"} />
                                                </svg>
                                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                    <span className={"text-3xl sm:text-4xl font-black " + (deadline.daysLeft <= 4 ? 'text-red-400' : 'text-zinc-100')}>
                                                        {deadline.daysLeft}
                                                    </span>
                                                    <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-500">Giorni</span>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500 mb-1">Prossimo Rinnovo</p>
                                                <p className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-100">{deadline.dateString}</p>
                                                <p className="text-xs text-green-400 mt-1 font-semibold">Quota mensile: €{(myPlan.monthly_cost / myPlan.max_members).toFixed(2)}</p>
                                            </div>
                                        </div>

                                        {/* STATO DEBITI PERSONALI */}
                                        <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md flex items-center justify-between">
                                            <div>
                                                <span className="text-[10px] uppercase tracking-widest font-semibold text-zinc-400 block">Stato Quote Personali</span>
                                                <span className={"text-sm font-bold " + (userDebtCount > 0 ? 'text-amber-400' : 'text-green-400')}>
                                                    {userDebtCount > 0
                                                        ? `⚠️ Mancano ${userDebtCount} quota/e da saldare`
                                                        : 'Tutto in regola ✅'}
                                                </span>
                                            </div>
                                            {userRole !== 'admin' && (
                                                <button
                                                    onClick={sendWhatsAppAdminReminder}
                                                    className="p-2 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-black rounded-xl transition-all text-xs font-bold flex items-center gap-1 border border-[#25D366]/30"
                                                    title="Invia promemoria rinnovo all'amministratore"
                                                >
                                                    <span>💬</span> Sollecita Admin
                                                </button>
                                            )}
                                        </div>

                                        {/* FORM REGISTRAZIONE PAGAMENTO */}
                                        <div className="space-y-4 pt-4 border-t border-white/10">
                                            <div className="flex flex-col gap-2">
                                                <label className="text-[10px] uppercase tracking-widest font-semibold text-zinc-400">Seleziona mese da saldare:</label>
                                                <div className="flex gap-2">
                                                    <select value={selectedTargetMonth} onChange={(e) => setSelectedTargetMonth(Number(e.target.value))} className="flex-grow bg-black/40 border border-white/10 text-zinc-100 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-green-500/50 transition-all">
                                                        {mesi.map((m, i) => <option key={i} value={i} className="bg-[#0B0B0F]">{m}</option>)}
                                                    </select>
                                                    <select value={selectedTargetYear} onChange={(e) => setSelectedTargetYear(Number(e.target.value))} className="w-28 bg-black/40 border border-white/10 text-zinc-100 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-green-500/50 transition-all">
                                                        {availableYears.map(year => (<option key={year} value={year} className="bg-[#0B0B0F]">{year}</option>))}
                                                    </select>
                                                </div>
                                            </div>
                                            <button onClick={requestPayment} disabled={isPaying} className="relative group w-full bg-gradient-to-r from-[#1DB954] to-[#1ed760] text-black font-extrabold rounded-2xl px-6 py-4 shadow-[0_0_20px_rgba(29,185,84,0.35)] hover:shadow-[0_0_30px_rgba(29,185,84,0.6)] transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 overflow-hidden text-sm">
                                                <div className="absolute inset-0 animate-shimmer pointer-events-none"></div>
                                                <span className="relative z-10 uppercase tracking-tight flex items-center justify-center gap-2">
                                                    <span>💸</span>
                                                    {isPaying ? 'ELABORAZIONE...' : 'REGISTRA PAGAMENTO ' + mesiCorti[selectedTargetMonth].toUpperCase() + ' ' + selectedTargetYear}
                                                </span>
                                            </button>
                                        </div>

                                        {/* STATUS MESI DELL'ANNO */}
                                        <h3 className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mt-8 mb-3 border-b border-white/10 pb-2">Status Pagamenti {selectedTargetYear}</h3>
                                        <div className="flex overflow-x-auto pb-2 gap-2 custom-scrollbar snap-x">
                                            {mesiCorti.map((mese, index) => {
                                                const isPaid = checkMonthPaid(index, selectedTargetYear, payments);
                                                const isCurrentMonth = new Date().getMonth() === index && currentYear === selectedTargetYear;
                                                return (
                                                    <div key={mese} className={"snap-start min-w-[70px] p-2.5 rounded-2xl border text-center flex flex-col items-center justify-center transition-all " + (isPaid ? 'bg-green-500/15 text-green-400 border-green-500/30 font-bold' : isCurrentMonth ? 'animate-pulse bg-amber-500/15 text-amber-400 border-amber-500/40 font-bold' : 'bg-white/5 text-zinc-500 border-white/5')}>
                                                        <span className="text-[9px] uppercase font-bold mb-1">{mese}</span>
                                                        <span className="text-base">{isPaid ? '✅' : isCurrentMonth ? '🔔' : '⏳'}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* COLONNA DESTRA: MEMBRI DEL GRUPPO + SOLLECITI WHATSAPP */}
                                <div className="flex flex-col gap-6">
                                    <div>
                                        <div className="flex justify-between items-center mb-4">
                                            <h2 className="text-2xl font-extrabold tracking-tight text-zinc-100 flex items-center gap-2">
                                                <span>👥</span> Membri del Gruppo
                                            </h2>
                                            <span className="text-xs text-zinc-400 font-semibold bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                                                {members.length} / {myPlan.max_members} Membri
                                            </span>
                                        </div>

                                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-3 shadow-xl ring-1 ring-white/5">
                                            <ul className="divide-y divide-white/10">
                                                {members.map((member) => {
                                                    const memberDebt = calculateUserDebt(member.id, allGroupPayments.length > 0 ? allGroupPayments : payments)
                                                    const isMemberAdmin = member.role === 'admin'
                                                    return (
                                                        <li key={member.id} className="p-3.5 flex items-center gap-3.5 hover:bg-white/5 transition-all rounded-2xl group">
                                                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-white/10 to-white/5 border border-white/15 text-green-400 flex items-center justify-center font-black text-lg shadow-inner shrink-0 group-hover:scale-105 transition-transform">
                                                                {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                                                            </div>
                                                            <div className="flex-grow min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <p className="font-bold text-zinc-100 text-sm truncate">
                                                                        {member.name}
                                                                    </p>
                                                                    {member.id === user?.id && (
                                                                        <span className="text-green-400 text-[9px] border border-green-400/50 bg-green-500/10 px-2 py-0.5 rounded-full uppercase tracking-widest font-bold">Tu</span>
                                                                    )}
                                                                    {isMemberAdmin && (
                                                                        <span className="text-red-400 text-[9px] border border-red-500/40 bg-red-500/10 px-2 py-0.5 rounded-full uppercase tracking-widest font-bold">Admin</span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <p className="text-zinc-400 text-xs truncate">{member.email}</p>
                                                                    {memberDebt > 0 ? (
                                                                        <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 shrink-0">
                                                                            Mancano {memberDebt} {memberDebt === 1 ? 'mese' : 'mesi'}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-[10px] text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded-md border border-green-500/20 shrink-0">
                                                                            Regolare ✅
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* AZIONI MEMBRO: SOLLECITO WHATSAPP E RIMOZIONE */}
                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                {userRole === 'admin' && member.id !== user?.id && memberDebt > 0 && (
                                                                    <button
                                                                        onClick={() => sendWhatsAppMemberReminder(member, memberDebt, (myPlan.monthly_cost / myPlan.max_members).toFixed(2))}
                                                                        className="p-2 bg-[#25D366]/15 hover:bg-[#25D366] text-[#25D366] hover:text-black rounded-xl transition-all border border-[#25D366]/30"
                                                                        title="Invia sollecito quota su WhatsApp"
                                                                    >
                                                                        💬
                                                                    </button>
                                                                )}
                                                                {userRole === 'admin' && member.id !== user?.id && (
                                                                    <button
                                                                        onClick={() => removeMember(member.id, member.name)}
                                                                        className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20"
                                                                        title="Rimuovi dal gruppo"
                                                                    >
                                                                        🗑️
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </li>
                                                    )
                                                })}
                                            </ul>
                                        </div>
                                    </div>

                                    {/* INVITO NUOVI MEMBRI */}
                                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-xl ring-1 ring-white/5">
                                        <h3 className="font-extrabold text-sm mb-1 text-zinc-100 flex items-center gap-2">
                                            <span>🔗</span> Invita nuovi Membri
                                        </h3>
                                        <p className="text-xs text-zinc-400 mb-3">Condividi questo link per far unire un amico al gruppo.</p>
                                        <div className="flex items-center gap-2 bg-black/40 p-2.5 rounded-2xl border border-white/10">
                                            <code className="flex-grow text-green-400 font-mono text-xs truncate px-1">
                                                {typeof window !== 'undefined' ? `${window.location.origin}/join/${myPlan?.invite_code || 'generazione...'}` : ''}
                                            </code>
                                            <button
                                                onClick={async () => {
                                                    let code = myPlan?.invite_code;
                                                    if (!code) {
                                                        showToast("Generazione codice in corso...", "info");
                                                        code = await ensureInviteCode(myPlan);
                                                    }
                                                    if (!code) {
                                                        showToast("Errore nella generazione del codice", "error");
                                                        return;
                                                    }
                                                    navigator.clipboard.writeText(`${window.location.origin}/join/${code}`);
                                                    showToast("Link d'invito copiato negli appunti!", "success");
                                                    triggerConfetti();
                                                    setPlans(prev => prev.map(p => p.id === myPlan?.id ? { ...p, invite_code: code } : p));
                                                }}
                                                className="bg-green-500 text-black text-xs font-bold px-4 py-2 rounded-xl hover:bg-green-400 transition-all active:scale-95 shadow-md shrink-0"
                                            >
                                                Copia Link
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SEZIONE 2: WIDGET RISPARMIO COLLETTIVO + PLAYLIST DEL GRUPPO */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                                {/* CARD RISPARMIO COLLETTIVO */}
                                <div className="bg-gradient-to-br from-green-950/20 via-white/5 to-white/5 backdrop-blur-xl border border-green-500/20 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden ring-1 ring-green-500/20">
                                    <div className="absolute top-0 right-0 w-36 h-36 bg-green-500/10 blur-2xl rounded-full pointer-events-none"></div>

                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <span className="text-[10px] uppercase tracking-widest font-black text-green-400 bg-green-500/15 border border-green-500/30 px-3 py-1 rounded-full inline-block mb-2">
                                                💰 Risparmio Attivo: -{savingsPercent}%
                                            </span>
                                            <h3 className="text-xl font-extrabold text-zinc-100 tracking-tight">
                                                Impatto Economico Gruppo
                                            </h3>
                                        </div>
                                        <span className="text-3xl">🎉</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="bg-black/40 border border-white/10 rounded-2xl p-4">
                                            <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-1">Il tuo risparmio / mese</p>
                                            <p className="text-2xl font-black text-green-400">~€{personalMonthlySavings.toFixed(2)}</p>
                                            <p className="text-[11px] text-zinc-400 mt-1">vs €{individualSpotifyPrice}/m Spotify Singolo</p>
                                        </div>
                                        <div className="bg-black/40 border border-white/10 rounded-2xl p-4">
                                            <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-1">Il tuo risparmio / anno</p>
                                            <p className="text-2xl font-black text-zinc-100">~€{personalAnnualSavings.toFixed(2)}</p>
                                            <p className="text-[11px] text-zinc-400 mt-1">in tasca ogni anno</p>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">⚡</span>
                                            <div>
                                                <p className="text-xs font-bold text-zinc-200">Risparmio collettivo totale annuo del gruppo:</p>
                                                <p className="text-lg font-black text-green-400">Oltre €{groupAnnualSavings.toFixed(2)} risparmiati!</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* CARD PLAYLIST CONDIVISA DEL GRUPPO (SPOTIFY EMBED HUB) */}
                                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl ring-1 ring-white/5 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl">🎵</span>
                                                <h3 className="text-lg font-extrabold text-zinc-100 tracking-tight">
                                                    Hub Playlist Condivisa
                                                </h3>
                                            </div>
                                            <button
                                                onClick={() => setIsEditingPlaylist(!isEditingPlaylist)}
                                                className="text-xs text-green-400 hover:text-green-300 font-bold transition-colors bg-white/5 border border-white/10 px-3 py-1.5 rounded-full"
                                            >
                                                {isEditingPlaylist ? 'Chiudi' : '⚙️ Cambia Link'}
                                            </button>
                                        </div>

                                        {isEditingPlaylist && (
                                            <div className="mb-4 p-4 bg-black/50 border border-white/10 rounded-2xl animate-in fade-in duration-200">
                                                <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-2 block">
                                                    Incolla URL Playlist / Album Spotify:
                                                </label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder="https://open.spotify.com/playlist/..."
                                                        value={customPlaylistInput}
                                                        onChange={(e) => setCustomPlaylistInput(e.target.value)}
                                                        className="flex-grow bg-white/5 border border-white/10 text-xs text-zinc-100 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-green-500/50"
                                                    />
                                                    <button
                                                        onClick={() => saveCustomPlaylist()}
                                                        className="bg-green-500 text-black text-xs font-bold px-4 py-2 rounded-xl hover:bg-green-400 transition-all shrink-0"
                                                    >
                                                        Salva
                                                    </button>
                                                </div>
                                                {/* PRESET RAPIDI */}
                                                <div className="flex gap-2 mt-3 flex-wrap">
                                                    <button onClick={() => saveCustomPlaylist('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M')} className="text-[10px] bg-white/5 hover:bg-white/10 text-zinc-300 px-2.5 py-1 rounded-lg border border-white/5">🔥 Top Hits</button>
                                                    <button onClick={() => saveCustomPlaylist('https://open.spotify.com/playlist/37i9dQZF1DX4WYpdgoIcn6')} className="text-[10px] bg-white/5 hover:bg-white/10 text-zinc-300 px-2.5 py-1 rounded-lg border border-white/5">☕ Chill Vibes</button>
                                                    <button onClick={() => saveCustomPlaylist('https://open.spotify.com/playlist/37i9dQZF1DXa2PvU927x81')} className="text-[10px] bg-white/5 hover:bg-white/10 text-zinc-300 px-2.5 py-1 rounded-lg border border-white/5">🚗 Road Trip</button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black/40">
                                            <iframe
                                                src={getSpotifyEmbedUrl(playlistUrl)}
                                                width="100%"
                                                height="152"
                                                frameBorder="0"
                                                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                                loading="lazy"
                                                className="w-full"
                                            ></iframe>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-zinc-500 text-center mt-3">
                                        Ascolta e condividi la musica direttamente con i membri del gruppo.
                                    </p>
                                </div>
                            </div>

                            {/* SEZIONE STORICO PAGAMENTI PERSONALE (SE USER) CON ESPORTAZIONE CSV */}
                            {userRole !== 'admin' && (
                                <div className="mb-12 bg-white/5 backdrop-blur-xl border border-white/10 p-6 sm:p-8 rounded-3xl shadow-xl">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                                        <h3 className="text-xl font-extrabold text-zinc-100 flex items-center gap-2">
                                            <span>📜</span> Storico dei Tuoi Pagamenti
                                        </h3>
                                        <button
                                            onClick={exportPaymentsCSV}
                                            className="inline-flex items-center gap-2 bg-white/5 border border-white/15 hover:border-green-500/50 hover:bg-green-500/10 text-zinc-200 hover:text-green-400 text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95 shadow-sm"
                                        >
                                            <span>📥</span> Esporta Report CSV
                                        </button>
                                    </div>
                                    {payments.length > 0 ? (
                                        <ul className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                            {payments.map(payment => (
                                                <li key={payment.id} className="flex justify-between items-center text-sm bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-zinc-200">Ricevuta di versamento</span>
                                                        <span className="text-[10px] text-zinc-500">Data: {new Date(payment.payment_date).toLocaleDateString('it-IT')}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[9px] font-bold text-green-400 bg-green-500/10 px-2.5 py-1 rounded-md border border-green-500/20 uppercase tracking-widest">
                                                            {payment.target_month !== null && payment.target_month !== undefined ? mesiCorti[payment.target_month] : 'N/D'} {payment.target_year || ''}
                                                        </span>
                                                        <span className="text-green-400 font-black">€{payment.amount.toFixed(2)}</span>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-xs text-zinc-500 text-center p-4 bg-white/5 rounded-2xl border border-white/5">Nessun pagamento registrato finora.</p>
                                    )}
                                </div>
                            )}

                            {/* SEZIONE AMMINISTRATORE (SOLO PER ADMIN) */}
                            {userRole === 'admin' && (
                                <div className="mt-8 pt-12 border-t border-white/10">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                                        <h2 className="text-2xl font-black tracking-tight text-red-400 flex items-center gap-3">
                                            <span className="p-2.5 bg-red-500/20 rounded-2xl border border-red-500/30">🛡️</span> Pannello Amministratore
                                        </h2>
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <button
                                                onClick={exportPaymentsCSV}
                                                className="inline-flex items-center gap-2 bg-white/5 border border-white/15 hover:border-green-500/50 hover:bg-green-500/10 text-zinc-200 hover:text-green-400 text-xs font-bold px-4 py-2.5 rounded-2xl transition-all active:scale-95 shadow-lg"
                                                title="Scarica tutti gli incassi del gruppo in formato CSV per Excel/Numbers"
                                            >
                                                <span>📥</span> Esporta Report Fiscale/CSV
                                            </button>
                                            <div className="bg-white/5 border border-white/10 px-6 py-2.5 rounded-2xl backdrop-blur-md shadow-lg">
                                                <span className="text-[10px] uppercase tracking-widest font-semibold text-zinc-400 mr-3">Cassa Totale:</span>
                                                <span className="text-2xl font-black text-green-400">€{totalGroupPaid.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        {/* GESTIONE PIANO E INCASSO MANUALE */}
                                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 sm:p-8 rounded-3xl shadow-xl">
                                            <div className="flex justify-between items-center mb-6">
                                                <h3 className="font-extrabold text-lg text-zinc-100">Gestione Parametri Piano</h3>
                                                <button onClick={() => { setIsManagingPlan(!isManagingPlan); if(!isManagingPlan) { setPlanCost(myPlan?.monthly_cost.toString() || ''); setPlanMaxMembers(myPlan?.max_members.toString() || ''); } }} className="text-xs text-green-400 hover:text-green-300 font-semibold transition-colors bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                                                    {isManagingPlan ? 'Annulla' : 'Modifica'}
                                                </button>
                                            </div>
                                            {isManagingPlan ? (
                                                <div className="space-y-4">
                                                    <div className="flex flex-col gap-2">
                                                        <label className="text-[10px] uppercase tracking-widest font-semibold text-zinc-400">Costo Mensile Complessivo (€)</label>
                                                        <input type="number" value={planCost} onChange={(e) => setPlanCost(e.target.value)} className="bg-black/40 border border-white/10 text-zinc-100 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500/50 transition-all" />
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        <label className="text-[10px] uppercase tracking-widest font-semibold text-zinc-400">Membri Massimi</label>
                                                        <input type="number" value={planMaxMembers} onChange={(e) => setPlanMaxMembers(e.target.value)} className="bg-black/40 border border-white/10 text-zinc-100 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500/50 transition-all" />
                                                    </div>
                                                    <button onClick={updatePlanDetails} className="w-full bg-green-500 text-black font-bold py-3 rounded-xl hover:bg-green-400 transition-all active:scale-95 shadow-md">Salva Modifiche</button>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <div className="flex justify-between text-sm p-3.5 bg-black/30 rounded-2xl border border-white/5">
                                                        <span className="text-zinc-400">Costo Mensile Spotify:</span>
                                                        <span className="font-bold text-zinc-100">€{myPlan?.monthly_cost.toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm p-3.5 bg-black/30 rounded-2xl border border-white/5">
                                                        <span className="text-zinc-400">Posti Totali:</span>
                                                        <span className="font-bold text-zinc-100">{myPlan?.max_members}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* REGISTRAZIONE INCASSO MANUALE CONTANTI */}
                                            <div className="mt-8 pt-6 border-t border-white/10">
                                                <h3 className="font-extrabold text-base mb-1 text-zinc-100">Registra Incasso Manuale (Contanti)</h3>
                                                <p className="text-xs text-zinc-400 mb-4 leading-relaxed">Segna i pagamenti ricevuti a mano per il mese selezionato ({mesi[selectedTargetMonth]} {selectedTargetYear}).</p>
                                                <ul className="space-y-2.5">
                                                    {members.map(member => {
                                                        const memberDebt = calculateUserDebt(member.id, allGroupPayments)
                                                        return (
                                                            <li key={member.id} className="flex justify-between items-center bg-black/30 p-3.5 rounded-2xl border border-white/5 hover:border-green-500/30 transition-all group">
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold text-zinc-200 text-sm">{member.name}</span>
                                                                    {memberDebt > 0 && (
                                                                        <span className="text-[10px] text-amber-400">In sospeso: {memberDebt} quota/e</span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {memberDebt > 0 && (
                                                                        <button
                                                                            onClick={() => sendWhatsAppMemberReminder(member, memberDebt, (myPlan.monthly_cost / myPlan.max_members).toFixed(2))}
                                                                            className="text-xs bg-[#25D366]/15 hover:bg-[#25D366] text-[#25D366] hover:text-black font-bold p-2 rounded-xl transition-all border border-[#25D366]/30"
                                                                            title="Sollecita su WhatsApp"
                                                                        >
                                                                            💬
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        onClick={() => requestAdminAddPayment(member.id, member.name)}
                                                                        className="text-xs bg-transparent border border-green-500/50 text-green-400 font-bold px-3 py-1.5 rounded-xl hover:bg-green-500 hover:text-black transition-all active:scale-95"
                                                                    >
                                                                        + Segna Pagato
                                                                    </button>
                                                                </div>
                                                            </li>
                                                        )
                                                    })}
                                                </ul>
                                            </div>
                                        </div>

                                        {/* STORICO GENERALE DI TUTTI I PAGAMENTI */}
                                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col justify-between">
                                            <div>
                                                <div className="flex justify-between items-center mb-4">
                                                    <h3 className="font-extrabold text-lg text-zinc-100 flex items-center gap-2">
                                                        <span>📋</span> Registro Transazioni
                                                    </h3>
                                                    <span className="text-xs text-zinc-400 font-semibold">
                                                        {allGroupPayments.length} registrati
                                                    </span>
                                                </div>

                                                {allGroupPayments.length > 0 ? (
                                                    <ul className="space-y-2.5 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                                                        {allGroupPayments.map(payment => (
                                                            <li key={payment.id} className="flex justify-between items-center text-sm bg-black/30 p-3.5 rounded-2xl border border-white/5 hover:border-white/15 transition-all group">
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold text-zinc-200">{payment.users?.name || 'Utente'}</span>
                                                                    <span className="text-[10px] text-zinc-500">Data: {new Date(payment.payment_date).toLocaleDateString('it-IT')}</span>
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-[9px] font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded-md border border-green-500/20 uppercase tracking-widest">
                                                                        {payment.target_month !== null && payment.target_month !== undefined ? mesiCorti[payment.target_month] : 'N/D'} {payment.target_year || ''}
                                                                    </span>
                                                                    <span className="text-green-400 font-black text-sm">€{payment.amount.toFixed(2)}</span>
                                                                    <button
                                                                        onClick={() => requestDeletePayment(payment.id)}
                                                                        className="text-red-400 bg-red-500/10 p-1.5 rounded-xl hover:bg-red-500 hover:text-white transition-all opacity-40 group-hover:opacity-100"
                                                                        title="Annulla incasso"
                                                                    >
                                                                        🗑️
                                                                    </button>
                                                                </div>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="text-xs text-zinc-500 text-center p-6 bg-black/30 rounded-2xl border border-white/5">Nessun incasso registrato nel gruppo finora.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            {loadingPlans ? (
                                <>
                                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-3xl mb-4 animate-bounce">⏳</div>
                                    <p className="text-zinc-400 font-medium">Sincronizzazione dashboard...</p>
                                </>
                            ) : (
                                <>
                                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-3xl mb-4">❌</div>
                                    <p className="text-zinc-400 font-medium">Nessun piano associato trovato.</p>
                                </>
                            )}
                            {(!userPlanId) && (
                                <div className="mt-6 p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md max-w-md w-full shadow-2xl">
                                    <h3 className="text-xl font-bold text-zinc-100 mb-2">Inizia con SpotiShare</h3>
                                    <p className="text-sm text-zinc-400 mb-6">Non sei ancora associato a nessun gruppo. Puoi crearne uno nuovo come amministratore oppure unirti a uno esistente con un codice invito.</p>
                                    <div className="flex flex-col gap-4">
                                        <div className="flex gap-3">
                                            <div className="flex-grow text-left">
                                                <label className="text-[10px] uppercase tracking-widest font-semibold text-zinc-400 ml-1">Costo Mensile (€)</label>
                                                <input type="number" placeholder="es. 17.99" id="newPlanCost" className="w-full bg-black/40 border border-white/10 text-zinc-100 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500/50 text-sm" />
                                            </div>
                                            <div className="w-32 text-left">
                                                <label className="text-[10px] uppercase tracking-widest font-semibold text-zinc-400 ml-1">Membri Max</label>
                                                <input type="number" placeholder="6" id="newPlanMax" className="w-full bg-black/40 border border-white/10 text-zinc-100 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500/50 text-sm" />
                                            </div>
                                        </div>
                                        <button onClick={async () => { const cost = parseFloat((document.getElementById('newPlanCost') as HTMLInputElement).value); const max = parseInt((document.getElementById('newPlanMax') as HTMLInputElement).value); if (isNaN(cost) || isNaN(max)) { showToast("Inserisci valori validi", "error"); return; } await createPlan(cost, max); }} className="bg-gradient-to-r from-[#1DB954] to-[#1ed760] text-black font-extrabold py-3.5 rounded-xl hover:scale-[1.02] transition-all shadow-lg shadow-green-500/20 text-sm uppercase">Crea Gruppo Ora</button>
                                        <div className="relative py-2">
                                            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10"></span></div>
                                            <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#0B0B0F] px-2 text-zinc-500">Oppure</span></div>
                                        </div>
                                        <a href="/join" className="text-center bg-white/5 border border-white/10 text-zinc-300 font-bold py-3 rounded-xl hover:bg-white/10 transition-all active:scale-95 text-sm">Ho un codice invito</a>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>

            {/* MODALE DI CONFERMA UNIVERSALE */}
            {confirmModal && confirmModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
                    <div className="bg-[#121218] border border-white/15 rounded-3xl p-6 shadow-2xl max-w-md w-full ring-1 ring-white/10 relative overflow-hidden animate-in zoom-in-95 duration-150">
                        <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                            confirmModal.title.toLowerCase().includes('rimuovi') ||
                            confirmModal.title.toLowerCase().includes('annulla') ||
                            confirmModal.title.toLowerCase().includes('elimina')
                                ? 'bg-gradient-to-r from-red-500 to-rose-600'
                                : 'bg-gradient-to-r from-[#1DB954] to-[#1ed760]'
                        }`}></div>
                        <h3 className="text-xl font-extrabold text-zinc-100 mb-2">
                            {confirmModal.title}
                        </h3>
                        <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                            {confirmModal.message}
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setConfirmModal(null)}
                                className="px-5 py-2.5 rounded-xl border border-white/10 text-zinc-300 hover:text-white hover:bg-white/5 font-semibold text-sm transition-all active:scale-95"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={() => {
                                    confirmModal.action()
                                }}
                                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95 ${
                                    confirmModal.title.toLowerCase().includes('rimuovi') ||
                                    confirmModal.title.toLowerCase().includes('annulla') ||
                                    confirmModal.title.toLowerCase().includes('elimina')
                                        ? 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/20'
                                        : 'bg-gradient-to-r from-[#1DB954] to-[#1ed760] text-black shadow-green-500/20 hover:scale-[1.02]'
                                }`}
                            >
                                Conferma
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODALE ISTRUZIONI INSTALLAZIONE IOS PWA */}
            {showIOSInstallModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
                    <div className="bg-[#121218] border border-white/15 rounded-3xl p-6 shadow-2xl max-w-sm w-full relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#1DB954] to-[#1ed760]"></div>
                        <div className="text-center mb-4">
                            <span className="text-4xl mb-2 inline-block">📲</span>
                            <h3 className="text-xl font-black text-zinc-100">Installa su iPhone / iPad</h3>
                        </div>
                        <ol className="text-xs text-zinc-300 space-y-3 mb-6 list-decimal list-inside bg-white/5 p-4 rounded-2xl border border-white/5 leading-relaxed">
                            <li>Tocca il pulsante <strong>Condividi</strong> (icona del quadrato con la freccia verso l&apos;alto ⎋) in fondo a Safari.</li>
                            <li>Scorri verso il basso e tocca <strong>&quot;Aggiungi alla schermata Home&quot;</strong>.</li>
                            <li>Tocca <strong>Aggiungi</strong> in alto a destra. Fatto! 🚀</li>
                        </ol>
                        <button
                            onClick={() => setShowIOSInstallModal(false)}
                            className="w-full bg-gradient-to-r from-[#1DB954] to-[#1ed760] text-black font-bold py-3 rounded-xl hover:scale-[1.02] transition-all text-sm"
                        >
                            Ho capito
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
