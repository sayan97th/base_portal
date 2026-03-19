import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * POST /api/stripe/setup-intent
 *
 * Creates a Stripe SetupIntent to securely save a payment method.
 * Finds or creates a Stripe Customer for the authenticated user (by email).
 * Returns the client_secret needed by the frontend to confirm the setup.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth_header = request.headers.get("Authorization");

  if (!auth_header) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const api_base =
      process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

    // Retrieve authenticated user from the Laravel API
    const me_response = await fetch(`${api_base}/api/auth/me`, {
      headers: {
        Authorization: auth_header,
        Accept: "application/json",
      },
    });

    if (!me_response.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const me_data = await me_response.json();
    // Handle both { user: {...} } and { data: {...} } and flat response formats
    const user = me_data.user ?? me_data.data ?? me_data;

    // Find existing Stripe customer by email or create a new one
    const existing_customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    let stripe_customer_id: string;

    if (existing_customers.data.length > 0) {
      stripe_customer_id = existing_customers.data[0].id;
    } else {
      const full_name = [user.first_name, user.last_name]
        .filter(Boolean)
        .join(" ");

      const customer = await stripe.customers.create({
        email: user.email,
        name: full_name || undefined,
        metadata: { user_id: String(user.id) },
      });

      stripe_customer_id = customer.id;
    }

    const setup_intent = await stripe.setupIntents.create({
      customer: stripe_customer_id,
      payment_method_types: ["card"],
    });

    return NextResponse.json({
      client_secret: setup_intent.client_secret,
    });
  } catch (error) {
    console.error("[stripe/setup-intent] Error:", error);
    return NextResponse.json(
      { error: "Failed to create setup intent. Please try again." },
      { status: 500 }
    );
  }
}
