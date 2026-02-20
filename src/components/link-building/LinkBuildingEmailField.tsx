import React from "react";
import Link from "next/link";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";

interface LinkBuildingEmailFieldProps {
  email: string;
}

const LinkBuildingEmailField: React.FC<LinkBuildingEmailFieldProps> = ({
  email,
}) => {
  return (
    <div>
      <Label>Email</Label>
      <Input type="email" defaultValue={email} disabled />
      <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
        To change your email go to{" "}
        <Link
          href="/profile"
          className="font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
        >
          your profile
        </Link>
        .
      </p>
    </div>
  );
};

export default LinkBuildingEmailField;
