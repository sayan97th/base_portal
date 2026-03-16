import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

/**
 * GET /api/admin/tracking/needs-update
 *
 * Returns all orders that need an update: orders whose status is "pending"
 * and that have not received any tracking update message yet (updates_count = 0).
 *
 * Proxies the request to the upstream Laravel API with the appropriate filters
 * and forwards the caller's Authorization header.
 *
 * Roles allowed: super_admin, admin, staff.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth_header = request.headers.get("Authorization");

  if (!auth_header) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const upstream_url = `${API_BASE_URL}/api/admin/tracking/orders?status=pending&needs_update=true`;

    const upstream_response = await fetch(upstream_url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: auth_header,
      },
      cache: "no-store",
    });

    if (!upstream_response.ok) {
      const error_data = await upstream_response.json().catch(() => ({
        message: "Upstream request failed",
      }));
      return NextResponse.json(error_data, {
        status: upstream_response.status,
      });
    }

    const data = await upstream_response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
