import type { PaymentProfile } from "@/types/client/payment-profile";
import CardBrandIcon from "./CardBrandIcon";
import { formatCardExpiry, getCardBrandLabel, isPaymentProfileExpired } from "./invoicePaymentUtils";

interface SavedCardOptionProps {
  payment_profile: PaymentProfile;
  is_selected: boolean;
  is_disabled: boolean;
  onSelect: (payment_profile_id: string) => void;
}

export default function SavedCardOption({ payment_profile, is_selected, is_disabled, onSelect }: SavedCardOptionProps) {
  const is_expired = isPaymentProfileExpired(payment_profile);
  const is_unavailable = is_disabled || is_expired;

  return (
    <label
      className={`flex items-center gap-4 rounded-xl border p-4 transition-all ${
        is_expired
          ? "cursor-not-allowed border-gray-200 bg-gray-50 opacity-60"
          : is_selected
          ? "cursor-pointer border-brand-500 bg-brand-50/40 ring-2 ring-brand-500/15"
          : "cursor-pointer border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <input
        type="radio"
        name="invoice_payment_method"
        value={payment_profile.id}
        checked={is_selected}
        disabled={is_unavailable}
        onChange={() => onSelect(payment_profile.id)}
        className="h-4 w-4 shrink-0 accent-brand-500"
      />

      <CardBrandIcon card_brand={payment_profile.card_brand} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900">
          {getCardBrandLabel(payment_profile.card_brand)} ending in {payment_profile.last_four}
        </p>
        <p className="mt-0.5 truncate text-xs text-gray-500">
          {payment_profile.cardholder_name ? `${payment_profile.cardholder_name} · ` : ""}
          {is_expired ? "Expired " : "Expires "}
          {formatCardExpiry(payment_profile)}
        </p>
      </div>

      {payment_profile.is_default && !is_expired && (
        <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
          Default
        </span>
      )}
      {is_expired && (
        <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600">
          Expired
        </span>
      )}
    </label>
  );
}
