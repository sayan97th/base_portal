"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  AdminResource,
  AdminResourceFile,
  ResourceCategory,
  ResourceStatus,
  CreateResourcePayload,
} from "@/types/admin/resources";
import {
  createAdminResource,
  updateAdminResource,
  getAdminResource,
  uploadAdminResourceFile,
  deleteAdminResourceFile,
} from "@/services/admin/resources.service";

// ── Constants ─────────────────────────────────────────────────────────────────

const FILE_MAX_SIZE = 50 * 1024 * 1024; // 50 MB
const FILE_ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
];

const CATEGORY_OPTIONS: { label: string; value: ResourceCategory }[] = [
  { label: "PDF", value: "pdf" },
  { label: "Spreadsheet", value: "spreadsheet" },
  { label: "Document", value: "document" },
  { label: "Presentation", value: "presentation" },
  { label: "Image", value: "image" },
  { label: "Blog Post", value: "blog_post" },
  { label: "Other", value: "other" },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface ResourceFormPageProps {
  mode: "create" | "edit";
  resource_id?: number;
}

interface StagedFile {
  uid: string;
  file: File;
  preview_name: string;
  error?: string;
  uploading?: boolean;
}

interface FormFields {
  title: string;
  description: string;
  category: ResourceCategory;
  status: ResourceStatus;
  organization_id: string;
}

interface FormErrors {
  title?: string;
  category?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getEmptyForm(): FormFields {
  return {
    title: "",
    description: "",
    category: "document",
    status: "draft",
    organization_id: "",
  };
}

function formFromResource(resource: AdminResource): FormFields {
  return {
    title: resource.title,
    description: resource.description ?? "",
    category: resource.category,
    status: resource.status,
    organization_id: resource.organization_id ? String(resource.organization_id) : "",
  };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileTypeFromMime(mime: string): string {
  const map: Record<string, string> = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-excel": "xls",
    "text/csv": "csv",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "application/vnd.ms-powerpoint": "ppt",
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
  };
  return map[mime] ?? "file";
}

function getFileTypeLabelFromExtension(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const labels: Record<string, string> = {
    pdf: "PDF", xlsx: "Excel", xls: "Excel", csv: "CSV",
    docx: "Word", doc: "Word", pptx: "PowerPoint", ppt: "PowerPoint",
    png: "PNG", jpg: "JPG", jpeg: "JPEG", gif: "GIF", webp: "WebP",
  };
  return labels[ext] ?? ext.toUpperCase();
}

// ── Form Input Components ────────────────────────────────────────────────────

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">{hint}</p>
      )}
      {error && <p className="mt-1.5 text-xs font-medium text-red-500">{error}</p>}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  error,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: boolean;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 transition-colors focus:outline-none focus:ring-2 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500 ${
        error
          ? "border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-200 dark:border-red-500/50 dark:bg-red-500/10"
          : "border-gray-200 bg-white focus:border-brand-400 focus:ring-brand-100 dark:border-gray-600"
      }`}
    />
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
    />
  );
}

function SectionCard({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-5 flex items-start gap-3">
        {icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-500/10">
            <span className="text-brand-500 dark:text-brand-400">{icon}</span>
          </div>
        )}
        <div>
          <h2 className="text-base font-semibold text-gray-800 dark:text-white">{title}</h2>
          {description && (
            <p className="mt-0.5 text-sm text-gray-400 dark:text-gray-500">{description}</p>
          )}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

// ── Existing File Row ─────────────────────────────────────────────────────────

function ExistingFileRow({
  file,
  resource_id,
  onRemoved,
}: {
  file: AdminResourceFile;
  resource_id: number;
  onRemoved: (file_id: number) => void;
}) {
  const [is_removing, setIsRemoving] = useState(false);

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      await deleteAdminResourceFile(resource_id, file.id);
      onRemoved(file.id);
    } catch {
      setIsRemoving(false);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-700/50">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-bold text-gray-500 shadow-sm dark:bg-gray-600 dark:text-gray-300">
        {getFileTypeLabelFromExtension(file.name).slice(0, 3)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">{file.name}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {getFileTypeLabelFromExtension(file.name)}
          {file.size_bytes ? ` · ${formatFileSize(file.size_bytes)}` : ""}
        </p>
      </div>
      <a
        href={file.download_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-600 dark:hover:text-gray-200"
        title="Download"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
      </a>
      <button
        onClick={handleRemove}
        disabled={is_removing}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-500/10 dark:hover:text-red-400"
        title="Remove file"
      >
        {is_removing ? (
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </button>
    </div>
  );
}

// ── Staged File Row ───────────────────────────────────────────────────────────

function StagedFileRow({
  staged,
  onRemove,
}: {
  staged: StagedFile;
  onRemove: (uid: string) => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
        staged.error
          ? "border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10"
          : staged.uploading
          ? "border-brand-200 bg-brand-50 dark:border-brand-500/30 dark:bg-brand-500/10"
          : "border-dashed border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700/30"
      }`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs font-bold text-gray-500 dark:bg-gray-600 dark:text-gray-300">
        {getFileTypeFromMime(staged.file.type).toUpperCase().slice(0, 3)}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-medium ${staged.error ? "text-red-700 dark:text-red-400" : "text-gray-700 dark:text-gray-300"}`}>
          {staged.preview_name}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {staged.error
            ? staged.error
            : staged.uploading
            ? "Uploading…"
            : `${formatFileSize(staged.file.size)} · Ready to upload`}
        </p>
      </div>
      {staged.uploading ? (
        <svg className="h-4 w-4 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <button
          onClick={() => onRemove(staged.uid)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-600 dark:hover:text-gray-200"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ── Drop Zone ─────────────────────────────────────────────────────────────────

function DropZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [is_dragging, setIsDragging] = useState(false);
  const file_input_ref = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length > 0) onFiles(dropped);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) onFiles(files);
    e.target.value = "";
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => file_input_ref.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
        is_dragging
          ? "border-brand-400 bg-brand-50/50 dark:border-brand-500 dark:bg-brand-500/10"
          : "border-gray-200 bg-gray-50/50 hover:border-brand-300 hover:bg-brand-50/30 dark:border-gray-700 dark:bg-gray-700/30 dark:hover:border-brand-500/50"
      }`}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700">
        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Drop files here or <span className="text-brand-500">browse</span>
        </p>
        <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
          PDF, Word, Excel, PowerPoint, Images · Max 50 MB per file
        </p>
      </div>
      <input
        ref={file_input_ref}
        type="file"
        multiple
        accept={FILE_ALLOWED_TYPES.join(",")}
        onChange={handleFileInput}
        className="hidden"
      />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ResourceFormPage({ mode, resource_id }: ResourceFormPageProps) {
  const router = useRouter();

  // ── Form State ───────────────────────────────────────────────────────────
  const [form, setForm] = useState<FormFields>(getEmptyForm());
  const [errors, setErrors] = useState<FormErrors>({});

  // ── Loading / Save State ─────────────────────────────────────────────────
  const [is_loading_resource, setIsLoadingResource] = useState(mode === "edit");
  const [is_saving, setIsSaving] = useState(false);
  const [save_error, setSaveError] = useState<string | null>(null);
  const [resource_id_state, setResourceIdState] = useState<number | null>(
    mode === "edit" && resource_id ? resource_id : null
  );

  // ── File State ───────────────────────────────────────────────────────────
  const [existing_files, setExistingFiles] = useState<AdminResourceFile[]>([]);
  const [staged_files, setStagedFiles] = useState<StagedFile[]>([]);
  const [upload_error, setUploadError] = useState<string | null>(null);

  // ── Load resource for edit mode ──────────────────────────────────────────
  useEffect(() => {
    if (mode !== "edit" || !resource_id) return;
    setIsLoadingResource(true);
    getAdminResource(resource_id)
      .then((resource) => {
        setForm(formFromResource(resource));
        setExistingFiles(resource.files ?? []);
      })
      .catch(() => setSaveError("Failed to load resource data."))
      .finally(() => setIsLoadingResource(false));
  }, [mode, resource_id]);

  const setField = useCallback(<K extends keyof FormFields>(key: K, value: FormFields[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }, []);

  // ── Validation ───────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const next_errors: FormErrors = {};
    if (!form.title.trim()) next_errors.title = "Title is required.";
    if (!form.category) next_errors.category = "Please select a category.";
    setErrors(next_errors);
    return Object.keys(next_errors).length === 0;
  };

  // ── File Staging ─────────────────────────────────────────────────────────

  const stageFiles = (files: File[]) => {
    setUploadError(null);
    const next: StagedFile[] = files.map((file) => {
      const uid = `${Date.now()}-${Math.random()}`;
      if (!FILE_ALLOWED_TYPES.includes(file.type)) {
        return { uid, file, preview_name: file.name, error: "File type not allowed." };
      }
      if (file.size > FILE_MAX_SIZE) {
        return { uid, file, preview_name: file.name, error: "File exceeds 50 MB limit." };
      }
      return { uid, file, preview_name: file.name };
    });
    setStagedFiles((prev) => [...prev, ...next]);
  };

  const removeStagedFile = (uid: string) => {
    setStagedFiles((prev) => prev.filter((f) => f.uid !== uid));
  };

  const handleExistingFileRemoved = (file_id: number) => {
    setExistingFiles((prev) => prev.filter((f) => f.id !== file_id));
  };

  // ── Upload staged files to a resource ────────────────────────────────────

  const uploadStagedFiles = useCallback(async (res_id: number) => {
    const valid_staged = staged_files.filter((f) => !f.error);
    if (valid_staged.length === 0) return;

    for (const staged of valid_staged) {
      setStagedFiles((prev) =>
        prev.map((f) => (f.uid === staged.uid ? { ...f, uploading: true } : f))
      );
      try {
        const new_file = await uploadAdminResourceFile(res_id, staged.file);
        setExistingFiles((prev) => [...prev, new_file]);
        setStagedFiles((prev) => prev.filter((f) => f.uid !== staged.uid));
      } catch {
        setStagedFiles((prev) =>
          prev.map((f) =>
            f.uid === staged.uid ? { ...f, uploading: false, error: "Upload failed. Try again." } : f
          )
        );
      }
    }
  }, [staged_files]);

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);
    setSaveError(null);

    const payload: CreateResourcePayload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category,
      status: form.status,
      organization_id: form.organization_id ? Number(form.organization_id) : null,
    };

    try {
      let res_id = resource_id_state;

      if (mode === "create") {
        const created = await createAdminResource(payload);
        res_id = created.id;
        setResourceIdState(created.id);
      } else if (resource_id_state) {
        await updateAdminResource(resource_id_state, payload);
      }

      // Upload staged files
      if (res_id) {
        await uploadStagedFiles(res_id);
      }

      router.push("/admin/resources");
    } catch {
      setSaveError("Failed to save resource. Please check your inputs and try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Upload files now (edit mode) ─────────────────────────────────────────

  const handleUploadNow = async () => {
    if (!resource_id_state) return;
    setUploadError(null);
    await uploadStagedFiles(resource_id_state);
  };

  const has_valid_staged = staged_files.some((f) => !f.error);
  const total_file_count = existing_files.length + staged_files.filter((f) => !f.error).length;

  // ── Loading state ─────────────────────────────────────────────────────────

  if (is_loading_resource) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="h-8 w-8 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-gray-400 dark:text-gray-500">Loading resource…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/resources"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {mode === "create" ? "New Resource" : "Edit Resource"}
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {mode === "create"
              ? "Fill in the details and attach files. The resource will be saved as draft."
              : "Update the resource details and manage attached files."}
          </p>
        </div>
      </div>

      {/* ── Error Banner ─────────────────────────────────────────────────────── */}
      {save_error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {save_error}
        </div>
      )}

      {/* ── Two-column layout ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* ── LEFT: Main Content ─────────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Basic Information */}
          <SectionCard
            title="Basic Information"
            description="Title, description, and category of the resource."
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            }
          >
            <Field label="Title" required error={errors.title}>
              <Input
                value={form.title}
                onChange={(v) => setField("title", v)}
                placeholder="e.g. February KW Movement 3 Month Comparison"
                error={Boolean(errors.title)}
              />
            </Field>

            <Field label="Description" hint="A brief description visible to the client.">
              <TextArea
                value={form.description}
                onChange={(v) => setField("description", v)}
                placeholder="Describe what this resource contains and why it's useful…"
                rows={4}
              />
            </Field>

            <Field label="Category" required error={errors.category}>
              <select
                value={form.category}
                onChange={(e) => setField("category", e.target.value as ResourceCategory)}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 dark:bg-gray-700 dark:text-white ${
                  errors.category
                    ? "border-red-400 bg-red-50 focus:ring-red-200 dark:border-red-500/50"
                    : "border-gray-200 bg-white focus:border-brand-400 focus:ring-brand-100 dark:border-gray-600"
                }`}
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>
          </SectionCard>

          {/* Organization */}
          <SectionCard
            title="Organization Assignment"
            description="Assign this resource to a specific organization. Leave empty to share with all."
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
              </svg>
            }
          >
            <Field
              label="Organization ID"
              hint="Enter the numeric ID of the target organization, or leave blank for all."
            >
              <Input
                type="number"
                value={form.organization_id}
                onChange={(v) => setField("organization_id", v)}
                placeholder="e.g. 42 (leave blank for all organizations)"
              />
            </Field>
          </SectionCard>

          {/* File Attachments */}
          <SectionCard
            title="File Attachments"
            description="Upload PDF, Word, Excel, PowerPoint, or image files."
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
              </svg>
            }
          >
            {/* Existing files */}
            {existing_files.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  Uploaded ({existing_files.length})
                </p>
                {existing_files.map((file) => (
                  <ExistingFileRow
                    key={file.id}
                    file={file}
                    resource_id={resource_id_state ?? 0}
                    onRemoved={handleExistingFileRemoved}
                  />
                ))}
              </div>
            )}

            {/* Staged files */}
            {staged_files.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  Pending upload ({staged_files.length})
                </p>
                {staged_files.map((staged) => (
                  <StagedFileRow
                    key={staged.uid}
                    staged={staged}
                    onRemove={removeStagedFile}
                  />
                ))}
              </div>
            )}

            {/* Upload error */}
            {upload_error && (
              <p className="text-xs font-medium text-red-500">{upload_error}</p>
            )}

            {/* Drop zone */}
            <DropZone onFiles={stageFiles} />

            {/* Upload now button (edit mode with staged files) */}
            {mode === "edit" && has_valid_staged && resource_id_state && (
              <button
                onClick={handleUploadNow}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 py-2.5 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Upload {staged_files.filter((f) => !f.error).length} pending {staged_files.filter((f) => !f.error).length === 1 ? "file" : "files"} now
              </button>
            )}
          </SectionCard>
        </div>

        {/* ── RIGHT: Sidebar ─────────────────────────────────────────────────── */}
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          {/* Publish Settings */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white">Publish Settings</h2>

            {/* Status toggle */}
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {form.status === "published" ? "Visible to clients" : "Hidden from clients"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setField("status", form.status === "published" ? "draft" : "published")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                  form.status === "published" ? "bg-brand-500" : "bg-gray-200 dark:bg-gray-700"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                    form.status === "published" ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Status label */}
            <div className={`mb-5 rounded-xl p-3 ${
              form.status === "published"
                ? "bg-emerald-50 dark:bg-emerald-500/10"
                : "bg-gray-50 dark:bg-gray-700/50"
            }`}>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${form.status === "published" ? "bg-emerald-500" : "bg-gray-400"}`} />
                <span className={`text-sm font-medium ${form.status === "published" ? "text-emerald-700 dark:text-emerald-400" : "text-gray-500 dark:text-gray-400"}`}>
                  {form.status === "published" ? "Published" : "Draft"}
                </span>
              </div>
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={is_saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 disabled:opacity-60"
            >
              {is_saving ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {mode === "create" ? "Creating…" : "Saving…"}
                </>
              ) : mode === "create" ? (
                "Create Resource"
              ) : (
                "Save Changes"
              )}
            </button>

            <button
              onClick={() => router.push("/admin/resources")}
              className="mt-2 w-full rounded-xl py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            >
              Cancel
            </button>
          </div>

          {/* Resource Preview */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white">Preview</h2>
            <div className="rounded-xl border border-gray-100 p-3.5 dark:border-gray-700">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
                  <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-medium ${form.category ? "text-brand-500" : "text-gray-400"}`}>
                    {CATEGORY_OPTIONS.find((o) => o.value === form.category)?.label ?? "Category"}
                  </p>
                  <p className={`mt-0.5 line-clamp-2 text-sm font-semibold ${form.title ? "text-gray-800 dark:text-white" : "text-gray-300 dark:text-gray-600"}`}>
                    {form.title || "Resource title will appear here"}
                  </p>
                </div>
              </div>
              {form.description && (
                <p className="mt-2.5 line-clamp-2 text-xs text-gray-400 dark:text-gray-500">
                  {form.description}
                </p>
              )}
              <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-2.5 dark:border-gray-700">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {total_file_count} {total_file_count === 1 ? "file" : "files"}
                </span>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span className={`text-xs font-medium ${form.status === "published" ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400 dark:text-gray-500"}`}>
                  {form.status === "published" ? "Published" : "Draft"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
