import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
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
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isPublicAdminRoute = 
    request.nextUrl.pathname.startsWith('/admin/login') ||
    request.nextUrl.pathname.startsWith('/admin/recuperar-password') ||
    request.nextUrl.pathname.startsWith('/admin/actualizar-password')

  const isPublicPortalRoute = 
    request.nextUrl.pathname.startsWith('/portal/login') ||
    request.nextUrl.pathname.startsWith('/portal/recuperar-password') ||
    request.nextUrl.pathname.startsWith('/portal/actualizar-password') ||
    request.nextUrl.pathname.startsWith('/portal/activar-cuenta') ||
    request.nextUrl.pathname.startsWith('/portal/no-autorizado') ||
    request.nextUrl.pathname.startsWith('/portal/membresia-inactiva')

  // Protected Admin routes check
  if (request.nextUrl.pathname.startsWith('/admin') && !isPublicAdminRoute) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      return NextResponse.redirect(url)
    }
  }

  // Protected Portal routes check
  if (request.nextUrl.pathname.startsWith('/portal') && !isPublicPortalRoute) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/portal/login'
      return NextResponse.redirect(url)
    }
  }

  // Redirect authenticated users away from admin login page
  if (request.nextUrl.pathname === '/admin/login' && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin'
    return NextResponse.redirect(url)
  }

  return response
}
