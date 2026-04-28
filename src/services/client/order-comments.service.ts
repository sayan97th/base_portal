import { apiClient } from "@/lib/api-client";
import type {
  OrderComment,
  CreateCommentPayload,
  UpdateCommentPayload,
} from "@/types/client/order-comments";

interface CommentsListResponse {
  data: OrderComment[];
}

interface CommentResponse {
  data: OrderComment;
}

export const orderCommentsService = {
  async fetchComments(session_id: string): Promise<OrderComment[]> {
    const response = await apiClient.get<CommentsListResponse>(
      `/api/order-sessions/${session_id}/comments`
    );
    return response.data;
  },

  async createComment(
    session_id: string,
    payload: CreateCommentPayload
  ): Promise<OrderComment> {
    const response = await apiClient.post<CommentResponse>(
      `/api/order-sessions/${session_id}/comments`,
      payload
    );
    return response.data;
  },

  async updateComment(
    comment_id: number,
    payload: UpdateCommentPayload
  ): Promise<OrderComment> {
    const response = await apiClient.patch<CommentResponse>(
      `/api/order-comments/${comment_id}`,
      payload
    );
    return response.data;
  },

  async deleteComment(comment_id: number): Promise<void> {
    await apiClient.delete<void>(`/api/order-comments/${comment_id}`);
  },
};
