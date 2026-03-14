"use client";

import React, { useState, useEffect, useRef } from "react";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import { useAuth } from "@/context/AuthContext";
import { profileService } from "@/services/client/profile.service";
import type { ProfileData } from "@/types/auth";

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

const timezone_options = [
  { value: "America/New_York", label: "America/New York (UTC-05:00)" },
  { value: "America/Chicago", label: "America/Chicago (UTC-06:00)" },
  { value: "America/Denver", label: "America/Denver (UTC-07:00)" },
  { value: "America/Los_Angeles", label: "America/Los Angeles (UTC-08:00)" },
  { value: "America/Anchorage", label: "America/Anchorage (UTC-09:00)" },
  { value: "Pacific/Honolulu", label: "Pacific/Honolulu (UTC-10:00)" },
  { value: "America/Toronto", label: "America/Toronto (UTC-05:00)" },
  { value: "America/Vancouver", label: "America/Vancouver (UTC-08:00)" },
  { value: "America/Sao_Paulo", label: "America/Sao Paulo (UTC-03:00)" },
  { value: "America/Argentina/Buenos_Aires", label: "America/Buenos Aires (UTC-03:00)" },
  { value: "Europe/London", label: "Europe/London (UTC+00:00)" },
  { value: "Europe/Paris", label: "Europe/Paris (UTC+01:00)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (UTC+01:00)" },
  { value: "Europe/Madrid", label: "Europe/Madrid (UTC+01:00)" },
  { value: "Europe/Rome", label: "Europe/Rome (UTC+01:00)" },
  { value: "Europe/Moscow", label: "Europe/Moscow (UTC+03:00)" },
  { value: "Africa/Nairobi", label: "Africa/Nairobi (UTC+03:00)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (UTC+04:00)" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (UTC+05:30)" },
  { value: "Asia/Bangkok", label: "Asia/Bangkok (UTC+07:00)" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai (UTC+08:00)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (UTC+08:00)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (UTC+09:00)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (UTC+10:00)" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland (UTC+12:00)" },
];

function isValidUrl(url: string | null | undefined): url is string {
  if (!url || typeof url !== "string" || url.trim() === "") return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

const default_form: Pick<ProfileData, "first_name" | "last_name" | "business_email" | "phone" | "timezone"> = {
  first_name: "",
  last_name: "",
  business_email: "",
  phone: "",
  timezone: "",
};

// ── Sub-components ────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  description?: string;
}

const SectionHeader = ({ title, description }: SectionHeaderProps) => (
  <div className="mb-5">
    <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
    {description && <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
  </div>
);

// ── Avatar Upload ─────────────────────────────────────────────────────────────

interface AvatarUploadProps {
  first_name: string;
  last_name: string;
  profile_photo_url: string | null;
  onPhotoUpload: (file: File) => Promise<void>;
  onPhotoDelete: () => Promise<void>;
}

const AvatarUpload = ({ first_name, last_name, profile_photo_url, onPhotoUpload, onPhotoDelete }: AvatarUploadProps) => {
  const [avatar_preview, setAvatarPreview] = useState<string | null>(null);
  const [is_uploading, setIsUploading] = useState(false);
  const [is_deleting, setIsDeleting] = useState(false);
  const [upload_error, setUploadError] = useState<string | null>(null);
  const [has_image_error, setHasImageError] = useState(false);
  const file_input_ref = useRef<HTMLInputElement>(null);

  const full_name = `${first_name} ${last_name}`.trim();
  const initials =
    full_name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "AD";

  const validated_url = isValidUrl(profile_photo_url) ? profile_photo_url : null;
  const displayed_photo = avatar_preview || (has_image_error ? null : validated_url);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) return "Invalid file type. Use PNG, JPG, GIF, or WebP.";
    if (file.size > MAX_FILE_SIZE) return "File exceeds 2MB. Please choose a smaller image.";
    return null;
  };

  const handleFileSelect = async (file: File) => {
    const err = validateFile(file);
    if (err) { setUploadError(err); return; }
    setUploadError(null);
    setHasImageError(false);
    const reader = new FileReader();
    reader.onload = (e) => setAvatarPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    setIsUploading(true);
    try {
      await onPhotoUpload(file);
    } catch {
      setUploadError("Failed to upload photo. Please try again.");
      setAvatarPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async () => {
    setUploadError(null);
    setIsDeleting(true);
    try {
      await onPhotoDelete();
      setAvatarPreview(null);
      if (file_input_ref.current) file_input_ref.current.value = "";
    } catch {
      setUploadError("Failed to remove photo. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <input
        ref={file_input_ref}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
        className="hidden"
        id="admin_avatar_upload"
        disabled={is_uploading}
      />

      {upload_error && (
        <div className="mb-3 rounded-lg border border-error-300 bg-error-50 px-4 py-2 text-xs text-error-600 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-400">
          {upload_error}
        </div>
      )}

      <div className="flex items-center gap-5">
        {/* Avatar */}
        <div className="relative shrink-0 group">
          <div className="h-20 w-20 overflow-hidden rounded-2xl ring-4 ring-white shadow-md dark:ring-gray-800">
            {is_uploading ? (
              <div className="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-gray-800">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500" />
              </div>
            ) : displayed_photo ? (
              <img
                src={displayed_photo}
                alt="Profile photo"
                className="h-full w-full object-cover"
                onError={() => setHasImageError(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-400 to-brand-600 text-xl font-bold text-white">
                {initials}
              </div>
            )}
          </div>
          {!is_uploading && (
            <button
              type="button"
              onClick={() => file_input_ref.current?.click()}
              className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
            </button>
          )}
        </div>

        {/* Upload controls */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
            {is_uploading ? "Uploading…" : full_name || "Admin User"}
          </p>
          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
            PNG, JPG, GIF or WebP · max 2 MB
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => file_input_ref.current?.click()}
              disabled={is_uploading || is_deleting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Upload
            </button>
            {(displayed_photo) && (
              <button
                type="button"
                onClick={handleDeletePhoto}
                disabled={is_uploading || is_deleting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-error-200 bg-white px-3 py-1.5 text-xs font-medium text-error-600 shadow-sm transition-colors hover:bg-error-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-error-500/30 dark:bg-gray-800 dark:text-error-400 dark:hover:bg-error-500/10"
              >
                {is_deleting ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-error-200 border-t-error-500" />
                ) : (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                )}
                {is_deleting ? "Removing…" : "Remove"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Role Badge ────────────────────────────────────────────────────────────────

const ROLE_STYLES: Record<string, string> = {
  super_admin: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/30",
  admin: "bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-500/10 dark:text-brand-400 dark:border-brand-500/30",
  staff: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminProfileForm() {
  const { user, permissions, refreshUser } = useAuth();

  const [form_data, setFormData] = useState(default_form);
  const [profile_photo_url, setProfilePhotoUrl] = useState<string | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [is_saving, setIsSaving] = useState(false);
  const [error_message, setErrorMessage] = useState<string | null>(null);
  const [success_message, setSuccessMessage] = useState<string | null>(null);

  const [is_password_visible, setIsPasswordVisible] = useState(false);
  const [password, setPassword] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await profileService.fetchUserProfile();
        setFormData({
          first_name: data.first_name ?? "",
          last_name: data.last_name ?? "",
          business_email: data.business_email ?? "",
          phone: data.phone ?? "",
          timezone: data.timezone ?? "",
        });
        setProfilePhotoUrl(data.profile_photo_url ?? null);
      } catch {
        setErrorMessage("Failed to load profile data.");
      } finally {
        setIsLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = async (file: File) => {
    const response = await profileService.uploadProfilePhoto(file);
    setProfilePhotoUrl(response.user.profile_photo_url);
    await refreshUser();
  };

  const handlePhotoDelete = async () => {
    const response = await profileService.deleteProfilePhoto();
    setProfilePhotoUrl(response.user.profile_photo_url);
    await refreshUser();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await profileService.updateUserProfile({
        ...form_data,
        notification_channel: "email_and_portal",
        team_order_updates: false,
        push_notifications_enabled: false,
        address: "",
        city: "",
        country: "",
        state_province: "",
        postal_code: "",
        company: "",
        tax_id: "",
        interested_in: "",
      });
      await refreshUser();
      setSuccessMessage("Profile updated successfully.");
    } catch {
      setErrorMessage("Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const role_names = user?.roles
    ? user.roles.map((r) => (typeof r === "string" ? r : r.name))
    : [];

  const role_display_names = user?.roles
    ? user.roles.map((r) => (typeof r === "string" ? r.replace(/_/g, " ") : r.display_name ?? r.name.replace(/_/g, " ")))
    : [];

  const member_since = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : null;

  if (is_loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-500" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Alerts */}
      {error_message && (
        <div className="mb-6 rounded-lg border border-error-300 bg-error-50 px-4 py-3 text-sm text-error-600 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-400">
          {error_message}
        </div>
      )}
      {success_message && (
        <div className="mb-6 rounded-lg border border-success-300 bg-success-50 px-4 py-3 text-sm text-success-600 dark:border-success-500/40 dark:bg-success-500/10 dark:text-success-400">
          {success_message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* ── Left: Identity Card ──────────────────────────────────────── */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4">
            {/* Profile Card */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
              {/* Cover gradient */}
              <div className="h-20 bg-gradient-to-r from-brand-500 to-brand-700" />

              {/* Avatar + name */}
              <div className="px-5 pb-5">
                <div className="-mt-10 mb-4">
                  <div className="inline-block rounded-2xl ring-4 ring-white shadow-md dark:ring-gray-900">
                    <div className="h-[72px] w-[72px] overflow-hidden rounded-2xl">
                      {isValidUrl(profile_photo_url) ? (
                        <img src={profile_photo_url!} alt="Profile" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-400 to-brand-600 text-xl font-bold text-white">
                          {(form_data.first_name[0] ?? "") + (form_data.last_name[0] ?? "") || "AD"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  {form_data.first_name || form_data.last_name
                    ? `${form_data.first_name} ${form_data.last_name}`.trim()
                    : user?.email ?? "Admin User"}
                </h3>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>

                {/* Role badges */}
                {role_names.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {role_names.map((role_name, i) => (
                      <span
                        key={role_name}
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${
                          ROLE_STYLES[role_name] ?? ROLE_STYLES.staff
                        }`}
                      >
                        {role_display_names[i] ?? role_name.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 dark:border-gray-800">
                {/* Stats row */}
                <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-gray-800">
                  <div className="px-5 py-4 text-center">
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{permissions.length}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Permissions</p>
                  </div>
                  <div className="px-5 py-4 text-center">
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{role_names.length}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Role{role_names.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>
              </div>

              {member_since && (
                <div className="border-t border-gray-100 px-5 py-3 dark:border-gray-800">
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Member since{" "}
                    <span className="font-medium text-gray-600 dark:text-gray-300">{member_since}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Permissions List */}
            {permissions.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Permissions</h3>
                </div>
                <div className="max-h-48 overflow-y-auto px-5 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {permissions.map((perm) => (
                      <span
                        key={perm}
                        className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      >
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Edit Sections ─────────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-2">

          {/* Personal Information */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <SectionHeader
              title="Personal Information"
              description="Update your name, email address, and profile photo."
            />

            {/* Photo upload */}
            <div className="mb-6">
              <Label className="mb-3">Profile Photo</Label>
              <AvatarUpload
                first_name={form_data.first_name}
                last_name={form_data.last_name}
                profile_photo_url={profile_photo_url}
                onPhotoUpload={handlePhotoUpload}
                onPhotoDelete={handlePhotoDelete}
              />
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="admin_first_name">First Name</Label>
                  <Input
                    id="admin_first_name"
                    name="first_name"
                    type="text"
                    defaultValue={form_data.first_name}
                    placeholder="First name"
                    onChange={(e) => handleFieldChange("first_name", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="admin_last_name">Last Name</Label>
                  <Input
                    id="admin_last_name"
                    name="last_name"
                    type="text"
                    defaultValue={form_data.last_name}
                    placeholder="Last name"
                    onChange={(e) => handleFieldChange("last_name", e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="admin_email">Email Address</Label>
                <Input
                  id="admin_email"
                  name="business_email"
                  type="email"
                  defaultValue={form_data.business_email}
                  placeholder="your@email.com"
                  onChange={(e) => handleFieldChange("business_email", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <SectionHeader
              title="Security"
              description="Manage your password and two-factor authentication."
            />

            <div className="space-y-4">
              <div>
                <Label htmlFor="admin_password">Password</Label>
                <div className="relative">
                  <Input
                    id="admin_password"
                    name="password"
                    type={is_password_visible ? "text" : "password"}
                    value={password}
                    placeholder="Enter new password to change"
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setIsPasswordVisible((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {is_password_visible ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                  Leave blank to keep your current password.
                </p>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 dark:border-gray-700 dark:bg-gray-800/50">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    Two-Factor Authentication
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Add an extra layer of security to your account.
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm">
                  Enable 2FA
                </Button>
              </div>
            </div>
          </div>

          {/* Work Details */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <SectionHeader
              title="Work Details"
              description="Your contact information and timezone preferences."
            />

            <div className="space-y-4">
              <div>
                <Label htmlFor="admin_phone">Phone Number</Label>
                <Input
                  id="admin_phone"
                  name="phone"
                  type="text"
                  defaultValue={form_data.phone}
                  placeholder="+1 (555) 000-0000"
                  onChange={(e) => handleFieldChange("phone", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="admin_timezone">Timezone</Label>
                <Select
                  options={timezone_options}
                  defaultValue={form_data.timezone}
                  onChange={(value) => handleFieldChange("timezone", value)}
                  placeholder="Select your timezone"
                />
              </div>
            </div>
          </div>

          {/* Save */}
          <div className="flex items-center justify-end gap-3">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Changes will be applied immediately.
            </p>
            <Button size="md" variant="primary" disabled={is_saving}>
              {is_saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
