import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const tokenFromCookie = request.cookies.get('spotify_provider_token')?.value;
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    const token = tokenFromCookie || tokenFromHeader;

    if (!token) {
      return NextResponse.json({
        connected: false,
        tracks: [],
        message: 'Nessun token Spotify trovato.'
      }, { status: 200 });
    }

    // Try recently played tracks first
    let spotifyRes = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=15', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      cache: 'no-store'
    });

    if (spotifyRes.status === 401) {
      return NextResponse.json({
        connected: false,
        error: 'TOKEN_EXPIRED',
        tracks: []
      }, { status: 200 });
    }

    let items: any[] = [];

    if (spotifyRes.ok) {
      const data = await spotifyRes.json();
      if (data && Array.isArray(data.items)) {
        items = data.items.map((i: any) => i.track).filter(Boolean);
      }
    }

    // If no recent tracks, try top tracks
    if (items.length === 0) {
      const topRes = await fetch('https://api.spotify.com/v1/me/top/tracks?limit=15', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        cache: 'no-store'
      });
      if (topRes.ok) {
        const topData = await topRes.json();
        if (topData && Array.isArray(topData.items)) {
          items = topData.items;
        }
      }
    }

    // Deduplicate by ID
    const seenIds = new Set<string>();
    const tracks = items
      .filter((item) => {
        if (!item || !item.id || seenIds.has(item.id)) return false;
        seenIds.add(item.id);
        return true;
      })
      .map((item) => {
        const albumImages = item.album?.images || [];
        const cover = albumImages[0]?.url || albumImages[1]?.url || '/default-cover.svg';
        return {
          id: item.id,
          title: item.name,
          artist: item.artists ? item.artists.map((a: any) => a.name).join(', ') : 'Artista Spotify',
          album: item.album?.name || 'Singolo',
          durationSec: Math.floor((item.duration_ms || 180000) / 1000),
          coverUrl: cover,
          spotifyUrl: item.external_urls?.spotify || `https://open.spotify.com/track/${item.id}`,
          genre: 'Spotify',
          audioTheme: 'energetic'
        };
      });

    return NextResponse.json({
      connected: true,
      tracks
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error in /api/spotify/recent:', error);
    return NextResponse.json({
      connected: false,
      tracks: [],
      error: error.message
    }, { status: 500 });
  }
}
