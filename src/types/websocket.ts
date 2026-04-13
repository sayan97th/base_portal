// ─── WebSocket event payload types ────────────────────────────────────────────
// These represent the exact JSON payloads received from every WebSocket event
// broadcast by the Laravel Reverb server.

// Received on: private channel `notifications.{userId}`
// Event name: `.new_notification`
export interface NewNotificationPayload {
  type: "new_notification";
  notification: {
    id: string;
    type:
      | "payment"
      | "system_alert"
      | "link_building"
      | "subscription"
      | "post"
      | string;
    message: string;
    preview_text: string | null;
    link: string | null;
    is_read: boolean;
    created_at: string; // ISO 8601 — e.g. "2026-04-12T00:00:00.000000Z"
  };
}

// Received on: public channel `backlink-orders`
// Event name: `.row_created`
export interface BacklinkRowCreatedPayload {
  type: "row_created";
  row: Record<string, unknown>; // full backlink order row object from the API
  created_by_session_id: string | null;
}

// Received on: public channel `backlink-orders`
// Event name: `.row_updated`
export interface BacklinkRowUpdatedPayload {
  type: "row_updated";
  row: Record<string, unknown>; // full backlink order row object from the API
  updated_by_session_id: string | null;
}

// Received on: public channel `backlink-orders`
// Event name: `.row_deleted`
export interface BacklinkRowDeletedPayload {
  type: "row_deleted";
  row_id: string;
  deleted_by_session_id: string | null;
}
