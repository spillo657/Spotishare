'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useToast } from './ToastContext';
import { supabase } from '@/utils/supabase';

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
    id: 'sfera-calcolatrici',
    title: 'CALCOLATRICI (feat. Geolier, Baby Gang, Guè)',
    artist: 'Sfera Ebbasta',
    album: 'X2VR',
    durationSec: 204,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/a4/4f/73/a44f738c-8515-581d-e0fa-0e78c857790b/23UM1IM28532.rgb.jpg/600x600bb.jpg',
    spotifyUrl: 'https://open.spotify.com/track/10vS59kPzN8vR4378fK8rM',
    genre: 'Trap Italiano',
    audioTheme: 'energetic'
  },
  {
    id: '100-messaggi',
    title: '100 MESSAGGI',
    artist: 'Lazza',
    album: 'LOCURA',
    durationSec: 245,
    coverUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d0000b273baf89eb11ec7c657805d2da0',
    spotifyUrl: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
    genre: 'Rap Italiano',
    audioTheme: 'energetic'
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
    coverUrl: 'https://image-cdn-fa.spotifycdn.com/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36',
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

const DEFAULT_FALLBACK_COVER = 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/a4/4f/73/a44f738c-8515-581d-e0fa-0e78c857790b/23UM1IM28532.rgb.jpg/600x600bb.jpg';

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
  const [startImmediatelyOnSelect, setStartImmediatelyOnSelect] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
  const [isLiveSpotifyConnected, setIsLiveSpotifyConnected] = useState<boolean>(false);
  const [isSyncingPlayer, setIsSyncingPlayer] = useState<boolean>(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Storage key with clean versioning
  const storageKey = `spotishare_listening_v8_${planId || 'default'}`;

  // Helper to check if a member is the current user
  const checkIsSelf = useCallback((member: Member, index: number): boolean => {
    if (currentUser?.id && member.id === currentUser.id) return true;
    if (currentUser?.email && member.email && member.email.toLowerCase() === currentUser.email.toLowerCase()) return true;
    if (member.name === 'Tu') return true;
    if (index === 0 && !currentUser) return true;
    return false;
  }, [currentUser]);

  // Retrieve Spotify OAuth token from Supabase session
  useEffect(() => {
    const fetchSessionToken = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.provider_token) {
          setSpotifyToken(session.provider_token);
          setIsLiveSpotifyConnected(true);
        }
      } catch (e) {
        console.warn('Error reading Spotify session token:', e);
      }
    };
    fetchSessionToken();
  }, []);

  // Poll Real Spotify Web API to get the EXACT song currently playing on the user's Spotify device
  const pollRealSpotifyPlayback = useCallback(async (token: string) => {
    if (!token) return;
    try {
      const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.status === 204 || res.status === 202) {
        // Spotify is paused / no track currently active
        setActivities(prev => prev.map(act => {
          if (act.isSelf) {
            return {
              ...act,
              isPlaying: false,
              lastPlayedText: 'Musica in pausa su Spotify',
              progressSec: 0
            };
          }
          return act;
        }));
        return;
      }

      if (res.status === 401) {
        // Token expired
        setSpotifyToken(null);
        setIsLiveSpotifyConnected(false);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        if (data && data.item) {
          const item = data.item;
          const liveTrack: TrackData = {
            id: item.id || `spotify-${Date.now()}`,
            title: item.name,
            artist: item.artists?.map((a: any) => a.name).join(', ') || 'Artista Spotify',
            album: item.album?.name || 'Album Spotify',
            durationSec: Math.floor((item.duration_ms || 180000) / 1000),
            coverUrl: item.album?.images?.[0]?.url || DEFAULT_FALLBACK_COVER,
            spotifyUrl: item.external_urls?.spotify || `https://open.spotify.com/track/${item.id}`,
            genre: 'Spotify Live',
            audioTheme: 'energetic'
          };

          const isPlayingLive = Boolean(data.is_playing);
          const progressLiveSec = Math.floor((data.progress_ms || 0) / 1000);

          setActivities(prev => prev.map(act => {
            if (act.isSelf) {
              return {
                ...act,
                isPlaying: isPlayingLive,
                track: liveTrack,
                progressSec: progressLiveSec,
                lastPlayedText: isPlayingLive ? 'In ascolto ora (Spotify Live)' : 'Musica in pausa su Spotify',
                device: 'Spotify Live Player'
              };
            }
            return act;
          }));
        }
      }
    } catch (err) {
      console.warn('Real Spotify polling error:', err);
    }
  }, []);

  // Poll Spotify every 4 seconds when token is active
  useEffect(() => {
    if (!spotifyToken) return;
    pollRealSpotifyPlayback(spotifyToken);
    const interval = setInterval(() => {
      pollRealSpotifyPlayback(spotifyToken);
    }, 4000);
    return () => clearInterval(interval);
  }, [spotifyToken, pollRealSpotifyPlayback]);

  // Connect Spotify OAuth with playback scopes
  const handleConnectSpotifyLive = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'spotify',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
          scopes: 'user-read-currently-playing user-read-playback-state user-modify-playback-state user-read-recently-played user-read-email'
        }
      });
      if (error) {
        showToast('Errore connessione: ' + error.message, 'error');
      } else if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      showToast('Errore imprevisto: ' + err.message, 'error');
    }
  };

  // Initialize and persist member listening states
  useEffect(() => {
    if (!members || members.length === 0) return;

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
      const isSelf = checkIsSelf(member, index);
      const cached = savedState[member.id];

      // If user had a cached track with valid URL, restore their exact preference
      if (
        cached &&
        cached.track &&
        cached.track.coverUrl &&
        !cached.track.coverUrl.includes('unsplash')
      ) {
        return {
          memberId: member.id,
          memberName: member.name || (isSelf ? 'Tu' : `Membro #${index + 1}`),
          memberEmail: member.email || '',
          isSelf,
          isPlaying: isSelf ? Boolean(cached.isPlaying) : (typeof cached.isPlaying === 'boolean' ? cached.isPlaying : false),
          track: cached.track,
          progressSec: cached.progressSec || 0,
          lastPlayedText: cached.isPlaying ? 'In ascolto ora' : 'Musica in pausa',
          device: cached.device || DEVICES[index % DEVICES.length]
        };
      }

      // If this is the current user ("Tu"), default to Sfera Ebbasta / paused so we don't show wrong Sabrina Carpenter
      if (isSelf) {
        const defaultUserTrack = DEFAULT_TRACK_CATALOG[0]; // Sfera Ebbasta
        return {
          memberId: member.id,
          memberName: member.name || 'Tu',
          memberEmail: member.email || '',
          isSelf: true,
          isPlaying: false, // Default is STOPPED / IN PAUSA
          track: defaultUserTrack,
          progressSec: 0,
          lastPlayedText: 'Musica in pausa',
          device: 'Spotify su iPhone'
        };
      }

      // Default assignment for other group members
      const track = DEFAULT_TRACK_CATALOG[(index + 1) % DEFAULT_TRACK_CATALOG.length];
      const isPlaying = index % 3 !== 2;
      const initialProgress = Math.floor(Math.random() * (track.durationSec - 40)) + 20;

      return {
        memberId: member.id,
        memberName: member.name || `Membro #${index + 1}`,
        memberEmail: member.email || '',
        isSelf: false,
        isPlaying,
        track,
        progressSec: initialProgress,
        lastPlayedText: isPlaying ? 'In ascolto ora' : `${(index + 1) * 7} min fa`,
        device: DEVICES[index % DEVICES.length]
      };
    });

    setActivities(newActivities);
  }, [members, currentUser, planId, storageKey, checkIsSelf]);

  // Timer to advance progress bars smoothly ONLY for actively playing tracks
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

  // Find the current logged-in user activity
  const myActivity = activities.find((a) => a.isSelf) || activities[0];

  // REAL SPOTIFY SYNC: Send playback command to user's Spotify device and open Spotify player
  const handleSyncWithMember = async (targetMember: MemberActivity) => {
    if (onTriggerConfetti) onTriggerConfetti();
    setIsSyncingPlayer(true);

    const trackId = targetMember.track.spotifyUrl.includes('/track/')
      ? targetMember.track.spotifyUrl.split('/track/')[1].split('?')[0]
      : targetMember.track.id;
    const trackUri = `spotify:track:${trackId}`;

    let playedDirectlyOnDevice = false;

    // 1. If Spotify OAuth token is available, command Spotify API to play on active device
    if (spotifyToken) {
      try {
        const playRes = await fetch('https://api.spotify.com/v1/me/player/play', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${spotifyToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            uris: [trackUri],
            position_ms: Math.max(0, (targetMember.progressSec || 0) * 1000)
          })
        });

        if (playRes.status === 204 || playRes.ok) {
          playedDirectlyOnDevice = true;
          showToast(`🎵 Brano avviato sul tuo dispositivo Spotify: "${targetMember.track.title}"!`, 'success');
        } else if (playRes.status === 404) {
          // No active device found
          showToast('Nessun dispositivo Spotify attivo trovato. Apertura Spotify in corso...', 'info');
        }
      } catch (e) {
        console.warn('Spotify Web API play error:', e);
      }
    }

    // 2. Open Spotify directly (deep link & web URL) to ensure playback starts on user app/device
    if (!playedDirectlyOnDevice) {
      window.open(targetMember.track.spotifyUrl, '_blank');
      showToast(`🎵 Sincronizzazione: apertura di "${targetMember.track.title}" nel tuo Spotify!`, 'success');
    }

    // 3. Update dashboard UI
    setActivities((prev) => {
      const updated = prev.map((act) => {
        if (act.isSelf) {
          return {
            ...act,
            isPlaying: true,
            track: targetMember.track,
            progressSec: targetMember.progressSec,
            lastPlayedText: 'In ascolto ora (Sincronizzato)',
            device: 'Spotify Group Session'
          };
        }
        return act;
      });
      persistActivities(updated);
      return updated;
    });

    setIsSyncingPlayer(false);
  };

  // Micro-action: Stop/Pause current user playback
  const handlePauseMyPlayback = async () => {
    // If Spotify token exists, pause on real Spotify device too
    if (spotifyToken) {
      try {
        await fetch('https://api.spotify.com/v1/me/player/pause', {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${spotifyToken}` }
        });
      } catch (e) {
        console.warn(e);
      }
    }

    setActivities((prev) => {
      const updated = prev.map((act) => {
        if (act.isSelf) {
          return {
            ...act,
            isPlaying: false,
            lastPlayedText: 'Musica in pausa'
          };
        }
        return act;
      });
      persistActivities(updated);
      return updated;
    });
    showToast('Hai messo in pausa la musica ⏸️', 'info');
  };

  // Micro-action: Resume/Play current user playback
  const handlePlayMyPlayback = async () => {
    if (spotifyToken && myActivity?.track) {
      const trackId = myActivity.track.spotifyUrl.includes('/track/')
        ? myActivity.track.spotifyUrl.split('/track/')[1].split('?')[0]
        : myActivity.track.id;
      try {
        await fetch('https://api.spotify.com/v1/me/player/play', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${spotifyToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            uris: [`spotify:track:${trackId}`]
          })
        });
      } catch (e) {
        console.warn(e);
      }
    }

    setActivities((prev) => {
      const updated = prev.map((act) => {
        if (act.isSelf) {
          return {
            ...act,
            isPlaying: true,
            lastPlayedText: 'In ascolto ora'
          };
        }
        return act;
      });
      persistActivities(updated);
      return updated;
    });
    showToast('Riproduzione avviata per il tuo profilo SpotiShare ▶️', 'success');
  };

  // Micro-action: Reset current user playback completely
  const handleStopMyPlayback = () => {
    setActivities((prev) => {
      const updated = prev.map((act) => {
        if (act.isSelf) {
          return {
            ...act,
            isPlaying: false,
            progressSec: 0,
            lastPlayedText: 'Musica fermata'
          };
        }
        return act;
      });
      persistActivities(updated);
      return updated;
    });
    showToast('Musica fermata e avanzamento azzerato ⏹️', 'info');
  };

  // Micro-action: Toggle Play/Pause on any row
  const handleTogglePlay = (memberId: string) => {
    setActivities((prev) => {
      const updated = prev.map((act) => {
        if (act.memberId === memberId) {
          const nextPlaying = !act.isPlaying;
          return {
            ...act,
            isPlaying: nextPlaying,
            lastPlayedText: nextPlaying ? 'In ascolto ora' : 'Musica in pausa'
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
  const handleSelectTrackForSelf = (track: TrackData, makeActive: boolean = false) => {
    setActivities((prev) => {
      const updated = prev.map((act) => {
        if (act.isSelf) {
          return {
            ...act,
            isPlaying: makeActive,
            track,
            progressSec: 0,
            lastPlayedText: makeActive ? 'In ascolto ora' : 'Musica in pausa'
          };
        }
        return act;
      });
      persistActivities(updated);
      return updated;
    });

    setShowSongPickerModal(false);
    showToast(
      makeActive
        ? `Brano impostato: "${track.title}" di ${track.artist}`
        : `Brano impostato (in pausa): "${track.title}"`,
      'success'
    );
    if (onTriggerConfetti) onTriggerConfetti();
  };

  // Custom song submission
  const handleSetCustomSong = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSongTitle.trim()) return;

    const artistName = customSongArtist.trim() || 'Sfera Ebbasta';
    const songTitle = customSongTitle.trim();

    const newTrack: TrackData = {
      id: `custom-${Date.now()}`,
      title: songTitle,
      artist: artistName,
      album: 'Brano Personale',
      durationSec: 210,
      coverUrl: DEFAULT_FALLBACK_COVER,
      spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(songTitle + ' ' + artistName)}`,
      genre: 'Personal Track',
      audioTheme: 'energetic'
    };

    handleSelectTrackForSelf(newTrack, startImmediatelyOnSelect);
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
    <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 sm:p-7 shadow-2xl ring-1 ring-white/5 relative overflow-hidden transition-all">
      {/* Subtle Ambient Emerald Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#1DB954]/10 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER DELLA TABELLA MUSICA SPOTIFY */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#1DB954]" />
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-zinc-100 flex items-center gap-2.5 tracking-tight">
              <span>🎧</span> In Ascolto Ora su Spotify
            </h3>
            {isLiveSpotifyConnected ? (
              <span className="text-[10px] uppercase font-black tracking-wider bg-[#1DB954]/20 text-[#1DB954] border border-[#1DB954]/40 px-3 py-1 rounded-full shadow-[0_0_10px_rgba(29,185,84,0.3)] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1DB954] animate-pulse" />
                Spotify Live Connesso
              </span>
            ) : (
              <span className="text-[10px] uppercase font-black tracking-wider bg-zinc-800 text-zinc-400 border border-white/10 px-3 py-1 rounded-full">
                Group Activity
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Visualizza e sincronizza la musica in tempo reale tra i membri del tuo piano Spotify Family.
          </p>
        </div>

        {/* CONTROLLI: FILTRO E MODIFICA BRANO */}
        <div className="flex items-center gap-3 flex-wrap shrink-0">
          {/* Live Connect Button if not authorized */}
          {!isLiveSpotifyConnected && (
            <button
              onClick={handleConnectSpotifyLive}
              className="inline-flex items-center gap-1.5 bg-[#1DB954]/15 hover:bg-[#1DB954]/25 text-[#1DB954] border border-[#1DB954]/40 text-xs font-black px-3.5 py-2 rounded-2xl transition-all active:scale-95 shadow-sm"
              title="Connetti il tuo account Spotify reale per rilevare automaticamente cosa stai ascoltando"
            >
              <span>🔗</span>
              <span>Connetti Spotify Live</span>
            </button>
          )}

          {/* Filter Tabs */}
          <div className="flex items-center bg-black/50 p-1 rounded-2xl border border-white/10 text-xs">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                filterMode === 'all'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Tutti ({activities.length})
            </button>
            <button
              onClick={() => setFilterMode('playing')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                filterMode === 'playing'
                  ? 'bg-[#1DB954] text-black font-black shadow-sm shadow-[#1DB954]/20'
                  : 'text-zinc-400 hover:text-[#1DB954]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              In riproduzione ({currentlyPlayingCount})
            </button>
            <button
              onClick={() => setFilterMode('paused')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
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
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#1DB954] to-[#1ed760] hover:scale-105 text-black font-extrabold text-xs px-4 py-2 rounded-2xl transition-all active:scale-95 shadow-lg shadow-[#1DB954]/25"
          >
            <span>🎵</span>
            <span>Il tuo brano</span>
          </button>
        </div>
      </div>

      {/* DEDICATED CONTROL BAR PER L'UTENTE ("TU") */}
      {myActivity && (
        <div className="mt-5 p-4 bg-gradient-to-r from-[#1DB954]/10 via-black/40 to-black/40 border border-[#1DB954]/30 rounded-2xl sm:rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative w-12 h-12 shrink-0 rounded-2xl overflow-hidden border border-[#1DB954]/40 shadow-md bg-zinc-900">
              <img
                src={myActivity.track.coverUrl}
                alt="Your current track cover"
                className={`w-full h-full object-cover ${myActivity.isPlaying ? 'opacity-100' : 'opacity-60 grayscale-[30%]'}`}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = DEFAULT_FALLBACK_COVER;
                }}
              />
              {myActivity.isPlaying && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <div className="flex items-end gap-[2px] h-3 w-3">
                    <span className="w-[2px] bg-[#1DB954] rounded-full equalizer-bar-1" />
                    <span className="w-[2px] bg-[#1DB954] rounded-full equalizer-bar-2" />
                    <span className="w-[2px] bg-[#1DB954] rounded-full equalizer-bar-3" />
                  </div>
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-white">Il tuo stato:</span>
                {myActivity.isPlaying ? (
                  <span className="inline-flex items-center gap-1.5 bg-[#1DB954]/20 border border-[#1DB954]/40 text-[#1DB954] text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1DB954] animate-pulse" />
                    In Riproduzione
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                    <span>⏸️</span>
                    Musica in Pausa / Fermata
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-300 font-bold truncate mt-1">
                {myActivity.track.title} <span className="text-zinc-500 font-normal">di</span> {myActivity.track.artist}
              </p>
            </div>
          </div>

          {/* User Quick Controls */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {myActivity.isPlaying ? (
              <button
                onClick={handlePauseMyPlayback}
                className="inline-flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-black px-3 py-1.5 rounded-xl transition-all active:scale-95 shadow-sm"
                title="Metti in pausa il tuo stato di ascolto"
              >
                <span>⏸️</span>
                <span>Metti in Pausa</span>
              </button>
            ) : (
              <button
                onClick={handlePlayMyPlayback}
                className="inline-flex items-center gap-1.5 bg-[#1DB954]/20 hover:bg-[#1DB954]/30 text-[#1DB954] border border-[#1DB954]/40 text-xs font-black px-3 py-1.5 rounded-xl transition-all active:scale-95 shadow-sm"
                title="Avvia la riproduzione del brano"
              >
                <span>▶️</span>
                <span>Avvia Ascolto</span>
              </button>
            )}

            <button
              onClick={handleStopMyPlayback}
              className="inline-flex items-center gap-1 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-xs font-bold px-3 py-1.5 rounded-xl transition-all active:scale-95"
              title="Ferma musica e azzera avanzamento"
            >
              <span>⏹️</span>
              <span>Ferma</span>
            </button>

            <button
              onClick={() => setShowSongPickerModal(true)}
              className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-extrabold px-3 py-1.5 rounded-xl transition-all active:scale-95"
            >
              <span>✏️</span>
              <span>Cambia Brano</span>
            </button>
          </div>
        </div>
      )}

      {/* TABELLA TRACKLIST SPOTTIFY CON COPERTINE UFFICIALI E LAYOUT AMPIO */}
      <div className="mt-6">
        {filteredActivities.length === 0 ? (
          <div className="py-12 text-center bg-black/20 border border-white/5 rounded-3xl">
            <p className="text-zinc-400 text-sm">Nessun membro corrisponde al filtro selezionato.</p>
            <button
              onClick={() => setFilterMode('all')}
              className="mt-3 text-xs text-[#1DB954] font-bold hover:underline"
            >
              Mostra tutti i partecipanti
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* INTESTAZIONE TABELLA DESKTOP */}
            <div className="hidden lg:grid grid-cols-12 gap-4 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-white/5">
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-4">Brano & Artista</div>
              <div className="col-span-3">Membro / Dispositivo</div>
              <div className="col-span-2">Avanzamento</div>
              <div className="col-span-2 text-right">Azioni</div>
            </div>

            {/* RIGHE BRANI ASCOLTATI */}
            {filteredActivities.map((act, index) => {
              const progressPercent = Math.min(
                100,
                Math.max(0, (act.progressSec / act.track.durationSec) * 100)
              );
              const isPreviewing = previewingMemberId === act.memberId;

              return (
                <div
                  key={act.memberId}
                  className={`p-4 bg-black/40 hover:bg-black/60 border ${
                    act.isSelf
                      ? 'border-[#1DB954]/40 bg-gradient-to-r from-[#1DB954]/5 to-black/50 shadow-[0_4px_25px_rgba(29,185,84,0.15)]'
                      : act.isPlaying
                      ? 'border-[#1DB954]/20 hover:border-[#1DB954]/40 shadow-[0_4px_20px_rgba(0,0,0,0.3)]'
                      : 'border-white/5 hover:border-white/15'
                  } rounded-2xl sm:rounded-3xl transition-all duration-200 flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:items-center`}
                >
                  {/* COLONNA 1: NUMERO / EQUALIZZATORE ANIMATO */}
                  <div className="hidden lg:flex lg:col-span-1 items-center justify-center text-zinc-400 text-xs font-mono font-bold">
                    {act.isPlaying ? (
                      <div className="flex items-end gap-[2px] h-4 w-4" title="In riproduzione">
                        <span className="w-[3px] bg-[#1DB954] rounded-full equalizer-bar-1" />
                        <span className="w-[3px] bg-[#1DB954] rounded-full equalizer-bar-2" />
                        <span className="w-[3px] bg-[#1DB954] rounded-full equalizer-bar-3" />
                        <span className="w-[3px] bg-[#1DB954] rounded-full equalizer-bar-4" />
                      </div>
                    ) : (
                      <span className="text-zinc-600">⏸️</span>
                    )}
                  </div>

                  {/* COLONNA 2: COPERTINA REALE + TITOLO/ARTISTA/ALBUM */}
                  <div className="lg:col-span-4 flex items-center gap-3.5 min-w-0">
                    {/* Square Official Album Cover */}
                    <div className="relative w-14 h-14 shrink-0 rounded-2xl overflow-hidden border border-white/10 shadow-lg bg-zinc-900 group-hover:scale-105 transition-transform">
                      <img
                        src={act.track.coverUrl}
                        alt={`${act.track.title} album cover`}
                        className={`w-full h-full object-cover ${
                          act.isPlaying ? 'opacity-100' : 'opacity-60 grayscale-[25%]'
                        }`}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = DEFAULT_FALLBACK_COVER;
                        }}
                      />
                    </div>

                    <div className="min-w-0 flex-grow">
                      <div className="flex items-center gap-2">
                        <a
                          href={act.track.spotifyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-black text-sm text-zinc-100 hover:text-[#1DB954] truncate transition-colors"
                          title={`Apri "${act.track.title}" su Spotify`}
                        >
                          {act.track.title}
                        </a>
                      </div>
                      <p className="text-xs text-zinc-300 font-bold truncate mt-0.5">
                        {act.track.artist}
                      </p>
                      <p className="text-[10px] text-zinc-500 truncate mt-0.5 flex items-center gap-1.5">
                        <span>{act.track.album}</span>
                        <span>•</span>
                        <span className="text-[#1DB954] font-medium">{act.track.genre}</span>
                      </p>
                    </div>
                  </div>

                  {/* COLONNA 3: MEMBRO CHE ASCOLTA & DISPOSITIVO */}
                  <div className="lg:col-span-3 flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/15 to-white/5 border border-white/10 flex items-center justify-center text-xs font-black text-white shrink-0 shadow-inner">
                      {act.memberName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-extrabold text-zinc-200 truncate">
                          {act.memberName}
                        </p>
                        {act.isSelf && (
                          <span className="text-[9px] font-black uppercase tracking-wider bg-[#1DB954]/20 text-[#1DB954] border border-[#1DB954]/40 px-2 py-0.5 rounded-md shadow-sm">
                            Tu
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-400 truncate mt-0.5">{act.device}</p>
                    </div>
                  </div>

                  {/* COLONNA 4: BARRA DI AVANZAMENTO & STATO */}
                  <div className="lg:col-span-2 min-w-0">
                    {act.isPlaying ? (
                      <div className="space-y-1.5">
                        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#1DB954] to-emerald-300 rounded-full transition-all duration-1000 ease-linear shadow-[0_0_8px_rgba(29,185,84,0.6)]"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-mono font-bold text-zinc-400">
                          <span>{formatTime(act.progressSec)}</span>
                          <span className="text-zinc-600">/</span>
                          <span>{formatTime(act.track.durationSec)}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 bg-white/5 px-2.5 py-1 rounded-xl w-fit">
                        <span>⏸️</span>
                        <span>{act.lastPlayedText}</span>
                      </div>
                    )}
                  </div>

                  {/* COLONNA 5: AZIONI RAPIDE */}
                  <div className="lg:col-span-2 flex items-center justify-end gap-2 flex-wrap">
                    {/* Sync / Ascolta Insieme (Sends real command to user's Spotify device!) */}
                    {!act.isSelf && (
                      <button
                        onClick={() => handleSyncWithMember(act)}
                        disabled={isSyncingPlayer}
                        className="inline-flex items-center gap-1 bg-[#1DB954]/15 hover:bg-[#1DB954] text-[#1DB954] hover:text-black border border-[#1DB954]/30 font-extrabold text-xs px-2.5 py-1.5 rounded-xl transition-all active:scale-95 shadow-sm disabled:opacity-50"
                        title={`Riproduci "${act.track.title}" direttamente sul tuo Spotify`}
                      >
                        <span>✨</span>
                        <span className="hidden xl:inline">Sincronizza</span>
                      </button>
                    )}

                    {/* Audio Preview Synth */}
                    <button
                      onClick={() => handlePlaySoundPreview(act)}
                      className={`p-1.5 sm:px-2.5 sm:py-1.5 border text-xs font-bold rounded-xl transition-all active:scale-95 flex items-center gap-1 ${
                        isPreviewing
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 animate-pulse'
                          : 'bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10'
                      }`}
                      title="Anteprima accordi musicali"
                    >
                      <span>{isPreviewing ? '🔊' : '🎵'}</span>
                    </button>

                    {/* Play/Pause Toggle for this user */}
                    <button
                      onClick={() => handleTogglePlay(act.memberId)}
                      className={`p-1.5 border rounded-xl transition-all text-xs ${
                        act.isPlaying
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                          : 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'
                      }`}
                      title={act.isPlaying ? 'Metti in pausa' : 'Avvia riproduzione'}
                    >
                      {act.isPlaying ? '⏸' : '▶️'}
                    </button>

                    {/* Official Spotify button */}
                    <a
                      href={act.track.spotifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-[#1DB954] hover:bg-[#1ed760] text-black font-extrabold text-xs px-3 py-1.5 rounded-xl transition-all active:scale-95 shadow-sm shadow-[#1DB954]/25 shrink-0"
                      title="Apri traccia su Spotify"
                    >
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.516 17.305c-.216.355-.678.47-1.033.254-2.827-1.727-6.386-2.118-10.578-1.16-.407.094-.813-.162-.907-.568-.094-.407.162-.813.568-.907 4.588-1.049 8.528-.607 11.696 1.348.355.216.47.678.254 1.033zm1.472-3.275c-.272.443-.853.585-1.296.313-3.237-1.99-8.172-2.565-12.001-1.402-.497.151-1.026-.134-1.177-.631-.151-.497.134-1.026.631-1.177 4.382-1.33 9.824-.693 13.53 1.587.443.272.585.853.313 1.296zm.127-3.41c-3.882-2.305-10.288-2.518-13.998-1.391-.597.181-1.233-.16-1.414-.757-.181-.597.16-1.233.757-1.414 4.268-1.296 11.341-1.047 15.807 1.604.538.319.715 1.018.396 1.556-.319.538-1.018.715-1.556.396z" />
                      </svg>
                      <span>Spotify</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODALE DI SELEZIONE BRANO CON RICERCA, COPERTINE REALI E TOGGLE STATO */}
      {showSongPickerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-[#121218] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl max-w-lg w-full relative overflow-hidden ring-1 ring-white/10 max-h-[90vh] flex flex-col justify-between">
            {/* Emerald Header Accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#1DB954] to-emerald-400" />

            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-extrabold text-zinc-100 flex items-center gap-2">
                    <span>🎧</span> Imposta il tuo brano Spotify
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Scegli quale canzone mostrare al gruppo o imposta il tuo stato in pausa.
                  </p>
                </div>
                <button
                  onClick={() => setShowSongPickerModal(false)}
                  className="text-zinc-400 hover:text-white p-2 rounded-full hover:bg-white/10 text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Quick Actions: Stop/Pause directly */}
              <div className="flex items-center gap-2 mb-4 p-2.5 bg-white/5 border border-white/10 rounded-2xl">
                <span className="text-[11px] text-zinc-300 flex-grow font-medium">
                  Musica fermata su Spotify?
                </span>
                <button
                  onClick={() => {
                    handlePauseMyPlayback();
                    setShowSongPickerModal(false);
                  }}
                  className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold rounded-xl text-xs transition-all"
                >
                  ⏸️ Imposta In Pausa
                </button>
              </div>

              {/* Quick Search */}
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="Cerca per titolo o artista (es. Sfera Ebbasta, Lazza, Geolier)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-2xl p-3 text-xs text-zinc-100 outline-none focus:ring-2 focus:ring-[#1DB954]/50"
                />
              </div>

              {/* Verified Catalogue List */}
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1 custom-scrollbar mb-4">
                {DEFAULT_TRACK_CATALOG.filter(
                  (t) =>
                    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    t.artist.toLowerCase().includes(searchQuery.toLowerCase())
                ).map((track) => (
                  <div
                    key={track.id}
                    onClick={() => handleSelectTrackForSelf(track, true)}
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
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs text-[#1DB954] font-bold bg-[#1DB954]/15 px-3 py-1 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                        Scegli ▶️
                      </span>
                    </div>
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
                    placeholder="Titolo esatto (es. CALCOLATRICI)"
                    value={customSongTitle}
                    onChange={(e) => setCustomSongTitle(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-xs text-zinc-100 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-[#1DB954]/50"
                  />
                  <input
                    type="text"
                    placeholder="Artista (es. Sfera Ebbasta)"
                    value={customSongArtist}
                    onChange={(e) => setCustomSongArtist(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-xs text-zinc-100 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-[#1DB954]/50"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={startImmediatelyOnSelect}
                      onChange={(e) => setStartImmediatelyOnSelect(e.target.checked)}
                      className="rounded accent-[#1DB954]"
                    />
                    <span>Avvia subito in riproduzione (In ascolto ora)</span>
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={!customSongTitle.trim()}
                  className="w-full bg-gradient-to-r from-[#1DB954] to-emerald-400 text-black font-extrabold py-2 rounded-xl text-xs hover:scale-[1.01] transition-all disabled:opacity-40"
                >
                  Imposta questo brano per il tuo profilo
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
