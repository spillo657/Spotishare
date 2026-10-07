import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    // We use a temporary response to capture cookies set by the Supabase client
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

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Final redirect response
      const redirectResponse = NextResponse.redirect(`${origin}${next}`)

      // Explicitly copy all cookies from the session exchange into the final redirect
      const allCookies = tempResponse.cookies.getAll()
      allCookies.forEach(cookie => {
        redirectResponse.cookies.set(cookie.name, cookie.value)
      })

      return redirectResponse
    }

    console.error('Auth exchange error:', error)
    return NextResponse.redirect(`${origin}/login?error=auth-failed`)
  }

  return NextResponse.redirect(`${origin}/login?error=auth-failed`)
}
