export type ResourceCategory =
  | "pdf"
  | "spreadsheet"
  | "document"
  | "presentation"
  | "image"
  | "blog_post"
  | "other";

export type ResourceStatus = "published" | "draft";

export type ResourceFileType =
  | "pdf"
  | "xlsx"
  | "xls"
  | "csv"
  | "docx"
  | "doc"
  | "pptx"
  | "ppt"
  | "png"
  | "jpg"
  | "jpeg"
  | "gif"
  | "other";

export interface AdminResourceFile {
  id: number;
  name: string;
  file_type: ResourceFileType;
  size_bytes?: number;
  download_url: string;
}

export interface AssignedClient {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
}

export interface AdminResource {
  id: number;
  title: string;
  description?: string | null;
  category: ResourceCategory;
  status: ResourceStatus;
  is_hidden: boolean;
  organization_id: number | null;
  organization?: { id: number; name: string } | null;
  assigned_clients: AssignedClient[];
  created_at: string;
  updated_at: string;
  files: AdminResourceFile[];
}

export interface CreateResourcePayload {
  title: string;
  description?: string | null;
  category: ResourceCategory;
  status: ResourceStatus;
  is_hidden: boolean;
  client_ids: number[];
}

export type UpdateResourcePayload = Partial<CreateResourcePayload>;

export interface AdminResourceFilters {
  page?: number;
  per_page?: number;
  search?: string;
  category?: ResourceCategory | "all";
  status?: ResourceStatus | "all";
}

export interface AdminResourcePaginatedResponse {
  data: AdminResource[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}
