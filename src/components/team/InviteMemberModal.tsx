"use client";
import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import type { Permission } from "./types";

interface InviteMemberModalProps {
  is_open: boolean;
  onClose: () => void;
  onInvite: (name: string, email: string, permissions: Permission[]) => void;
}

const AVAILABLE_PERMISSIONS: { value: Permission; label: string }[] = [
  { value: "orders", label: "Orders" },
  { value: "tickets", label: "Tickets" },
  { value: "invoices", label: "Invoices" },
];

const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  is_open,
  onClose,
  onInvite,
}) => {
  const [member_name, setMemberName] = useState("");
  const [member_email, setMemberEmail] = useState("");
  const [selected_permissions, setSelectedPermissions] = useState<Permission[]>(
    []
  );

  const togglePermission = (permission: Permission) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };

  const handleInvite = () => {
    if (member_name.trim() && member_email.trim()) {
      onInvite(member_name.trim(), member_email.trim(), selected_permissions);
      resetForm();
    }
  };

  const resetForm = () => {
    setMemberName("");
    setMemberEmail("");
    setSelectedPermissions([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const is_valid = member_name.trim() !== "" && member_email.trim() !== "";

  return (
    <Modal
      isOpen={is_open}
      onClose={handleClose}
      showCloseButton={false}
      className="max-w-lg w-full p-6 lg:p-8"
    >
      <div className="space-y-5">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Invite Team Member
        </h3>

        <div>
          <Label htmlFor="member_name">Name</Label>
          <Input
            id="member_name"
            name="member_name"
            type="text"
            placeholder="Full name"
            defaultValue={member_name}
            onChange={(e) => setMemberName(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="member_email">Email</Label>
          <Input
            id="member_email"
            name="member_email"
            type="email"
            placeholder="email@example.com"
            defaultValue={member_email}
            onChange={(e) => setMemberEmail(e.target.value)}
          />
        </div>

        <div>
          <Label>Permissions</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {AVAILABLE_PERMISSIONS.map(({ value, label }) => {
              const is_selected = selected_permissions.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => togglePermission(value)}
                  className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                    is_selected
                      ? "bg-brand-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <hr className="border-gray-200 dark:border-gray-700" />

        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleInvite}
            disabled={!is_valid}
          >
            Invite
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default InviteMemberModal;
