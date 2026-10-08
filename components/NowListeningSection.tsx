'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useToast } from './ToastContext';

export interface Member {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  spotify_id?: string;
  [key: string]: any;
}

interface TrackData {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationSec: number;
  coverUrl: string;
  spotifyUrl: string;
  genre: string;
  audioTheme: 'energetic' | 'chill' | 'lofi' | 'pop' | 'electronic';
}

export interface MemberActivity {
  memberId: string;
  memberName: string;
  memberEmail: string;
  isSelf: boolean;
  isPlaying: boolean;
  track: TrackData;
  progressSec: number;
  lastPlayedText: string;
  device: string;
}

const DEFAULT_TRACK_CATALOG: TrackData[] = [
  {
    id: '100-messaggi',
    title: '100 MESSAGGI',
    artist: 'Lazza',
    album: 'LOCURA',
    durationSec: 245,
    coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&auto=format&fit=crop&q=80',
    spotifyUrl: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
    genre: 'Rap Italiano',
    audioTheme: 'energetic'
  },
  {
    id: 'birds-of-a-feather',
    title: 'BIRDS OF A FEATHER',
    artist: 'Billie Eilish',
    album: 'HIT ME HARD AND SOFT',
    durationSec: 190,
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80',
    spotifyUrl: 'https://open.spotify.com/track/6dOtVTDmMPgnemIRdpkVJF',
    genre: 'Indie Pop',
    audioTheme: 'chill'
  },
  {
    id: 'espresso',
    title: 'Espresso',
    artist: 'Sabrina Carpenter',
    album: 'Short n\' Sweet',
    durationSec: 175,
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80',
    spotifyUrl: 'https://open.spotify.com/track/2HRgqmZQC00umik87XENrr',
    genre: 'Dance Pop',
    audioTheme: 'pop'
  },
  {
    id: 'blinding-lights',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    album: 'After Hours',
    durationSec: 200,
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80',
    spotifyUrl: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b',
    genre: 'Synthwave',
    audioTheme: 'electronic'
  },
  {
    id: 'tuta-gold',
    title: 'TUTA GOLD',
    artist: 'Mahmood',
    album: 'NEI LETTI DEGLI ALTRI',
    durationSec: 185,
    coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&auto=format&fit=crop&q=80',
    spotifyUrl: 'https://open.spotify.com/track/0c5vM5s6x9fT7tH6a5q3jK',
    genre: 'Urban Pop',
    audioTheme: 'energetic'
  },
  {
    id: 'die-with-a-smile',
    title: 'Die With A Smile',
    artist: 'Lady Gaga, Bruno Mars',
    album: 'Die With A Smile',
    durationSec: 251,
    coverUrl: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=300&auto=format&fit=crop&q=80',
    spotifyUrl: 'https://open.spotify.com/track/2plbrEY59IikOBB0PD7xSu',
    genre: 'Pop Ballad',
    audioTheme: 'chill'
  },
  {
    id: 'il-male-che-mi-fai',
    title: 'IL MALE CHE MI FAI',
    artist: 'Geolier feat. Marracash',
    album: 'Il Coraggio dei Bambini',
    durationSec: 214,
    coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&auto=format&fit=crop&q=80',
    spotifyUrl: 'https://open.spotify.com/track/1X45vY53H2uP87sD9yT8q9',
    genre: 'Rap Napoletano',
    audioTheme: 'energetic'
  },
  {
    id: 'sinceramente',
    title: 'Sinceramente',
    artist: 'Annalisa',
    album: 'E poi siamo finiti nel vortice',
    durationSec: 215,
    coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&auto=format&fit=crop&q=80',
    spotifyUrl: 'https://open.spotify.com/track/7lPN2DXiMsVn9Xq2E3H5Q7',
    genre: 'Italo Pop',
    audioTheme: 'pop'
  }
];

const DEVICES = [
  'Spotify su iPhone',
  'Spotify Desktop (Mac)',
  'Spotify Connect (Sonos)',
  'Spotify su Android',
  'Spotify Web Player',
  'Amazon Echo / Alexa'
];

interface Props {
  members: Member[];
  currentUser: any;
  planId: string | null;
  onTriggerConfetti?: () => void;
}

export default function NowListeningSection({
  members,
  currentUser,
  planId,
  onTriggerConfetti
}: Props) {
  const { showToast } = useToast();
  const [activities, setActivities] = useState<MemberActivity[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'playing' | 'paused'>('all');
  const [previewingMemberId, setPreviewingMemberId] = useState<string | null>(null);
  const [showSongPickerModal, setShowSongPickerModal] = useState(false);
  const [customSongTitle, setCustomSongTitle] = useState('');
  const [customSongArtist, setCustomSongArtist] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const audioContextRef = useRef<AudioContext | null>(null);
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize and persist member listening states
  useEffect(() => {
    if (!members || members.length === 0) return;

    const storageKey = `spotishare_now_playing_${planId || 'default'}`;
    let savedState: Record<string, any> = {};
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) savedState = JSON.parse(raw);
      } catch (e) {
        console.error('Error loading saved listening state:', e);
      }
    }

    const newActivities: MemberActivity[] = members.map((member, index) => {
      const isSelf = member.id === currentUser?.id;
      const cached = savedState[member.id];

      if (cached && cached.track) {
        return {
          memberId: member.id,
          memberName: member.name || (isSelf ? 'Tu' : `Membro #${index + 1}`),
          memberEmail: member.email || '',
          isSelf,
          isPlaying: typeof cached.isPlaying === 'boolean' ? cached.isPlaying : index % 2 === 0,
          track: cached.track,
          progressSec: cached.progressSec || Math.floor(Math.random() * 80) + 15,
          lastPlayedText: cached.lastPlayedText || (index % 2 === 0 ? 'In ascolto ora' : '15 min fa'),
          device: cached.device || DEVICES[index % DEVICES.length]
        };
      }

      // Default deterministic assignment
      const track = DEFAULT_TRACK_CATALOG[index % DEFAULT_TRACK_CATALOG.length];
      const isPlaying = index % 3 !== 2; // 2 out of 3 members playing
      const initialProgress = Math.floor(Math.random() * (track.durationSec - 40)) + 20;

      return {
        memberId: member.id,
        memberName: member.name || (isSelf ? 'Tu' : `Membro #${index + 1}`),
        memberEmail: member.email || '',
        isSelf,
        isPlaying,
        track,
        progressSec: initialProgress,
        lastPlayedText: isPlaying ? 'In ascolto ora' : `${(index + 1) * 7} min fa`,
        device: DEVICES[index % DEVICES.length]
      };
    });

    setActivities(newActivities);
  }, [members, currentUser, planId]);

  // Live timer to advance progress bars smoothly every second
  useEffect(() => {
    const interval = setInterval(() => {
      setActivities((prev) =>
        prev.map((act) => {
          if (!act.isPlaying) return act;
          const nextSec = act.progressSec + 1;
          if (nextSec >= act.track.durationSec) {
            // Loop back to start
            return { ...act, progressSec: 0 };
          }
          return { ...act, progressSec: nextSec };
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Save changes to localStorage
  const persistActivities = (updatedList: MemberActivity[]) => {
    if (typeof window === 'undefined') return;
    const storageKey = `spotishare_now_playing_${planId || 'default'}`;
    const mapToSave: Record<string, any> = {};
    updatedList.forEach((a) => {
      mapToSave[a.memberId] = {
        isPlaying: a.isPlaying,
        track: a.track,
        progressSec: a.progressSec,
        lastPlayedText: a.lastPlayedText,
        device: a.device
      };
    });
    try {
      localStorage.setItem(storageKey, JSON.stringify(mapToSave));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  };

  // Micro-action: Ascolta Insieme / Sincronizza (Group Session)
  const handleSyncWithMember = (targetMember: MemberActivity) => {
    if (onTriggerConfetti) onTriggerConfetti();

    // Set current user's song to match target member's track
    setActivities((prev) => {
      const updated = prev.map((act) => {
        if (act.isSelf) {
          return {
            ...act,
            isPlaying: true,
            track: targetMember.track,
            progressSec: targetMember.progressSec,
            lastPlayedText: 'In ascolto ora',
            device: 'Spotify Group Session'
          };
        }
        return act;
      });
      persistActivities(updated);
      return updated;
    });

    showToast(
      `Sincronizzato con l'ascolto di ${targetMember.memberName}! Stai ascoltando "${targetMember.track.title}" insieme a lui.`,
      'success'
    );
  };

  // Micro-action: Toggle play/pause for user or simulation
  const handleTogglePlay = (memberId: string) => {
    setActivities((prev) => {
      const updated = prev.map((act) => {
        if (act.memberId === memberId) {
          const nextPlaying = !act.isPlaying;
          return {
            ...act,
            isPlaying: nextPlaying,
            lastPlayedText: nextPlaying ? 'In ascolto ora' : 'Poco fa'
          };
        }
        return act;
      });
      persistActivities(updated);
      return updated;
    });
  };

  // Micro-action: Interactive Melodic Sound Preview with Web Audio API
  const handlePlaySoundPreview = (member: MemberActivity) => {
    if (previewingMemberId === member.memberId) {
      // Stop preview
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      setPreviewingMemberId(null);
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
      return;
    }

    try {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      setPreviewingMemberId(member.memberId);

      // Create pleasant musical chord/riff
      const chords: Record<string, number[]> = {
        energetic: [261.63, 329.63, 392.0, 523.25], // C Major
        chill: [220.0, 261.63, 329.63, 440.0], // A Minor
        lofi: [174.61, 220.0, 261.63, 349.23], // F Major 7
        pop: [293.66, 369.99, 440.0, 587.33], // D Major
        electronic: [196.0, 246.94, 293.66, 392.0] // G Major
      };

      const notes = chords[member.track.audioTheme] || chords.pop;
      const now = ctx.currentTime;

      // Play arpeggio sequence
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = member.track.audioTheme === 'electronic' ? 'sawtooth' : 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.25);

        gain.gain.setValueAtTime(0, now + idx * 0.25);
        gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.25 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.25 + 1.8);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.25);
        osc.stop(now + idx * 0.25 + 2.0);
      });

      // Repeat rhythmically
      for (let bar = 1; bar < 4; bar++) {
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq * 1.5, now + bar * 1.2 + idx * 0.2);

          gain.gain.setValueAtTime(0, now + bar * 1.2 + idx * 0.2);
          gain.gain.linearRampToValueAtTime(0.08, now + bar * 1.2 + idx * 0.2 + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + bar * 1.2 + idx * 0.2 + 1.2);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + bar * 1.2 + idx * 0.2);
          osc.stop(now + bar * 1.2 + idx * 0.2 + 1.4);
        });
      }

      showToast(`Riproduzione anteprima audio per "${member.track.title}"`, 'info');

      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
      previewTimerRef.current = setTimeout(() => {
        setPreviewingMemberId(null);
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
      }, 6500);
    } catch (e) {
      console.error('Audio preview error:', e);
      showToast('Impossibile avviare anteprima audio.', 'error');
      setPreviewingMemberId(null);
    }
  };

  // Change self user track
  const handleSelectTrackForSelf = (track: TrackData) => {
    setActivities((prev) => {
      const updated = prev.map((act) => {
        if (act.isSelf) {
          return {
            ...act,
            isPlaying: true,
            track,
            progressSec: 0,
            lastPlayedText: 'In ascolto ora'
          };
        }
        return act;
      });
      persistActivities(updated);
      return updated;
    });

    setShowSongPickerModal(false);
    showToast(`La tua traccia attiva è ora "${track.title}" di ${track.artist}!`, 'success');
    if (onTriggerConfetti) onTriggerConfetti();
  };

  // Custom song manual submission
  const handleSetCustomSong = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSongTitle.trim()) return;

    const newTrack: TrackData = {
      id: `custom-${Date.now()}`,
      title: customSongTitle.trim(),
      artist: customSongArtist.trim() || 'Artista Preferito',
      album: 'Singolo / Playlist Personale',
      durationSec: 210,
      coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80',
      spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(customSongTitle.trim() + ' ' + customSongArtist.trim())}`,
      genre: 'Personal Track',
      audioTheme: 'energetic'
    };

    handleSelectTrackForSelf(newTrack);
    setCustomSongTitle('');
    setCustomSongArtist('');
  };

  // Filtered activities
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      if (filterMode === 'playing') return act.isPlaying;
      if (filterMode === 'paused') return !act.isPlaying;
      return true;
    });
  }, [activities, filterMode]);

  const currentlyPlayingCount = activities.filter((a) => a.isPlaying).length;

  return (
    <div className="w-full mt-6 bg-gradient-to-b from-white/[0.07] to-white/[0.02] backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl ring-1 ring-white/5 relative overflow-hidden transition-all">
      {/* Background Emerald Ambient Glow */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#1DB954]/15 rounded-full blur-[100px] pointer-events-none animate-pulse-slow"></div>
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Header with Title, Live Counter & Quick Actions */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div className="flex items-start sm:items-center gap-3.5">
          {/* Animated Vinyl Icon */}
          <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#1DB954] to-emerald-400 opacity-30 blur-md animate-pulse"></div>
            <div className="w-12 h-12 rounded-full bg-black border-2 border-white/20 flex items-center justify-center shadow-lg relative overflow-hidden animate-vinyl">
              <div className="absolute inset-1 rounded-full border border-white/10"></div>
              <div className="absolute inset-2.5 rounded-full border border-white/10"></div>
              <div className="w-4 h-4 rounded-full bg-[#1DB954] border-2 border-black flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-black"></div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-100 flex items-center gap-2">
                In Riproduzione nel Gruppo
              </h3>
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black bg-[#1DB954]/15 text-[#1DB954] border border-[#1DB954]/30 shadow-[0_0_12px_rgba(29,185,84,0.25)]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1DB954] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1DB954]"></span>
                </span>
                LIVE SPOTIFY
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Scopri cosa ascoltano i membri del gruppo in tempo reale e sincronizzati con 1-click.
            </p>
          </div>
        </div>

        {/* Filter and Personal Song Update */}
        <div className="flex items-center gap-2.5 flex-wrap sm:justify-end">
          {/* Filter Pills */}
          <div className="flex items-center bg-black/40 p-1 rounded-2xl border border-white/10">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterMode === 'all'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Tutti ({activities.length})
            </button>
            <button
              onClick={() => setFilterMode('playing')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                filterMode === 'playing'
                  ? 'bg-[#1DB954] text-black shadow-md shadow-[#1DB954]/30 font-black'
                  : 'text-zinc-400 hover:text-[#1DB954]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
              Attivi ({currentlyPlayingCount})
            </button>
            <button
              onClick={() => setFilterMode('paused')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterMode === 'paused'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              In Pausa ({activities.length - currentlyPlayingCount})
            </button>
          </div>

          {/* User customize button */}
          <button
            onClick={() => setShowSongPickerModal(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500/20 to-[#1DB954]/20 hover:from-[#1DB954] hover:to-emerald-400 hover:text-black border border-[#1DB954]/40 text-[#1DB954] text-xs font-extrabold px-4 py-2 rounded-2xl transition-all shadow-md active:scale-95 whitespace-nowrap"
            title="Aggiorna la canzone che stai ascoltando su SpotiShare"
          >
            <span>🎧</span>
            <span>Il tuo brano</span>
          </button>
        </div>
      </div>

      {/* Member Cards Grid */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {filteredActivities.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white/[0.02] border border-white/5 rounded-2xl">
            <p className="text-zinc-400 text-sm">Nessun membro corrisponde al filtro selezionato.</p>
            <button
              onClick={() => setFilterMode('all')}
              className="mt-3 text-xs text-[#1DB954] font-bold hover:underline"
            >
              Mostra tutti i partecipanti
            </button>
          </div>
        ) : (
          filteredActivities.map((act) => {
            const progressPercent = Math.min(
              100,
              Math.max(0, (act.progressSec / act.track.durationSec) * 100)
            );
            const isPreviewing = previewingMemberId === act.memberId;

            return (
              <div
                key={act.memberId}
                className={`group relative bg-black/40 hover:bg-black/60 border ${
                  act.isPlaying
                    ? 'border-[#1DB954]/30 hover:border-[#1DB954]/60 shadow-[0_4px_25px_rgba(0,0,0,0.5)]'
                    : 'border-white/10 hover:border-white/20'
                } rounded-3xl p-4.5 sm:p-5 transition-all duration-300 flex flex-col justify-between overflow-hidden ring-1 ${
                  act.isPlaying ? 'ring-[#1DB954]/20' : 'ring-white/5'
                }`}
              >
                {/* Ambient Top Glow for Active Tracks */}
                {act.isPlaying && (
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#1DB954]/10 rounded-full blur-2xl pointer-events-none group-hover:bg-[#1DB954]/20 transition-all"></div>
                )}

                <div>
                  {/* Top Bar: Member info + Status badge */}
                  <div className="flex items-center justify-between gap-3 mb-3.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/15 to-white/5 border border-white/10 flex items-center justify-center text-xs font-black text-white shrink-0 shadow-inner">
                        {act.memberName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-extrabold text-zinc-200 truncate">
                            {act.memberName}
                          </p>
                          {act.isSelf && (
                            <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded-md">
                              Tu
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-500 truncate">{act.device}</p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    {act.isPlaying ? (
                      <div className="flex items-center gap-1.5 bg-[#1DB954]/15 border border-[#1DB954]/40 px-2.5 py-1 rounded-full text-[10px] font-black text-[#1DB954] shadow-[0_0_10px_rgba(29,185,84,0.15)] shrink-0">
                        <span className="w-2 h-2 rounded-full bg-[#1DB954] animate-radar-dot"></span>
                        <span>In riproduzione</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-[10px] font-semibold text-zinc-400 shrink-0">
                        <span className="text-[10px]">⏸</span>
                        <span>{act.lastPlayedText}</span>
                      </div>
                    )}
                  </div>

                  {/* Main Track Presentation: Album Art + Vinyl Effect + Track Details + Equalizer */}
                  <div className="flex items-center gap-4 bg-white/[0.03] border border-white/5 rounded-2xl p-3 relative group/card">
                    {/* Vinyl + Album Cover Container */}
                    <div className="relative w-16 h-16 sm:w-18 sm:h-18 shrink-0 flex items-center">
                      {/* Interactive Vinyl Record (slides out when playing) */}
                      <div
                        className={`absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#0d0d11] border border-white/20 shadow-2xl flex items-center justify-center transition-transform duration-500 ${
                          act.isPlaying
                            ? 'translate-x-3.5 animate-vinyl'
                            : 'translate-x-1 group-hover/card:translate-x-2'
                        }`}
                        style={{
                          backgroundImage:
                            'radial-gradient(circle, #222 20%, #111 35%, #2a2a2a 45%, #151515 65%, #050505 85%)'
                        }}
                      >
                        {/* Grooves */}
                        <div className="absolute inset-1 rounded-full border border-white/5"></div>
                        <div className="absolute inset-2.5 rounded-full border border-white/5"></div>
                        {/* Vinyl Center Sticker */}
                        <div className="w-5 h-5 rounded-full bg-[#1DB954] border-2 border-black flex items-center justify-center shadow-inner">
                          <div className="w-1.5 h-1.5 rounded-full bg-black"></div>
                        </div>
                      </div>

                      {/* Album Cover Sleeve with Glow */}
                      <div className="relative z-10 w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border border-white/15 shadow-xl bg-black shrink-0">
                        <img
                          src={act.track.coverUrl}
                          alt={act.track.title}
                          className={`w-full h-full object-cover transition-transform duration-500 ${
                            act.isPlaying ? 'scale-105' : 'grayscale-[40%]'
                          }`}
                        />
                        {/* Genre Tag on Cover */}
                        <div className="absolute bottom-0 inset-x-0 bg-black/70 backdrop-blur-xs text-[8px] font-bold text-center text-zinc-300 py-0.5 truncate px-1">
                          {act.track.genre}
                        </div>
                      </div>
                    </div>

                    {/* Track Info */}
                    <div className="flex-grow min-w-0 pl-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-black text-sm text-zinc-100 truncate group-hover:text-[#1DB954] transition-colors">
                            {act.track.title}
                          </h4>
                          <p className="text-xs font-bold text-zinc-300 truncate mt-0.5">
                            {act.track.artist}
                          </p>
                          <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                            {act.track.album}
                          </p>
                        </div>

                        {/* Animated Soundwave Equalizer (Visible when playing) */}
                        {act.isPlaying && (
                          <div
                            className="flex items-end gap-1 h-6 shrink-0 pt-1"
                            title="In riproduzione"
                          >
                            <span className="w-1 bg-gradient-to-t from-[#1DB954] to-emerald-300 rounded-full equalizer-bar-1"></span>
                            <span className="w-1 bg-gradient-to-t from-[#1DB954] to-emerald-300 rounded-full equalizer-bar-2"></span>
                            <span className="w-1 bg-gradient-to-t from-[#1DB954] to-emerald-300 rounded-full equalizer-bar-3"></span>
                            <span className="w-1 bg-gradient-to-t from-[#1DB954] to-emerald-300 rounded-full equalizer-bar-4"></span>
                            <span className="w-1 bg-gradient-to-t from-[#1DB954] to-emerald-300 rounded-full equalizer-bar-5"></span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Progress Bar */}
                  {act.isPlaying && (
                    <div className="mt-3 px-1">
                      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden relative">
                        <div
                          className="h-full bg-gradient-to-r from-[#1DB954] to-emerald-300 rounded-full transition-all duration-1000 ease-linear shadow-[0_0_8px_rgba(29,185,84,0.6)]"
                          style={{ width: `${progressPercent}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 mt-1 font-semibold">
                        <span>{formatTime(act.progressSec)}</span>
                        <span>{formatTime(act.track.durationSec)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Micro-actions */}
                <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-white/5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Sincronizza / Ascolta Insieme Button */}
                    {!act.isSelf && act.isPlaying && (
                      <button
                        onClick={() => handleSyncWithMember(act)}
                        className="inline-flex items-center gap-1.5 bg-[#1DB954]/20 hover:bg-[#1DB954] text-[#1DB954] hover:text-black border border-[#1DB954]/40 font-extrabold text-[11px] px-3 py-1.5 rounded-xl transition-all active:scale-95 shadow-sm"
                        title={`Sincronizza il tuo ascolto con ${act.memberName}`}
                      >
                        <span>✨</span>
                        <span>Ascolta Insieme</span>
                      </button>
                    )}

                    {/* Audio Preview Chords / Melody */}
                    <button
                      onClick={() => handlePlaySoundPreview(act)}
                      className={`inline-flex items-center gap-1 border text-[11px] font-bold px-2.5 py-1.5 rounded-xl transition-all active:scale-95 ${
                        isPreviewing
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 animate-pulse'
                          : 'bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10'
                      }`}
                      title="Ascolta breve anteprima musicale sintetizzata"
                    >
                      <span>{isPreviewing ? '🔊' : '🎵'}</span>
                      <span>{isPreviewing ? 'Stop' : 'Anteprima'}</span>
                    </button>

                    {/* Simulation play/pause for this card */}
                    <button
                      onClick={() => handleTogglePlay(act.memberId)}
                      className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white rounded-xl transition-all text-xs"
                      title={act.isPlaying ? 'Metti in pausa' : 'Avvia riproduzione'}
                    >
                      {act.isPlaying ? '⏸' : '▶️'}
                    </button>
                  </div>

                  {/* Open in Spotify link */}
                  <a
                    href={act.track.spotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#1DB954]/50 text-zinc-300 hover:text-[#1DB954] text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all active:scale-95 shrink-0"
                    title="Apri traccia ufficiale su Spotify"
                  >
                    <span>Apri</span>
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.516 17.305c-.216.355-.678.47-1.033.254-2.827-1.727-6.386-2.118-10.578-1.16-.407.094-.813-.162-.907-.568-.094-.407.162-.813.568-.907 4.588-1.049 8.528-.607 11.696 1.348.355.216.47.678.254 1.033zm1.472-3.275c-.272.443-.853.585-1.296.313-3.237-1.99-8.172-2.565-12.001-1.402-.497.151-1.026-.134-1.177-.631-.151-.497.134-1.026.631-1.177 4.382-1.33 9.824-.693 13.53 1.587.443.272.585.853.313 1.296zm.127-3.41c-3.882-2.305-10.288-2.518-13.998-1.391-.597.181-1.233-.16-1.414-.757-.181-.597.16-1.233.757-1.414 4.268-1.296 11.341-1.047 15.807 1.604.538.319.715 1.018.396 1.556-.319.538-1.018.715-1.556.396z" />
                    </svg>
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Change Your Active Song on SpotiShare */}
      {showSongPickerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-[#121218] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl max-w-xl w-full relative overflow-hidden ring-1 ring-white/10 max-h-[90vh] flex flex-col justify-between">
            {/* Emerald Header Accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#1DB954] to-emerald-400"></div>

            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-extrabold text-zinc-100 flex items-center gap-2">
                    <span>🎧</span> Il tuo brano Spotify
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Scegli una traccia di tendenza o inserisci la tua canzone per mostrarla al gruppo.
                  </p>
                </div>
                <button
                  onClick={() => setShowSongPickerModal(false)}
                  className="text-zinc-400 hover:text-white p-2 rounded-full hover:bg-white/10 text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Quick Search */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Cerca per titolo o artista..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-2xl p-3 text-xs text-zinc-100 outline-none focus:ring-2 focus:ring-[#1DB954]/50"
                />
              </div>

              {/* Catalogue List */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar mb-4">
                {DEFAULT_TRACK_CATALOG.filter(
                  (t) =>
                    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    t.artist.toLowerCase().includes(searchQuery.toLowerCase())
                ).map((track) => (
                  <div
                    key={track.id}
                    onClick={() => handleSelectTrackForSelf(track)}
                    className="flex items-center justify-between p-2.5 bg-white/5 hover:bg-[#1DB954]/10 border border-white/5 hover:border-[#1DB954]/40 rounded-2xl cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={track.coverUrl}
                        alt={track.title}
                        className="w-10 h-10 rounded-xl object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-100 truncate group-hover:text-[#1DB954]">
                          {track.title}
                        </p>
                        <p className="text-[10px] text-zinc-400 truncate">{track.artist}</p>
                      </div>
                    </div>
                    <span className="text-xs text-[#1DB954] font-bold bg-[#1DB954]/15 px-3 py-1 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      Seleziona
                    </span>
                  </div>
                ))}
              </div>

              {/* Custom Track Input Form */}
              <form
                onSubmit={handleSetCustomSong}
                className="p-3.5 bg-black/40 border border-white/10 rounded-2xl space-y-2.5"
              >
                <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">
                  Oppure inserisci un brano personalizzato:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Titolo Brano (es. Starboy)"
                    value={customSongTitle}
                    onChange={(e) => setCustomSongTitle(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-xs text-zinc-100 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-[#1DB954]/50"
                  />
                  <input
                    type="text"
                    placeholder="Artista (es. The Weeknd)"
                    value={customSongArtist}
                    onChange={(e) => setCustomSongArtist(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-xs text-zinc-100 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-[#1DB954]/50"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!customSongTitle.trim()}
                  className="w-full bg-gradient-to-r from-[#1DB954] to-emerald-400 text-black font-extrabold py-2 rounded-xl text-xs hover:scale-[1.01] transition-all disabled:opacity-40"
                >
                  Imposta come brano in riproduzione
                </button>
              </form>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setShowSongPickerModal(false)}
                className="px-5 py-2 bg-white/10 hover:bg-white/15 text-zinc-300 hover:text-white font-bold rounded-xl text-xs transition-all"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
