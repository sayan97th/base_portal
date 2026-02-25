"use client";
import React from "react";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";

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

interface BillingAddressSectionProps {
  address: string;
  city: string;
  country: string;
  state_province: string;
  postal_code: string;
  company: string;
  tax_id: string;
  onFieldChange: (field: string, value: string) => void;
}

export default function BillingAddressSection({
  address,
  city,
  country,
  state_province,
  postal_code,
  company,
  tax_id,
  onFieldChange,
}: BillingAddressSectionProps) {
  return (
    <section>
      <h2 className="mb-6 text-xl font-semibold text-gray-800 dark:text-white/90">
        Billing address
      </h2>

      <div className="space-y-5">
        {/* Address / City */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <Input
              id="address"
              name="address"
              type="text"
              defaultValue={address}
              placeholder="Address"
              onChange={(e) => onFieldChange("address", e.target.value)}
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Address
            </p>
          </div>
          <div>
            <Input
              id="city"
              name="city"
              type="text"
              defaultValue={city}
              placeholder="City"
              onChange={(e) => onFieldChange("city", e.target.value)}
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              City
            </p>
          </div>
        </div>

        {/* Country / State / Postal Code */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div>
            <Select
              options={country_options}
              defaultValue={country}
              onChange={(value) => onFieldChange("country", value)}
              placeholder="Select country"
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Country
            </p>
          </div>
          <div>
            <Select
              options={us_state_options}
              defaultValue={state_province}
              onChange={(value) => onFieldChange("state_province", value)}
              placeholder="Select state"
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              State / Province / Region
            </p>
          </div>
          <div>
            <Input
              id="postal_code"
              name="postal_code"
              type="text"
              defaultValue={postal_code}
              placeholder="Postal / Zip Code"
              onChange={(e) => onFieldChange("postal_code", e.target.value)}
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Postal / Zip Code
            </p>
          </div>
        </div>

        {/* Company / Tax ID */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <Input
              id="company"
              name="company"
              type="text"
              defaultValue={company}
              placeholder="Company"
              onChange={(e) => onFieldChange("company", e.target.value)}
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Company
            </p>
          </div>
          <div>
            <Input
              id="tax_id"
              name="tax_id"
              type="text"
              defaultValue={tax_id}
              placeholder="Tax ID"
              onChange={(e) => onFieldChange("tax_id", e.target.value)}
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Tax ID
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
