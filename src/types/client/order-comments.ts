export interface OrderComment {
  id: number;
  session_id: string;
  user_id: number;
  parent_id: number | null;
  content: string;
  is_admin_comment: boolean;
  author_name: string;
  author_avatar_url: string | null;
  created_at: string;
  updated_at: string;
  replies: OrderComment[];
}

export interface CreateCommentPayload {
  content: string;
  parent_id?: number | null;
}

export interface UpdateCommentPayload {
  content: string;
}
