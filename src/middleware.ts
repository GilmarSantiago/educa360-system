import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('educa360_session')?.value;

  // Rutas públicas que no requieren autenticación
  const isPublicRoute =
    pathname === '/' ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/_next') ||
    pathname.includes('/favicon.ico');

  // Si intenta acceder a una ruta protegida
  if (!isPublicRoute) {
    if (!token) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    const session = await verifyToken(token);
    if (!session) {
      const redirectUrl = new URL('/?reason=expired', req.url);
      const res = NextResponse.redirect(redirectUrl);
      res.cookies.set('educa360_session', '', {
        path: '/',
        maxAge: 0,
      });
      return res;
    }
  }

  // Si está autenticado e intenta ir a la página de login ("/")
  if (token && pathname === '/') {
    const session = await verifyToken(token);
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)', '/dashboard/:path*'],
};
