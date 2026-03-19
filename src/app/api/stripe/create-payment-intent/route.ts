import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { amount_cents, metadata, stripe_payment_method_id } = await req.json();

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

    const payment_intent = await stripe.paymentIntents.create({
      amount: amount_cents,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata: metadata ?? {},
      ...(stripe_customer_id ? { customer: stripe_customer_id } : {}),
    });

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
