import Echo from "laravel-echo";
import Pusher from "pusher-js";
import type {
  ChannelAuthorizationCallback,
  ChannelAuthorizationData,
} from "pusher-js/types/src/core/auth/options";

// Make Pusher available globally so laravel-echo can pick it up
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).Pusher = Pusher;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

const REVERB_APP_KEY = process.env.NEXT_PUBLIC_REVERB_APP_KEY ?? "";
const REVERB_HOST = process.env.NEXT_PUBLIC_REVERB_HOST ?? "localhost";
const REVERB_PORT = parseInt(
  process.env.NEXT_PUBLIC_REVERB_PORT ?? "8080",
  10
);
const REVERB_SCHEME = process.env.NEXT_PUBLIC_REVERB_SCHEME ?? "http";

// Module-level singleton — reused across the entire app
let echo_instance: Echo<"reverb"> | null = null;

/**
 * Per-tab session identifier forwarded as X-Session-Id on every channel auth
 * request.  Set via setEchoSessionId() before the first getEcho() call so the
 * backend can associate the socket connection with a specific browser tab.
 */
let _session_id: string | null = null;

/**
 * Stores the tab-scoped session UUID so that the Echo authorizer can forward it
 * as X-Session-Id on every presence-channel auth request.
 * Must be called before the first getEcho() call (i.e. before any channel join).
 */
export function setEchoSessionId(id: string): void {
  _session_id = id;
}

/**
 * Returns the cached Echo instance, or creates a new one authenticated with
 * the provided JWT Bearer token. Call this once per authenticated session.
 */
export function getEcho(token: string): Echo<"reverb"> {
  if (echo_instance) return echo_instance;

  const force_tls = REVERB_SCHEME === "https";

  echo_instance = new Echo({
    broadcaster: "reverb",
    key: REVERB_APP_KEY,
    wsHost: REVERB_HOST,
    wsPort: force_tls ? undefined : REVERB_PORT,
    wssPort: force_tls ? REVERB_PORT : undefined,
    forceTLS: force_tls,
    disableStats: true,
    enabledTransports: ["ws", "wss"],
    // Custom authorizer — every private-channel auth request carries the JWT
    // in the Authorization header instead of relying on Laravel session cookies.
    authorizer: (channel: { name: string }) => ({
      authorize: (
        socket_id: string,
        callback: ChannelAuthorizationCallback
      ) => {
        const body = new URLSearchParams({
          socket_id,
          channel_name: channel.name,
        }).toString();

        fetch(`${API_BASE_URL}/api/broadcasting/auth`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/x-www-form-urlencoded",
            ...(_session_id ? { "X-Session-Id": _session_id } : {}),
          },
          body,
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(
                `Broadcasting auth failed: ${response.status}`
              );
            }
            return response.json() as Promise<ChannelAuthorizationData>;
          })
          .then((data) => callback(null, data))
          .catch((error: Error) => callback(error, null));
      },
    }),
  });

  return echo_instance;
}

/**
 * Disconnects the WebSocket and clears the cached Echo instance.
 * Call this on logout to prevent stale subscriptions across sessions.
 */
export function resetEcho(): void {
  if (echo_instance) {
    echo_instance.disconnect();
    echo_instance = null;
  }
}
