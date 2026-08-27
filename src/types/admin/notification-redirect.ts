/**
 * Response shape for GET /api/admin/notifications/{id}/redirect-context.
 * Resolves whether a notification (reached via its email link) belongs to a
 * client account, and whether the current admin/staff caller may impersonate
 * that client to view it.
 */
export interface NotificationRedirectTargetUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
}

export interface NotificationRedirectContext {
  notification_id: number;
  belongs_to_client: boolean;
  /** Same-origin path validated by the backend, safe to navigate to directly. */
  redirect_path: string;
  /** True only when the caller holds both the required role and permission. */
  can_impersonate: boolean;
  target_user: NotificationRedirectTargetUser;
}

export interface NotificationRedirectContextResponse {
  data: NotificationRedirectContext;
}
