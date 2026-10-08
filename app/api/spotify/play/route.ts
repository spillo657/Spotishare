import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const tokenFromCookie = request.cookies.get('spotify_provider_token')?.value;
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    const token = tokenFromCookie || tokenFromHeader;

    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'NO_TOKEN',
        message: 'Token Spotify non trovato. Riconnetti il tuo account Spotify.'
      }, { status: 401 });
    }

    const body = await request.json();
    const { uri, uris, position_ms } = body;

    const targetUris = uris || (uri ? [uri] : []);

    if (targetUris.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'MISSING_URI',
        message: 'Nessun URI brano fornito'
      }, { status: 400 });
    }

    const spotifyRes = await fetch('https://api.spotify.com/v1/me/player/play', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uris: targetUris,
        position_ms: position_ms || 0
      })
    });

    if (spotifyRes.status === 204 || spotifyRes.ok) {
      return NextResponse.json({
        success: true,
        message: 'Riproduzione avviata con successo sul tuo Spotify!'
      });
    }

    if (spotifyRes.status === 404) {
      // 404: No active device found
      return NextResponse.json({
        success: false,
        error: 'NO_ACTIVE_DEVICE',
        message: 'Nessun dispositivo Spotify attivo trovato. Apri Spotify su uno dei tuoi dispositivi.'
      }, { status: 200 });
    }

    if (spotifyRes.status === 403) {
      return NextResponse.json({
        success: false,
        error: 'RESTRICTED',
        message: 'Azione limitata (richiede Spotify Premium attivo per il controllo da remoto).'
      }, { status: 200 });
    }

    const errData = await spotifyRes.text();
    return NextResponse.json({
      success: false,
      error: `Spotify status ${spotifyRes.status}`,
      details: errData
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error in /api/spotify/play:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal error'
    }, { status: 500 });
  }
}
