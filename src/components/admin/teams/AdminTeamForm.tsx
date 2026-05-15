"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { CreateAdminTeamPayload } from "@/types/admin/teams";
import { createAdminTeam, updateAdminTeam, getAdminTeam } from "@/services/admin/teams.service";

// ── Color Picker ───────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  { label: "Blue",   value: "#3B82F6" },
  { label: "Purple", value: "#8B5CF6" },
  { label: "Green",  value: "#10B981" },
  { label: "Red",    value: "#EF4444" },
  { label: "Orange", value: "#F59E0B" },
  { label: "Pink",   value: "#EC4899" },
  { label: "Teal",   value: "#14B8A6" },
  { label: "Indigo", value: "#6366F1" },
];

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRESET_COLORS.map((color) => (
        <button
          key={color.value}
          type="button"
          onClick={() => onChange(color.value)}
          className={`relative flex h-8 w-8 items-center justify-center rounded-full transition-transform hover:scale-110 ${
            value === color.value ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : ""
          }`}
          style={{ backgroundColor: color.value }}
          title={color.label}
        >
          {value === color.value && (
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          )}
        </button>
      ))}
    </div>
  );
}

// ── Team Preview ───────────────────────────────────────────────────────────────

function TeamPreview({ name, description, color }: { name: string; description: string; color: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-white/3">
      <div className="h-1 w-full" style={{ backgroundColor: color }} />
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: color }}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {name || <span className="italic text-gray-400">Team name</span>}
            </p>
            {description && (
              <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{description}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Form ──────────────────────────────────────────────────────────────────

interface AdminTeamFormProps {
  mode: "create" | "edit";
  team_id?: string;
}

export default function AdminTeamForm({ mode, team_id }: AdminTeamFormProps) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#3B82F6");
  const [is_active, setIsActive] = useState(true);

  const [is_loading_team, setIsLoadingTeam] = useState(mode === "edit");
  const [is_submitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [field_errors, setFieldErrors] = useState<Record<string, string>>({});

  const loadTeam = useCallback(async () => {
    if (!team_id) return;
    try {
      const team = await getAdminTeam(team_id);
      setName(team.name);
      setDescription(team.description ?? "");
      setColor(team.color);
      setIsActive(team.is_active);
    } catch {
      setError("Failed to load team data.");
    } finally {
      setIsLoadingTeam(false);
    }
  }, [team_id]);

  useEffect(() => {
    if (mode === "edit") loadTeam();
  }, [mode, loadTeam]);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = "Team name is required.";
    else if (name.trim().length > 150) errors.name = "Name must be 150 characters or fewer.";
    if (description.length > 500) errors.description = "Description must be 500 characters or fewer.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setError(null);

    const payload: CreateAdminTeamPayload = {
      name: name.trim(),
      description: description.trim() || null,
      color,
      is_active,
    };

    try {
      if (mode === "create") {
        const team = await createAdminTeam(payload);
        router.push(`/admin/teams/${team.id}`);
      } else if (team_id) {
        await updateAdminTeam(team_id, payload);
        router.push(`/admin/teams/${team_id}`);
      }
    } catch (err: unknown) {
      const api_err = err as { errors?: Record<string, string[]>; message?: string };
      if (api_err?.errors) {
        const mapped: Record<string, string> = {};
        for (const [key, messages] of Object.entries(api_err.errors)) {
          mapped[key] = Array.isArray(messages) ? messages[0] : messages;
        }
        setFieldErrors(mapped);
      } else {
        setError(api_err?.message ?? "An error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (is_loading_team) {
    return (
      <div className="flex items-center justify-center py-32">
        <svg className="h-8 w-8 animate-spin text-brand-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.back()}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {mode === "create" ? "Create New Team" : "Edit Team"}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {mode === "create"
            ? "Set up a new admin team and invite staff members."
            : "Update the team's settings."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 lg:col-span-3">
          {error && (
            <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/30 dark:bg-red-500/10">
              <svg className="h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Team Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (field_errors.name) setFieldErrors((prev) => ({ ...prev, name: "" }));
              }}
              placeholder="e.g. Content Strategy"
              maxLength={150}
              className={`w-full rounded-xl border px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 outline-none transition-colors dark:bg-gray-900 dark:text-gray-300 dark:placeholder-gray-500 ${
                field_errors.name
                  ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-400/20 dark:border-red-500/50"
                  : "border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 dark:border-gray-700 dark:focus:border-brand-500"
              }`}
            />
            {field_errors.name && (
              <p className="mt-1 text-xs text-red-500">{field_errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description <span className="text-xs font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (field_errors.description) setFieldErrors((prev) => ({ ...prev, description: "" }));
              }}
              placeholder="What does this team work on?"
              rows={3}
              maxLength={500}
              className={`w-full resize-none rounded-xl border px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 outline-none transition-colors dark:bg-gray-900 dark:text-gray-300 dark:placeholder-gray-500 ${
                field_errors.description
                  ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-400/20 dark:border-red-500/50"
                  : "border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 dark:border-gray-700 dark:focus:border-brand-500"
              }`}
            />
            <div className="mt-1 flex items-center justify-between">
              {field_errors.description ? (
                <p className="text-xs text-red-500">{field_errors.description}</p>
              ) : (
                <span />
              )}
              <p className="text-xs text-gray-400">{description.length}/500</p>
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Team Color
            </label>
            <ColorPicker value={color} onChange={setColor} />
          </div>

          {/* Active toggle (edit mode only) */}
          {mode === "edit" && (
            <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3 dark:border-gray-800 dark:bg-white/2">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Inactive teams are hidden from most views.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  is_active ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 translate-x-1 transform rounded-full bg-white shadow-sm transition-transform ${
                    is_active ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={is_submitting}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
            >
              {is_submitting && (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {is_submitting
                ? mode === "create"
                  ? "Creating…"
                  : "Saving…"
                : mode === "create"
                  ? "Create Team"
                  : "Save Changes"}
            </button>
          </div>
        </form>

        {/* Preview */}
        <div className="lg:col-span-2">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Preview
          </p>
          <TeamPreview name={name} description={description} color={color} />
        </div>
      </div>
    </div>
  );
}
