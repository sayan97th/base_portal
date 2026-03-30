export type PostType = "promo" | "news" | "blog_post" | "tip";
export type PostStatus = "draft" | "active" | "archived";

export interface NewsPost {
  id: string;
  type: PostType;
  status: PostStatus;
  title: string;
  subtitle: string | null;
  description: string | null;
  /** For promos: numeric string, e.g. "14" */
  discount_value: string | null;
  /** For promos: label shown after discount, e.g. "All Services" */
  discount_label: string | null;
  /** Optional coupon linked to this promo */
  coupon_id: string | null;
  coupon_code: string | null;
  starts_at: string | null;
  ends_at: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  cta_text: string | null;
  cta_url: string | null;
  tags: string[];
  is_featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateNewsPostPayload {
  type: PostType;
  status: PostStatus;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  discount_value?: string | null;
  discount_label?: string | null;
  coupon_id?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  image_url?: string | null;
  thumbnail_url?: string | null;
  cta_text?: string | null;
  cta_url?: string | null;
  tags?: string[];
  is_featured?: boolean;
  sort_order?: number;
}

export type UpdateNewsPostPayload = Partial<CreateNewsPostPayload>;

export interface NewsPostListResponse {
  data: NewsPost[];
}

export interface NewsPostDetailResponse {
  data: NewsPost;
}

export interface AdminNewsFilters {
  page?: number;
  per_page?: number;
  search?: string;
  type?: PostType | "all";
  status?: PostStatus | "all";
}
