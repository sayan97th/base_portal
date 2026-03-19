import { loadStripe, Stripe } from "@stripe/stripe-js";

let stripe_promise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripe_promise) {
    stripe_promise = loadStripe(
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
    );
  }
  return stripe_promise;
}
