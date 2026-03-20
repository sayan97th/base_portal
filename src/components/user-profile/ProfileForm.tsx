"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import { useAuth } from "@/context/AuthContext";
import { profileService } from "@/services/client/profile.service";
import type { ProfileData } from "@/types/auth";
import NotificationPreferencesSection from "./NotificationPreferencesSection";
import BillingAddressSection from "./BillingAddressSection";
import ChangePasswordSection from "@/components/admin/profile/ChangePasswordSection";

// ── Constants ─────────────────────────────────────────────────────────────────

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
  { value: "America/Mexico_City", label: "America/Mexico City (UTC-06:00)" },
  { value: "America/Bogota", label: "America/Bogota (UTC-05:00)" },
  { value: "America/Lima", label: "America/Lima (UTC-05:00)" },
  { value: "America/Santiago", label: "America/Santiago (UTC-04:00)" },
  { value: "Atlantic/Azores", label: "Atlantic/Azores (UTC-01:00)" },
  { value: "Europe/London", label: "Europe/London (UTC+00:00)" },
  { value: "Europe/Lisbon", label: "Europe/Lisbon (UTC+00:00)" },
  { value: "Europe/Paris", label: "Europe/Paris (UTC+01:00)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (UTC+01:00)" },
  { value: "Europe/Madrid", label: "Europe/Madrid (UTC+01:00)" },
  { value: "Europe/Rome", label: "Europe/Rome (UTC+01:00)" },
  { value: "Europe/Amsterdam", label: "Europe/Amsterdam (UTC+01:00)" },
  { value: "Europe/Athens", label: "Europe/Athens (UTC+02:00)" },
  { value: "Europe/Helsinki", label: "Europe/Helsinki (UTC+02:00)" },
  { value: "Europe/Istanbul", label: "Europe/Istanbul (UTC+03:00)" },
  { value: "Europe/Moscow", label: "Europe/Moscow (UTC+03:00)" },
  { value: "Africa/Casablanca", label: "Africa/Casablanca (UTC+00:00)" },
  { value: "Africa/Lagos", label: "Africa/Lagos (UTC+01:00)" },
  { value: "Africa/Nairobi", label: "Africa/Nairobi (UTC+03:00)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (UTC+04:00)" },
  { value: "Asia/Karachi", label: "Asia/Karachi (UTC+05:00)" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (UTC+05:30)" },
  { value: "Asia/Dhaka", label: "Asia/Dhaka (UTC+06:00)" },
  { value: "Asia/Bangkok", label: "Asia/Bangkok (UTC+07:00)" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai (UTC+08:00)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (UTC+08:00)" },
  { value: "Asia/Hong_Kong", label: "Asia/Hong Kong (UTC+08:00)" },
  { value: "Asia/Seoul", label: "Asia/Seoul (UTC+09:00)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (UTC+09:00)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (UTC+10:00)" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland (UTC+12:00)" },
];

const interest_options = [
  { value: "", label: "Nothing selected" },
  { value: "links", label: "Links" },
  { value: "content", label: "Content" },
  { value: "both", label: "Both" },
];

const default_form_data: ProfileData = {
  business_email: "",
  first_name: "",
  last_name: "",
  notification_channel: "email_and_portal",
  team_order_updates: false,
  push_notifications_enabled: false,
  address: "",
  city: "",
  country: "",
  state_province: "",
  postal_code: "",
  company: "",
  phone: "",
  timezone: "",
  interested_in: "",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function isValidUrl(url: string | null | undefined): url is string {
  if (!url || typeof url !== "string" || url.trim() === "") return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
}

const SectionHeader = ({ icon, title, description }: SectionHeaderProps) => (
  <div className="mb-5">
    <div className="flex items-center gap-2.5">
      {icon && (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-500/10">
          {icon}
        </div>
      )}
      <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
    </div>
    {description && (
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
    )}
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

const AvatarUpload = ({
  first_name,
  last_name,
  profile_photo_url,
  onPhotoUpload,
  onPhotoDelete,
}: AvatarUploadProps) => {
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
      .slice(0, 2) || "U";

  const validated_url = isValidUrl(profile_photo_url) ? profile_photo_url : null;
  const displayed_photo = avatar_preview || (has_image_error ? null : validated_url);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) return "Invalid file type. Use PNG, JPG, GIF, or WebP.";
    if (file.size > MAX_FILE_SIZE) return "File exceeds 2 MB. Please choose a smaller image.";
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
        id="profile_avatar_upload"
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
              <Image
                src={displayed_photo}
                alt="Profile photo"
                width={80}
                height={80}
                unoptimized
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
            {is_uploading ? "Uploading…" : full_name || "Your Profile"}
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
            {displayed_photo && (
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

// ── Main Component ────────────────────────────────────────────────────────────

export default function ProfileForm() {
  const { user, refreshUser } = useAuth();
  const [form_data, setFormData] = useState<ProfileData>(default_form_data);
  const [profile_photo_url, setProfilePhotoUrl] = useState<string | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [is_saving, setIsSaving] = useState(false);
  const [error_message, setErrorMessage] = useState<string | null>(null);
  const [success_message, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await profileService.fetchUserProfile();
        const sanitized_data: ProfileData = { ...default_form_data };
        for (const key of Object.keys(default_form_data) as Array<keyof ProfileData>) {
          if (data[key] !== null && data[key] !== undefined) {
            (sanitized_data as unknown as Record<string, unknown>)[key] = data[key];
          }
        }
        setFormData(sanitized_data);
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

  const handleNotificationChannelChange = (value: string) => {
    setFormData((prev) => ({ ...prev, notification_channel: value }));
  };

  const handleTeamOrderUpdatesChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, team_order_updates: checked }));
  };

  const handlePushNotificationsChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, push_notifications_enabled: checked }));
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

  const handleSubmit = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await profileService.updateUserProfile(form_data);
      await refreshUser();
      setSuccessMessage("Profile updated successfully.");
    } catch {
      setErrorMessage("Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const member_since = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  if (is_loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-500" />
      </div>
    );
  }

  return (
    <div>
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
          <div className="sticky top-6">
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
              {/* Cover gradient */}
              <div className="h-20 bg-gradient-to-r from-brand-500 to-brand-700" />

              {/* Avatar + info */}
              <div className="px-5 pb-5">
                <div className="-mt-10 mb-4">
                  <div className="inline-block rounded-2xl ring-4 ring-white shadow-md dark:ring-gray-900">
                    <div className="h-[72px] w-[72px] overflow-hidden rounded-2xl">
                      {isValidUrl(profile_photo_url) ? (
                        <Image
                          src={profile_photo_url!}
                          alt="Profile"
                          width={72}
                          height={72}
                          unoptimized
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-400 to-brand-600 text-xl font-bold text-white">
                          {(form_data.first_name[0] ?? "") + (form_data.last_name[0] ?? "") || "U"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  {form_data.first_name || form_data.last_name
                    ? `${form_data.first_name} ${form_data.last_name}`.trim()
                    : user?.email ?? "Client User"}
                </h3>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  {user?.email}
                </p>

                {form_data.company && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                    </svg>
                    {form_data.company}
                  </div>
                )}

                {form_data.phone && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                    </svg>
                    {form_data.phone}
                  </div>
                )}

                {form_data.timezone && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {form_data.timezone}
                  </div>
                )}
              </div>

              {member_since && (
                <div className="border-t border-gray-100 px-5 py-3 dark:border-gray-800">
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Member since{" "}
                    <span className="font-medium text-gray-600 dark:text-gray-300">
                      {member_since}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: Edit Sections ─────────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-2">

          {/* Personal Information */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <SectionHeader
              icon={
                <svg className="h-4 w-4 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              }
              title="Personal Information"
              description="Update your name and profile photo."
            />

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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  type="text"
                  defaultValue={form_data.first_name}
                  placeholder="First name"
                  onChange={(e) => handleFieldChange("first_name", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  type="text"
                  defaultValue={form_data.last_name}
                  placeholder="Last name"
                  onChange={(e) => handleFieldChange("last_name", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Contact & Preferences */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <SectionHeader
              icon={
                <svg className="h-4 w-4 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
              title="Contact & Preferences"
              description="Your phone number, timezone, and service interests."
            />

            <div className="space-y-4">
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="text"
                  defaultValue={form_data.phone ?? ""}
                  placeholder="+1 (555) 000-0000"
                  onChange={(e) => handleFieldChange("phone", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  options={timezone_options}
                  defaultValue={form_data.timezone}
                  onChange={(value) => handleFieldChange("timezone", value)}
                  placeholder="Select your timezone"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center gap-2">
                  <Label htmlFor="interested_in" className="mb-0">
                    I am interested in
                  </Label>
                  <span className="text-xs text-gray-400 dark:text-gray-500">optional</span>
                </div>
                <Select
                  options={interest_options}
                  defaultValue={form_data.interested_in}
                  onChange={(value) => handleFieldChange("interested_in", value)}
                  placeholder="Nothing selected"
                />
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <SectionHeader
              icon={
                <svg className="h-4 w-4 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
              }
              title="Notification Preferences"
              description="Choose how and when you receive updates about your orders."
            />
            <NotificationPreferencesSection
              notification_channel={form_data.notification_channel}
              team_order_updates={form_data.team_order_updates}
              push_notifications_enabled={form_data.push_notifications_enabled}
              onNotificationChannelChange={handleNotificationChannelChange}
              onTeamOrderUpdatesChange={handleTeamOrderUpdatesChange}
              onPushNotificationsChange={handlePushNotificationsChange}
            />
          </div>

          {/* Billing Address */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <SectionHeader
              icon={
                <svg className="h-4 w-4 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                </svg>
              }
              title="Billing Address"
              description="Your billing details for invoices and payments."
            />
            <BillingAddressSection
              address={form_data.address}
              city={form_data.city}
              country={form_data.country}
              state_province={form_data.state_province}
              postal_code={form_data.postal_code}
              company={form_data.company}
              onFieldChange={handleFieldChange}
            />
          </div>

          {/* Save profile button */}
          <div className="flex items-center justify-end gap-3">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Changes will be applied immediately.
            </p>
            <Button size="md" variant="primary" disabled={is_saving} onClick={handleSubmit}>
              {is_saving ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Saving…
                </span>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>

          {/* Security */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <SectionHeader
              icon={
                <svg className="h-4 w-4 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              }
              title="Security"
              description="Manage two-factor authentication for your account."
            />

            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 dark:border-gray-700 dark:bg-gray-800/50">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  Two-Factor Authentication
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Add an extra layer of security to your account.
                </p>
              </div>
              <Button variant="outline" size="sm">
                Enable 2FA
              </Button>
            </div>
          </div>

          {/* Change Password */}
          <ChangePasswordSection />

        </div>
      </div>
    </div>
  );
}
