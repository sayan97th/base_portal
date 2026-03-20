"use client";

import React, { useState, useEffect } from "react";
import { useModal } from "@/hooks/useModal";
import { Modal } from "@/components/ui/modal";
import { profileService } from "@/services/client/profile.service";
import type { ProfileData } from "@/types/auth";

// ─── Static data ──────────────────────────────────────────────────────────────

const country_options = [
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "GB", label: "United Kingdom" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "ES", label: "Spain" },
  { value: "IT", label: "Italy" },
  { value: "BR", label: "Brazil" },
  { value: "MX", label: "Mexico" },
  { value: "JP", label: "Japan" },
  { value: "IN", label: "India" },
  { value: "CN", label: "China" },
  { value: "KR", label: "South Korea" },
  { value: "NL", label: "Netherlands" },
  { value: "SE", label: "Sweden" },
  { value: "NO", label: "Norway" },
  { value: "DK", label: "Denmark" },
  { value: "FI", label: "Finland" },
  { value: "CH", label: "Switzerland" },
  { value: "AT", label: "Austria" },
  { value: "BE", label: "Belgium" },
  { value: "PT", label: "Portugal" },
  { value: "IE", label: "Ireland" },
  { value: "NZ", label: "New Zealand" },
  { value: "SG", label: "Singapore" },
  { value: "HK", label: "Hong Kong" },
  { value: "AR", label: "Argentina" },
  { value: "CL", label: "Chile" },
  { value: "CO", label: "Colombia" },
  { value: "PL", label: "Poland" },
  { value: "CZ", label: "Czech Republic" },
  { value: "RO", label: "Romania" },
  { value: "HU", label: "Hungary" },
  { value: "ZA", label: "South Africa" },
  { value: "IL", label: "Israel" },
  { value: "AE", label: "United Arab Emirates" },
  { value: "SA", label: "Saudi Arabia" },
  { value: "TH", label: "Thailand" },
  { value: "PH", label: "Philippines" },
  { value: "MY", label: "Malaysia" },
  { value: "ID", label: "Indonesia" },
  { value: "VN", label: "Vietnam" },
  { value: "TW", label: "Taiwan" },
  { value: "TR", label: "Turkey" },
  { value: "EG", label: "Egypt" },
  { value: "NG", label: "Nigeria" },
  { value: "KE", label: "Kenya" },
  { value: "GH", label: "Ghana" },
  { value: "PK", label: "Pakistan" },
];

const us_state_options = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

// ─── Styling helpers ───────────────────────────────────────────────────────────

const label_class =
  "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300";

function getInputClass(has_error?: boolean) {
  const base =
    "h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-all focus:bg-white focus:outline-none focus:ring-2 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-gray-500";
  if (has_error) {
    return `${base} border-red-400 bg-red-50/40 focus:border-red-400 focus:ring-red-400/20 dark:border-red-500/60 dark:bg-red-500/5 dark:focus:border-red-400`;
  }
  return `${base} border-gray-200 bg-gray-50 focus:border-brand-500 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-400 dark:focus:bg-white/5`;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getCountryLabel(code: string): string {
  return country_options.find((c) => c.value === code)?.label ?? code;
}

function getStateLabel(code: string, country: string): string {
  if (country === "US") {
    return us_state_options.find((s) => s.value === code)?.label ?? code;
  }
  return code;
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type BillingAddressFields = Pick<
  ProfileData,
  "address" | "city" | "country" | "state_province" | "postal_code" | "company"
>;

const empty_billing: BillingAddressFields = {
  address: "",
  city: "",
  country: "",
  state_province: "",
  postal_code: "",
  company: "",
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className={label_class}>
      {children}
    </label>
  );
}

function AddressInfoRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div>
      <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="text-sm font-medium text-gray-800 dark:text-white/90">{value}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 animate-pulse">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1">
          <div className="h-5 w-36 rounded bg-gray-200 dark:bg-gray-700 mb-6" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7">
            {[...Array(4)].map((_, i) => (
              <div key={i}>
                <div className="mb-2 h-3 w-20 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-4 w-40 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            ))}
          </div>
        </div>
        <div className="h-10 w-24 rounded-full bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function UserAddressCard() {
  const { isOpen, openModal, closeModal } = useModal();

  // Only billing address fields are stored — no need to hold the full profile.
  const [saved_billing, setSavedBilling] = useState<BillingAddressFields>(empty_billing);
  const [edit_form, setEditForm] = useState<BillingAddressFields>(empty_billing);
  const [is_loading, setIsLoading] = useState(true);
  const [is_saving, setIsSaving] = useState(false);
  const [error_message, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadBillingAddress();
  }, []);

  async function loadBillingAddress() {
    setIsLoading(true);
    try {
      const data = await profileService.fetchUserProfile();
      setSavedBilling({
        address: data.address ?? "",
        city: data.city ?? "",
        country: data.country ?? "",
        state_province: data.state_province ?? "",
        postal_code: data.postal_code ?? "",
        company: data.company ?? "",
      });
    } catch {
      // Display falls back to empty state — fail silently
    } finally {
      setIsLoading(false);
    }
  }

  function handleOpenModal() {
    setEditForm({ ...saved_billing });
    setErrorMessage(null);
    openModal();
  }

  function handleFieldChange(field: keyof BillingAddressFields, value: string) {
    if (field === "country") {
      setEditForm((prev) => ({ ...prev, country: value, state_province: "" }));
    } else {
      setEditForm((prev) => ({ ...prev, [field]: value }));
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    try {
      // PATCH — only billing address fields are sent, leaving the rest of the
      // profile untouched on the server.
      await profileService.patchUserProfile(edit_form);
      setSavedBilling(edit_form);
      closeModal();
    } catch {
      setErrorMessage("Failed to save billing address. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  if (is_loading) return <LoadingSkeleton />;

  const has_data = !!(
    saved_billing.address ||
    saved_billing.city ||
    saved_billing.postal_code
  );

  const country_label = saved_billing.country
    ? getCountryLabel(saved_billing.country)
    : null;

  const state_label = saved_billing.state_province
    ? getStateLabel(saved_billing.state_province, saved_billing.country)
    : null;

  const city_state_country = [saved_billing.city, state_label, country_label]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      {/* ── Card ──────────────────────────────────────────────────────────── */}
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
              Billing Address
            </h4>

            {has_data ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
                <AddressInfoRow label="Address" value={saved_billing.address} />
                <AddressInfoRow label="City / State / Country" value={city_state_country || null} />
                <AddressInfoRow label="Postal Code" value={saved_billing.postal_code} />
                <AddressInfoRow label="Company" value={saved_billing.company} />
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No billing address saved yet. Add your billing details to speed up
                checkout and payment forms.
              </p>
            )}
          </div>

          {/* Edit button */}
          <button
            onClick={handleOpenModal}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
          >
            <svg
              className="fill-current"
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z"
              />
            </svg>
            Edit
          </button>
        </div>
      </div>

      {/* ── Edit Modal ────────────────────────────────────────────────────── */}
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="relative w-full overflow-y-auto bg-white no-scrollbar rounded-3xl dark:bg-gray-900">
          {/* Header */}
          <div className="border-b border-gray-100 px-6 py-5 dark:border-gray-800">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              Billing Address
            </h4>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              This address will be pre-filled automatically in checkout and payment
              forms.
            </p>
          </div>

          {/* Error alert */}
          {error_message && (
            <div className="mx-6 mt-5 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-400">
              {error_message}
            </div>
          )}

          <form onSubmit={handleSave} className="flex flex-col">
            <div className="space-y-5 px-6 py-6">

              {/* Address / City */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="billing_address">Address</FieldLabel>
                  <input
                    id="billing_address"
                    type="text"
                    value={edit_form.address}
                    onChange={(e) => handleFieldChange("address", e.target.value)}
                    placeholder="123 Main St"
                    className={getInputClass()}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="billing_city">City</FieldLabel>
                  <input
                    id="billing_city"
                    type="text"
                    value={edit_form.city}
                    onChange={(e) => handleFieldChange("city", e.target.value)}
                    placeholder="City"
                    className={getInputClass()}
                  />
                </div>
              </div>

              {/* Country / State / Postal Code */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div>
                  <FieldLabel htmlFor="billing_country">Country</FieldLabel>
                  <select
                    id="billing_country"
                    value={edit_form.country}
                    onChange={(e) => handleFieldChange("country", e.target.value)}
                    className={getInputClass() + " cursor-pointer"}
                  >
                    <option value="">Select country</option>
                    {country_options.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <FieldLabel htmlFor="billing_state">State / Province</FieldLabel>
                  {edit_form.country === "US" ? (
                    <select
                      id="billing_state"
                      value={edit_form.state_province}
                      onChange={(e) =>
                        handleFieldChange("state_province", e.target.value)
                      }
                      className={getInputClass() + " cursor-pointer"}
                    >
                      <option value="">Select state</option>
                      {us_state_options.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id="billing_state"
                      type="text"
                      value={edit_form.state_province}
                      onChange={(e) =>
                        handleFieldChange("state_province", e.target.value)
                      }
                      placeholder="State / Province / Region"
                      className={getInputClass()}
                    />
                  )}
                </div>

                <div>
                  <FieldLabel htmlFor="billing_postal">Postal / Zip Code</FieldLabel>
                  <input
                    id="billing_postal"
                    type="text"
                    value={edit_form.postal_code}
                    onChange={(e) =>
                      handleFieldChange("postal_code", e.target.value)
                    }
                    placeholder="12345"
                    className={getInputClass()}
                  />
                </div>
              </div>

              {/* Company */}
              <div>
                <FieldLabel htmlFor="billing_company">Company</FieldLabel>
                <input
                  id="billing_company"
                  type="text"
                  value={edit_form.company}
                  onChange={(e) => handleFieldChange("company", e.target.value)}
                  placeholder="Company name"
                  className={getInputClass()}
                />
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-theme-xs transition-colors hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={is_saving}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-brand-500 dark:hover:bg-brand-600"
              >
                {is_saving ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Saving…
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
