import type { ClientPaginatedResponse } from "./link-building";

export type ResourceCategory =
  | "pdf"
  | "spreadsheet"
  | "document"
  | "presentation"
  | "image"
  | "blog_post"
  | "other";

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

export interface ResourceFile {
  id: number;
  name: string;
  file_type: ResourceFileType;
  size_bytes?: number;
  download_url: string;
}

export interface Resource {
  id: number;
  title: string;
  description?: string;
  category: ResourceCategory;
  created_at: string;
  updated_at: string;
  files: ResourceFile[];
}

export interface ResourceListFilters {
  page?: number;
  per_page?: number;
  search?: string;
  category?: ResourceCategory | "all";
}

export type ResourceListResponse = ClientPaginatedResponse<Resource>;
