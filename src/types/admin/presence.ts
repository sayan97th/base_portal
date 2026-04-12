import type { BacklinkOrderRow } from "./backlink-order";

// ── Collaborator presence ──────────────────────────────────────────────────────

/**
 * A user currently connected to the backlink orders table collaboration channel.
 * The server assigns a unique session_id per WebSocket connection so that the
 * same user opening two browser tabs is tracked as two separate collaborators.
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

// ── WebSocket connection states ────────────────────────────────────────────────

export type WsReadyState = "connecting" | "connected" | "reconnecting" | "disconnected";

// ── Client → Server message types ─────────────────────────────────────────────

/**
 * Sent once right after the socket opens.
 * The server uses this to register the user, assign a color, and broadcast
 * their arrival to all other connected clients.
 */
export interface WsJoinMessage {
  type: "join";
  user_id: number;
  name: string;
  avatar_url: string | null;
}

/**
 * Sent when the current user starts editing a cell.
 * The server broadcasts a `row_focused` event to all other connected clients.
 */
export interface WsRowFocusMessage {
  type: "row_focus";
  row_id: string;
  col_key: string;
}

/**
 * Sent when the current user stops editing a row (blur, Tab, Enter, Escape).
 * The server broadcasts a `row_blurred` event to all other connected clients.
 */
export interface WsRowBlurMessage {
  type: "row_blur";
  row_id: string;
}

/** Heartbeat to keep the connection alive */
export interface WsPingMessage {
  type: "ping";
}

export type WsClientMessage =
  | WsJoinMessage
  | WsRowFocusMessage
  | WsRowBlurMessage
  | WsPingMessage;

// ── Server → Client message types ─────────────────────────────────────────────

/**
 * Full snapshot of all currently connected collaborators, sent to a new
 * connection right after they send the `join` message.
 */
export interface WsPresenceStateMessage {
  type: "presence_state";
  users: CollaboratorPresence[];
}

/** Broadcast to all other clients when a new user joins */
export interface WsUserJoinedMessage {
  type: "user_joined";
  user: CollaboratorPresence;
}

/** Broadcast to all other clients when a user disconnects */
export interface WsUserLeftMessage {
  type: "user_left";
  session_id: string;
}

/** Broadcast to all other clients when a user focuses a cell */
export interface WsRowFocusedMessage {
  type: "row_focused";
  session_id: string;
  row_id: string;
  col_key: string;
}

/** Broadcast to all other clients when a user stops editing a row */
export interface WsRowBlurredMessage {
  type: "row_blurred";
  session_id: string;
  row_id: string;
}

/**
 * Broadcast to all OTHER clients after a row is saved via the REST API.
 * The server should hook into the backlink order update/create/delete endpoints
 * and broadcast these events to all active WebSocket clients on this channel.
 *
 * Laravel implementation note:
 *   After BacklinkOrder::update() succeeds, broadcast a BacklinkOrderUpdated
 *   event on the "backlink-orders" channel with the serialized row.
 */
export interface WsRowUpdatedMessage {
  type: "row_updated";
  row: BacklinkOrderRow;
  /** session_id of the user who performed the update */
  updated_by_session_id: string;
}

/** Broadcast after a new row is created via the REST API */
export interface WsRowCreatedMessage {
  type: "row_created";
  row: BacklinkOrderRow;
  created_by_session_id: string;
}

/** Broadcast after a row is deleted via the REST API */
export interface WsRowDeletedMessage {
  type: "row_deleted";
  row_id: string;
  deleted_by_session_id: string;
}

/** Response to a `ping` heartbeat */
export interface WsPongMessage {
  type: "pong";
}

export type WsServerMessage =
  | WsPresenceStateMessage
  | WsUserJoinedMessage
  | WsUserLeftMessage
  | WsRowFocusedMessage
  | WsRowBlurredMessage
  | WsRowUpdatedMessage
  | WsRowCreatedMessage
  | WsRowDeletedMessage
  | WsPongMessage;
