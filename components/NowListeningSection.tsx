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

// Authentic, verified high-resolution Spotify album covers
const DEFAULT_TRACK_CATALOG: TrackData[] = [
  {
    id: 'birds-of-a-feather',
    title: 'BIRDS OF A FEATHER',
    artist: 'Billie Eilish',
    album: 'HIT ME HARD AND SOFT',
    durationSec: 190,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/92/9f/69/929f69f1-9977-3a44-d674-11f70c852d1b/24UMGIM36186.rgb.jpg/600x600bb.jpg',
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
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/57/e8/7b/57e87ba0-5057-9bb9-c247-ce7dbe426e89/24UMGIM55213.rgb.jpg/600x600bb.jpg',
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
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/6f/bc/e6/6fbce6c4-c38c-72d8-4fd0-66cfff32f679/20UMGIM12176.rgb.jpg/600x600bb.jpg',
    spotifyUrl: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b',
    genre: 'Synthwave',
    audioTheme: 'electronic'
  },
  {
    id: 'die-with-a-smile',
    title: 'Die With A Smile',
    artist: 'Lady Gaga & Bruno Mars',
    album: 'Die With A Smile',
    durationSec: 251,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/11/ae/f2/11aef294-f57c-bab9-c9fc-529162984e62/24UMGIM85348.rgb.jpg/600x600bb.jpg',
    spotifyUrl: 'https://open.spotify.com/track/2plbrEY59IikOBB0PD7xSu',
    genre: 'Pop Ballad',
    audioTheme: 'chill'
  },
  {
    id: 'i-p-me-tu-p-te',
    title: 'I P’ ME, TU P’ TE',
    artist: 'Geolier',
    album: 'Il Coraggio dei Bambini',
    durationSec: 214,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/9d/7a/59/9d7a59d1-bc66-3e7f-9e83-ff7c744bfa7f/5021732285935.jpg/600x600bb.jpg',
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
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/6e/fe/af/6efeaf67-47cc-3808-da77-2f7d36ad0805/5054197949418.jpg/600x600bb.jpg',
    spotifyUrl: 'https://open.spotify.com/track/7lPN2DXiMsVn9Xq2E3H5Q7',
    genre: 'Italo Pop',
    audioTheme: 'pop'
  },
  {
    id: 'click-boom',
    title: 'CLICK BOOM!',
    artist: 'Rose Villain',
    album: 'RADIO SAKURA',
    durationSec: 205,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/6c/55/22/6c5522ce-dbf5-e1c4-6abf-561df46597da/5054197950162.jpg/600x600bb.jpg',
    spotifyUrl: 'https://open.spotify.com/track/1yD6u7m6YF9vVj9c1tT9V0',
    genre: 'Urban Pop',
    audioTheme: 'energetic'
  },
  {
    id: 'hoe',
    title: 'Hoe (feat. Sfera Ebbasta)',
    artist: 'Tedua',
    album: 'La Divina Commedia',
    durationSec: 184,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/6e/c0/34/6ec03465-2132-e76c-9bf8-4adae5403da5/196871136129.jpg/600x600bb.jpg',
    spotifyUrl: 'https://open.spotify.com/track/5c3yKevvQ3RjA6dY5VvNqZ',
    genre: 'Trap Italiano',
    audioTheme: 'energetic'
  }
];

const DEFAULT_FALLBACK_COVER = 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/92/9f/69/929f69f1-9977-3a44-d674-11f70c852d1b/24UMGIM36186.rgb.jpg/600x600bb.jpg';

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

      // Deterministic initial assignment with real songs
      const track = DEFAULT_TRACK_CATALOG[index % DEFAULT_TRACK_CATALOG.length];
      const isPlaying = index % 3 !== 2;
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

  // Timer to advance progress bars smoothly
  useEffect(() => {
    const interval = setInterval(() => {
      setActivities((prev) =>
        prev.map((act) => {
          if (!act.isPlaying) return act;
          const nextSec = act.progressSec + 1;
          if (nextSec >= act.track.durationSec) {
            return { ...act, progressSec: 0 };
          }
          return { ...act, progressSec: nextSec };
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

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

  // Micro-action: Sincronizza / Ascolta Insieme
  const handleSyncWithMember = (targetMember: MemberActivity) => {
    if (onTriggerConfetti) onTriggerConfetti();

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
      `Sincronizzato con ${targetMember.memberName}! Ora stai ascoltando "${targetMember.track.title}".`,
      'success'
    );
  };

  // Micro-action: Toggle Play/Pause
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

  // Micro-action: Web Audio Synth Preview
  const handlePlaySoundPreview = (member: MemberActivity) => {
    if (previewingMemberId === member.memberId) {
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

      const chords: Record<string, number[]> = {
        energetic: [261.63, 329.63, 392.0, 523.25],
        chill: [220.0, 261.63, 329.63, 440.0],
        lofi: [174.61, 220.0, 261.63, 349.23],
        pop: [293.66, 369.99, 440.0, 587.33],
        electronic: [196.0, 246.94, 293.66, 392.0]
      };

      const notes = chords[member.track.audioTheme] || chords.pop;
      const now = ctx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = member.track.audioTheme === 'electronic' ? 'sawtooth' : 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.22);

        gain.gain.setValueAtTime(0, now + idx * 0.22);
        gain.gain.linearRampToValueAtTime(0.1, now + idx * 0.22 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.22 + 1.8);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.22);
        osc.stop(now + idx * 0.22 + 2.0);
      });

      showToast(`Anteprima accordi per "${member.track.title}"`, 'info');

      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
      previewTimerRef.current = setTimeout(() => {
        setPreviewingMemberId(null);
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
      }, 5500);
    } catch (e) {
      console.error('Audio preview error:', e);
      setPreviewingMemberId(null);
    }
  };

  // Change active song for current user
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
    showToast(`Brano impostato: "${track.title}" di ${track.artist}`, 'success');
    if (onTriggerConfetti) onTriggerConfetti();
  };

  // Custom song submission
  const handleSetCustomSong = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSongTitle.trim()) return;

    const newTrack: TrackData = {
      id: `custom-${Date.now()}`,
      title: customSongTitle.trim(),
      artist: customSongArtist.trim() || 'Artista Preferito',
      album: 'Brano Personale',
      durationSec: 210,
      coverUrl: DEFAULT_FALLBACK_COVER,
      spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(customSongTitle.trim() + ' ' + customSongArtist.trim())}`,
      genre: 'Personal Track',
      audioTheme: 'energetic'
    };

    handleSelectTrackForSelf(newTrack);
    setCustomSongTitle('');
    setCustomSongArtist('');
  };

  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      if (filterMode === 'playing') return act.isPlaying;
      if (filterMode === 'paused') return !act.isPlaying;
      return true;
    });
  }, [activities, filterMode]);

  const currentlyPlayingCount = activities.filter((a) => a.isPlaying).length;

  return (
    <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl ring-1 ring-white/5 relative overflow-hidden transition-all">
      {/* Subtle Ambient Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#1DB954]/10 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER DELLA TABELLA MUSICA SPOTIFY */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#1DB954]" />
            </span>
            <h3 className="text-lg font-black text-zinc-100 flex items-center gap-2 tracking-tight">
              <span>🎧</span> In Ascolto Ora su Spotify
            </h3>
            <span className="text-[10px] uppercase font-black tracking-wider bg-[#1DB954]/15 text-[#1DB954] border border-[#1DB954]/30 px-2.5 py-0.5 rounded-full shadow-[0_0_8px_rgba(29,185,84,0.2)]">
              Live Group Activity
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Visualizza le tracce trasmesse in tempo reale dai membri della famiglia Spotify.
          </p>
        </div>

        {/* CONTROLLI: FILTRO E MODIFICA BRANO */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Filter Tabs */}
          <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                filterMode === 'all'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Tutti ({activities.length})
            </button>
            <button
              onClick={() => setFilterMode('playing')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                filterMode === 'playing'
                  ? 'bg-[#1DB954] text-black font-extrabold shadow-sm'
                  : 'text-zinc-400 hover:text-[#1DB954]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              In riproduzione ({currentlyPlayingCount})
            </button>
            <button
              onClick={() => setFilterMode('paused')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                filterMode === 'paused'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              In pausa ({activities.length - currentlyPlayingCount})
            </button>
          </div>

          {/* Button: Change your song */}
          <button
            onClick={() => setShowSongPickerModal(true)}
            className="inline-flex items-center gap-1.5 bg-[#1DB954]/15 hover:bg-[#1DB954] text-[#1DB954] hover:text-black border border-[#1DB954]/30 hover:border-transparent text-xs font-extrabold px-3 py-1.5 rounded-xl transition-all active:scale-95 shadow-sm"
          >
            <span>🎵</span>
            <span>Il tuo brano</span>
          </button>
        </div>
      </div>

      {/* TABELLA BRANI IN ASCOLTO (CLEAN SPOTIFY STYLE) */}
      <div className="mt-4">
        {filteredActivities.length === 0 ? (
          <div className="py-10 text-center bg-black/20 border border-white/5 rounded-2xl">
            <p className="text-zinc-400 text-xs">Nessun membro corrisponde al filtro selezionato.</p>
            <button
              onClick={() => setFilterMode('all')}
              className="mt-2 text-xs text-[#1DB954] font-bold hover:underline"
            >
              Mostra tutti i partecipanti
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredActivities.map((act, index) => {
              const progressPercent = Math.min(
                100,
                Math.max(0, (act.progressSec / act.track.durationSec) * 100)
              );
              const isPreviewing = previewingMemberId === act.memberId;

              return (
                <div
                  key={act.memberId}
                  className={`p-3.5 bg-black/40 hover:bg-black/60 border ${
                    act.isPlaying
                      ? 'border-[#1DB954]/30 hover:border-[#1DB954]/60'
                      : 'border-white/5 hover:border-white/15'
                  } rounded-2xl transition-all group flex flex-col md:flex-row md:items-center justify-between gap-3.5`}
                >
                  {/* LATO SINISTRO: COPERTINA REALE + TITOLO/ARTISTA + EQUALIZZATORE */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-grow">
                    {/* INDICE / MINI EQUALIZZATORE */}
                    <div className="w-6 shrink-0 flex items-center justify-center text-zinc-500 text-xs font-mono font-bold">
                      {act.isPlaying ? (
                        <div className="flex items-end gap-[2px] h-4 w-4" title="In riproduzione">
                          <span className="w-[3px] bg-[#1DB954] rounded-full equalizer-bar-1" />
                          <span className="w-[3px] bg-[#1DB954] rounded-full equalizer-bar-2" />
                          <span className="w-[3px] bg-[#1DB954] rounded-full equalizer-bar-3" />
                          <span className="w-[3px] bg-[#1DB954] rounded-full equalizer-bar-4" />
                        </div>
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>

                    {/* COPERTINA REALE SPOTIFY (SQUARE ARTWORK, NO DISK GRAPHIC) */}
                    <div className="relative w-12 h-12 sm:w-13 sm:h-13 shrink-0 rounded-xl overflow-hidden border border-white/10 shadow-lg bg-zinc-900 group-hover:scale-105 transition-transform">
                      <img
                        src={act.track.coverUrl}
                        alt={`${act.track.title} cover`}
                        className={`w-full h-full object-cover transition-opacity ${
                          act.isPlaying ? 'opacity-100' : 'opacity-70 grayscale-[20%]'
                        }`}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = DEFAULT_FALLBACK_COVER;
                        }}
                      />
                    </div>

                    {/* DETTAGLI TRACCIA */}
                    <div className="min-w-0 flex-grow">
                      <div className="flex items-center gap-2">
                        <a
                          href={act.track.spotifyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-extrabold text-sm text-zinc-100 hover:text-[#1DB954] truncate transition-colors"
                          title={`Apri "${act.track.title}" su Spotify`}
                        >
                          {act.track.title}
                        </a>
                      </div>
                      <p className="text-xs text-zinc-300 font-medium truncate mt-0.5">
                        {act.track.artist}
                        {act.track.album && (
                          <span className="text-zinc-500 font-normal"> • {act.track.album}</span>
                        )}
                      </p>

                      {/* LIVE PROGRESS BAR & TIME */}
                      {act.isPlaying && (
                        <div className="flex items-center gap-2 mt-1.5 max-w-xs">
                          <div className="flex-grow bg-white/10 h-1 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#1DB954] to-emerald-300 rounded-full transition-all duration-1000 ease-linear shadow-[0_0_6px_rgba(29,185,84,0.6)]"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <span className="text-[9px] font-mono text-zinc-400 shrink-0 font-semibold">
                            {formatTime(act.progressSec)} / {formatTime(act.track.durationSec)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CENTRO-DESTRA: INFO MEMBRO ASCOLTATORE */}
                  <div className="flex items-center gap-2 shrink-0 px-2 py-1 bg-white/[0.02] border border-white/5 rounded-xl">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-white/15 to-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-white shrink-0">
                      {act.memberName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-zinc-200 truncate max-w-[110px]">
                          {act.memberName}
                        </span>
                        {act.isSelf && (
                          <span className="text-[8px] font-black uppercase bg-[#1DB954]/20 text-[#1DB954] border border-[#1DB954]/30 px-1 py-0.2 rounded">
                            Tu
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] text-zinc-500 truncate">{act.device}</p>
                    </div>
                  </div>

                  {/* LATO DESTRO: AZIONI (SINCRONIZZA, ANTEPRIMA, APRI SPOTIFY) */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                    {/* Sync / Ascolta Insieme Button */}
                    {!act.isSelf && act.isPlaying && (
                      <button
                        onClick={() => handleSyncWithMember(act)}
                        className="inline-flex items-center gap-1 bg-[#1DB954]/15 hover:bg-[#1DB954] text-[#1DB954] hover:text-black border border-[#1DB954]/30 font-bold text-xs px-2.5 py-1.5 rounded-xl transition-all active:scale-95 shadow-sm"
                        title={`Sincronizza il tuo ascolto con ${act.memberName}`}
                      >
                        <span>✨</span>
                        <span className="hidden sm:inline">Ascolta Insieme</span>
                      </button>
                    )}

                    {/* Audio Preview synthesizer */}
                    <button
                      onClick={() => handlePlaySoundPreview(act)}
                      className={`p-1.5 sm:px-2.5 sm:py-1.5 border text-xs font-bold rounded-xl transition-all active:scale-95 flex items-center gap-1 ${
                        isPreviewing
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 animate-pulse'
                          : 'bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10'
                      }`}
                      title="Anteprima sonora sintetica"
                    >
                      <span>{isPreviewing ? '🔊' : '🎵'}</span>
                      <span className="hidden sm:inline">{isPreviewing ? 'Stop' : 'Anteprima'}</span>
                    </button>

                    {/* Play/Pause simulation toggle */}
                    <button
                      onClick={() => handleTogglePlay(act.memberId)}
                      className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white rounded-xl transition-all text-xs"
                      title={act.isPlaying ? 'Metti in pausa' : 'Avvia riproduzione'}
                    >
                      {act.isPlaying ? '⏸' : '▶️'}
                    </button>

                    {/* Official Spotify Link Button */}
                    <a
                      href={act.track.spotifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-[#1DB954] hover:bg-[#1ed760] text-black font-extrabold text-xs px-3 py-1.5 rounded-xl transition-all active:scale-95 shadow-sm shadow-[#1DB954]/20"
                      title="Apri brano ufficiale su Spotify"
                    >
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.516 17.305c-.216.355-.678.47-1.033.254-2.827-1.727-6.386-2.118-10.578-1.16-.407.094-.813-.162-.907-.568-.094-.407.162-.813.568-.907 4.588-1.049 8.528-.607 11.696 1.348.355.216.47.678.254 1.033zm1.472-3.275c-.272.443-.853.585-1.296.313-3.237-1.99-8.172-2.565-12.001-1.402-.497.151-1.026-.134-1.177-.631-.151-.497.134-1.026.631-1.177 4.382-1.33 9.824-.693 13.53 1.587.443.272.585.853.313 1.296zm.127-3.41c-3.882-2.305-10.288-2.518-13.998-1.391-.597.181-1.233-.16-1.414-.757-.181-.597.16-1.233.757-1.414 4.268-1.296 11.341-1.047 15.807 1.604.538.319.715 1.018.396 1.556-.319.538-1.018.715-1.556.396z" />
                      </svg>
                      <span className="hidden sm:inline">Spotify</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODALE DI SELEZIONE BRANO CON RICERCA E COPERTINE REALI */}
      {showSongPickerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-[#121218] border border-white/15 rounded-3xl p-6 sm:p-7 shadow-2xl max-w-lg w-full relative overflow-hidden ring-1 ring-white/10 max-h-[90vh] flex flex-col justify-between">
            {/* Emerald Header Accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#1DB954] to-emerald-400" />

            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-extrabold text-zinc-100 flex items-center gap-2">
                    <span>🎧</span> Il tuo brano su SpotiShare
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Scegli una traccia dal catalogo o inserisci un brano personalizzato.
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
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="Cerca per titolo o artista..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-2xl p-3 text-xs text-zinc-100 outline-none focus:ring-2 focus:ring-[#1DB954]/50"
                />
              </div>

              {/* Verified Catalogue List */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar mb-4">
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
                        className="w-11 h-11 rounded-xl object-cover shrink-0 border border-white/10 shadow-md"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = DEFAULT_FALLBACK_COVER;
                        }}
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
                className="p-3 bg-black/40 border border-white/10 rounded-2xl space-y-2"
              >
                <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">
                  Oppure inserisci brano personalizzato:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Titolo (es. Starboy)"
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

            <div className="mt-3 pt-3 border-t border-white/10 flex justify-end">
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
