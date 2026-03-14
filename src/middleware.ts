import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ROLE_COOKIE_NAME, isStaffRole } from "@/lib/roles";

const auth_routes = ["/signin", "/signup"];
const invitation_routes = ["/accept-invitation"];

/**
 * Returns true when the pathname starts with any of the given prefixes.
 */
function matchesAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get("access_token")?.value;
  const primary_role = request.cookies.get(ROLE_COOKIE_NAME)?.value;
  const { pathname } = request.nextUrl;

  const is_auth_route = matchesAny(pathname, auth_routes);
  const is_invitation_route = matchesAny(pathname, invitation_routes);
  const is_admin_route = pathname === "/admin" || pathname.startsWith("/admin/");

  // ── Unauthenticated users ─────────────────────────────────────────────────

  if (!token) {
    // Allow access to auth pages and invitation acceptance.
    if (is_auth_route || is_invitation_route) {
      return NextResponse.next();
    }
    // Everything else requires authentication.
    const signin_url = new URL("/signin", request.url);
    signin_url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signin_url);
  }

  // ── Authenticated users ───────────────────────────────────────────────────

  const is_staff = primary_role ? isStaffRole(primary_role) : false;

  // Prevent authenticated users from accessing auth pages.
  if (is_auth_route) {
    const destination = is_staff ? "/admin/dashboard" : "/";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  // Admin-only routes: block regular clients entirely.
  if (is_admin_route) {
    if (!is_staff) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Redirect admin/staff away from ALL client-portal routes to their dashboard.
  if (is_staff) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
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
