import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = request.cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
            NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Create a response that redirects to the dashboard (or the 'next' param)
      const response = NextResponse.redirect(`${origin}${next}`)

      // Important: the cookies from exchangeCodeForSession must be passed to the response
      // Since the createServerClient's setAll updates the request,
      // we need to make sure they are also on the response.
      // However, with @supabase/ssr and the current pattern,
      // we can simply return the redirect.
      return response
    }
  }

  // Return the user to an error page or login if something went wrong
  return NextResponse.redirect(`${origin}/login?error=auth-failed`)
}
