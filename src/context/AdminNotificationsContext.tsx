"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { adminNotificationsService } from "@/services/admin/notifications.service";
import type { AdminNotification, AdminNotificationFilters } from "@/services/admin/notifications.service";
import { useAuth } from "@/context/AuthContext";

const POLL_INTERVAL_MS = 60_000;

// ─── State ────────────────────────────────────────────────────────────────────

interface AdminNotificationsState {
  notifications: AdminNotification[];
  unread_count: number;
  is_loading: boolean;
  has_loaded: boolean;
}

const initial_state: AdminNotificationsState = {
  notifications: [],
  unread_count: 0,
  is_loading: false,
  has_loaded: false,
};

// ─── Actions ──────────────────────────────────────────────────────────────────

type AdminNotificationsAction =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; payload: AdminNotification[] }
  | { type: "SET_UNREAD_COUNT"; payload: number }
  | { type: "UPDATE_NOTIFICATION"; payload: Partial<AdminNotification> & { id: number } }
  | { type: "MARK_ALL_AS_READ" }
  | { type: "RESET" };

function adminNotificationsReducer(
  state: AdminNotificationsState,
  action: AdminNotificationsAction
): AdminNotificationsState {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, is_loading: true };

    case "FETCH_SUCCESS":
      return {
        ...state,
        notifications: action.payload,
        unread_count: action.payload.filter((n) => !n.is_read && !n.is_archived).length,
        is_loading: false,
        has_loaded: true,
      };

    case "SET_UNREAD_COUNT":
      return { ...state, unread_count: action.payload };

    case "UPDATE_NOTIFICATION":
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.payload.id ? { ...n, ...action.payload } : n
        ),
        unread_count: state.notifications
          .map((n) => (n.id === action.payload.id ? { ...n, ...action.payload } : n))
          .filter((n) => !n.is_read && !n.is_archived).length,
      };

    case "MARK_ALL_AS_READ":
      return {
        ...state,
        notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
        unread_count: 0,
      };

    case "RESET":
      return initial_state;

    default:
      return state;
  }
}

// ─── Context type ─────────────────────────────────────────────────────────────

interface AdminNotificationsContextType {
  notifications: AdminNotification[];
  unread_count: number;
  is_loading: boolean;
  has_loaded: boolean;
  fetchNotifications: (filters?: AdminNotificationFilters) => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  archiveNotification: (id: number) => Promise<void>;
}

const AdminNotificationsContext = createContext<AdminNotificationsContextType | undefined>(
  undefined
);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AdminNotificationsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(adminNotificationsReducer, initial_state);
  const { isAuthenticated, isStaff } = useAuth();
  const poll_ref = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = useCallback(
    async (filters?: AdminNotificationFilters) => {
      if (!isAuthenticated || !isStaff) return;
      try {
        const response = await adminNotificationsService.getNotifications(filters);
        dispatch({ type: "FETCH_SUCCESS", payload: response.data });
      } catch {
        // Preserve existing state on network failure
      }
    },
    [isAuthenticated, isStaff]
  );

  // Initial load and reset on auth change
  useEffect(() => {
    if (!isAuthenticated || !isStaff) {
      dispatch({ type: "RESET" });
      return;
    }
    dispatch({ type: "FETCH_START" });
    fetchNotifications();
  }, [isAuthenticated, isStaff, fetchNotifications]);

  // Background polling
  useEffect(() => {
    if (!isAuthenticated || !isStaff) return;
    poll_ref.current = setInterval(() => fetchNotifications(), POLL_INTERVAL_MS);
    return () => {
      if (poll_ref.current) clearInterval(poll_ref.current);
    };
  }, [isAuthenticated, isStaff, fetchNotifications]);

  const markAsRead = useCallback(
    async (id: number) => {
      dispatch({ type: "UPDATE_NOTIFICATION", payload: { id, is_read: true } });
      await adminNotificationsService.markAsRead(id).catch(() => fetchNotifications());
    },
    [fetchNotifications]
  );

  const markAllAsRead = useCallback(async () => {
    dispatch({ type: "MARK_ALL_AS_READ" });
    await adminNotificationsService.markAllAsRead().catch(() => fetchNotifications());
  }, [fetchNotifications]);

  const archiveNotification = useCallback(
    async (id: number) => {
      dispatch({ type: "UPDATE_NOTIFICATION", payload: { id, is_archived: true } });
      await adminNotificationsService
        .archiveNotification(id)
        .catch(() => fetchNotifications());
    },
    [fetchNotifications]
  );

  return (
    <AdminNotificationsContext.Provider
      value={{
        notifications: state.notifications,
        unread_count: state.unread_count,
        is_loading: state.is_loading,
        has_loaded: state.has_loaded,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        archiveNotification,
      }}
    >
      {children}
    </AdminNotificationsContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useAdminNotifications = () => {
  const context = useContext(AdminNotificationsContext);
  if (context === undefined) {
    throw new Error(
      "useAdminNotifications must be used within an AdminNotificationsProvider"
    );
  }
  return context;
};
