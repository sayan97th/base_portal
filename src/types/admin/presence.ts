import type { BacklinkOrderRow } from "./backlink-order";

// ── Collaborator presence ──────────────────────────────────────────────────────

/**
 * A user currently connected to the backlink orders presence channel.
 * The server assigns a unique session_id per connection so that the same
 * user opening two browser tabs is tracked as two separate collaborators.
 *
 * Laravel channel auth (`routes/channels.php`) must return at least:
 *   ['session_id', 'user_id', 'name', 'initials', 'color', 'avatar_url']
 */
export interface CollaboratorPresence {
  /** Unique per-connection identifier assigned by the server */
  session_id: string;
  user_id: number;
  name: string;
  /** Two-letter initials derived from name (e.g. "JD" for "John Doe") */
  initials: string;
  /** Hex color assigned by the server to this collaborator (e.g. "#6366f1") */
  color: string;
  avatar_url: string | null;
  /** The database row_id currently being edited by this collaborator, or null */
  focused_row_id: string | null;
  /** The column key being edited (e.g. "client"), or null */
  focused_col_key: string | null;
}

// ── WebSocket / Echo connection states ────────────────────────────────────────

export type WsReadyState =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

// ── Whisper payloads (client → other clients via Echo presence channel) ────────

/**
 * Sent when the current user starts editing a cell.
 * Transmitted as a client event (whisper) on the presence channel.
 */
export interface WhisperRowFocus {
  /** Tab-level session identifier so multi-tab users are tracked separately */
  session_id: string;
  row_id: string;
  col_key: string;
}

/**
 * Sent when the current user stops editing a row (blur, Tab, Enter, Escape).
 * Transmitted as a client event (whisper) on the presence channel.
 */
export interface WhisperRowBlur {
  session_id: string;
  row_id: string;
}

/**
 * Sent when the current user selects a row without editing a specific cell
 * (e.g. clicking anywhere on the row before a cell is focused).
 * Sets focused_row_id on the collaborator without a focused_col_key so that
 * other users see the row as "selected by" this collaborator.
 * Transmitted as a client event (whisper) on the presence channel.
 */
export interface WhisperRowSelect {
  session_id: string;
  row_id: string;
}

// ── Server broadcast event payloads (server → all clients) ────────────────────

/**
 * Broadcast by the server after a BacklinkOrder row is updated via the REST API.
 * Laravel event class: BacklinkOrderUpdated
 * Channel: presence-backlink-orders
 */
export interface EchoRowUpdatedPayload {
  row: BacklinkOrderRow;
  /** session_id of the tab that triggered the update */
  updated_by_session_id: string;
}

/**
 * Broadcast by the server after a new BacklinkOrder row is created.
 * Laravel event class: BacklinkOrderCreated
 * Channel: presence-backlink-orders
 */
export interface EchoRowCreatedPayload {
  row: BacklinkOrderRow;
  created_by_session_id: string;
}

/**
 * Broadcast by the server after a BacklinkOrder row is deleted.
 * Laravel event class: BacklinkOrderDeleted
 * Channel: presence-backlink-orders
 */
export interface EchoRowDeletedPayload {
  row_id: string;
  deleted_by_session_id: string;
}
