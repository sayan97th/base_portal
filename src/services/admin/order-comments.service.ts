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

export const adminOrderCommentsService = {
  async fetchCommentsBySession(session_id: string): Promise<OrderComment[]> {
    const response = await apiClient.get<CommentsListResponse>(
      `/api/admin/order-sessions/${session_id}/comments`
    );
    return response.data;
  },

  async fetchCommentsByOrder(order_id: string): Promise<OrderComment[]> {
    const response = await apiClient.get<CommentsListResponse>(
      `/api/admin/orders/${order_id}/comments`
    );
    return response.data;
  },

  async createCommentBySession(
    session_id: string,
    payload: CreateCommentPayload
  ): Promise<OrderComment> {
    const response = await apiClient.post<CommentResponse>(
      `/api/admin/order-sessions/${session_id}/comments`,
      payload
    );
    return response.data;
  },

  async createCommentByOrder(
    order_id: string,
    payload: CreateCommentPayload
  ): Promise<OrderComment> {
    const response = await apiClient.post<CommentResponse>(
      `/api/admin/orders/${order_id}/comments`,
      payload
    );
    return response.data;
  },

  async updateComment(
    comment_id: number,
    payload: UpdateCommentPayload
  ): Promise<OrderComment> {
    const response = await apiClient.patch<CommentResponse>(
      `/api/admin/order-comments/${comment_id}`,
      payload
    );
    return response.data;
  },

  async deleteComment(comment_id: number): Promise<void> {
    await apiClient.delete<void>(`/api/admin/order-comments/${comment_id}`);
  },
};
