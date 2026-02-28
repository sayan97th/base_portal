export interface Role {
  id: number;
  name: string;
  display_name: string;
}

export interface Organization {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  website: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_link: string | null;
  logo_light: string | null;
  logo_dark: string | null;
  icon_light: string | null;
  icon_dark: string | null;
  mobile_app_icon: string | null;
  primary_color: string | null;
  accent_color: string | null;
  timezone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  business_email: string | null;
  phone: string | null;
  job_title: string | null;
  profile_photo_url: string | null;
  organization_id: number | null;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
  roles: Role[] | string[];
  organization: Organization | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface MeResponse {
  user: User;
  permissions: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirmation: string;
  invitation_token?: string;
}

export interface ProfileData {
  first_name: string;
  last_name: string;
  business_email: string;
  phone: string | null;
  timezone: string;
  interested_in: string;
  notification_channel: string;
  team_order_updates: boolean;
  push_notifications_enabled: boolean;
  address: string;
  city: string;
  country: string;
  state_province: string;
  postal_code: string;
  company: string;
  tax_id: string;
}

export interface ProfileResponse extends ProfileData {
  profile_photo_path: string | null;
  profile_photo_url: string | null;
}

export interface UpdateProfileResponse {
  user: User;
  message: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}
