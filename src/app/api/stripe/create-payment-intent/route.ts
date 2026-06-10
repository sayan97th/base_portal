import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const {
      amount_cents,
      metadata,
      stripe_payment_method_id,
      save_for_future,
    } = await req.json();

    if (!amount_cents || typeof amount_cents !== "number" || amount_cents <= 0) {
      return NextResponse.json(
        { error: "Invalid amount provided." },
        { status: 400 }
      );
    }

    // When paying with a saved card (attached to a Stripe Customer) Stripe
    // requires the PaymentIntent to reference that same customer.
    // We resolve the customer_id by retrieving the PaymentMethod from Stripe.
    let stripe_customer_id: string | undefined;
    if (stripe_payment_method_id) {
      const pm = await stripe.paymentMethods.retrieve(stripe_payment_method_id);
      if (pm.customer) {
        stripe_customer_id =
          typeof pm.customer === "string" ? pm.customer : pm.customer.id;
      }
    }

    // When the user wants to save the card for future purchases, we must:
    //  1. Find or create a Stripe Customer for this user so the PM can be attached.
    //  2. Create the PI with setup_future_usage so Stripe marks the PM as reusable.
    //  3. Use payment_method_types: ['card'] instead of automatic_payment_methods
    //     so the resulting PM can be directly attached to the Customer afterward.
    if (save_for_future && !stripe_customer_id) {
      const auth_header = req.headers.get("Authorization");

      if (auth_header) {
        try {
          const api_base =
            process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

          const me_response = await fetch(`${api_base}/api/auth/me`, {
            headers: {
              Authorization: auth_header,
              Accept: "application/json",
            },
          });

          if (me_response.ok) {
            const me_data = await me_response.json();
            const user = me_data.user ?? me_data.data ?? me_data;

            const existing_customers = await stripe.customers.list({
              email: user.email,
              limit: 1,
            });

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
          }
        } catch {
          // If customer lookup fails, proceed without customer — card can still
          // be charged; saving will be attempted post-payment via direct attach.
        }
      }
    }

    const payment_intent_params: Stripe.PaymentIntentCreateParams = {
      amount: amount_cents,
      currency: "usd",
      metadata: metadata ?? {},
      ...(stripe_customer_id ? { customer: stripe_customer_id } : {}),
    };

    // When saving the card for future use: use explicit card-only types and
    // set setup_future_usage so Stripe attaches the PM to the Customer and
    // optimizes SCA for future off-session charges.
    if (save_for_future && stripe_customer_id) {
      payment_intent_params.payment_method_types = ["card"];
      payment_intent_params.setup_future_usage = "off_session";
    } else {
      payment_intent_params.automatic_payment_methods = { enabled: true };
    }

    const payment_intent = await stripe.paymentIntents.create(
      payment_intent_params
    );

    return NextResponse.json({
      client_secret: payment_intent.client_secret,
      payment_intent_id: payment_intent.id,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to create payment intent.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
