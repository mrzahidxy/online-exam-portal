import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  const pathname = request.nextUrl.pathname;

  // Redirect authenticated users away from auth pages to a neutral page
  // The AuthProvider will handle role-based redirects client-side
  if (
    pathname.startsWith("/auth/login") ||
    pathname.startsWith("/auth/signup")
  ) {
    if (token) {
      // Redirect to root, let AuthProvider handle role-based routing
      return NextResponse.redirect(
        new URL("/student/assessments", request.url)
      );
    }
  }

  // Redirect root to appropriate dashboard or login
  if (pathname === "/") {
    if (token) {
      // Let AuthProvider handle role-based routing from a neutral starting point
      return NextResponse.redirect(
        new URL("/student/assessments", request.url)
      );
    } else {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
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
