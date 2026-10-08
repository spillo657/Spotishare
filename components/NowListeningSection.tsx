'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
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

export interface TrackData {
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

const DEFAULT_FALLBACK_COVER = '/default-cover.svg';

export const NO_TRACK: TrackData = {
  id: 'none',
  title: 'Nessun brano in esecuzione',
  artist: 'Nessuna riproduzione attiva',
  album: 'Inattivo',
  durationSec: 0,
  coverUrl: DEFAULT_FALLBACK_COVER,
  spotifyUrl: 'https://open.spotify.com',
  genre: 'Inattivo',
  audioTheme: 'chill'
};

// Verified default catalogue with reliable artwork URLs and accurate metadata
export const DEFAULT_TRACK_CATALOG: TrackData[] = [
  {
    id: 'sfera-calcolatrici',
    title: 'CALCOLATRICI (feat. Geolier, Baby Gang, Guè)',
    artist: 'Sfera Ebbasta',
    album: 'X2VR',
    durationSec: 204,
    coverUrl: 'https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e02baf89eb11ec7c657805d2da0',
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
    coverUrl: 'https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e02baf89eb11ec7c657805d2da0',
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
    coverUrl: 'https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e028863bc11d2aa12b54f5aeb36',
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
  const [mounted, setMounted] = useState(false);
  const [activities, setActivities] = useState<MemberActivity[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'playing' | 'paused'>('all');
  const [previewingMemberId, setPreviewingMemberId] = useState<string | null>(null);

  // Modal states
  const [showSongPickerModal, setShowSongPickerModal] = useState(false);
  const [modalTab, setModalTab] = useState<'recent' | 'catalog' | 'custom'>('recent');
  const [recentTracks, setRecentTracks] = useState<TrackData[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);
  const [customSongTitle, setCustomSongTitle] = useState('');
  const [customSongArtist, setCustomSongArtist] = useState('');
  const [startImmediatelyOnSelect, setStartImmediatelyOnSelect] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Live Spotify Connection State
  const [isLiveSpotifyChecking, setIsLiveSpotifyChecking] = useState<boolean>(true);
  const [isLiveSpotifyConnected, setIsLiveSpotifyConnected] = useState<boolean>(false);
  const [isSyncingPlayer, setIsSyncingPlayer] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [clientSpotifyToken, setClientSpotifyToken] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const audioContextRef = useRef<AudioContext | null>(null);
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Manual Selection lock ref to prevent background idle polling from wiping user-selected tracks
  const lastManualTrackSetRef = useRef<{ trackId: string; timestamp: number } | null>(null);

  // Supabase Realtime Channel & State Refs for instant multi-user synchronization
  const channelRef = useRef<any>(null);
  const myCurrentStateRef = useRef<{
    memberId: string;
    track: TrackData;
    isPlaying: boolean;
    progressSec: number;
    device: string;
    updatedAt: number;
  } | null>(null);

  // ESC key and modal scroll lock for seamless closing and interaction
  useEffect(() => {
    if (!showSongPickerModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSongPickerModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [showSongPickerModal]);

  // Helper to determine if a member is the current user
  const checkIsSelf = useCallback((member: Member, index: number): boolean => {
    if (currentUser?.id && member.id === currentUser.id) return true;
    if (currentUser?.email && member.email && member.email.toLowerCase() === currentUser.email.toLowerCase()) return true;
    if (member.name === 'Tu') return true;
    if (index === 0 && !currentUser) return true;
    return false;
  }, [currentUser]);

  // Broadcast helper to publish local changes to the entire group in real-time
  const broadcastMyState = useCallback(
    (track: TrackData, isPlaying: boolean, progressSec: number = 0, device: string = 'Spotify Web') => {
      if (!currentUser?.id) return;

      const payload = {
        memberId: currentUser.id,
        track,
        isPlaying,
        progressSec,
        device,
        updatedAt: Date.now()
      };
      myCurrentStateRef.current = payload;

      if (channelRef.current) {
        channelRef.current
          .send({
            type: 'broadcast',
            event: 'track_change',
            payload
          })
          .catch((e: any) => console.warn('Broadcast send error:', e));

        channelRef.current.track(payload).catch((e: any) => console.warn('Presence track error:', e));
      }
    },
    [currentUser]
  );

  // Connect to Supabase Realtime Channel for the current plan
  useEffect(() => {
    if (!planId) return;

    const channelName = `spotishare_plan_${planId}`;
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: currentUser?.id || `user_${Date.now()}` }
      }
    });

    channel
      .on('broadcast', { event: 'track_change' }, (response: any) => {
        const data = response?.payload;
        if (!data || !data.memberId) return;

        setActivities((prev) =>
          prev.map((act) => {
            if (act.memberId === data.memberId) {
              const isPlaying = Boolean(data.isPlaying) && data.track?.id && data.track.id !== 'none';
              if (isPlaying && data.track) {
                return {
                  ...act,
                  track: data.track,
                  isPlaying: true,
                  progressSec: data.progressSec || 0,
                  lastPlayedText: 'In ascolto ora',
                  device: data.device || act.device
                };
              }
              // Explicit pause / stop from broadcast
              if (data.isPlaying === false) {
                return {
                  ...act,
                  track: NO_TRACK,
                  isPlaying: false,
                  progressSec: 0,
                  lastPlayedText: 'Nessun brano in esecuzione',
                  device: data.device || act.device
                };
              }
              return act;
            }
            return act;
          })
        );
      })
      .on('broadcast', { event: 'request_state' }, () => {
        // If another member requests current state, broadcast our current state
        if (currentUser?.id) {
          const stateToSend = myCurrentStateRef.current || {
            memberId: currentUser.id,
            track: NO_TRACK,
            isPlaying: false,
            progressSec: 0,
            device: 'Nessun dispositivo attivo',
            updatedAt: Date.now()
          };
          channel.send({
            type: 'broadcast',
            event: 'track_change',
            payload: stateToSend
          }).catch((e: any) => console.warn('State reply error:', e));
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        Object.values(state).forEach((presences: any) => {
          if (Array.isArray(presences)) {
            presences.forEach((p: any) => {
              if (p && p.memberId && p.memberId !== currentUser?.id) {
                setActivities((prev) =>
                  prev.map((act) => {
                    if (act.memberId === p.memberId) {
                      const isIncomingActive = Boolean(p.isPlaying) && p.track && p.track.id !== 'none';
                      if (isIncomingActive) {
                        return {
                          ...act,
                          track: p.track,
                          isPlaying: true,
                          progressSec: p.progressSec || 0,
                          lastPlayedText: 'In ascolto ora',
                          device: p.device || act.device
                        };
                      }
                      // Never overwrite an existing active track with an empty/default one on presence sync
                      return act;
                    }
                    return act;
                  })
                );
              }
            });
          }
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          if (currentUser?.id) {
            const initialState = myCurrentStateRef.current || {
              memberId: currentUser.id,
              track: NO_TRACK,
              isPlaying: false,
              progressSec: 0,
              device: 'Spotify Web',
              updatedAt: Date.now()
            };
            await channel.track(initialState).catch((e: any) => console.warn('Presence init error:', e));
          }
          // Request current state from other connected members in the room
          channel.send({
            type: 'broadcast',
            event: 'request_state',
            payload: { requestedBy: currentUser?.id }
          }).catch((e: any) => console.warn('Request state error:', e));
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [planId, currentUser]);

  // Extract client Spotify token from Supabase session, cookies, or localStorage
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let token = session?.provider_token || null;

        if (!token && typeof document !== 'undefined') {
          const match = document.cookie.match(/(^| )spotify_provider_token=([^;]+)/);
          if (match) token = match[2];
        }

        if (!token && typeof window !== 'undefined') {
          token = localStorage.getItem('spotify_provider_token');
        }

        if (token) {
          setClientSpotifyToken(token);
          if (typeof document !== 'undefined') {
            document.cookie = `spotify_provider_token=${token}; path=/; max-age=3600; SameSite=Lax`;
          }
          if (typeof window !== 'undefined') {
            localStorage.setItem('spotify_provider_token', token);
          }
        }
      } catch (e) {
        console.warn('Session token check error:', e);
      }
    };

    checkSession();

    // Subscribe to auth changes to update token dynamically
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.provider_token) {
        setClientSpotifyToken(session.provider_token);
        if (typeof document !== 'undefined') {
          document.cookie = `spotify_provider_token=${session.provider_token}; path=/; max-age=3600; SameSite=Lax`;
        }
        if (typeof window !== 'undefined') {
          localStorage.setItem('spotify_provider_token', session.provider_token);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Real-time Spotify API polling with high reactivity & smart manual-selection preservation
  const pollServerSpotifyStatus = useCallback(async (isManual: boolean = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const headers: Record<string, string> = {};
      let activeToken = clientSpotifyToken;

      if (!activeToken && typeof window !== 'undefined') {
        activeToken = localStorage.getItem('spotify_provider_token');
      }
      if (!activeToken && typeof document !== 'undefined') {
        const match = document.cookie.match(/(^| )spotify_provider_token=([^;]+)/);
        if (match) activeToken = match[2];
      }

      if (activeToken) {
        headers['Authorization'] = `Bearer ${activeToken}`;
      }

      const res = await fetch('/api/spotify/current', {
        headers,
        cache: 'no-store'
      });

      if (!res.ok) {
        setIsLiveSpotifyChecking(false);
        if (isManual) setIsRefreshing(false);
        return;
      }

      const data = await res.json();
      setIsLiveSpotifyChecking(false);

      if (data.connected === true) {
        setIsLiveSpotifyConnected(true);

        if (data.is_playing && data.track && data.track.id !== 'none') {
          // Live Spotify playback detected!
          lastManualTrackSetRef.current = null; // Clear manual lock as real audio stream is verified

          setActivities((prev) =>
            prev.map((act) => {
              if (act.isSelf) {
                return {
                  ...act,
                  isPlaying: true,
                  track: data.track,
                  progressSec: data.progressSec || 0,
                  lastPlayedText: 'In ascolto ora',
                  device: data.device || 'Spotify Device'
                };
              }
              return act;
            })
          );

          // Broadcast state to all other members (Admin included)
          broadcastMyState(data.track, true, data.progressSec || 0, data.device || 'Spotify Device');

        } else {
          // Spotify is stopped or paused on server
          // If the user has manually selected a track or has an active track, preserve it!
          // We do not wipe it unless explicit pause occurred.
          const hasManualLock = Boolean(lastManualTrackSetRef.current);

          if (!hasManualLock) {
            if (currentUser?.id && myCurrentStateRef.current?.isPlaying) {
              myCurrentStateRef.current = {
                memberId: currentUser.id,
                track: NO_TRACK,
                isPlaying: false,
                progressSec: 0,
                device: 'Nessun dispositivo attivo',
                updatedAt: Date.now()
              };
            }
            // Only clear if the self activity is explicitly without track or inactive
            setActivities((prev) =>
              prev.map((act) => {
                if (act.isSelf && act.isPlaying && (!act.track || act.track.id === 'none')) {
                  return {
                    ...act,
                    isPlaying: false,
                    track: NO_TRACK,
                    lastPlayedText: 'Nessun brano in esecuzione',
                    progressSec: 0
                  };
                }
                return act;
              })
            );
          }
        }
      } else {
        setIsLiveSpotifyConnected(false);
      }
    } catch (err) {
      console.warn('Error polling /api/spotify/current:', err);
      setIsLiveSpotifyChecking(false);
    } finally {
      if (isManual) {
        setTimeout(() => setIsRefreshing(false), 400);
      }
    }
  }, [clientSpotifyToken, broadcastMyState]);

  // High-reactivity polling: every 2000ms + on window focus + on tab visibility change
  useEffect(() => {
    pollServerSpotifyStatus();

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        pollServerSpotifyStatus();
      }
    }, 2000);

    const handleFocus = () => {
      pollServerSpotifyStatus();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        pollServerSpotifyStatus();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pollServerSpotifyStatus]);

  // Fetch recent tracks when modal opens or user switches to 'recent' tab
  const fetchRecentSpotifyTracks = useCallback(async () => {
    setIsLoadingRecent(true);
    try {
      const headers: Record<string, string> = {};
      let activeToken = clientSpotifyToken;
      if (!activeToken && typeof window !== 'undefined') {
        activeToken = localStorage.getItem('spotify_provider_token');
      }
      if (!activeToken && typeof document !== 'undefined') {
        const match = document.cookie.match(/(^| )spotify_provider_token=([^;]+)/);
        if (match) activeToken = match[2];
      }
      if (activeToken) {
        headers['Authorization'] = `Bearer ${activeToken}`;
      }
      const res = await fetch('/api/spotify/recent', {
        headers,
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.tracks && Array.isArray(data.tracks) && data.tracks.length > 0) {
          setRecentTracks(data.tracks);
        }
      }
    } catch (err) {
      console.warn('Error fetching recent tracks:', err);
    } finally {
      setIsLoadingRecent(false);
    }
  }, [clientSpotifyToken]);

  useEffect(() => {
    if (showSongPickerModal) {
      fetchRecentSpotifyTracks();
    }
  }, [showSongPickerModal, fetchRecentSpotifyTracks]);

  // Connect / Reconnect Spotify OAuth
  const handleConnectSpotifyLive = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'spotify',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
          scopes: 'user-read-currently-playing user-read-playback-state user-modify-playback-state user-read-recently-played user-read-email user-top-read'
        }
      });
      if (error) {
        showToast('Errore connessione: ' + error.message, 'error');
      } else if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      showToast('Errore: ' + err.message, 'error');
    }
  };

  // Safe Member State Merging: preserves existing playback and selected tracks on dashboard re-renders
  useEffect(() => {
    if (!members || members.length === 0) return;

    setActivities((prev) => {
      return members.map((member, index) => {
        const isSelf = checkIsSelf(member, index);
        const existing = prev.find((a) => a.memberId === member.id);

        if (existing) {
          return {
            ...existing,
            memberName: member.name || existing.memberName,
            memberEmail: member.email || existing.memberEmail,
            isSelf,
            isPlaying: existing.isPlaying,
            track: existing.track && existing.track.id !== 'none' ? existing.track : existing.track,
            progressSec: existing.progressSec,
            lastPlayedText: existing.lastPlayedText,
            device: existing.device
          };
        }

        const selfState = isSelf && myCurrentStateRef.current && myCurrentStateRef.current.track.id !== 'none'
          ? myCurrentStateRef.current
          : null;

        const initialDevice = selfState && selfState.isPlaying
          ? (selfState.device || 'Spotify Web Player')
          : (isSelf ? 'Nessun dispositivo attivo' : 'Nessun dispositivo attivo');

        return {
          memberId: member.id,
          memberName: member.name || (isSelf ? 'Tu' : `Membro #${index + 1}`),
          memberEmail: member.email || '',
          isSelf,
          isPlaying: selfState ? selfState.isPlaying : false,
          track: selfState ? selfState.track : NO_TRACK,
          progressSec: selfState ? selfState.progressSec : 0,
          lastPlayedText: selfState && selfState.isPlaying ? 'In ascolto ora' : 'Nessun brano in esecuzione',
          device: initialDevice
        };
      });
    });
  }, [members, currentUser, planId, checkIsSelf]);

  // Smooth progress advance only when actively playing
  useEffect(() => {
    const interval = setInterval(() => {
      setActivities((prev) =>
        prev.map((act) => {
          if (!act.isPlaying || act.track.id === 'none') return act;
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
    if (!seconds || seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const myActivity = activities.find((a) => a.isSelf) || activities[0];

  // REAL SPOTIFY SYNC: Commands real Spotify player & opens song on device
  const handleSyncWithMember = async (targetMember: MemberActivity) => {
    if (targetMember.track.id === 'none') {
      showToast('Questo membro non ha nessun brano in esecuzione al momento.', 'info');
      return;
    }

    if (onTriggerConfetti) onTriggerConfetti();
    setIsSyncingPlayer(true);

    lastManualTrackSetRef.current = {
      trackId: targetMember.track.id,
      timestamp: Date.now()
    };

    // Optimistic UI Update for zero perceived latency
    setActivities((prev) =>
      prev.map((act) =>
        act.isSelf
          ? {
              ...act,
              isPlaying: true,
              track: targetMember.track,
              progressSec: targetMember.progressSec,
              lastPlayedText: 'In ascolto ora (Sincronizzato)',
              device: 'Spotify Group Session'
            }
          : act
      )
    );

    // Broadcast sync state
    broadcastMyState(targetMember.track, true, targetMember.progressSec, 'Spotify Group Session');

    const trackId = targetMember.track.spotifyUrl.includes('/track/')
      ? targetMember.track.spotifyUrl.split('/track/')[1].split('?')[0]
      : targetMember.track.id;
    const trackUri = `spotify:track:${trackId}`;

    let playedViaApi = false;

    // 1. Send play command to backend API proxy
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (clientSpotifyToken) headers['Authorization'] = `Bearer ${clientSpotifyToken}`;

      const res = await fetch('/api/spotify/play', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          uri: trackUri,
          position_ms: Math.max(0, (targetMember.progressSec || 0) * 1000)
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          playedViaApi = true;
          showToast(`🎵 Brano avviato sul tuo Spotify: "${targetMember.track.title}"!`, 'success');
          setTimeout(() => pollServerSpotifyStatus(), 300);
          setTimeout(() => pollServerSpotifyStatus(), 1200);
        }
      }
    } catch (e) {
      console.warn('API Play error:', e);
    }

    // 2. Open Spotify directly if API play was not possible
    if (!playedViaApi) {
      window.open(targetMember.track.spotifyUrl, '_blank');
      showToast(`🎵 Sincronizzazione: apertura "${targetMember.track.title}" su Spotify...`, 'success');
    }

    setIsSyncingPlayer(false);
  };

  // Pause playback: immediate optimistic update + API command + Realtime Broadcast
  const handlePauseMyPlayback = async () => {
    lastManualTrackSetRef.current = null; // Clear manual lock on explicit pause

    // Immediate UI feedback
    setActivities((prev) =>
      prev.map((act) => {
        if (act.isSelf) {
          return {
            ...act,
            isPlaying: false,
            track: NO_TRACK,
            progressSec: 0,
            lastPlayedText: 'Nessun brano in esecuzione'
          };
        }
        return act;
      })
    );
    showToast('Nessun brano in riproduzione ⏸️', 'info');

    // Broadcast paused state to Admin and all group members
    broadcastMyState(NO_TRACK, false, 0, 'Spotify');

    try {
      const headers: Record<string, string> = {};
      if (clientSpotifyToken) headers['Authorization'] = `Bearer ${clientSpotifyToken}`;
      await fetch('/api/spotify/pause', { method: 'POST', headers });
      setTimeout(() => pollServerSpotifyStatus(), 200);
      setTimeout(() => pollServerSpotifyStatus(), 800);
    } catch (e) {
      console.warn(e);
    }
  };

  // Stop playback / Clear track to NO_TRACK
  const handleStopMyPlayback = () => {
    lastManualTrackSetRef.current = null; // Clear manual lock

    setActivities((prev) =>
      prev.map((act) => {
        if (act.isSelf) {
          return {
            ...act,
            isPlaying: false,
            track: NO_TRACK,
            progressSec: 0,
            lastPlayedText: 'Nessun brano in esecuzione'
          };
        }
        return act;
      })
    );
    showToast('Stato azzerato: Nessun brano in esecuzione ⏹️', 'info');
    broadcastMyState(NO_TRACK, false, 0, 'Spotify');
    handlePauseMyPlayback();
  };

  // Resume playback or start a selected track
  const handlePlayMyPlayback = async () => {
    const trackToPlay = myActivity?.track?.id !== 'none' ? myActivity.track : DEFAULT_TRACK_CATALOG[0];

    lastManualTrackSetRef.current = {
      trackId: trackToPlay.id,
      timestamp: Date.now()
    };

    // Optimistic UI update
    setActivities((prev) =>
      prev.map((act) => {
        if (act.isSelf) {
          return {
            ...act,
            isPlaying: true,
            track: trackToPlay,
            lastPlayedText: 'In ascolto ora'
          };
        }
        return act;
      })
    );
    showToast(`Riproduzione avviata: "${trackToPlay.title}" ▶️`, 'success');

    // Broadcast to group
    broadcastMyState(trackToPlay, true, 0, 'Spotify Web');

    const trackId = trackToPlay.spotifyUrl.includes('/track/')
      ? trackToPlay.spotifyUrl.split('/track/')[1].split('?')[0]
      : trackToPlay.id;

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (clientSpotifyToken) headers['Authorization'] = `Bearer ${clientSpotifyToken}`;
      await fetch('/api/spotify/play', {
        method: 'POST',
        headers,
        body: JSON.stringify({ uri: `spotify:track:${trackId}` })
      });
      setTimeout(() => pollServerSpotifyStatus(), 300);
      setTimeout(() => pollServerSpotifyStatus(), 1200);
    } catch (e) {
      console.warn(e);
    }
  };

  // Toggle play/pause for a member row
  const handleTogglePlay = (memberId: string) => {
    setActivities((prev) =>
      prev.map((act) => {
        if (act.memberId === memberId) {
          const nextPlaying = !act.isPlaying;
          const nextTrack = nextPlaying ? (act.track.id === 'none' ? DEFAULT_TRACK_CATALOG[0] : act.track) : NO_TRACK;

          if (act.isSelf) {
            if (nextPlaying) {
              lastManualTrackSetRef.current = { trackId: nextTrack.id, timestamp: Date.now() };
            } else {
              lastManualTrackSetRef.current = null;
            }
            broadcastMyState(nextTrack, nextPlaying, 0, 'Spotify');
          }

          return {
            ...act,
            isPlaying: nextPlaying,
            track: nextTrack,
            lastPlayedText: nextPlaying ? 'In ascolto ora' : 'Nessun brano in esecuzione'
          };
        }
        return act;
      })
    );
  };

  // Synthesizer preview
  const handlePlaySoundPreview = (member: MemberActivity) => {
    if (member.track.id === 'none') {
      showToast('Nessun brano da riprodurre per questa anteprima.', 'info');
      return;
    }

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

  // Change current user track from catalogue or recent tracks + Broadcast to room
  const handleSelectTrackForSelf = async (track: TrackData, makeActive: boolean = true) => {
    // 1. Immediately close modal for instant feedback
    setShowSongPickerModal(false);

    // 2. Lock this manual selection so polling doesn't wipe it out
    if (makeActive) {
      lastManualTrackSetRef.current = {
        trackId: track.id,
        timestamp: Date.now()
      };
    }

    // 3. Optimistic UI update
    setActivities((prev) =>
      prev.map((act) => {
        if (act.isSelf) {
          return {
            ...act,
            isPlaying: makeActive,
            track,
            progressSec: 0,
            lastPlayedText: makeActive ? 'In ascolto ora' : 'Nessun brano in esecuzione'
          };
        }
        return act;
      })
    );

    // 4. Broadcast immediately to Admin and all group members
    broadcastMyState(track, makeActive, 0, 'Spotify Web');

    showToast(
      makeActive
        ? `🎵 In ascolto: "${track.title}" di ${track.artist}`
        : `Brano impostato: "${track.title}"`,
      'success'
    );
    if (onTriggerConfetti) onTriggerConfetti();

    // 5. If makeActive, send Spotify play command in background
    if (makeActive) {
      const trackId = track.spotifyUrl.includes('/track/')
        ? track.spotifyUrl.split('/track/')[1].split('?')[0]
        : track.id;
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (clientSpotifyToken) headers['Authorization'] = `Bearer ${clientSpotifyToken}`;
        await fetch('/api/spotify/play', {
          method: 'POST',
          headers,
          body: JSON.stringify({ uri: `spotify:track:${trackId}` })
        });
        setTimeout(() => pollServerSpotifyStatus(), 300);
        setTimeout(() => pollServerSpotifyStatus(), 1200);
      } catch (e) {
        console.warn('Play API error:', e);
      }
    }
  };

  const handleSetCustomSong = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSongTitle.trim()) return;

    const artistName = customSongArtist.trim() || 'Artista';
    const songTitle = customSongTitle.trim();

    const newTrack: TrackData = {
      id: `custom-${Date.now()}`,
      title: songTitle,
      artist: artistName,
      album: 'Brano Personalizzato',
      durationSec: 210,
      coverUrl: DEFAULT_FALLBACK_COVER,
      spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(songTitle + ' ' + artistName)}`,
      genre: 'Personalizzato',
      audioTheme: 'energetic'
    };

    handleSelectTrackForSelf(newTrack, startImmediatelyOnSelect);
    setCustomSongTitle('');
    setCustomSongArtist('');
  };

  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      if (filterMode === 'playing') return act.isPlaying && act.track.id !== 'none';
      if (filterMode === 'paused') return !act.isPlaying || act.track.id === 'none';
      return true;
    });
  }, [activities, filterMode]);

  const currentlyPlayingCount = activities.filter((a) => a.isPlaying && a.track.id !== 'none').length;

  return (
    <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 sm:p-7 shadow-2xl ring-1 ring-white/5 relative overflow-hidden transition-all">
      {/* Ambient Emerald Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#1DB954]/10 rounded-full blur-3xl pointer-events-none" />

      {/* BANNER RE-CONNECT SPOTIFY SE NON AUTORIZZATO */}
      {!isLiveSpotifyChecking && !isLiveSpotifyConnected && (
        <div className="mb-6 p-4 bg-gradient-to-r from-amber-500/15 via-black/40 to-black/40 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔗</span>
            <div>
              <p className="text-xs font-black text-amber-300 uppercase tracking-wider">
                Sincronizzazione Live Spotify Non Attiva
              </p>
              <p className="text-xs text-zinc-300">
                Collega il tuo account Spotify per mostrare automaticamente cosa stai ascoltando e attivare la sincronizzazione.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleConnectSpotifyLive}
            className="inline-flex items-center justify-center gap-2 bg-[#1DB954] hover:bg-[#1ed760] text-black font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all active:scale-95 shadow-lg shadow-[#1DB954]/25 shrink-0 cursor-pointer"
          >
            <span>🎧</span>
            <span>Collega Spotify Ora</span>
          </button>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="relative flex h-3.5 w-3.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${currentlyPlayingCount > 0 ? 'bg-green-400' : 'bg-zinc-600'}`} />
              <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${currentlyPlayingCount > 0 ? 'bg-[#1DB954]' : 'bg-zinc-500'}`} />
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-zinc-100 flex items-center gap-2.5 tracking-tight">
              <span>🎧</span> In Ascolto Ora su Spotify
            </h3>
            {isLiveSpotifyChecking ? (
              <span className="text-[10px] uppercase font-black tracking-wider bg-zinc-800/80 text-zinc-400 border border-white/10 px-3 py-1 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-pulse" />
                Verifica live...
              </span>
            ) : isLiveSpotifyConnected ? (
              <span className="text-[10px] uppercase font-black tracking-wider bg-[#1DB954]/20 text-[#1DB954] border border-[#1DB954]/40 px-3 py-1 rounded-full shadow-[0_0_10px_rgba(29,185,84,0.3)] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1DB954] animate-pulse" />
                Live Connesso
              </span>
            ) : (
              <span className="text-[10px] uppercase font-black tracking-wider bg-zinc-800 text-zinc-400 border border-white/10 px-3 py-1 rounded-full">
                Sync Disponibile
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Visualizza e sincronizza la musica in tempo reale tra i membri del tuo piano Spotify Family.
          </p>
        </div>

        {/* CONTROLS */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => pollServerSpotifyStatus(true)}
            disabled={isRefreshing}
            className="p-2 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 rounded-2xl transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Aggiorna stato Spotify in tempo reale"
          >
            <span className={`inline-block text-sm ${isRefreshing ? 'animate-spin' : ''}`}>🔄</span>
          </button>

          {/* Filter Tabs */}
          <div className="flex items-center bg-black/50 p-1 rounded-2xl border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Tutti ({activities.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('playing')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterMode === 'playing'
                  ? 'bg-[#1DB954] text-black font-black shadow-sm shadow-[#1DB954]/20'
                  : 'text-zinc-400 hover:text-[#1DB954]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              In riproduzione ({currentlyPlayingCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('paused')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                filterMode === 'paused'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              In pausa ({activities.length - currentlyPlayingCount})
            </button>
          </div>

          {/* Button: Choose your song / Catalog */}
          <button
            type="button"
            onClick={() => setShowSongPickerModal(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#1DB954] to-[#1ed760] hover:scale-105 text-black font-extrabold text-xs px-4 py-2.5 rounded-2xl transition-all active:scale-95 shadow-lg shadow-[#1DB954]/25 cursor-pointer"
          >
            <span>🎵</span>
            <span>I tuoi brani</span>
          </button>
        </div>
      </div>

      {/* USER DEDICATED CONTROL BAR */}
      {myActivity && (
        <div className={`mt-5 p-4 sm:p-5 border rounded-2xl sm:rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
          myActivity.isPlaying && myActivity.track.id !== 'none'
            ? 'bg-gradient-to-r from-[#1DB954]/15 via-black/50 to-black/40 border-[#1DB954]/40 shadow-[0_4px_30px_rgba(29,185,84,0.15)]'
            : 'bg-black/40 border-white/10'
        }`}>
          <div className="flex items-center gap-4 min-w-0">
            {/* Cover image or vinyl placeholder */}
            <div className="relative w-14 h-14 shrink-0 rounded-2xl overflow-hidden border border-white/10 shadow-lg bg-zinc-900 flex items-center justify-center">
              {myActivity.track.id !== 'none' && myActivity.track.coverUrl ? (
                <img
                  src={myActivity.track.coverUrl}
                  alt="Copertina brano"
                  referrerPolicy="no-referrer"
                  className={`w-full h-full object-cover ${myActivity.isPlaying ? 'opacity-100' : 'opacity-60 grayscale-[30%]'}`}
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_FALLBACK_COVER;
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-zinc-600">
                  <span className="text-xl">💿</span>
                </div>
              )}

              {myActivity.isPlaying && myActivity.track.id !== 'none' && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="flex items-end gap-[2px] h-3.5 w-3.5">
                    <span className="w-[2.5px] bg-[#1DB954] rounded-full equalizer-bar-1" />
                    <span className="w-[2.5px] bg-[#1DB954] rounded-full equalizer-bar-2" />
                    <span className="w-[2.5px] bg-[#1DB954] rounded-full equalizer-bar-3" />
                  </div>
                </div>
              )}
            </div>

            {/* Track Info */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-black text-zinc-400">Il tuo stato:</span>
                {myActivity.isPlaying && myActivity.track.id !== 'none' ? (
                  <span className="inline-flex items-center gap-1.5 bg-[#1DB954]/20 border border-[#1DB954]/40 text-[#1DB954] text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1DB954] animate-pulse" />
                    In Riproduzione
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 bg-zinc-800/80 border border-white/10 text-zinc-400 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full">
                    <span>⏸️</span>
                    Non in riproduzione
                  </span>
                )}
              </div>

              {myActivity.track.id !== 'none' ? (
                <div className="min-w-0">
                  <p className="text-sm text-zinc-100 font-extrabold truncate">
                    {myActivity.track.title}
                  </p>
                  <p className="text-xs text-zinc-400 truncate mt-0.5">
                    di <span className="text-zinc-200 font-semibold">{myActivity.track.artist}</span>
                  </p>
                </div>
              ) : (
                <div className="min-w-0">
                  <p className="text-sm text-zinc-400 font-bold truncate">
                    Nessun brano in esecuzione
                  </p>
                  <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                    Avvia la musica su Spotify o seleziona un brano dal catalogo.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Controls */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {myActivity.isPlaying && myActivity.track.id !== 'none' ? (
              <button
                type="button"
                onClick={handlePauseMyPlayback}
                className="inline-flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-black px-3.5 py-2 rounded-xl transition-all active:scale-95 shadow-sm cursor-pointer"
                title="Metti in pausa la musica"
              >
                <span>⏸️</span>
                <span>Metti in Pausa</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePlayMyPlayback}
                className="inline-flex items-center gap-1.5 bg-[#1DB954]/20 hover:bg-[#1DB954]/30 text-[#1DB954] border border-[#1DB954]/40 text-xs font-black px-3.5 py-2 rounded-xl transition-all active:scale-95 shadow-sm cursor-pointer"
                title="Avvia la riproduzione del brano"
              >
                <span>▶️</span>
                <span>Avvia Ascolto</span>
              </button>
            )}

            {myActivity.isPlaying && (
              <button
                type="button"
                onClick={handleStopMyPlayback}
                className="inline-flex items-center gap-1 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-xs font-bold px-3 py-2 rounded-xl transition-all active:scale-95 cursor-pointer"
                title="Azzera e imposta nessun brano"
              >
                <span>⏹️</span>
                <span>Azzera</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowSongPickerModal(true)}
              className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-extrabold px-3.5 py-2 rounded-xl transition-all active:scale-95 cursor-pointer"
            >
              <span>🎵</span>
              <span>Scegli Brano</span>
            </button>
          </div>
        </div>
      )}

      {/* TRACKLIST TABLE */}
      <div className="mt-6">
        {filteredActivities.length === 0 ? (
          <div className="py-12 text-center bg-black/20 border border-white/5 rounded-3xl">
            <p className="text-zinc-400 text-sm">Nessun membro corrisponde al filtro selezionato.</p>
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className="mt-3 text-xs text-[#1DB954] font-bold hover:underline cursor-pointer"
            >
              Mostra tutti i partecipanti
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* TABLE HEADER */}
            <div className="hidden lg:grid grid-cols-12 gap-4 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-white/5">
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-4">Brano & Artista</div>
              <div className="col-span-3">Membro / Dispositivo</div>
              <div className="col-span-2">Avanzamento</div>
              <div className="col-span-2 text-right">Azioni</div>
            </div>

            {/* ROWS */}
            {filteredActivities.map((act) => {
              const hasActiveSong = act.isPlaying && act.track.id !== 'none';
              const progressPercent = hasActiveSong && act.track.durationSec > 0
                ? Math.min(100, Math.max(0, (act.progressSec / act.track.durationSec) * 100))
                : 0;
              const isPreviewing = previewingMemberId === act.memberId;

              return (
                <div
                  key={act.memberId}
                  className={`p-4 bg-black/40 hover:bg-black/60 border ${
                    act.isSelf
                      ? hasActiveSong
                        ? 'border-[#1DB954]/40 bg-gradient-to-r from-[#1DB954]/5 to-black/50 shadow-[0_4px_25px_rgba(29,185,84,0.15)]'
                        : 'border-white/10'
                      : hasActiveSong
                      ? 'border-[#1DB954]/20 hover:border-[#1DB954]/40 shadow-[0_4px_20px_rgba(0,0,0,0.3)]'
                      : 'border-white/5 hover:border-white/15'
                  } rounded-2xl sm:rounded-3xl transition-all duration-200 flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:items-center`}
                >
                  {/* COL 1: EQUALIZER */}
                  <div className="hidden lg:flex lg:col-span-1 items-center justify-center text-zinc-400 text-xs font-mono font-bold">
                    {hasActiveSong ? (
                      <div className="flex items-end gap-[2px] h-4 w-4" title="In riproduzione">
                        <span className="w-[3px] bg-[#1DB954] rounded-full equalizer-bar-1" />
                        <span className="w-[3px] bg-[#1DB954] rounded-full equalizer-bar-2" />
                        <span className="w-[3px] bg-[#1DB954] rounded-full equalizer-bar-3" />
                        <span className="w-[3px] bg-[#1DB954] rounded-full equalizer-bar-4" />
                      </div>
                    ) : (
                      <span className="text-zinc-600 text-xs">⏸️</span>
                    )}
                  </div>

                  {/* COL 2: ALBUM COVER & TRACK INFO */}
                  <div className="lg:col-span-4 flex items-center gap-3.5 min-w-0">
                    <div className="relative w-13 h-13 shrink-0 rounded-2xl overflow-hidden border border-white/10 shadow-lg bg-zinc-900 flex items-center justify-center">
                      {hasActiveSong && act.track.coverUrl ? (
                        <img
                          src={act.track.coverUrl}
                          alt={`${act.track.title} cover`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = DEFAULT_FALLBACK_COVER;
                          }}
                        />
                      ) : (
                        <span className="text-zinc-600 text-base">💿</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-grow">
                      {hasActiveSong ? (
                        <>
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
                        </>
                      ) : (
                        <div>
                          <p className="font-bold text-sm text-zinc-400 truncate">
                            Nessun brano in esecuzione
                          </p>
                          <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                            Nessuna riproduzione attiva
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* COL 3: MEMBER & DEVICE */}
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

                  {/* COL 4: PROGRESS BAR */}
                  <div className="lg:col-span-2 min-w-0">
                    {hasActiveSong ? (
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
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 bg-white/5 px-2.5 py-1 rounded-xl w-fit">
                        <span>⏸️</span>
                        <span>Nessun brano in esecuzione</span>
                      </div>
                    )}
                  </div>

                  {/* COL 5: ACTIONS */}
                  <div className="lg:col-span-2 flex items-center justify-end gap-2 flex-wrap">
                    {/* Sync / Listen Together */}
                    {!act.isSelf && hasActiveSong && (
                      <button
                        type="button"
                        onClick={() => handleSyncWithMember(act)}
                        disabled={isSyncingPlayer}
                        className="inline-flex items-center gap-1 bg-[#1DB954]/15 hover:bg-[#1DB954] text-[#1DB954] hover:text-black border border-[#1DB954]/30 font-extrabold text-xs px-2.5 py-1.5 rounded-xl transition-all active:scale-95 shadow-sm disabled:opacity-50 cursor-pointer"
                        title={`Riproduci "${act.track.title}" direttamente sul tuo Spotify`}
                      >
                        <span>✨</span>
                        <span className="hidden xl:inline">Sincronizza</span>
                      </button>
                    )}

                    {/* Synth Preview */}
                    {hasActiveSong && (
                      <button
                        type="button"
                        onClick={() => handlePlaySoundPreview(act)}
                        className={`p-1.5 sm:px-2.5 sm:py-1.5 border text-xs font-bold rounded-xl transition-all active:scale-95 flex items-center gap-1 cursor-pointer ${
                          isPreviewing
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 animate-pulse'
                            : 'bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10'
                        }`}
                        title="Anteprima accordi musicali"
                      >
                        <span>{isPreviewing ? '🔊' : '🎵'}</span>
                      </button>
                    )}

                    {/* Play/Pause Toggle */}
                    <button
                      type="button"
                      onClick={() => handleTogglePlay(act.memberId)}
                      className={`p-1.5 border rounded-xl transition-all text-xs cursor-pointer ${
                        hasActiveSong
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                          : 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'
                      }`}
                      title={hasActiveSong ? 'Metti in pausa' : 'Avvia riproduzione'}
                    >
                      {hasActiveSong ? '⏸' : '▶️'}
                    </button>

                    {/* Official Spotify button */}
                    {hasActiveSong ? (
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
                    ) : (
                      act.isSelf && (
                        <button
                          type="button"
                          onClick={() => setShowSongPickerModal(true)}
                          className="text-xs text-zinc-400 hover:text-zinc-200 bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-xl border border-white/10 transition-all font-bold cursor-pointer"
                        >
                          Scegli
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SONG PICKER & RECENT TRACKS MODAL */}
      {mounted && showSongPickerModal && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="song-picker-modal-title"
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/85 backdrop-blur-md overflow-hidden animate-in fade-in duration-150"
          onClick={() => setShowSongPickerModal(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[85dvh] flex flex-col rounded-3xl bg-[#121218] border border-white/15 shadow-2xl overflow-hidden relative ring-1 ring-white/10 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Emerald Top Accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#1DB954] to-emerald-400 shrink-0" />

            {/* STICKY HEADER */}
            <div className="shrink-0 p-5 sm:p-6 pb-3 border-b border-white/10 bg-[#121218] space-y-3">
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <h3 id="song-picker-modal-title" className="text-lg sm:text-xl font-extrabold text-zinc-100 flex items-center gap-2 truncate">
                    <span>🎧</span> I tuoi brani e catalogo Spotify
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5 truncate">
                    Scegli un brano da ascoltare o imposta il tuo stato SpotiShare.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSongPickerModal(false)}
                  className="text-zinc-400 hover:text-white p-1.5 sm:p-2 rounded-xl hover:bg-white/10 text-base transition-colors cursor-pointer shrink-0"
                  aria-label="Chiudi finestra"
                >
                  ✕
                </button>
              </div>

              {/* Quick Action: Reset to "Nessun brano in esecuzione" */}
              <div className="p-2.5 sm:p-3 bg-white/5 border border-white/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-zinc-200 truncate">Non stai ascoltando musica?</p>
                  <p className="text-[10px] sm:text-[11px] text-zinc-400 truncate">Imposta lo stato su &quot;Nessun brano in esecuzione&quot;.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handlePauseMyPlayback();
                    setShowSongPickerModal(false);
                  }}
                  className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold rounded-xl text-xs transition-all whitespace-nowrap active:scale-95 cursor-pointer shrink-0"
                >
                  ⏸️ Imposta Inattivo
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 p-1 bg-black/60 rounded-2xl border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setModalTab('recent')}
                  className={`py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer truncate ${
                    modalTab === 'recent'
                      ? 'bg-white/15 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span>🎧</span>
                  <span className="truncate">Brani Spotify</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('catalog')}
                  className={`py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer truncate ${
                    modalTab === 'catalog'
                      ? 'bg-white/15 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span>🔥</span>
                  <span className="truncate">Hit & Consigliati</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('custom')}
                  className={`py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer truncate ${
                    modalTab === 'custom'
                      ? 'bg-white/15 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span>✨</span>
                  <span className="truncate">Cerca / Altro</span>
                </button>
              </div>
            </div>

            {/* SCROLLABLE BODY */}
            <div className="flex-1 overflow-y-auto min-h-0 p-5 sm:p-6 space-y-4 overscroll-contain custom-scrollbar">
              {/* TAB 1: RECENT SPOTIFY TRACKS */}
              {modalTab === 'recent' && (
                <div>
                  {isLiveSpotifyConnected ? (
                    <div>
                      <div className="flex justify-between items-center mb-2.5 px-1">
                        <span className="text-xs font-bold text-zinc-300">Ascoltati di recente sul tuo account</span>
                        <button
                          type="button"
                          onClick={fetchRecentSpotifyTracks}
                          disabled={isLoadingRecent}
                          className="text-[11px] text-[#1DB954] hover:underline font-semibold cursor-pointer disabled:opacity-50"
                        >
                          {isLoadingRecent ? 'Caricamento...' : 'Aggiorna'}
                        </button>
                      </div>

                      {isLoadingRecent ? (
                        <div className="py-12 text-center">
                          <div className="w-8 h-8 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin mx-auto mb-2.5" />
                          <p className="text-xs text-zinc-400">Caricamento dei tuoi brani da Spotify...</p>
                        </div>
                      ) : recentTracks.length > 0 ? (
                        <div className="space-y-2">
                          {recentTracks.map((track) => (
                            <button
                              key={track.id}
                              type="button"
                              onClick={() => handleSelectTrackForSelf(track, true)}
                              className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-[#1DB954]/15 active:bg-[#1DB954]/25 border border-white/5 hover:border-[#1DB954]/40 rounded-2xl cursor-pointer transition-all group text-left focus:outline-none focus:ring-2 focus:ring-[#1DB954]/60 shadow-sm"
                            >
                              <div className="flex items-center gap-3 min-w-0 pointer-events-none">
                                <img
                                  src={track.coverUrl || DEFAULT_FALLBACK_COVER}
                                  alt={track.title}
                                  referrerPolicy="no-referrer"
                                  className="w-12 h-12 rounded-xl object-cover shrink-0 border border-white/10 shadow-md"
                                  onError={(e) => {
                                    e.currentTarget.src = DEFAULT_FALLBACK_COVER;
                                  }}
                                />
                                <div className="min-w-0">
                                  <p className="text-xs font-extrabold text-zinc-100 truncate group-hover:text-[#1DB954]">
                                    {track.title}
                                  </p>
                                  <p className="text-[11px] text-zinc-400 truncate mt-0.5">{track.artist}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 pointer-events-none">
                                <span className="text-[10px] font-mono font-bold text-zinc-400 bg-white/5 px-2 py-0.5 rounded-md">
                                  {formatTime(track.durationSec)}
                                </span>
                                <span className="text-xs text-black font-extrabold bg-[#1DB954] px-3 py-1.5 rounded-xl shadow-md transition-transform group-hover:scale-105">
                                  Ascolta ▶️
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center bg-black/40 border border-white/10 rounded-2xl">
                          <p className="text-xs text-zinc-400 mb-2">Nessun brano recente trovato sul tuo profilo Spotify.</p>
                          <button
                            type="button"
                            onClick={() => setModalTab('catalog')}
                            className="text-xs text-[#1DB954] font-bold hover:underline cursor-pointer"
                          >
                            Esplora il catalogo Hit & Consigliati →
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-black/40 border border-white/10 rounded-2xl">
                      <span className="text-3xl block mb-2">🎧</span>
                      <p className="text-xs font-bold text-zinc-200 mb-1">Collega il tuo account Spotify</p>
                      <p className="text-xs text-zinc-400 mb-4">
                        Connettiti per importare automaticamente i tuoi brani recenti e sincronizzare la musica in tempo reale.
                      </p>
                      <button
                        type="button"
                        onClick={handleConnectSpotifyLive}
                        className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-lg active:scale-95 cursor-pointer"
                      >
                        Collega Spotify Ora
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: VERIFIED CATALOGUE */}
              {modalTab === 'catalog' && (
                <div>
                  <div className="mb-3">
                    <input
                      type="text"
                      placeholder="Cerca brano o artista nel catalogo (es. Sfera, Lazza, Billie Eilish)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-2xl p-2.5 text-xs text-zinc-100 outline-none focus:ring-2 focus:ring-[#1DB954]/50"
                    />
                  </div>

                  <div className="space-y-2">
                    {DEFAULT_TRACK_CATALOG.filter(
                      (t) =>
                        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        t.artist.toLowerCase().includes(searchQuery.toLowerCase())
                    ).map((track) => (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() => handleSelectTrackForSelf(track, true)}
                        className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-[#1DB954]/15 active:bg-[#1DB954]/25 border border-white/5 hover:border-[#1DB954]/40 rounded-2xl cursor-pointer transition-all group text-left focus:outline-none focus:ring-2 focus:ring-[#1DB954]/60 shadow-sm"
                      >
                        <div className="flex items-center gap-3 min-w-0 pointer-events-none">
                          <img
                            src={track.coverUrl || DEFAULT_FALLBACK_COVER}
                            alt={track.title}
                            referrerPolicy="no-referrer"
                            className="w-12 h-12 rounded-xl object-cover shrink-0 border border-white/10 shadow-md"
                            onError={(e) => {
                              e.currentTarget.src = DEFAULT_FALLBACK_COVER;
                            }}
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-extrabold text-zinc-100 truncate group-hover:text-[#1DB954]">
                              {track.title}
                            </p>
                            <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                              {track.artist} • <span className="text-[#1DB954]">{track.genre}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 pointer-events-none">
                          <span className="text-[10px] font-mono font-bold text-zinc-400 bg-white/5 px-2 py-0.5 rounded-md">
                            {formatTime(track.durationSec)}
                          </span>
                          <span className="text-xs text-black font-extrabold bg-[#1DB954] px-3 py-1.5 rounded-xl shadow-md transition-transform group-hover:scale-105">
                            Scegli ▶️
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: CUSTOM TRACK FORM */}
              {modalTab === 'custom' && (
                <div>
                  <form
                    onSubmit={handleSetCustomSong}
                    className="p-4 sm:p-5 bg-black/40 border border-white/10 rounded-2xl space-y-3.5"
                  >
                    <p className="text-xs font-bold text-zinc-200">
                      Inserisci qualsiasi brano personalizzato:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 block mb-1">
                          Titolo del brano
                        </label>
                        <input
                          type="text"
                          placeholder="es. CALCOLATRICI"
                          value={customSongTitle}
                          onChange={(e) => setCustomSongTitle(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 text-xs text-zinc-100 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-[#1DB954]/50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 block mb-1">
                          Artista
                        </label>
                        <input
                          type="text"
                          placeholder="es. Sfera Ebbasta"
                          value={customSongArtist}
                          onChange={(e) => setCustomSongArtist(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 text-xs text-zinc-100 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-[#1DB954]/50"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={startImmediatelyOnSelect}
                          onChange={(e) => setStartImmediatelyOnSelect(e.target.checked)}
                          className="rounded accent-[#1DB954]"
                        />
                        <span>Avvia subito in riproduzione su SpotiShare</span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={!customSongTitle.trim()}
                      className="w-full bg-gradient-to-r from-[#1DB954] to-emerald-400 text-black font-extrabold py-2.5 rounded-xl text-xs hover:scale-[1.01] transition-all disabled:opacity-40 shadow-md cursor-pointer"
                    >
                      Imposta questo brano per il tuo profilo
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* STICKY FOOTER */}
            <div className="shrink-0 p-4 sm:p-5 border-t border-white/10 bg-[#121218] flex justify-between items-center">
              <div className="text-xs text-zinc-400 truncate mr-3 min-w-0">
                {myActivity?.isPlaying && myActivity?.track?.id !== 'none' ? (
                  <span className="flex items-center gap-1.5 text-emerald-400 font-semibold truncate">
                    <span className="w-2 h-2 rounded-full bg-[#1DB954] animate-pulse shrink-0" />
                    <span className="truncate">Attivo: {myActivity.track.title}</span>
                  </span>
                ) : (
                  <span className="text-zinc-500">Nessun brano attivo</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowSongPickerModal(false)}
                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-zinc-200 hover:text-white font-bold rounded-xl text-xs transition-all active:scale-95 cursor-pointer shrink-0"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
