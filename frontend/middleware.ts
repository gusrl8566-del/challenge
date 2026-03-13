import { NextRequest, NextResponse } from 'next/server';

const protectedAdminRoutes = ['/admin', '/admin/dashboard', '/admin/scores', '/admin/rankings'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  const isProtected = protectedAdminRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const token = request.cookies.get('admin_access_token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
