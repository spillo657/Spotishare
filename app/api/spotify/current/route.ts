import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    // 1. Get token from cookie or Authorization header
    const tokenFromCookie = request.cookies.get('spotify_provider_token')?.value;
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    const token = tokenFromCookie || tokenFromHeader;

    if (!token) {
      return NextResponse.json({
        connected: false,
        is_playing: false,
        error: 'NO_TOKEN',
        track: null,
        message: 'Nessun token Spotify trovato.'
      }, {
        status: 200,
        headers: { 'Cache-Control': 'no-store, max-age=0' }
      });
    }

    // 2. Fetch full player state from Spotify Web API
    let spotifyRes = await fetch('https://api.spotify.com/v1/me/player', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      cache: 'no-store'
    });

    // If /me/player returns 204 or 202, check /currently-playing as fallback
    if (spotifyRes.status === 204 || spotifyRes.status === 202) {
      spotifyRes = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        cache: 'no-store'
      });
    }

    if (spotifyRes.status === 204 || spotifyRes.status === 202) {
      // 204/202: Spotify is idle / no active playback
      return NextResponse.json({
        connected: true,
        is_playing: false,
        status: 'idle',
        track: null,
        message: 'Nessun brano in esecuzione'
      }, {
        status: 200,
        headers: { 'Cache-Control': 'no-store, max-age=0' }
      });
    }

    if (spotifyRes.status === 401) {
      // Token expired
      return NextResponse.json({
        connected: false,
        is_playing: false,
        error: 'TOKEN_EXPIRED',
        track: null,
        message: 'Token Spotify scaduto. Riconnetti Spotify.'
      }, {
        status: 200,
        headers: { 'Cache-Control': 'no-store, max-age=0' }
      });
    }

    if (spotifyRes.ok) {
      const data = await spotifyRes.json();

      if (!data || !data.item || !data.is_playing) {
        return NextResponse.json({
          connected: true,
          is_playing: false,
          status: 'paused',
          track: null,
          message: 'Nessun brano in esecuzione'
        }, {
          status: 200,
          headers: { 'Cache-Control': 'no-store, max-age=0' }
        });
      }

      const item = data.item;
      const albumImages = item.album?.images || [];
      const cover = albumImages[0]?.url || albumImages[1]?.url || '/default-cover.svg';

      const trackData = {
        id: item.id || `spotify-${Date.now()}`,
        title: item.name,
        artist: item.artists ? item.artists.map((a: any) => a.name).join(', ') : 'Artista Spotify',
        album: item.album?.name || 'Singolo',
        durationSec: Math.floor((item.duration_ms || 180000) / 1000),
        coverUrl: cover,
        spotifyUrl: item.external_urls?.spotify || `https://open.spotify.com/track/${item.id}`,
        genre: 'Spotify Live',
        audioTheme: 'energetic'
      };

      return NextResponse.json({
        connected: true,
        is_playing: true,
        progressSec: Math.floor((data.progress_ms || 0) / 1000),
        track: trackData,
        device: data.device?.name ? `${data.device.name}` : 'Spotify Device'
      }, {
        status: 200,
        headers: { 'Cache-Control': 'no-store, max-age=0' }
      });
    }

    return NextResponse.json({
      connected: true,
      is_playing: false,
      status: 'paused',
      track: null,
      message: 'Nessun brano in esecuzione'
    }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    });

  } catch (error: any) {
    console.error('Error in /api/spotify/current:', error);
    return NextResponse.json({
      connected: false,
      is_playing: false,
      track: null,
      error: error.message
    }, {
      status: 500,
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    });
  }
}
