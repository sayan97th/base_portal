export type EmailAudience = "admin" | "client";

export interface AutomatedEmailCatalogEntry {
  name: string;
  audience: EmailAudience;
  trigger: string;
  delay: string;
}

// Reference catalog of every automated email currently wired up in the
// platform. Kept here as static documentation so admins can see, in one
// place, exactly what fires and why, without having to read the codebase.
export const AUTOMATED_EMAIL_CATALOG: AutomatedEmailCatalogEntry[] = [
  {
    name: "New order comment",
    audience: "admin",
    trigger: "Client comments on an order",
    delay: "Near instant, staggered per recipient",
  },
  {
    name: "Credit purchase",
    audience: "admin",
    trigger: "Client completes a credit purchase",
    delay: "Near instant, staggered per recipient",
  },
  {
    name: "Invoice paid",
    audience: "admin",
    trigger: "An invoice is marked as paid",
    delay: "Near instant, staggered per recipient",
  },
  {
    name: "Invoice refunded",
    audience: "admin",
    trigger: "An invoice is refunded, full or partial",
    delay: "Near instant, staggered per recipient",
  },
  {
    name: "New support ticket",
    audience: "admin",
    trigger: "Client opens a new support ticket",
    delay: "Near instant, staggered per recipient",
  },
  {
    name: "Pay later order placed",
    audience: "admin",
    trigger: "Client places a pay later order",
    delay: "Near instant, staggered per recipient",
  },
  {
    name: "Ticket reply from client",
    audience: "admin",
    trigger: "Client replies to a support ticket",
    delay: "Near instant, staggered per recipient",
  },
  {
    name: "Link building / order status update",
    audience: "client",
    trigger: "All placements go Live, the first leaves New Request, or an admin notifies manually",
    delay: "Immediate, queued on the status change",
  },
  {
    name: "Order update posted",
    audience: "client",
    trigger: "Admin posts an order update with Send email checked",
    delay: "Immediate, queued on posting",
  },
  {
    name: "Order report delivered",
    audience: "client",
    trigger: "Admin sends a completed link building report",
    delay: "Immediate, queued when sent",
  },
  {
    name: "Comment reply",
    audience: "client",
    trigger: "Admin replies to the client's order comment",
    delay: "Near instant",
  },
  {
    name: "Ticket reply",
    audience: "client",
    trigger: "Admin replies to the client's support ticket",
    delay: "Near instant",
  },
  {
    name: "Invoice refunded (client copy)",
    audience: "client",
    trigger: "Admin processes a refund on the invoice",
    delay: "Near instant",
  },
  {
    name: "Payment successful",
    audience: "client",
    trigger: "A payment is processed successfully",
    delay: "Near instant",
  },
  {
    name: "Credit purchase confirmation",
    audience: "client",
    trigger: "Client completes a credit purchase",
    delay: "Near instant",
  },
  {
    name: "Client welcome email",
    audience: "client",
    trigger: "New account created, or admin resends the welcome email",
    delay: "Instant, staggered for bulk batches",
  },
  {
    name: "Client / team / staff invitation",
    audience: "client",
    trigger: "Admin sends an invitation",
    delay: "Near instant",
  },
];
