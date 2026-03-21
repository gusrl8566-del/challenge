import { NextRequest, NextResponse } from 'next/server';

const participantAllowedRoutes = ['/', '/upload'];
const adminAllowedRoutes = ['/rankings', '/admin'];

function isAllowed(pathname: string, routes: string[]): boolean {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasAdminToken = Boolean(request.cookies.get('admin_access_token')?.value);

  if (pathname === '/admin/login' && hasAdminToken) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  if (!hasAdminToken) {
    if (pathname === '/admin/login' || isAllowed(pathname, participantAllowedRoutes)) {
      return NextResponse.next();
    }

    if (pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    return NextResponse.redirect(new URL('/', request.url));
  }

  if (isAllowed(pathname, adminAllowedRoutes)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL('/rankings', request.url));
}

export const config = {
  matcher: ['/', '/upload/:path*', '/rankings/:path*', '/admin/:path*'],
};
