import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    // Temporary response to capture Supabase auth cookies
    const tempResponse = NextResponse.next({
      request: {
        headers: request.headers,
      },
    })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
              tempResponse.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data?.session) {
      // Final redirect response
      const redirectResponse = NextResponse.redirect(`${origin}${next}`)

      // Copy all standard Supabase auth cookies
      const allCookies = tempResponse.cookies.getAll()
      allCookies.forEach(cookie => {
        redirectResponse.cookies.set(cookie.name, cookie.value)
      })

      // Store Spotify Provider Token in cookie so frontend and API routes can control Spotify playback
      if (data.session.provider_token) {
        redirectResponse.cookies.set('spotify_provider_token', data.session.provider_token, {
          path: '/',
          httpOnly: false, // accessible to client and API routes
          maxAge: 3600, // 1 hour (standard Spotify access token duration)
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production'
        })
      }

      if (data.session.provider_refresh_token) {
        redirectResponse.cookies.set('spotify_provider_refresh_token', data.session.provider_refresh_token, {
          path: '/',
          httpOnly: true,
          maxAge: 30 * 24 * 3600, // 30 days
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production'
        })
      }

      return redirectResponse
    }

    console.error('Auth exchange error:', error)
    return NextResponse.redirect(`${origin}/login?error=auth-failed`)
  }

  return NextResponse.redirect(`${origin}/login?error=auth-failed`)
}
