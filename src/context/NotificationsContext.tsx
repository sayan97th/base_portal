"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { notificationsService } from "@/services/notifications.service";
import type {
  Notification,
  CreateNotificationPayload,
} from "@/services/notifications.service";
import { useAuth } from "@/context/AuthContext";

const POLL_INTERVAL_MS = 60_000;

// ─── State ────────────────────────────────────────────────────────────────────

interface NotificationsState {
  notifications: Notification[];
  is_loading: boolean;
  has_loaded: boolean;
}

const initial_state: NotificationsState = {
  notifications: [],
  is_loading: false,
  has_loaded: false,
};

// ─── Actions ──────────────────────────────────────────────────────────────────

type NotificationsAction =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; payload: Notification[] }
  | { type: "ADD_NOTIFICATION"; payload: Notification }
  | { type: "UPDATE_NOTIFICATION"; payload: Partial<Notification> & { id: number } }
  | { type: "MARK_ALL_AS_READ" }
  | { type: "RESET" };

function notificationsReducer(
  state: NotificationsState,
  action: NotificationsAction
): NotificationsState {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, is_loading: true };

    case "FETCH_SUCCESS":
      return {
        ...state,
        notifications: action.payload,
        is_loading: false,
        has_loaded: true,
      };

    case "ADD_NOTIFICATION":
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
      };

    case "UPDATE_NOTIFICATION":
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.payload.id ? { ...n, ...action.payload } : n
        ),
      };

    case "MARK_ALL_AS_READ":
      return {
        ...state,
        notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
      };

    case "RESET":
      return initial_state;

    default:
      return state;
  }
}

// ─── Context type ─────────────────────────────────────────────────────────────

interface NotificationsContextType {
  notifications: Notification[];
  unread_count: number;
  is_loading: boolean;
  has_loaded: boolean;
  fetchNotifications: () => Promise<void>;
  addNotification: (payload: CreateNotificationPayload) => Promise<Notification | null>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  snoozeNotification: (id: number, snooze_until?: string) => Promise<void>;
  archiveNotification: (id: number) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(
  undefined
);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(notificationsReducer, initial_state);
  const { isAuthenticated } = useAuth();
  const poll_ref = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await notificationsService.getNotifications();
      dispatch({ type: "FETCH_SUCCESS", payload: data });
    } catch {
      // Preserve existing state on network failure
    }
  }, [isAuthenticated]);

  // Initial load and reset on auth change
  useEffect(() => {
    if (!isAuthenticated) {
      dispatch({ type: "RESET" });
      return;
    }
    dispatch({ type: "FETCH_START" });
    fetchNotifications();
  }, [isAuthenticated, fetchNotifications]);

  // Background polling
  useEffect(() => {
    if (!isAuthenticated) return;
    poll_ref.current = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => {
      if (poll_ref.current) clearInterval(poll_ref.current);
    };
  }, [isAuthenticated, fetchNotifications]);

  const unread_count = state.notifications.filter(
    (n) => !n.is_read && !n.is_archived
  ).length;

  const addNotification = useCallback(
    async (payload: CreateNotificationPayload): Promise<Notification | null> => {
      try {
        const notification = await notificationsService.createNotification(payload);
        dispatch({ type: "ADD_NOTIFICATION", payload: notification });
        return notification;
      } catch {
        return null;
      }
    },
    []
  );

  const markAsRead = useCallback(
    async (id: number) => {
      dispatch({ type: "UPDATE_NOTIFICATION", payload: { id, is_read: true } });
      await notificationsService.markAsRead(id).catch(() => fetchNotifications());
    },
    [fetchNotifications]
  );

  const markAllAsRead = useCallback(async () => {
    dispatch({ type: "MARK_ALL_AS_READ" });
    await notificationsService.markAllAsRead().catch(() => fetchNotifications());
  }, [fetchNotifications]);

  const snoozeNotification = useCallback(
    async (id: number, snooze_until?: string) => {
      dispatch({
        type: "UPDATE_NOTIFICATION",
        payload: { id, is_snoozed: true, is_read: true },
      });
      await notificationsService
        .snoozeNotification(id, snooze_until)
        .catch(() => fetchNotifications());
    },
    [fetchNotifications]
  );

  const archiveNotification = useCallback(
    async (id: number) => {
      dispatch({ type: "UPDATE_NOTIFICATION", payload: { id, is_archived: true } });
      await notificationsService
        .archiveNotification(id)
        .catch(() => fetchNotifications());
    },
    [fetchNotifications]
  );

  return (
    <NotificationsContext.Provider
      value={{
        notifications: state.notifications,
        unread_count,
        is_loading: state.is_loading,
        has_loaded: state.has_loaded,
        fetchNotifications,
        addNotification,
        markAsRead,
        markAllAsRead,
        snoozeNotification,
        archiveNotification,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }
  return context;
};
