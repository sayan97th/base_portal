import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ROLE_COOKIE_NAME, isStaffRole } from "@/lib/roles";

const auth_routes = ["/signin", "/signup"];
const invitation_routes = ["/accept-invitation"];
const password_reset_routes = ["/reset-password"];

/**
 * Returns true when the pathname starts with any of the given prefixes.
 */
function matchesAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

// Matches /invoices/{id}/view (public token-based invoice view)
function isPublicInvoiceView(pathname: string): boolean {
  return /^\/invoices\/[^/]+\/view$/.test(pathname);
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get("access_token")?.value;
  const primary_role = request.cookies.get(ROLE_COOKIE_NAME)?.value;
  const { pathname } = request.nextUrl;

  const is_auth_route = matchesAny(pathname, auth_routes);
  const is_invitation_route = matchesAny(pathname, invitation_routes);
  const is_password_reset_route = matchesAny(pathname, password_reset_routes);
  const is_admin_route = pathname === "/admin" || pathname.startsWith("/admin/");
  const is_public_invoice_view = isPublicInvoiceView(pathname);

  // ── Unauthenticated users ─────────────────────────────────────────────────

  if (!token) {
    // Allow access to auth pages, invitation acceptance, password reset, and public invoice views.
    if (is_auth_route || is_invitation_route || is_password_reset_route || is_public_invoice_view) {
      return NextResponse.next();
    }
    // Everything else requires authentication.
    const signin_url = new URL("/signin", request.url);
    signin_url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signin_url);
  }

  // ── Authenticated users ───────────────────────────────────────────────────

  const is_staff = primary_role ? isStaffRole(primary_role) : false;

  // Prevent authenticated users from accessing auth/password-reset pages.
  if (is_auth_route || is_password_reset_route) {
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

  // Always allow the public invoice view regardless of role.
  if (is_public_invoice_view) {
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
