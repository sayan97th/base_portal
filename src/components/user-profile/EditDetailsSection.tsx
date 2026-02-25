"use client";
import React, { useState } from "react";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import AvatarText from "@/components/ui/avatar/AvatarText";

interface EditDetailsSectionProps {
  business_email: string;
  password: string;
  first_name: string;
  last_name: string;
  onFieldChange: (field: string, value: string) => void;
}

export default function EditDetailsSection({
  business_email,
  password,
  first_name,
  last_name,
  onFieldChange,
}: EditDetailsSectionProps) {
  const [is_password_visible, setIsPasswordVisible] = useState(false);

  const full_name = `${first_name} ${last_name}`.trim();

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!is_password_visible);
  };

  return (
    <section>
      <h2 className="mb-6 text-xl font-semibold text-gray-800 dark:text-white/90">
        Edit your details
      </h2>

      <div className="space-y-5">
        {/* Business Email */}
        <div>
          <Label htmlFor="business_email">Business Email</Label>
          <Input
            id="business_email"
            name="business_email"
            type="email"
            defaultValue={business_email}
            onChange={(e) => onFieldChange("business_email", e.target.value)}
          />
        </div>

        {/* Password + 2FA */}
        <div>
          <Label htmlFor="password">Password</Label>
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Input
                id="password"
                name="password"
                type={is_password_visible ? "text" : "password"}
                defaultValue={password}
                onChange={(e) => onFieldChange("password", e.target.value)}
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {is_password_visible ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            <Button variant="outline" size="sm">
              Enable 2FA
            </Button>
          </div>
        </div>

        {/* First Name / Last Name */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="first_name">First name</Label>
            <Input
              id="first_name"
              name="first_name"
              type="text"
              defaultValue={first_name}
              onChange={(e) => onFieldChange("first_name", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="last_name">Last name</Label>
            <Input
              id="last_name"
              name="last_name"
              type="text"
              defaultValue={last_name}
              onChange={(e) => onFieldChange("last_name", e.target.value)}
            />
          </div>
        </div>

        {/* Avatar / Upload Photo */}
        <div className="flex items-center gap-4">
          <AvatarText name={full_name || "U"} className="h-12 w-12" />
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              Upload photo
            </Button>
            <Button variant="outline" size="sm">
              Delete photo
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
