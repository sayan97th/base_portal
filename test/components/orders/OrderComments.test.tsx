import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import OrderComments from "@/components/orders/OrderComments";
import { orderCommentsService } from "@/services/client/order-comments.service";
import { useAuth } from "@/context/AuthContext";
import type { OrderComment } from "@/types/client/order-comments";

jest.mock("@/services/client/order-comments.service", () => ({
  orderCommentsService: {
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

const mocked_service = orderCommentsService as jest.Mocked<typeof orderCommentsService>;
const mocked_use_auth = useAuth as jest.Mock;

function buildComment(overrides: Partial<OrderComment> = {}): OrderComment {
  return {
    id: 1,
    session_id: "",
    user_id: 5,
    parent_id: null,
    content: "It looks like the link on this order is returning a 404.",
    is_admin_comment: false,
    author_name: "Rachael LeBert",
    author_avatar_url: null,
    created_at: "2026-08-27T08:39:00Z",
    updated_at: "2026-08-27T08:39:00Z",
    replies: [],
    ...overrides,
  };
}

describe("OrderComments deep-link scrolling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
    mocked_use_auth.mockReturnValue({
      user: { id: 99, first_name: "Test", last_name: "User", profile_photo_url: null },
      isAdmin: false,
    });
  });

  it("renders each top-level comment with an id attribute matching comment-{id}", async () => {
    mocked_service.fetchCommentsByOrder.mockResolvedValue([
      buildComment({ id: 1 }),
      buildComment({ id: 2, content: "A second comment." }),
    ]);

    const { container } = render(
      <OrderComments purchase_type="single_order" order_id="order-1" />
    );

    await waitFor(() => expect(screen.getByText("A second comment.")).toBeInTheDocument());

    expect(container.querySelector("#comment-1")).not.toBeNull();
    expect(container.querySelector("#comment-2")).not.toBeNull();
  });

  it("scrolls to and highlights the comment matching target_comment_id", async () => {
    mocked_service.fetchCommentsByOrder.mockResolvedValue([
      buildComment({ id: 1 }),
      buildComment({ id: 2, content: "A second comment." }),
    ]);

    const { container } = render(
      <OrderComments purchase_type="single_order" order_id="order-1" target_comment_id={2} />
    );

    await waitFor(() => expect(screen.getByText("A second comment.")).toBeInTheDocument());

    await waitFor(() => {
      expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
    });

    const target = container.querySelector("#comment-2");
    expect(target).not.toBeNull();
    expect(target?.className).toEqual(expect.stringContaining("comment-highlight-flash"));

    const other = container.querySelector("#comment-1");
    expect(other?.className).not.toEqual(expect.stringContaining("comment-highlight-flash"));
  });

  it("scrolls to and highlights a matching reply nested under a top-level comment", async () => {
    mocked_service.fetchCommentsByOrder.mockResolvedValue([
      buildComment({
        id: 1,
        replies: [buildComment({ id: 10, content: "A staff reply.", is_admin_comment: true })],
      }),
    ]);

    const { container } = render(
      <OrderComments purchase_type="single_order" order_id="order-1" target_comment_id={10} />
    );

    await waitFor(() => expect(screen.getByText("A staff reply.")).toBeInTheDocument());

    await waitFor(() => {
      const target = container.querySelector("#comment-10");
      expect(target?.className).toEqual(expect.stringContaining("comment-highlight-flash"));
    });
  });

  it("does not scroll when target_comment_id does not match any loaded comment", async () => {
    mocked_service.fetchCommentsByOrder.mockResolvedValue([buildComment({ id: 1 })]);

    render(
      <OrderComments purchase_type="single_order" order_id="order-1" target_comment_id={999} />
    );

    await waitFor(() =>
      expect(screen.getByText("It looks like the link on this order is returning a 404.")).toBeInTheDocument()
    );

    expect(window.HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it("fetches comments for a multi-purchase session via the session endpoint", async () => {
    mocked_service.fetchCommentsBySession.mockResolvedValue([buildComment({ id: 1 })]);

    render(<OrderComments purchase_type="multi_purchase" session_id="sess-1" />);

    await waitFor(() => expect(mocked_service.fetchCommentsBySession).toHaveBeenCalledWith("sess-1"));
    expect(mocked_service.fetchCommentsByOrder).not.toHaveBeenCalled();
  });
});
