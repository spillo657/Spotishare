import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    // 1. Verify that the request comes from an authenticated SpotiShare user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Non autorizzato. Effettua l\'accesso a SpotiShare.'
      }, { status: 401 });
    }

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

    const spotifyRes = await fetch('https://api.spotify.com/v1/me/player/pause', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (spotifyRes.status === 204 || spotifyRes.ok) {
      return NextResponse.json({
        success: true,
        message: 'Musica messa in pausa su Spotify'
      });
    }

    return NextResponse.json({
      success: false,
      error: `Spotify status ${spotifyRes.status}`
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
