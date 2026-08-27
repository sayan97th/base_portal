import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import AdminOrderComments from "@/components/admin/orders/AdminOrderComments";
import { adminOrderCommentsService } from "@/services/admin/order-comments.service";
import { useAuth } from "@/context/AuthContext";
import type { OrderComment } from "@/types/client/order-comments";

jest.mock("@/services/admin/order-comments.service", () => ({
  adminOrderCommentsService: {
    fetchCommentsBySession: jest.fn(),
    fetchCommentsByOrder: jest.fn(),
    createCommentBySession: jest.fn(),
    createCommentByOrder: jest.fn(),
    updateComment: jest.fn(),
    deleteComment: jest.fn(),
  },
}));

jest.mock("@/context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

const mocked_service = adminOrderCommentsService as jest.Mocked<typeof adminOrderCommentsService>;
const mocked_use_auth = useAuth as jest.Mock;

function buildComment(overrides: Partial<OrderComment> = {}): OrderComment {
  return {
    id: 1,
    session_id: "",
    user_id: 5,
    parent_id: null,
    content: "A client message about their order.",
    is_admin_comment: false,
    author_name: "Rachael LeBert",
    author_avatar_url: null,
    created_at: "2026-08-27T08:39:00Z",
    updated_at: "2026-08-27T08:39:00Z",
    replies: [],
    ...overrides,
  };
}

describe("AdminOrderComments deep-link scrolling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
    mocked_use_auth.mockReturnValue({
      user: { id: 1, first_name: "Admin", last_name: "User", profile_photo_url: null },
    });
  });

  it("renders each comment with an id attribute matching comment-{id}", async () => {
    mocked_service.fetchCommentsByOrder.mockResolvedValue([
      buildComment({ id: 1 }),
      buildComment({ id: 2, content: "A second client message." }),
    ]);

    const { container } = render(
      <AdminOrderComments purchase_type="single_order" order_id="order-1" />
    );

    await waitFor(() => expect(screen.getByText("A second client message.")).toBeInTheDocument());

    expect(container.querySelector("#comment-1")).not.toBeNull();
    expect(container.querySelector("#comment-2")).not.toBeNull();
  });

  it("scrolls to and highlights the comment matching target_comment_id", async () => {
    mocked_service.fetchCommentsByOrder.mockResolvedValue([
      buildComment({ id: 1 }),
      buildComment({ id: 2, content: "A second client message." }),
    ]);

    const { container } = render(
      <AdminOrderComments purchase_type="single_order" order_id="order-1" target_comment_id={2} />
    );

    await waitFor(() => expect(screen.getByText("A second client message.")).toBeInTheDocument());

    await waitFor(() => {
      expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
    });

    const target = container.querySelector("#comment-2");
    expect(target?.className).toEqual(expect.stringContaining("ring-brand-400"));
  });

  it("fetches comments for a multi-purchase session via the admin session endpoint", async () => {
    mocked_service.fetchCommentsBySession.mockResolvedValue([buildComment({ id: 1 })]);

    render(
      <AdminOrderComments purchase_type="multi_purchase" order_id="order-1" session_id="sess-1" />
    );

    await waitFor(() =>
      expect(mocked_service.fetchCommentsBySession).toHaveBeenCalledWith("sess-1")
    );
    expect(mocked_service.fetchCommentsByOrder).not.toHaveBeenCalled();
  });

  it("does not scroll when target_comment_id does not match any loaded comment", async () => {
    mocked_service.fetchCommentsByOrder.mockResolvedValue([buildComment({ id: 1 })]);

    render(
      <AdminOrderComments purchase_type="single_order" order_id="order-1" target_comment_id={999} />
    );

    await waitFor(() =>
      expect(screen.getByText("A client message about their order.")).toBeInTheDocument()
    );

    expect(window.HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
});
