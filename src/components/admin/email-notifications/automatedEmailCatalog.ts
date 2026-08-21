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
    trigger: "A client posts a comment on one of their orders",
    delay: "Near instant, queued as soon as the comment is created",
  },
  {
    name: "Credit purchase",
    audience: "admin",
    trigger: "A client completes a credit package purchase",
    delay: "Near instant, queued as soon as the purchase completes",
  },
  {
    name: "Invoice paid",
    audience: "admin",
    trigger: "An invoice is marked as paid",
    delay: "Near instant, queued as soon as the payment is confirmed",
  },
  {
    name: "Invoice refunded",
    audience: "admin",
    trigger: "An invoice is refunded, in full or in part",
    delay: "Near instant, queued as soon as the refund is processed",
  },
  {
    name: "New support ticket",
    audience: "admin",
    trigger: "A client opens a new support ticket",
    delay: "Near instant, queued as soon as the ticket is created",
  },
  {
    name: "Pay later order placed",
    audience: "admin",
    trigger: "A client places an order using the pay later option",
    delay: "Near instant, queued as soon as the order is placed",
  },
  {
    name: "Ticket reply from client",
    audience: "admin",
    trigger: "A client replies to an existing support ticket",
    delay: "Near instant, queued as soon as the reply is posted",
  },
  {
    name: "Link building / order status update",
    audience: "client",
    trigger:
      "Fires on three conditions: every link placement on an order reaches Live (order auto marked completed), the first placement moves out of New Request (order auto marked processing), or an admin manually changes an order status with Notify client checked",
    delay: "Queued immediately on the status change, delivered as soon as a queue worker picks it up (typically a few seconds)",
  },
  {
    name: "Order update posted",
    audience: "client",
    trigger:
      "An admin posts a new update or tracking entry on an order with Send email checked",
    delay: "Queued immediately when the update is posted",
  },
  {
    name: "Order report delivered",
    audience: "client",
    trigger: "An admin sends a completed link building report for an order",
    delay: "Queued immediately when the report is sent",
  },
  {
    name: "Comment reply",
    audience: "client",
    trigger: "An admin replies to the client's comment on an order",
    delay: "Near instant, queued as soon as the reply is posted",
  },
  {
    name: "Ticket reply",
    audience: "client",
    trigger: "An admin replies to the client's support ticket",
    delay: "Near instant, queued as soon as the reply is posted",
  },
  {
    name: "Invoice refunded (client copy)",
    audience: "client",
    trigger: "An admin processes a refund on the client's invoice",
    delay: "Near instant, queued as soon as the refund is processed",
  },
  {
    name: "Payment successful",
    audience: "client",
    trigger: "A client's payment on an invoice or order is successfully processed",
    delay: "Near instant, queued as soon as the payment confirmation is received",
  },
  {
    name: "Credit purchase confirmation",
    audience: "client",
    trigger: "A client completes a credit package purchase",
    delay: "Near instant, queued as soon as the purchase completes",
  },
  {
    name: "Client welcome email",
    audience: "client",
    trigger: "A new client account is created, or an admin resends the welcome email",
    delay: "Near instant for a single client. For a bulk batch, delivery is staggered across the batch run",
  },
  {
    name: "Client / team / staff invitation",
    audience: "client",
    trigger: "An admin invites a new client, team member, or staff member",
    delay: "Near instant, queued as soon as the invitation is created",
  },
];
