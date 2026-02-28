import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const authRoutes = ["/signin", "/signup"];

export function middleware(request: NextRequest) {
  const token = request.cookies.get("access_token")?.value;
  const { pathname } = request.nextUrl;

  // If user is authenticated and tries to access auth pages, redirect to dashboard
  if (token && authRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // If user is not authenticated and tries to access protected routes, redirect to signin
  if (!token && !authRoutes.includes(pathname)) {
    const signinUrl = new URL("/signin", request.url);
    signinUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signinUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - _next (static files, images, etc.)
     * - favicon.ico, images, and other static assets
     */
    "/((?!api|_next|favicon.ico|images|.*\\.).*)",
  ],
};
