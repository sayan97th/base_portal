import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/stripe/setup-intent
 *
 * Proxies to the Laravel API so the Stripe Customer is always resolved from
 * `users.stripe_customer_id`, the single source of truth. Creating a Stripe
 * Customer here directly (as this route previously did, by searching Stripe
 * for a customer by email) produced a second, divergent Customer object
 * whenever a user had not yet gone through checkout. The SetupIntent, and the
 * PaymentMethod it confirms, would then be attached to that divergent
 * customer, which the backend does not recognize when saving the payment
 * profile, causing every save to fail with a customer mismatch.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth_header = request.headers.get("Authorization");

  if (!auth_header) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const api_base =
      process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

    const backend_response = await fetch(`${api_base}/api/stripe/setup-intent`, {
      method: "POST",
      headers: {
        Authorization: auth_header,
        Accept: "application/json",
      },
    });

    const data = await backend_response.json();

    if (!backend_response.ok) {
      return NextResponse.json(
        {
          error:
            data.error ?? data.message ?? "Failed to create setup intent. Please try again.",
        },
        { status: backend_response.status }
      );
    }

    return NextResponse.json({ client_secret: data.client_secret });
  } catch (error) {
    console.error("[stripe/setup-intent] Error:", error);
    return NextResponse.json(
      { error: "Failed to create setup intent. Please try again." },
      { status: 500 }
    );
  }
}
