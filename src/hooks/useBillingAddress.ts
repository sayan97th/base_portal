import { useState, useEffect } from "react";
import { profileService } from "@/services/client/profile.service";
import type { BillingAddress } from "@/components/shared/CheckoutStep";

export interface UseBillingAddressReturn {
  saved_billing_address: BillingAddress | null;
  is_loading: boolean;
  has_saved_address: boolean;
}

/**
 * Fetches the authenticated user's saved billing address from their profile.
 * Returns null when the profile has no address data or the fetch fails.
 *
 * Data source: GET /api/profile  (existing endpoint — no new endpoint required)
 * Fields mapped:
 *   profile.address        → billing_address.address
 *   profile.city           → billing_address.city
 *   profile.country        → billing_address.country
 *   profile.state_province → billing_address.state
 *   profile.postal_code    → billing_address.postal_code
 *   profile.company        → billing_address.company
 */
export function useBillingAddress(): UseBillingAddressReturn {
  const [saved_billing_address, setSavedBillingAddress] =
    useState<BillingAddress | null>(null);
  const [is_loading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSavedBillingAddress() {
      setIsLoading(true);
      try {
        const profile = await profileService.fetchUserProfile();

        // Only expose a saved address if at least one meaningful field is set
        const has_address_data = !!(
          profile.address ||
          profile.city ||
          profile.postal_code
        );

        if (has_address_data) {
          setSavedBillingAddress({
            address: profile.address ?? "",
            city: profile.city ?? "",
            country: profile.country ?? "United States",
            state: profile.state_province ?? "",
            postal_code: profile.postal_code ?? "",
            company: profile.company ?? "",
          });
        }
      } catch {
        // Pre-fill is optional — fail silently so checkout is never blocked
      } finally {
        setIsLoading(false);
      }
    }

    fetchSavedBillingAddress();
  }, []);

  return {
    saved_billing_address,
    is_loading,
    has_saved_address: saved_billing_address !== null,
  };
}
