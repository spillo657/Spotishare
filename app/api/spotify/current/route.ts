import { NextRequest, NextResponse } from 'next/server';

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
        message: 'Nessun token Spotify disponibile. Effettua l\'accesso con Spotify.'
      }, { status: 200 });
    }

    // 2. Fetch currently-playing track from Spotify Web API
    const spotifyRes = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      cache: 'no-store'
    });

    if (spotifyRes.status === 204 || spotifyRes.status === 202) {
      // 204: Spotify is idle or paused
      return NextResponse.json({
        connected: true,
        is_playing: false,
        status: 'paused',
        message: 'Musica in pausa su Spotify'
      }, { status: 200 });
    }

    if (spotifyRes.status === 401) {
      // Token expired
      return NextResponse.json({
        connected: false,
        is_playing: false,
        error: 'TOKEN_EXPIRED',
        message: 'Token Spotify scaduto. Riconnetti Spotify.'
      }, { status: 200 });
    }

    if (spotifyRes.ok) {
      const data = await spotifyRes.json();

      if (!data || !data.item) {
        return NextResponse.json({
          connected: true,
          is_playing: false,
          status: 'paused',
          message: 'Musica in pausa su Spotify'
        }, { status: 200 });
      }

      const item = data.item;
      const trackData = {
        id: item.id || `spotify-${Date.now()}`,
        title: item.name,
        artist: item.artists ? item.artists.map((a: any) => a.name).join(', ') : 'Artista Spotify',
        album: item.album?.name || 'Album Spotify',
        durationSec: Math.floor((item.duration_ms || 180000) / 1000),
        coverUrl: item.album?.images?.[0]?.url || 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/a4/4f/73/a44f738c-8515-581d-e0fa-0e78c857790b/23UM1IM28532.rgb.jpg/600x600bb.jpg',
        spotifyUrl: item.external_urls?.spotify || `https://open.spotify.com/track/${item.id}`,
        genre: 'Spotify Live',
        audioTheme: 'energetic'
      };

      return NextResponse.json({
        connected: true,
        is_playing: Boolean(data.is_playing),
        progressSec: Math.floor((data.progress_ms || 0) / 1000),
        track: trackData,
        device: 'Spotify Device'
      }, { status: 200 });
    }

    // Other errors
    return NextResponse.json({
      connected: true,
      is_playing: false,
      status: 'unknown',
      error: `Spotify API responded with status ${spotifyRes.status}`
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error in /api/spotify/current:', error);
    return NextResponse.json({
      connected: false,
      is_playing: false,
      error: error.message || 'Internal error'
    }, { status: 500 });
  }
}
