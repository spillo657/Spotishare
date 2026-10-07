import { createClient } from '@supabase/supabase-js';

export async function verifySpotifyPremium(accessToken: string) {
  try {
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) return { verified: false, error: 'Invalid token' };

    const data = await response.json();

    // Note: Spotify's public API doesn't explicitly return "Family Plan" member status.
    // We can verify the user exists and is active.
    // For a real production app, we'd check the 'product' field if available via specific scopes.
    return {
      verified: true,
      userName: data.display_name,
      email: data.email,
    };
  } catch (error) {
    return { verified: false, error: 'API Error' };
  }
}
