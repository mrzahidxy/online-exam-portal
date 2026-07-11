import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  const pathname = request.nextUrl.pathname;

  // Redirect root to login only when there is no session cookie.
  // Role-specific routing is handled after login/registration on the client.
  if (pathname === "/" && !token) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Protect admin routes
  if (pathname.startsWith("/admin")) {
    if (!token) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }

  // Protect student routes
  if (pathname.startsWith("/student")) {
    if (!token) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/auth/login",
    "/auth/signup",
    "/admin/:path*",
    "/student/:path*",
  ],
};
