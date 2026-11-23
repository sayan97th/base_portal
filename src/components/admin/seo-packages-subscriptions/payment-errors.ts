import type { ChargeErrorShape } from "@/services/admin/seo-packages-subscription.service";

export type PaymentErrorKind = "funds" | "expired" | "declined" | "card" | "verification" | "system" | "conflict";

export interface PaymentErrorInfo {
  kind: PaymentErrorKind;
  title: string;
  explanation: string;
  next_steps: string[];
  /** True when choosing a different card is the most likely fix. */
  suggests_other_card: boolean;
  /** True when trying the same card again could work. */
  can_retry_same_card: boolean;
}

const ASK_CLIENT_TO_PAY = "Ask the client to pay the invoice from their portal.";

const PAYMENT_ERRORS: Record<string, PaymentErrorInfo> = {
  insufficient_funds: {
    kind: "funds",
    title: "Insufficient funds",
    explanation: "The bank declined the payment because the card does not have enough available balance.",
    next_steps: [
      "Try another card saved on the client's account.",
      "Ask the client to add funds and retry later.",
      ASK_CLIENT_TO_PAY,
    ],
    suggests_other_card: true,
    can_retry_same_card: true,
  },
  card_velocity_exceeded: {
    kind: "funds",
    title: "Card limit reached",
    explanation: "The card has reached its spending or transaction limit for now.",
    next_steps: ["Try another card.", "Ask the client to contact their bank to raise the limit."],
    suggests_other_card: true,
    can_retry_same_card: false,
  },
  withdrawal_count_limit_exceeded: {
    kind: "funds",
    title: "Card limit reached",
    explanation: "The card has reached its spending or transaction limit for now.",
    next_steps: ["Try another card.", "Ask the client to contact their bank to raise the limit."],
    suggests_other_card: true,
    can_retry_same_card: false,
  },
  expired_card: {
    kind: "expired",
    title: "Card expired",
    explanation: "This card is past its expiration date, so the bank will not accept it.",
    next_steps: ["Choose another card that is still valid.", "Ask the client to add a new card to their account."],
    suggests_other_card: true,
    can_retry_same_card: false,
  },
  incorrect_cvc: {
    kind: "card",
    title: "Security code mismatch",
    explanation: "The bank rejected the card because the security code on file does not match.",
    next_steps: ["Ask the client to remove the card and add it again.", "Try another card."],
    suggests_other_card: true,
    can_retry_same_card: false,
  },
  incorrect_number: {
    kind: "card",
    title: "Card no longer valid",
    explanation: "The bank reports that this card number is not valid anymore.",
    next_steps: ["Ask the client to add a new card.", "Try another card."],
    suggests_other_card: true,
    can_retry_same_card: false,
  },
  invalid_payment_method: {
    kind: "card",
    title: "Card no longer valid",
    explanation: "This saved card can no longer be used for payments.",
    next_steps: ["Ask the client to add a new card.", "Try another card."],
    suggests_other_card: true,
    can_retry_same_card: false,
  },
  invalid_account: {
    kind: "card",
    title: "Card account closed",
    explanation: "The account linked to this card is closed or invalid.",
    next_steps: ["Ask the client to add a new card.", "Try another card."],
    suggests_other_card: true,
    can_retry_same_card: false,
  },
  lost_card: {
    kind: "declined",
    title: "Card blocked by the bank",
    explanation: "The bank has blocked this card. For privacy, the bank does not share more details.",
    next_steps: ["Ask the client to contact their bank or use a different card.", "Try another card."],
    suggests_other_card: true,
    can_retry_same_card: false,
  },
  stolen_card: {
    kind: "declined",
    title: "Card blocked by the bank",
    explanation: "The bank has blocked this card. For privacy, the bank does not share more details.",
    next_steps: ["Ask the client to contact their bank or use a different card.", "Try another card."],
    suggests_other_card: true,
    can_retry_same_card: false,
  },
  pickup_card: {
    kind: "declined",
    title: "Card blocked by the bank",
    explanation: "The bank has blocked this card. For privacy, the bank does not share more details.",
    next_steps: ["Ask the client to contact their bank or use a different card.", "Try another card."],
    suggests_other_card: true,
    can_retry_same_card: false,
  },
  restricted_card: {
    kind: "declined",
    title: "Card restricted",
    explanation: "The bank does not allow this card to be used for this type of payment.",
    next_steps: ["Try another card.", "Ask the client to contact their bank."],
    suggests_other_card: true,
    can_retry_same_card: false,
  },
  do_not_honor: {
    kind: "declined",
    title: "Declined by the bank",
    explanation: "The bank declined the payment without giving a specific reason.",
    next_steps: [
      "Ask the client to contact their bank to approve the charge, then retry.",
      "Try another card.",
    ],
    suggests_other_card: true,
    can_retry_same_card: true,
  },
  generic_decline: {
    kind: "declined",
    title: "Declined by the bank",
    explanation: "The bank declined the payment without giving a specific reason.",
    next_steps: [
      "Ask the client to contact their bank to approve the charge, then retry.",
      "Try another card.",
    ],
    suggests_other_card: true,
    can_retry_same_card: true,
  },
  card_declined: {
    kind: "declined",
    title: "Card declined",
    explanation: "The bank declined the payment.",
    next_steps: [
      "Ask the client to contact their bank to approve the charge, then retry.",
      "Try another card.",
      ASK_CLIENT_TO_PAY,
    ],
    suggests_other_card: true,
    can_retry_same_card: true,
  },
  fraudulent: {
    kind: "declined",
    title: "Declined by the bank",
    explanation: "The bank flagged this payment and declined it.",
    next_steps: ["Ask the client to contact their bank.", "Try another card."],
    suggests_other_card: true,
    can_retry_same_card: false,
  },
  authentication_required: {
    kind: "verification",
    title: "Client verification needed",
    explanation:
      "The bank wants the cardholder to approve this payment themselves, which cannot be done from an admin charge.",
    next_steps: [ASK_CLIENT_TO_PAY, "Try another card."],
    suggests_other_card: true,
    can_retry_same_card: false,
  },
  no_payment_method: {
    kind: "card",
    title: "No card on file",
    explanation: "The client does not have a valid card saved on their account.",
    next_steps: ["Ask the client to add a card to their account.", ASK_CLIENT_TO_PAY],
    suggests_other_card: false,
    can_retry_same_card: false,
  },
  card_not_found: {
    kind: "card",
    title: "Card not available",
    explanation: "This card is not saved on the client's account anymore.",
    next_steps: ["Reload the page and choose a card from the updated list."],
    suggests_other_card: true,
    can_retry_same_card: false,
  },
  card_owner_mismatch: {
    kind: "card",
    title: "Card not available",
    explanation: "This card does not belong to the client of this subscription, so it was not charged.",
    next_steps: ["Reload the page and choose one of the client's own cards."],
    suggests_other_card: true,
    can_retry_same_card: false,
  },
  processing_error: {
    kind: "system",
    title: "Temporary processing error",
    explanation: "The payment processor had a temporary problem. The card was not charged.",
    next_steps: ["Wait a minute and retry the payment."],
    suggests_other_card: false,
    can_retry_same_card: true,
  },
  charge_in_progress: {
    kind: "conflict",
    title: "Payment already in progress",
    explanation: "Another charge for this period is running right now.",
    next_steps: ["Wait a moment, then open the subscription to see the result."],
    suggests_other_card: false,
    can_retry_same_card: false,
  },
  charge_conflict: {
    kind: "conflict",
    title: "Payment already in progress",
    explanation: "Another charge for this period is running right now.",
    next_steps: ["Wait a moment, then open the subscription to see the result."],
    suggests_other_card: false,
    can_retry_same_card: false,
  },
  already_paid: {
    kind: "conflict",
    title: "Period already paid",
    explanation: "This billing period was already paid, so the card was not charged again.",
    next_steps: ["Open the subscription to see the payment history."],
    suggests_other_card: false,
    can_retry_same_card: false,
  },
  charge_not_allowed: {
    kind: "system",
    title: "Payment not allowed",
    explanation: "This subscription cannot be charged right now.",
    next_steps: ["Open the subscription and check its status and end date."],
    suggests_other_card: false,
    can_retry_same_card: false,
  },
  forbidden: {
    kind: "system",
    title: "Permission needed",
    explanation: "Your role is not allowed to charge subscriptions.",
    next_steps: ["Ask an admin to run this payment."],
    suggests_other_card: false,
    can_retry_same_card: false,
  },
  network_error: {
    kind: "system",
    title: "Connection problem",
    explanation:
      "We could not reach the server, so we do not know if the payment went through.",
    next_steps: ["Open the subscription and check the payment history before trying again."],
    suggests_other_card: false,
    can_retry_same_card: false,
  },
};

const FALLBACK_ERROR: PaymentErrorInfo = {
  kind: "declined",
  title: "Payment failed",
  explanation: "The payment could not be completed.",
  next_steps: ["Try another card.", ASK_CLIENT_TO_PAY],
  suggests_other_card: true,
  can_retry_same_card: true,
};

export interface ResolvedPaymentError extends PaymentErrorInfo {
  code: string;
  /** Raw message from the server or the bank, shown as extra detail. */
  server_message: string | null;
}

/** Maps a charge error response to a clear, actionable message. */
export function resolvePaymentError(error: unknown): ResolvedPaymentError {
  const charge_error = (error ?? {}) as ChargeErrorShape;
  const status_code = charge_error.status_code;

  let code = charge_error.error_code || charge_error.charge?.failure_code || "";
  if (!code && status_code === 403) code = "forbidden";
  if (!code && status_code === undefined) code = "network_error";
  if (!code) code = "card_declined";

  const info = PAYMENT_ERRORS[code] ?? FALLBACK_ERROR;
  const server_message = charge_error.message || charge_error.charge?.failure_message || null;

  return { ...info, code, server_message };
}
