"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { getEcho } from "@/lib/echo";
import { getToken } from "@/lib/api-client";
import { useEchoConnection } from "@/hooks/useEchoConnection";
import { useAuth } from "@/context/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type EventSeverity = "info" | "success" | "error" | "warning";

interface LogEntry {
  id: string;
  timestamp: Date;
  severity: EventSeverity;
  channel: string;
  event: string;
  payload: unknown;
}

interface SubscribedChannel {
  name: string;
  type: "public" | "private";
  event_count: number;
  subscribed_at: Date;
  last_event_at: Date | null;
  error: string | null;
}

type BuiltInPreset = {
  label: string;
  channel: string;
  type: "public" | "private";
  events: string[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const CONNECTION_STATE_CONFIG: Record<
  string,
  { label: string; color: string; pulse: boolean }
> = {
  connected:    { label: "Connected",    color: "bg-green-500",  pulse: false },
  connecting:   { label: "Connecting…",  color: "bg-yellow-400", pulse: true  },
  unavailable:  { label: "Unavailable",  color: "bg-red-500",    pulse: false },
  failed:       { label: "Failed",       color: "bg-red-600",    pulse: false },
  disconnected: { label: "Disconnected", color: "bg-gray-400",   pulse: false },
  initialized:  { label: "Initialized",  color: "bg-blue-400",   pulse: true  },
};

const SEVERITY_STYLES: Record<EventSeverity, string> = {
  info:    "text-blue-400",
  success: "text-green-400",
  error:   "text-red-400",
  warning: "text-yellow-400",
};

const SEVERITY_BADGES: Record<EventSeverity, string> = {
  info:    "bg-blue-900/50 text-blue-300 border border-blue-700",
  success: "bg-green-900/50 text-green-300 border border-green-700",
  error:   "bg-red-900/50 text-red-300 border border-red-700",
  warning: "bg-yellow-900/50 text-yellow-300 border border-yellow-700",
};

export default function WebSocketView() {
  const { user } = useAuth();
  const token = getToken();

  const { connection_state } = useEchoConnection(token);

  // ── Log ───────────────────────────────────────────────────────────────────
  const [log_entries, setLogEntries] = useState<LogEntry[]>([]);
  const log_ref = useRef<HTMLDivElement>(null);
  const [auto_scroll, setAutoScroll] = useState(true);

  // ── Subscriptions ─────────────────────────────────────────────────────────
  const [subscribed_channels, setSubscribedChannels] = useState<
    Record<string, SubscribedChannel>
  >({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channel_refs = useRef<Record<string, any>>({});

  // ── Custom channel form ───────────────────────────────────────────────────
  const [custom_channel, setCustomChannel] = useState("");
  const [custom_type, setCustomType] = useState<"public" | "private">("public");
  const [custom_event, setCustomEvent] = useState(".test");

  // ── Stats ─────────────────────────────────────────────────────────────────
  const [total_events, setTotalEvents] = useState(0);
  const [connect_time, setConnectTime] = useState<Date | null>(null);
  const connect_time_ref = useRef<Date | null>(null);

  // Track when we first connect
  useEffect(() => {
    if (connection_state === "connected" && !connect_time_ref.current) {
      connect_time_ref.current = new Date();
      setConnectTime(new Date());
    }
  }, [connection_state]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const addLog = useCallback(
    (
      severity: EventSeverity,
      channel: string,
      event: string,
      payload: unknown = null
    ) => {
      const entry: LogEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        severity,
        channel,
        event,
        payload,
      };
      setLogEntries((prev) => [...prev.slice(-199), entry]); // keep last 200
      setTotalEvents((n) => n + 1);
    },
    []
  );

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    });

  const formatDuration = (from: Date) => {
    const secs = Math.floor((Date.now() - from.getTime()) / 1000);
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return [h > 0 ? `${h}h` : null, m > 0 ? `${m}m` : null, `${s}s`]
      .filter(Boolean)
      .join(" ");
  };

  // Auto-scroll log
  useEffect(() => {
    if (auto_scroll && log_ref.current) {
      log_ref.current.scrollTop = log_ref.current.scrollHeight;
    }
  }, [log_entries, auto_scroll]);

  // Log connection state changes
  const prev_state_ref = useRef<string | null>(null);
  useEffect(() => {
    if (prev_state_ref.current === connection_state) return;
    const severity: EventSeverity =
      connection_state === "connected"
        ? "success"
        : connection_state === "failed" || connection_state === "unavailable"
        ? "error"
        : "info";
    addLog(severity, "system", "state_change", { state: connection_state });
    prev_state_ref.current = connection_state;
  }, [connection_state, addLog]);

  // ── Subscribe / Unsubscribe ───────────────────────────────────────────────

  const subscribeToChannel = useCallback(
    (channel_name: string, type: "public" | "private", events: string[]) => {
      if (!token) {
        addLog("error", "system", "no_token", {
          message: "No auth token found. Please log in first.",
        });
        return;
      }
      if (channel_refs.current[channel_name]) {
        addLog("warning", channel_name, "already_subscribed", {
          message: "Already subscribed to this channel.",
        });
        return;
      }

      try {
        const echo = getEcho(token);
        const channel =
          type === "private"
            ? echo.private(channel_name)
            : echo.channel(channel_name);

        const event_list =
          events.length > 0 ? events : [".test", ".ping", ".message"];

        event_list.forEach((ev) => {
          channel.listen(ev, (payload: unknown) => {
            addLog("success", channel_name, ev, payload);
            setSubscribedChannels((prev) => ({
              ...prev,
              [channel_name]: {
                ...prev[channel_name],
                event_count: (prev[channel_name]?.event_count ?? 0) + 1,
                last_event_at: new Date(),
                error: null,
              },
            }));
          });
        });

        // Listen for subscription errors (private channel auth failure)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (channel as any).error((err: unknown) => {
          const msg =
            err instanceof Error ? err.message : JSON.stringify(err);
          addLog("error", channel_name, "subscription_error", { error: msg });
          setSubscribedChannels((prev) => ({
            ...prev,
            [channel_name]: { ...prev[channel_name], error: msg },
          }));
        });

        channel_refs.current[channel_name] = channel;

        setSubscribedChannels((prev) => ({
          ...prev,
          [channel_name]: {
            name: channel_name,
            type,
            event_count: 0,
            subscribed_at: new Date(),
            last_event_at: null,
            error: null,
          },
        }));

        addLog("info", channel_name, "subscribed", {
          type,
          events: event_list,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        addLog("error", channel_name, "subscribe_exception", { error: msg });
      }
    },
    [token, addLog]
  );

  const unsubscribeFromChannel = useCallback(
    (channel_name: string) => {
      if (!token) return;
      try {
        const echo = getEcho(token);
        echo.leave(channel_name);
        delete channel_refs.current[channel_name];
        setSubscribedChannels((prev) => {
          const next = { ...prev };
          delete next[channel_name];
          return next;
        });
        addLog("warning", channel_name, "unsubscribed", null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        addLog("error", channel_name, "unsubscribe_exception", { error: msg });
      }
    },
    [token, addLog]
  );

  const clearLog = () => {
    setLogEntries([]);
    setTotalEvents(0);
  };

  // ── Built-in presets ──────────────────────────────────────────────────────

  const PRESETS: BuiltInPreset[] = [
    {
      label: "Backlink Orders",
      channel: "backlink-orders",
      type: "public",
      events: [".row_created", ".row_updated", ".row_deleted"],
    },
    ...(user
      ? [
          {
            label: `Notifications (you)`,
            channel: `notifications.${user.id}`,
            type: "private" as const,
            events: [".new_notification"],
          },
        ]
      : []),
  ];

  // ── Custom channel submit ─────────────────────────────────────────────────

  const handleCustomSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    const name = custom_channel.trim();
    if (!name) return;
    const events = custom_event.trim()
      ? custom_event.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    subscribeToChannel(name, custom_type, events);
    setCustomChannel("");
    setCustomEvent(".test");
  };

  // ── State display config ───────────────────────────────────────────────────

  const state_cfg =
    CONNECTION_STATE_CONFIG[connection_state] ??
    CONNECTION_STATE_CONFIG["disconnected"];

  // ── Env config display ────────────────────────────────────────────────────

  const env_config = {
    HOST:   process.env.NEXT_PUBLIC_REVERB_HOST   ?? "localhost",
    PORT:   process.env.NEXT_PUBLIC_REVERB_PORT   ?? "8080",
    SCHEME: process.env.NEXT_PUBLIC_REVERB_SCHEME ?? "http",
    KEY:    process.env.NEXT_PUBLIC_REVERB_APP_KEY
      ? `${process.env.NEXT_PUBLIC_REVERB_APP_KEY.slice(0, 6)}…`
      : "(not set)",
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 font-mono text-sm">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          WebSocket Test Panel
        </h1>
        <p className="text-gray-400 mt-1">
          Inspect, subscribe, and monitor your Laravel Reverb WebSocket server in real time.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* ── Left column ── */}
        <div className="xl:col-span-1 flex flex-col gap-4">

          {/* Connection Status */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
              Connection Status
            </h2>
            <div className="flex items-center gap-3 mb-4">
              <span className="relative flex h-4 w-4">
                <span
                  className={`${state_cfg.color} ${
                    state_cfg.pulse ? "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" : "hidden"
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-4 w-4 ${state_cfg.color}`}
                />
              </span>
              <span className="text-white font-semibold text-base">
                {state_cfg.label}
              </span>
            </div>
            <dl className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <dt className="text-gray-500">State</dt>
                <dd className="text-gray-200">{connection_state}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Token</dt>
                <dd className={token ? "text-green-400" : "text-red-400"}>
                  {token ? `${token.slice(0, 10)}…` : "Not found"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">User ID</dt>
                <dd className="text-gray-200">{user?.id ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Uptime</dt>
                <dd className="text-gray-200">
                  {connect_time ? formatDuration(connect_time) : "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Events received</dt>
                <dd className="text-green-400 font-semibold">{total_events}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Active channels</dt>
                <dd className="text-blue-400 font-semibold">
                  {Object.keys(subscribed_channels).length}
                </dd>
              </div>
            </dl>
          </div>

          {/* Server Config */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
              Server Config
            </h2>
            <dl className="space-y-1.5 text-xs">
              {Object.entries(env_config).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <dt className="text-gray-500 shrink-0">REVERB_{k}</dt>
                  <dd className="text-yellow-300 truncate">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Preset Subscriptions */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
              Quick Presets
            </h2>
            <div className="space-y-2">
              {PRESETS.map((preset) => {
                const is_subscribed = !!subscribed_channels[preset.channel];
                return (
                  <div
                    key={preset.channel}
                    className="flex items-center justify-between gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">
                        {preset.label}
                      </p>
                      <p className="text-gray-400 text-xs truncate">
                        {preset.type === "private" ? "🔒 " : "📡 "}
                        {preset.channel}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        is_subscribed
                          ? unsubscribeFromChannel(preset.channel)
                          : subscribeToChannel(
                              preset.channel,
                              preset.type,
                              preset.events
                            )
                      }
                      className={`shrink-0 rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                        is_subscribed
                          ? "bg-red-900/60 text-red-300 hover:bg-red-800"
                          : "bg-green-900/60 text-green-300 hover:bg-green-800"
                      }`}
                    >
                      {is_subscribed ? "Leave" : "Join"}
                    </button>
                  </div>
                );
              })}
              {PRESETS.length === 0 && (
                <p className="text-gray-500 text-xs">
                  Log in to see available presets.
                </p>
              )}
            </div>
          </div>

          {/* Custom Channel */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
              Custom Channel
            </h2>
            <form onSubmit={handleCustomSubscribe} className="space-y-2">
              <input
                type="text"
                value={custom_channel}
                onChange={(e) => setCustomChannel(e.target.value)}
                placeholder="Channel name…"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none text-xs"
              />
              <div className="flex gap-2">
                <select
                  value={custom_type}
                  onChange={(e) =>
                    setCustomType(e.target.value as "public" | "private")
                  }
                  className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-2 py-2 text-white focus:border-blue-500 focus:outline-none text-xs"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
                <input
                  type="text"
                  value={custom_event}
                  onChange={(e) => setCustomEvent(e.target.value)}
                  placeholder="Events (comma-sep)"
                  className="flex-[2] rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none text-xs"
                />
              </div>
              <button
                type="submit"
                disabled={!custom_channel.trim()}
                className="w-full rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="xl:col-span-2 flex flex-col gap-4">

          {/* Active Subscriptions */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
              Active Subscriptions
            </h2>
            {Object.keys(subscribed_channels).length === 0 ? (
              <p className="text-gray-600 text-xs italic">
                No active subscriptions. Use the presets or the custom form to
                subscribe to a channel.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-800">
                      <th className="text-left pb-2 pr-4 font-normal">Channel</th>
                      <th className="text-left pb-2 pr-4 font-normal">Type</th>
                      <th className="text-left pb-2 pr-4 font-normal">Events</th>
                      <th className="text-left pb-2 pr-4 font-normal">Subscribed</th>
                      <th className="text-left pb-2 pr-4 font-normal">Last Event</th>
                      <th className="text-left pb-2 font-normal">Status</th>
                      <th className="pb-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {Object.values(subscribed_channels).map((ch) => (
                      <tr key={ch.name} className="group">
                        <td className="py-2 pr-4">
                          <span className="text-white font-medium">{ch.name}</span>
                        </td>
                        <td className="py-2 pr-4">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              ch.type === "private"
                                ? "bg-purple-900/50 text-purple-300"
                                : "bg-blue-900/50 text-blue-300"
                            }`}
                          >
                            {ch.type}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-green-400 font-semibold">
                          {ch.event_count}
                        </td>
                        <td className="py-2 pr-4 text-gray-400">
                          {formatTime(ch.subscribed_at)}
                        </td>
                        <td className="py-2 pr-4 text-gray-400">
                          {ch.last_event_at ? formatTime(ch.last_event_at) : "—"}
                        </td>
                        <td className="py-2 pr-4">
                          {ch.error ? (
                            <span className="text-red-400 truncate max-w-[140px] block" title={ch.error}>
                              ✗ {ch.error.slice(0, 30)}…
                            </span>
                          ) : (
                            <span className="text-green-400">✓ OK</span>
                          )}
                        </td>
                        <td className="py-2">
                          <button
                            onClick={() => unsubscribeFromChannel(ch.name)}
                            className="text-gray-600 hover:text-red-400 transition-colors"
                            title="Unsubscribe"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Event Log */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                Event Log{" "}
                <span className="text-gray-600 normal-case">
                  ({log_entries.length} entries)
                </span>
              </h2>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={auto_scroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="accent-blue-500"
                  />
                  Auto-scroll
                </label>
                <button
                  onClick={clearLog}
                  className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            <div
              ref={log_ref}
              className="flex-1 overflow-y-auto rounded-lg bg-gray-950 border border-gray-800 p-3 space-y-1"
              style={{ minHeight: "360px", maxHeight: "460px" }}
            >
              {log_entries.length === 0 ? (
                <p className="text-gray-700 text-xs italic text-center pt-8">
                  Waiting for events… Subscribe to a channel to start.
                </p>
              ) : (
                log_entries.map((entry) => (
                  <LogRow key={entry.id} entry={entry} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Log Row ──────────────────────────────────────────────────────────────────

function LogRow({ entry }: { entry: LogEntry }) {
  const [expanded, setExpanded] = useState(false);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    });

  const has_payload =
    entry.payload !== null && entry.payload !== undefined;

  return (
    <div
      className={`rounded border-l-2 px-2 py-1.5 text-xs cursor-pointer select-none transition-colors ${
        entry.severity === "error"
          ? "border-red-600 bg-red-950/30 hover:bg-red-950/50"
          : entry.severity === "success"
          ? "border-green-700 bg-green-950/20 hover:bg-green-950/40"
          : entry.severity === "warning"
          ? "border-yellow-600 bg-yellow-950/20 hover:bg-yellow-950/40"
          : "border-blue-800 bg-blue-950/10 hover:bg-blue-950/30"
      }`}
      onClick={() => has_payload && setExpanded((v) => !v)}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-gray-600 shrink-0">{formatTime(entry.timestamp)}</span>
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${SEVERITY_BADGES[entry.severity]}`}
        >
          {entry.severity.toUpperCase()}
        </span>
        <span className="text-gray-400 shrink-0">{entry.channel}</span>
        <span className="text-gray-600">›</span>
        <span className={`font-semibold ${SEVERITY_STYLES[entry.severity]}`}>
          {entry.event}
        </span>
        {has_payload && (
          <span className="ml-auto text-gray-600 text-[10px]">
            {expanded ? "▲ hide" : "▼ show payload"}
          </span>
        )}
      </div>
      {expanded && has_payload && (
        <pre className="mt-1.5 text-[10px] text-gray-300 bg-gray-900 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
          {JSON.stringify(entry.payload, null, 2)}
        </pre>
      )}
    </div>
  );
}
