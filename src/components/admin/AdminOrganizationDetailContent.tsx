"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import {
  getAdminOrganization,
  updateAdminOrganization,
  type UpdateOrganizationData,
} from "@/services/admin/organization.service";
import type { Organization } from "@/services/admin/types";

// ── Constants ─────────────────────────────────────────────────────────────────

const TIMEZONE_OPTIONS = [
  { value: "America/New_York", label: "America/New York (UTC-05:00)" },
  { value: "America/Chicago", label: "America/Chicago (UTC-06:00)" },
  { value: "America/Denver", label: "America/Denver (UTC-07:00)" },
  { value: "America/Boise", label: "America/Boise (UTC-07:00)" },
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

const TEXTAREA_CLASS =
  "min-h-[88px] w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 resize-none";

// ── Form State ────────────────────────────────────────────────────────────────

interface OrgFormState {
  name: string;
  description: string;
  website: string;
  contact_email: string;
  contact_phone: string;
  contact_link: string;
  logo_light: string;
  logo_dark: string;
  icon_light: string;
  icon_dark: string;
  mobile_app_icon: string;
  primary_color: string;
  accent_color: string;
  timezone: string;
  is_active: boolean;
}

function orgToFormData(org: Organization): OrgFormState {
  return {
    name: org.name,
    description: org.description ?? "",
    website: org.website ?? "",
    contact_email: org.contact_email ?? "",
    contact_phone: org.contact_phone ?? "",
    contact_link: org.contact_link ?? "",
    logo_light: org.logo_light ?? "",
    logo_dark: org.logo_dark ?? "",
    icon_light: org.icon_light ?? "",
    icon_dark: org.icon_dark ?? "",
    mobile_app_icon: org.mobile_app_icon ?? "",
    primary_color: org.primary_color ?? "",
    accent_color: org.accent_color ?? "",
    timezone: org.timezone,
    is_active: org.is_active,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function isValidUrl(url: string): boolean {
  if (!url || url.trim() === "") return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function isValidHex(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const BackIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const GlobeIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
  </svg>
);

const MailIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
);

const PhoneIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
  </svg>
);

const LinkIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
  </svg>
);

const PaletteIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
  </svg>
);

const ImageIcon = () => (
  <svg className="h-5 w-5 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

// ── Skeleton ──────────────────────────────────────────────────────────────────

const SkeletonBlock = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded bg-gray-100 dark:bg-gray-800 ${className}`} />
);

const LoadingSkeleton = () => (
  <div className="space-y-6">
    <SkeletonBlock className="h-4 w-36" />
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800" />
      <div className="flex items-start gap-5 p-6">
        <SkeletonBlock className="h-16 w-16 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="h-7 w-64" />
          <SkeletonBlock className="h-4 w-40" />
          <SkeletonBlock className="h-4 w-80" />
          <SkeletonBlock className="h-5 w-16 rounded-full" />
        </div>
      </div>
    </div>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <SkeletonBlock className="h-72 rounded-2xl lg:col-span-1" />
      <div className="space-y-6 lg:col-span-2">
        <SkeletonBlock className="h-64 rounded-2xl" />
        <SkeletonBlock className="h-48 rounded-2xl" />
        <SkeletonBlock className="h-56 rounded-2xl" />
      </div>
    </div>
  </div>
);

// ── Sub-components ────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

const SectionHeader = ({ title, description, icon }: SectionHeaderProps) => (
  <div className="mb-5 flex items-start gap-3">
    {icon && (
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
        {icon}
      </div>
    )}
    <div>
      <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
      {description && (
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{description}</p>
      )}
    </div>
  </div>
);

interface LogoPreviewFieldProps {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
}

const LogoPreviewField = ({ id, label, hint, value, onChange }: LogoPreviewFieldProps) => {
  const [has_error, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [value]);

  const show_preview = isValidUrl(value) && !has_error;

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <p className="mb-2 mt-0.5 text-xs text-gray-400 dark:text-gray-500">{hint}</p>
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
          {show_preview ? (
            <img
              key={value}
              src={value}
              alt={label}
              className="h-full w-full object-contain p-1.5"
              onError={() => setHasError(true)}
            />
          ) : (
            <ImageIcon />
          )}
        </div>
        <div className="flex-1">
          <Input
            id={id}
            type="url"
            value={value}
            placeholder="https://cdn.example.com/logo.png"
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

interface ColorFieldProps {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
}

const ColorField = ({ id, label, hint, value, onChange }: ColorFieldProps) => {
  const safe_hex = isValidHex(value) ? value : "#000000";

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <p className="mb-2 mt-0.5 text-xs text-gray-400 dark:text-gray-500">{hint}</p>
      <div className="flex items-center gap-2">
        <div className="shrink-0">
          <input
            type="color"
            value={safe_hex}
            onChange={(e) => onChange(e.target.value)}
            title={`Pick ${label}`}
            className="h-11 w-11 cursor-pointer rounded-lg border border-gray-300 bg-white p-1 transition hover:border-brand-300 dark:border-gray-700 dark:bg-gray-900"
          />
        </div>
        <div className="flex-1">
          <Input
            id={id}
            type="text"
            value={value}
            placeholder="#FF5733"
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
        {isValidHex(value) && (
          <div
            className="h-11 w-11 shrink-0 rounded-lg border border-gray-200 shadow-inner dark:border-gray-700"
            style={{ background: value }}
            title={value}
          />
        )}
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

interface AdminOrganizationDetailContentProps {
  organization_id: number;
}

const AdminOrganizationDetailContent: React.FC<AdminOrganizationDetailContentProps> = ({
  organization_id,
}) => {
  const [org, setOrg] = useState<Organization | null>(null);
  const [form_data, setFormData] = useState<OrgFormState | null>(null);
  const [form_key, setFormKey] = useState(0);
  const [is_loading, setIsLoading] = useState(true);
  const [is_saving, setIsSaving] = useState(false);
  const [fetch_error, setFetchError] = useState<string | null>(null);
  const [error_message, setErrorMessage] = useState<string | null>(null);
  const [success_message, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrg() {
      setIsLoading(true);
      setFetchError(null);
      try {
        const data = await getAdminOrganization(organization_id);
        setOrg(data);
        setFormData(orgToFormData(data));
        setFormKey((k) => k + 1);
      } catch {
        setFetchError("We couldn't load this organization. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
    loadOrg();
  }, [organization_id]);

  const handleFieldChange = useCallback(
    <K extends keyof OrgFormState>(field: K, value: OrgFormState[K]) => {
      setFormData((prev) => (prev ? { ...prev, [field]: value } : prev));
      setSuccessMessage(null);
    },
    []
  );

  const handleReset = useCallback(() => {
    if (!org) return;
    setFormData(orgToFormData(org));
    setFormKey((k) => k + 1);
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [org]);

  const handleSubmit = useCallback(async () => {
    if (!org || !form_data) return;
    if (!form_data.name.trim()) {
      setErrorMessage("Organization name is required.");
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const payload: UpdateOrganizationData = {
        name: form_data.name.trim(),
        description: form_data.description.trim() || null,
        website: form_data.website.trim() || null,
        contact_email: form_data.contact_email.trim() || null,
        contact_phone: form_data.contact_phone.trim() || null,
        contact_link: form_data.contact_link.trim() || null,
        logo_light: form_data.logo_light.trim() || null,
        logo_dark: form_data.logo_dark.trim() || null,
        icon_light: form_data.icon_light.trim() || null,
        icon_dark: form_data.icon_dark.trim() || null,
        mobile_app_icon: form_data.mobile_app_icon.trim() || null,
        primary_color: form_data.primary_color.trim() || null,
        accent_color: form_data.accent_color.trim() || null,
        timezone: form_data.timezone,
        is_active: form_data.is_active,
      };
      const updated = await updateAdminOrganization(org.id, payload);
      setOrg(updated);
      setFormData(orgToFormData(updated));
      setFormKey((k) => k + 1);
      setSuccessMessage("Organization updated successfully.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setErrorMessage("Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [org, form_data]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (is_loading) return <LoadingSkeleton />;

  // ── Fetch error ────────────────────────────────────────────────────────────
  if (fetch_error || !org || !form_data) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/organizations"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200"
        >
          <BackIcon />
          Back to Organizations
        </Link>
        <div className="rounded-xl border border-error-200 bg-error-50 p-6 dark:border-error-500/20 dark:bg-error-500/10">
          <p className="text-sm font-medium text-error-600 dark:text-error-400">
            {fetch_error ?? "Organization not found."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-error-600 underline hover:text-error-700 dark:text-error-400"
          >
            <RefreshIcon />
            Try again
          </button>
        </div>
      </div>
    );
  }

  // ── Derived display values ─────────────────────────────────────────────────
  const org_initial = org.name[0]?.toUpperCase() ?? "O";
  const has_logo_light = isValidUrl(org.logo_light ?? "");
  const cover_style =
    isValidHex(org.primary_color ?? "") && isValidHex(org.accent_color ?? "")
      ? { background: `linear-gradient(135deg, ${org.primary_color}, ${org.accent_color})` }
      : isValidHex(org.primary_color ?? "")
        ? { background: `linear-gradient(135deg, ${org.primary_color}, ${org.primary_color}99)` }
        : undefined;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/admin/organizations"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200"
      >
        <BackIcon />
        Back to Organizations
      </Link>

      {/* ── Hero Header ─────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="h-1.5 w-full bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600" />
        <div className="p-6">
          <div className="flex flex-wrap items-start gap-5">
            {/* Logo or initial */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-md dark:border-gray-700 dark:bg-gray-800">
              {has_logo_light ? (
                <img
                  src={org.logo_light!}
                  alt={org.name}
                  className="h-full w-full object-contain p-2"
                />
              ) : (
                <span className="bg-gradient-to-br from-brand-400 to-brand-600 flex h-full w-full items-center justify-center text-xl font-bold text-white">
                  {org_initial}
                </span>
              )}
            </div>

            {/* Identity */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {org.name}
                </h1>
                <Badge
                  variant="light"
                  size="sm"
                  color={org.is_active ? "success" : "error"}
                  startIcon={org.is_active ? <CheckCircleIcon /> : undefined}
                >
                  {org.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>

              <p className="mt-1 font-mono text-xs text-gray-400 dark:text-gray-500">
                {org.slug}
              </p>

              {org.description && (
                <p className="mt-1.5 max-w-xl text-sm text-gray-500 dark:text-gray-400">
                  {org.description}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-3">
                {org.website && (
                  <a
                    href={org.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline dark:text-brand-400"
                  >
                    <GlobeIcon />
                    {org.website.replace(/^https?:\/\//, "")}
                    <ExternalLinkIcon />
                  </a>
                )}
                {org.contact_email && (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                    <MailIcon />
                    {org.contact_email}
                  </span>
                )}
                {org.contact_phone && (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                    <PhoneIcon />
                    {org.contact_phone}
                  </span>
                )}
              </div>
            </div>

            {/* Org ID chip */}
            <div className="shrink-0 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-center dark:border-gray-700 dark:bg-gray-800">
              <p className="text-xs text-gray-400 dark:text-gray-500">Org ID</p>
              <p className="mt-0.5 font-mono text-sm font-semibold text-gray-700 dark:text-gray-300">
                #{org.id}
              </p>
            </div>
          </div>

          {/* Color swatches */}
          {(org.primary_color || org.accent_color) && (
            <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-gray-100 pt-4 dark:border-gray-800">
              <span className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                <PaletteIcon />
                Brand Colors
              </span>
              {org.primary_color && isValidHex(org.primary_color) && (
                <div className="flex items-center gap-2">
                  <div
                    className="h-5 w-5 rounded-full border border-gray-200 shadow-sm dark:border-gray-700"
                    style={{ background: org.primary_color }}
                  />
                  <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                    {org.primary_color}
                  </span>
                  <span className="text-xs text-gray-300 dark:text-gray-600">Primary</span>
                </div>
              )}
              {org.accent_color && isValidHex(org.accent_color) && (
                <div className="flex items-center gap-2">
                  <div
                    className="h-5 w-5 rounded-full border border-gray-200 shadow-sm dark:border-gray-700"
                    style={{ background: org.accent_color }}
                  />
                  <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                    {org.accent_color}
                  </span>
                  <span className="text-xs text-gray-300 dark:text-gray-600">Accent</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Global alerts ───────────────────────────────────────────────────── */}
      {error_message && (
        <div className="rounded-lg border border-error-300 bg-error-50 px-4 py-3 text-sm text-error-600 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-400">
          {error_message}
        </div>
      )}
      {success_message && (
        <div className="flex items-center gap-2 rounded-lg border border-success-300 bg-success-50 px-4 py-3 text-sm text-success-600 dark:border-success-500/40 dark:bg-success-500/10 dark:text-success-400">
          <CheckCircleIcon />
          {success_message}
        </div>
      )}

      {/* ── Main Grid ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* ── Left Sidebar ──────────────────────────────────────────────────── */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4">

            {/* Identity preview card */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
              {/* Gradient cover */}
              <div
                className="h-20 bg-gradient-to-r from-brand-500 to-brand-700"
                style={cover_style}
              />
              <div className="px-5 pb-5">
                {/* Logo floating above cover */}
                <div className="-mt-9 mb-4">
                  <div className="inline-block overflow-hidden rounded-xl ring-4 ring-white shadow-md dark:ring-gray-900">
                    <div className="h-[68px] w-[68px]">
                      {has_logo_light ? (
                        <img
                          src={org.logo_light!}
                          alt={org.name}
                          className="h-full w-full object-contain bg-white p-1.5"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-400 to-brand-600 text-2xl font-bold text-white">
                          {org_initial}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  {org.name}
                </h3>
                <p className="mt-0.5 font-mono text-xs text-gray-400 dark:text-gray-500">
                  {org.slug}
                </p>
                <div className="mt-2">
                  <Badge
                    variant="light"
                    size="sm"
                    color={org.is_active ? "success" : "error"}
                  >
                    {org.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>

              {/* Timestamps */}
              <div className="space-y-1.5 border-t border-gray-100 px-5 py-3.5 dark:border-gray-800">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-1 text-gray-400 dark:text-gray-500">
                    <ClockIcon />
                    Created
                  </span>
                  <span className="font-medium text-gray-600 dark:text-gray-300">
                    {formatDate(org.created_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-1 text-gray-400 dark:text-gray-500">
                    <ClockIcon />
                    Updated
                  </span>
                  <span className="font-medium text-gray-600 dark:text-gray-300">
                    {formatDate(org.updated_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-gray-400 dark:text-gray-500">Timezone</span>
                  <span className="font-medium text-gray-600 dark:text-gray-300">
                    {org.timezone}
                  </span>
                </div>
              </div>
            </div>

            {/* Brand colors card */}
            {(isValidHex(org.primary_color ?? "") || isValidHex(org.accent_color ?? "")) && (
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                  <span className="text-gray-400 dark:text-gray-500">
                    <PaletteIcon />
                  </span>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    Brand Colors
                  </h3>
                </div>
                <div className="px-5 py-4 space-y-3">
                  {isValidHex(org.primary_color ?? "") && (
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 shrink-0 rounded-lg border border-gray-200 shadow-inner dark:border-gray-700"
                        style={{ background: org.primary_color! }}
                      />
                      <div>
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          Primary Color
                        </p>
                        <p className="font-mono text-xs text-gray-400 dark:text-gray-500">
                          {org.primary_color}
                        </p>
                      </div>
                    </div>
                  )}
                  {isValidHex(org.accent_color ?? "") && (
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 shrink-0 rounded-lg border border-gray-200 shadow-inner dark:border-gray-700"
                        style={{ background: org.accent_color! }}
                      />
                      <div>
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          Accent Color
                        </p>
                        <p className="font-mono text-xs text-gray-400 dark:text-gray-500">
                          {org.accent_color}
                        </p>
                      </div>
                    </div>
                  )}
                  {/* Preview bar */}
                  {isValidHex(org.primary_color ?? "") && (
                    <div
                      className="h-2 w-full rounded-full"
                      style={
                        isValidHex(org.accent_color ?? "")
                          ? { background: `linear-gradient(to right, ${org.primary_color}, ${org.accent_color})` }
                          : { background: org.primary_color! }
                      }
                    />
                  )}
                </div>
              </div>
            )}

            {/* Quick contact card */}
            {(org.contact_email || org.contact_phone || org.contact_link) && (
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                  <span className="text-gray-400 dark:text-gray-500">
                    <MailIcon />
                  </span>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    Contact
                  </h3>
                </div>
                <div className="px-5 py-3 space-y-2.5">
                  {org.contact_email && (
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 text-gray-400 dark:text-gray-500">
                        <MailIcon />
                      </span>
                      <a
                        href={`mailto:${org.contact_email}`}
                        className="break-all text-xs text-brand-600 hover:underline dark:text-brand-400"
                      >
                        {org.contact_email}
                      </a>
                    </div>
                  )}
                  {org.contact_phone && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 dark:text-gray-500">
                        <PhoneIcon />
                      </span>
                      <span className="text-xs text-gray-600 dark:text-gray-300">
                        {org.contact_phone}
                      </span>
                    </div>
                  )}
                  {org.contact_link && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 dark:text-gray-500">
                        <LinkIcon />
                      </span>
                      <a
                        href={org.contact_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-brand-600 hover:underline dark:text-brand-400"
                      >
                        Contact page
                        <ExternalLinkIcon />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Edit Form ─────────────────────────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-2" key={form_key}>

          {/* Section 1: General Information */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <SectionHeader
              title="General Information"
              description="Basic details about the organization displayed throughout the portal."
              icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                </svg>
              }
            />
            <div className="space-y-4">
              <div>
                <Label htmlFor="org_name">
                  Organization Name
                  <span className="ml-1 text-error-500">*</span>
                </Label>
                <Input
                  id="org_name"
                  type="text"
                  value={form_data.name}
                  placeholder="BASE Search Marketing"
                  onChange={(e) => handleFieldChange("name", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="org_slug">Slug</Label>
                <Input
                  id="org_slug"
                  type="text"
                  value={org.slug}
                  disabled
                />
                <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                  Auto-generated identifier used in URLs. Not editable.
                </p>
              </div>

              <div>
                <Label htmlFor="org_description">Description</Label>
                <textarea
                  id="org_description"
                  value={form_data.description}
                  onChange={(e) => handleFieldChange("description", e.target.value)}
                  placeholder="A brief description of the organization…"
                  rows={3}
                  className={TEXTAREA_CLASS}
                />
              </div>

              <div>
                <Label htmlFor="org_website">Website</Label>
                <Input
                  id="org_website"
                  type="url"
                  value={form_data.website}
                  placeholder="https://basesearchmarketing.com"
                  onChange={(e) => handleFieldChange("website", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="org_timezone">Timezone</Label>
                <Select
                  key={`tz_${form_key}`}
                  options={TIMEZONE_OPTIONS}
                  defaultValue={form_data.timezone}
                  onChange={(value) => handleFieldChange("timezone", value)}
                  placeholder="Select timezone"
                />
              </div>

              {/* Active status toggle */}
              <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 dark:border-gray-700 dark:bg-gray-800/50">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    Organization Active
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Inactive organizations are hidden from non-admin users.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form_data.is_active}
                  onClick={() => handleFieldChange("is_active", !form_data.is_active)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
                    form_data.is_active
                      ? "bg-success-500"
                      : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                      form_data.is_active ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Contact Details */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <SectionHeader
              title="Contact Details"
              description="Primary contact information used in invoices, emails, and client-facing pages."
              icon={<MailIcon />}
            />
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="org_contact_email">Contact Email</Label>
                  <Input
                    id="org_contact_email"
                    type="email"
                    value={form_data.contact_email}
                    placeholder="hello@example.com"
                    onChange={(e) => handleFieldChange("contact_email", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="org_contact_phone">Contact Phone</Label>
                  <Input
                    id="org_contact_phone"
                    type="text"
                    value={form_data.contact_phone}
                    placeholder="+1 (555) 000-0000"
                    onChange={(e) => handleFieldChange("contact_phone", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="org_contact_link">Contact Page URL</Label>
                <Input
                  id="org_contact_link"
                  type="url"
                  value={form_data.contact_link}
                  placeholder="https://example.com/contact"
                  onChange={(e) => handleFieldChange("contact_link", e.target.value)}
                />
                <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                  Link displayed to clients to reach your team.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Brand Colors */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <SectionHeader
              title="Brand Colors"
              description="Define the color palette applied to the portal's UI elements, buttons, and highlights."
              icon={<PaletteIcon />}
            />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <ColorField
                id="org_primary_color"
                label="Primary Color"
                hint="Used for buttons, links, and primary UI accents."
                value={form_data.primary_color}
                onChange={(v) => handleFieldChange("primary_color", v)}
              />
              <ColorField
                id="org_accent_color"
                label="Accent Color"
                hint="Used for highlights, hover states, and secondary elements."
                value={form_data.accent_color}
                onChange={(v) => handleFieldChange("accent_color", v)}
              />
            </div>
            {/* Live preview strip */}
            {(isValidHex(form_data.primary_color) || isValidHex(form_data.accent_color)) && (
              <div className="mt-5 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                <div
                  className="h-8"
                  style={
                    isValidHex(form_data.primary_color) && isValidHex(form_data.accent_color)
                      ? { background: `linear-gradient(to right, ${form_data.primary_color}, ${form_data.accent_color})` }
                      : isValidHex(form_data.primary_color)
                        ? { background: form_data.primary_color }
                        : { background: form_data.accent_color }
                  }
                />
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 dark:bg-gray-800">
                  <span className="text-xs text-gray-400 dark:text-gray-500">Color preview</span>
                  {isValidHex(form_data.primary_color) && (
                    <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                      {form_data.primary_color}
                    </span>
                  )}
                  {isValidHex(form_data.primary_color) && isValidHex(form_data.accent_color) && (
                    <span className="text-gray-300 dark:text-gray-600">→</span>
                  )}
                  {isValidHex(form_data.accent_color) && (
                    <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                      {form_data.accent_color}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Brand Assets — Logos */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <SectionHeader
              title="Brand Assets — Logos"
              description="Full-width logo images shown in the application header and printed materials."
              icon={<ImageIcon />}
            />
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <LogoPreviewField
                  id="org_logo_light"
                  label="Logo (Light Mode)"
                  hint="Displayed on white or light-colored backgrounds."
                  value={form_data.logo_light}
                  onChange={(v) => handleFieldChange("logo_light", v)}
                />
                <LogoPreviewField
                  id="org_logo_dark"
                  label="Logo (Dark Mode)"
                  hint="Displayed on dark backgrounds and sidebar headers."
                  value={form_data.logo_dark}
                  onChange={(v) => handleFieldChange("logo_dark", v)}
                />
              </div>
            </div>
          </div>

          {/* Section 5: Brand Assets — Icons */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <SectionHeader
              title="Brand Assets — Icons"
              description="Square icon images used in favicons, tab titles, mobile shortcuts, and compact UI slots."
              icon={<ImageIcon />}
            />
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <LogoPreviewField
                  id="org_icon_light"
                  label="Icon (Light Mode)"
                  hint="Square icon for light-colored backgrounds."
                  value={form_data.icon_light}
                  onChange={(v) => handleFieldChange("icon_light", v)}
                />
                <LogoPreviewField
                  id="org_icon_dark"
                  label="Icon (Dark Mode)"
                  hint="Square icon for dark backgrounds."
                  value={form_data.icon_dark}
                  onChange={(v) => handleFieldChange("icon_dark", v)}
                />
              </div>
              <LogoPreviewField
                id="org_mobile_app_icon"
                label="Mobile App Icon"
                hint="Icon displayed in mobile browsers, PWA shortcuts, and app launchers."
                value={form_data.mobile_app_icon}
                onChange={(v) => handleFieldChange("mobile_app_icon", v)}
              />
            </div>
          </div>

          {/* ── Save / Reset ───────────────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-800 dark:bg-white/[0.02]">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Changes are applied immediately after saving.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleReset}
                disabled={is_saving}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                <RefreshIcon />
                Reset
              </button>
              <Button
                size="md"
                variant="primary"
                disabled={is_saving}
                onClick={handleSubmit}
              >
                {is_saving ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Saving…
                  </span>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOrganizationDetailContent;
