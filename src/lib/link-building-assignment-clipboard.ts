/**
 * Copy and paste for the assignment columns of the link building orders grid
 * (Client Account and Assigned To). These cells store a user id but show a name,
 * so a copy writes the name the cell shows and a paste resolves a name, an email
 * or an id back to the matching user, the way a spreadsheet lookup column works.
 */

import type { AdminUserOption, ClientUserOption } from "@/services/admin/link-building-dashboard.service";

export const ASSIGNMENT_CLIPBOARD_COLUMN_KEYS = ["user_id", "assigned_admin_user_id"] as const;

export type AssignmentClipboardColumnKey = (typeof ASSIGNMENT_CLIPBOARD_COLUMN_KEYS)[number];

export function isAssignmentColumnKey(col_key: string): col_key is AssignmentClipboardColumnKey {
  return (ASSIGNMENT_CLIPBOARD_COLUMN_KEYS as readonly string[]).includes(col_key);
}

export interface AssignmentUserLists {
  client_users: ClientUserOption[];
  admin_users: AdminUserOption[];
}

/** Text an assignment cell shows (and copies): the client's company or name, or the team member's name. */
export function getAssignmentCellText(
  col_key: AssignmentClipboardColumnKey,
  user_id: number | string | null | undefined,
  users: AssignmentUserLists
): string {
  if (user_id == null || user_id === "") return "";
  const id = Number(user_id);
  if (col_key === "user_id") {
    const client = users.client_users.find((u) => u.id === id);
    return client ? client.company || client.name : "";
  }
  return users.admin_users.find((u) => u.id === id)?.name ?? "";
}

/** Result of resolving one pasted assignment value. */
export type AssignmentPasteResult =
  | { status: "resolved"; user_id: number | null }
  | { status: "unmatched" };

function normalizeLookupText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Resolves pasted text to a user id. A blank value unassigns the cell. Otherwise
 * the text is matched, ignoring casing and extra spaces, against each user's id,
 * email, name and (for client accounts) company. Text matching no user, or more
 * than one user, is reported as unmatched so the cell keeps its current value
 * instead of being assigned to the wrong account.
 */
export function resolveAssignmentPasteValue(
  col_key: AssignmentClipboardColumnKey,
  raw_value: string,
  users: AssignmentUserLists
): AssignmentPasteResult {
  const lookup = normalizeLookupText(raw_value);
  if (lookup === "" || lookup === "unassigned") {
    return { status: "resolved", user_id: null };
  }

  const candidates: { id: number; texts: string[] }[] =
    col_key === "user_id"
      ? users.client_users.map((u) => ({ id: u.id, texts: [u.email, u.company, u.name] }))
      : users.admin_users.map((u) => ({ id: u.id, texts: [u.email, u.name] }));

  const by_id = candidates.find((candidate) => String(candidate.id) === lookup);
  if (by_id) return { status: "resolved", user_id: by_id.id };

  // Email first, it is unique, then the display texts, which may repeat.
  for (const text_idx of [0, 1, 2]) {
    const matches = candidates.filter(
      (candidate) => candidate.texts[text_idx] && normalizeLookupText(candidate.texts[text_idx]) === lookup
    );
    if (matches.length === 1) return { status: "resolved", user_id: matches[0].id };
    if (matches.length > 1) return { status: "unmatched" };
  }

  return { status: "unmatched" };
}
