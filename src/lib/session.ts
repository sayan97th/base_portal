// Module-level variable — generated once for the lifetime of the browser tab.
let session_id: string | null = null;

/**
 * Returns a stable UUID v4 that identifies the current browser tab/session.
 * The same value is returned on every call within a single page load.
 *
 * Used to suppress self-originated WebSocket events: when the backend echoes
 * back a broadcast that includes `created_by_session_id` / `updated_by_session_id`
 * / `deleted_by_session_id`, the frontend compares against this value to
 * decide whether to apply the update or ignore it (optimistic update already applied).
 *
 * Send this value as `session_id` in the request body or as the
 * `X-Session-Id` header whenever calling backlink order mutation endpoints.
 */
export function getSessionId(): string {
  if (!session_id) {
    session_id = crypto.randomUUID();
  }
  return session_id;
}
