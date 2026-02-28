"use client";
import React, { useState, useRef } from "react";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";

interface EditDetailsSectionProps {
  business_email: string;
  password: string;
  first_name: string;
  last_name: string;
  profile_photo_url: string | null;
  onFieldChange: (field: string, value: string) => void;
  onPhotoUpload: (file: File) => Promise<void>;
  onPhotoDelete: () => Promise<void>;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

function isValidUrl(url: string | null | undefined): url is string {
  if (!url || typeof url !== "string" || url.trim() === "") return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export default function EditDetailsSection({
  business_email,
  password,
  first_name,
  last_name,
  profile_photo_url,
  onFieldChange,
  onPhotoUpload,
  onPhotoDelete,
}: EditDetailsSectionProps) {
  const [is_password_visible, setIsPasswordVisible] = useState(false);
  const [avatar_preview, setAvatarPreview] = useState<string | null>(null);
  const [is_dragging, setIsDragging] = useState(false);
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

  const validated_photo_url = isValidUrl(profile_photo_url) ? profile_photo_url : null;
  const displayed_photo = avatar_preview || (has_image_error ? null : validated_photo_url);

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!is_password_visible);
  };

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Invalid file type. Please upload a PNG, JPG, GIF or WebP image.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File size exceeds 2MB. Please choose a smaller image.";
    }
    return null;
  };

  const handleFileSelect = async (file: File) => {
    const validation_error = validateFile(file);
    if (validation_error) {
      setUploadError(validation_error);
      return;
    }

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
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

        {/* Profile Photo Upload */}
        <div>
          <Label className="mb-3">Profile photo</Label>
          <input
            ref={file_input_ref}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            onChange={handleInputChange}
            className="hidden"
            id="avatar_upload"
            disabled={is_uploading}
          />

          {upload_error && (
            <div className="mb-3 rounded-lg border border-error-300 bg-error-50 px-4 py-2 text-xs text-error-600 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-400">
              {upload_error}
            </div>
          )}

          {displayed_photo ? (
            /* -- Preview state -- */
            <div className="flex items-center gap-5 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
              <div className="relative shrink-0 group">
                <div className="h-[72px] w-[72px] overflow-hidden rounded-full ring-2 ring-white shadow-theme-sm dark:ring-gray-700">
                  {is_uploading ? (
                    <div className="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-gray-700">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500" />
                    </div>
                  ) : (
                    <img
                      src={displayed_photo}
                      alt="Profile photo"
                      className="h-full w-full object-cover"
                      onError={() => setHasImageError(true)}
                    />
                  )}
                </div>
                {!is_uploading && (
                  <div
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 cursor-pointer"
                    onClick={() => file_input_ref.current?.click()}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">
                  {full_name || "Your photo"}
                </p>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                  {is_uploading ? "Uploading..." : "Hover the image to change it"}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => file_input_ref.current?.click()}
                  disabled={is_uploading || is_deleting}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-theme-xs transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Change
                </button>
                <button
                  type="button"
                  onClick={handleDeletePhoto}
                  disabled={is_uploading || is_deleting}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-error-300 bg-white px-3 py-2 text-xs font-medium text-error-600 shadow-theme-xs transition-colors hover:bg-error-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-error-500/40 dark:bg-gray-800 dark:text-error-400 dark:hover:bg-error-500/10"
                >
                  {is_deleting ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-error-200 border-t-error-500" />
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  )}
                  {is_deleting ? "Removing..." : "Remove"}
                </button>
              </div>
            </div>
          ) : (
            /* -- Empty / drop zone state -- */
            <label
              htmlFor="avatar_upload"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-all ${
                is_dragging
                  ? "border-brand-400 bg-brand-50 dark:border-brand-600 dark:bg-brand-900/20"
                  : "border-gray-300 bg-white hover:border-brand-300 hover:bg-brand-25 dark:border-gray-600 dark:bg-gray-900 dark:hover:border-brand-700 dark:hover:bg-gray-800"
              }`}
            >
              {/* Initials avatar as placeholder */}
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-500 ring-4 ring-brand-25 dark:bg-brand-900/30 dark:text-brand-400 dark:ring-brand-900/10">
                <span className="text-lg font-semibold">{initials}</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium text-brand-500 dark:text-brand-400">
                  Click to upload
                </span>{" "}
                or drag and drop
              </p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                PNG, JPG, GIF or WebP (max 2MB)
              </p>
            </label>
          )}
        </div>
      </div>
    </section>
  );
}
