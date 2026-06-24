import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminCreditPurchasesContent from "@/components/admin/credits/AdminCreditPurchasesContent";
import { adminCreditsService } from "@/services/admin/credits.service";
import type { AdminCreditPurchase, CreditPurchaseStatus } from "@/types/admin/credits";
import type { PaginatedResponse } from "@/types/admin";

// ─── Module mocks ────────────────────────────────────────────────────────────

jest.mock("@/services/admin/credits.service", () => ({
  adminCreditsService: {
    fetchAllPurchases: jest.fn(),
  },
}));

// flatpickr uses DOM APIs not available in jsdom
jest.mock("flatpickr", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    destroy:  jest.fn(),
    setDate:  jest.fn(),
    clear:    jest.fn(),
    set:      jest.fn(),
  })),
}));

jest.mock("flatpickr/dist/flatpickr.min.css", () => ({}));

// useDebounce returns the value immediately in tests
jest.mock("@/hooks/useDebounce", () => ({
  useDebounce: (value: unknown) => value,
}));

jest.mock("next/link", () => {
  const Link = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  Link.displayName = "Link";
  return Link;
});

const mockFetchAllPurchases = adminCreditsService.fetchAllPurchases as jest.MockedFunction<
  typeof adminCreditsService.fetchAllPurchases
>;

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makePurchase(overrides: Partial<AdminCreditPurchase> = {}): AdminCreditPurchase {
  return {
    id:                 1,
    package_id:         "starter-500",
    package_name:       "Starter 500",
    credits_amount:     500,
    amount_paid:        49.99,
    payment_intent_id:  "pi_test_abc123",
    status:             "completed",
    created_at:         "2024-06-01T10:00:00Z",
    user: {
      id:         10,
      first_name: "Alice",
      last_name:  "Walker",
      email:      "alice@example.com",
    },
    ...overrides,
  };
}

function makePaginatedPurchases(
  items: AdminCreditPurchase[] = [],
  overrides: Partial<PaginatedResponse<AdminCreditPurchase>> = {}
): PaginatedResponse<AdminCreditPurchase> {
  return {
    data:         items,
    current_page: 1,
    last_page:    1,
    total:        items.length,
    ...overrides,
  };
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchAllPurchases.mockResolvedValue(makePaginatedPurchases([]));
});

// ─── Test suite ──────────────────────────────────────────────────────────────

describe("AdminCreditPurchasesContent", () => {

  // ─── Initial render ────────────────────────────────────────────────────────

  describe("initial render", () => {
    it("renders the Credit Purchases heading", async () => {
      render(<AdminCreditPurchasesContent />);

      expect(screen.getByRole("heading", { name: /credit purchases/i })).toBeInTheDocument();
    });

    it("renders the Purchase History table section", async () => {
      render(<AdminCreditPurchasesContent />);

      await waitFor(() => {
        expect(screen.getByText("Purchase History")).toBeInTheDocument();
      });
    });

    it("calls fetchAllPurchases on mount", async () => {
      render(<AdminCreditPurchasesContent />);

      await waitFor(() => {
        expect(mockFetchAllPurchases).toHaveBeenCalledTimes(1);
      });
    });

    it("renders a search input field", async () => {
      render(<AdminCreditPurchasesContent />);

      expect(
        screen.getByPlaceholderText(/search by client name or email/i)
      ).toBeInTheDocument();
    });

    it("renders a status filter dropdown", async () => {
      render(<AdminCreditPurchasesContent />);

      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("renders a link to Client Balances page", async () => {
      render(<AdminCreditPurchasesContent />);

      expect(screen.getByRole("link", { name: /client balances/i })).toBeInTheDocument();
    });
  });

  // ─── Empty state ───────────────────────────────────────────────────────────

  describe("empty state", () => {
    it("shows no purchases found when data is empty", async () => {
      mockFetchAllPurchases.mockResolvedValue(makePaginatedPurchases([]));

      render(<AdminCreditPurchasesContent />);

      await waitFor(() => {
        // Multiple "No purchases found" elements exist (desktop + mobile view)
        expect(screen.getAllByText("No purchases found").length).toBeGreaterThanOrEqual(1);
      });
    });

    it("shows no purchases yet message when no filters are active", async () => {
      mockFetchAllPurchases.mockResolvedValue(makePaginatedPurchases([]));

      render(<AdminCreditPurchasesContent />);

      await waitFor(() => {
        expect(
          screen.getByText(/no credit purchases have been made yet/i)
        ).toBeInTheDocument();
      });
    });
  });

  // ─── Purchase data display ─────────────────────────────────────────────────

  describe("purchase data display", () => {
    it("renders client name in purchase row", async () => {
      mockFetchAllPurchases.mockResolvedValue(
        makePaginatedPurchases([makePurchase()])
      );

      render(<AdminCreditPurchasesContent />);

      await waitFor(() => {
        // Name appears in both desktop table and mobile card — at least one match is expected
        expect(screen.getAllByText("Alice Walker").length).toBeGreaterThanOrEqual(1);
      });
    });

    it("renders client email in purchase row", async () => {
      mockFetchAllPurchases.mockResolvedValue(
        makePaginatedPurchases([makePurchase()])
      );

      render(<AdminCreditPurchasesContent />);

      await waitFor(() => {
        expect(screen.getAllByText("alice@example.com").length).toBeGreaterThanOrEqual(1);
      });
    });

    it("renders package name in purchase row", async () => {
      mockFetchAllPurchases.mockResolvedValue(
        makePaginatedPurchases([makePurchase({ package_name: "Pro 1000" })])
      );

      render(<AdminCreditPurchasesContent />);

      await waitFor(() => {
        expect(screen.getAllByText("Pro 1000").length).toBeGreaterThanOrEqual(1);
      });
    });

    it("renders credits amount with CR suffix", async () => {
      mockFetchAllPurchases.mockResolvedValue(
        makePaginatedPurchases([makePurchase({ credits_amount: 500 })])
      );

      render(<AdminCreditPurchasesContent />);

      await waitFor(() => {
        expect(screen.getAllByText("+500 CR").length).toBeGreaterThanOrEqual(1);
      });
    });

    it("renders amount paid in USD format", async () => {
      // Use a unique value to avoid collision with stat card values
      mockFetchAllPurchases.mockResolvedValue(
        makePaginatedPurchases([makePurchase({ amount_paid: 77.77, status: "completed" })])
      );

      render(<AdminCreditPurchasesContent />);

      await waitFor(() => {
        expect(screen.getAllByText("$77.77").length).toBeGreaterThanOrEqual(1);
      });
    });

    it("renders Completed status badge for completed purchases", async () => {
      mockFetchAllPurchases.mockResolvedValue(
        makePaginatedPurchases([makePurchase({ status: "completed" })])
      );

      render(<AdminCreditPurchasesContent />);

      await waitFor(() => {
        expect(screen.getByText("Completed")).toBeInTheDocument();
      });
    });

    it("renders Pending status badge for pending purchases", async () => {
      mockFetchAllPurchases.mockResolvedValue(
        makePaginatedPurchases([makePurchase({ status: "pending" })])
      );

      render(<AdminCreditPurchasesContent />);

      await waitFor(() => {
        expect(screen.getByText("Pending")).toBeInTheDocument();
      });
    });

    it("renders Failed status badge for failed purchases", async () => {
      mockFetchAllPurchases.mockResolvedValue(
        makePaginatedPurchases([makePurchase({ status: "failed" })])
      );

      render(<AdminCreditPurchasesContent />);

      await waitFor(() => {
        expect(screen.getByText("Failed")).toBeInTheDocument();
      });
    });

    it("renders Refunded status badge for refunded purchases", async () => {
      mockFetchAllPurchases.mockResolvedValue(
        makePaginatedPurchases([makePurchase({ status: "refunded" })])
      );

      render(<AdminCreditPurchasesContent />);

      await waitFor(() => {
        expect(screen.getByText("Refunded")).toBeInTheDocument();
      });
    });
  });

  // ─── Stat cards ────────────────────────────────────────────────────────────

  describe("stat cards", () => {
    it("shows Total Revenue stat for completed purchases", async () => {
      mockFetchAllPurchases.mockResolvedValue(
        makePaginatedPurchases([
          makePurchase({ amount_paid: 49.99, status: "completed" }),
          makePurchase({ id: 2, amount_paid: 89.99, status: "completed" }),
        ])
      );

      render(<AdminCreditPurchasesContent />);

      await waitFor(() => {
        expect(screen.getByText("$139.98")).toBeInTheDocument();
      });
    });

    it("excludes non-completed purchases from total revenue", async () => {
      mockFetchAllPurchases.mockResolvedValue(
        makePaginatedPurchases([
          makePurchase({ amount_paid: 55.55, status: "completed" }),
          makePurchase({ id: 2, amount_paid: 89.99, status: "failed" }),
        ])
      );

      render(<AdminCreditPurchasesContent />);

      await waitFor(() => {
        // $55.55 appears in stat card AND in the table row — both are correct here
        expect(screen.getAllByText("$55.55").length).toBeGreaterThanOrEqual(1);
        // The combined total $145.54 must NOT appear anywhere — it would be wrong
        expect(screen.queryByText("$145.54")).not.toBeInTheDocument();
      });
    });

    it("shows Transactions count matching total", async () => {
      mockFetchAllPurchases.mockResolvedValue(
        makePaginatedPurchases(
          [makePurchase(), makePurchase({ id: 2 }), makePurchase({ id: 3 })],
          { total: 3 }
        )
      );

      render(<AdminCreditPurchasesContent />);

      await waitFor(() => {
        expect(screen.getByText("3")).toBeInTheDocument();
      });
    });
  });

  // ─── Filters ──────────────────────────────────────────────────────────────

  describe("filters", () => {
    it("fetches with search param when user types in search field", async () => {
      render(<AdminCreditPurchasesContent />);

      const search_input = screen.getByPlaceholderText(/search by client name or email/i);
      await userEvent.type(search_input, "alice");

      await waitFor(() => {
        expect(mockFetchAllPurchases).toHaveBeenCalledWith(
          expect.objectContaining({ search: "alice" })
        );
      });
    });

    it("fetches with status param when status filter is changed", async () => {
      render(<AdminCreditPurchasesContent />);

      const status_select = screen.getByRole("combobox");
      await userEvent.selectOptions(status_select, "completed");

      await waitFor(() => {
        expect(mockFetchAllPurchases).toHaveBeenCalledWith(
          expect.objectContaining({ status: "completed" })
        );
      });
    });

    it("shows Clear all button when filters are active", async () => {
      render(<AdminCreditPurchasesContent />);

      const search_input = screen.getByPlaceholderText(/search by client name or email/i);
      await userEvent.type(search_input, "test");

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /clear all/i })).toBeInTheDocument();
      });
    });

    it("clears search input when Clear all is clicked", async () => {
      render(<AdminCreditPurchasesContent />);

      const search_input = screen.getByPlaceholderText(/search by client name or email/i);
      await userEvent.type(search_input, "alice");

      await waitFor(() => screen.getByRole("button", { name: /clear all/i }));
      fireEvent.click(screen.getByRole("button", { name: /clear all/i }));

      expect(search_input).toHaveValue("");
    });

    it("shows filter message when results are empty and filters active", async () => {
      mockFetchAllPurchases.mockResolvedValue(makePaginatedPurchases([]));

      render(<AdminCreditPurchasesContent />);

      const search_input = screen.getByPlaceholderText(/search by client name or email/i);
      await userEvent.type(search_input, "unknown@example.com");

      await waitFor(() => {
        // Both desktop and mobile show this message; at least one must be present
        expect(screen.getAllByText(/try adjusting your filters/i).length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  // ─── Error state ───────────────────────────────────────────────────────────

  describe("error state", () => {
    it("shows error message when fetchAllPurchases fails", async () => {
      mockFetchAllPurchases.mockRejectedValue(new Error("Network Error"));

      render(<AdminCreditPurchasesContent />);

      await waitFor(() => {
        expect(
          screen.getByText(/failed to load credit purchases/i)
        ).toBeInTheDocument();
      });
    });

    it("shows Retry button when there is an error", async () => {
      mockFetchAllPurchases.mockRejectedValue(new Error("Network Error"));

      render(<AdminCreditPurchasesContent />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
      });
    });

    it("retries fetch when Retry button is clicked", async () => {
      mockFetchAllPurchases
        .mockRejectedValueOnce(new Error("Network Error"))
        .mockResolvedValue(makePaginatedPurchases([]));

      render(<AdminCreditPurchasesContent />);

      await waitFor(() => screen.getByRole("button", { name: /retry/i }));
      fireEvent.click(screen.getByRole("button", { name: /retry/i }));

      await waitFor(() => {
        expect(mockFetchAllPurchases).toHaveBeenCalledTimes(2);
      });
    });
  });

  // ─── Pagination ────────────────────────────────────────────────────────────

  describe("pagination", () => {
    it("shows pagination when there are more than 15 results", async () => {
      mockFetchAllPurchases.mockResolvedValue(
        makePaginatedPurchases(
          Array.from({ length: 15 }, (_, i) => makePurchase({ id: i + 1 })),
          { total: 30, last_page: 2, current_page: 1 }
        )
      );

      render(<AdminCreditPurchasesContent />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
      });
    });

    it("does not show pagination when results fit on one page", async () => {
      mockFetchAllPurchases.mockResolvedValue(
        makePaginatedPurchases(
          [makePurchase()],
          { total: 1, last_page: 1 }
        )
      );

      render(<AdminCreditPurchasesContent />);

      await waitFor(() => {
        expect(screen.getAllByText("Alice Walker").length).toBeGreaterThanOrEqual(1);
      });

      expect(screen.queryByRole("button", { name: /^next$/i })).not.toBeInTheDocument();
    });

    it("shows showing X of Y label when multiple pages exist", async () => {
      mockFetchAllPurchases.mockResolvedValue(
        makePaginatedPurchases(
          Array.from({ length: 15 }, (_, i) => makePurchase({ id: i + 1 })),
          { total: 30, last_page: 2, current_page: 1 }
        )
      );

      render(<AdminCreditPurchasesContent />);

      await waitFor(() => {
        // "Showing X–Y of Z purchases" text in pagination bar
        expect(screen.getAllByText(/showing/i).length).toBeGreaterThanOrEqual(1);
      });
    });

    it("fetches page 2 when Next button is clicked", async () => {
      mockFetchAllPurchases.mockResolvedValue(
        makePaginatedPurchases(
          Array.from({ length: 15 }, (_, i) => makePurchase({ id: i + 1 })),
          { total: 30, last_page: 2, current_page: 1 }
        )
      );

      render(<AdminCreditPurchasesContent />);

      await waitFor(() => screen.getByRole("button", { name: /next/i }));
      fireEvent.click(screen.getByRole("button", { name: /next/i }));

      await waitFor(() => {
        expect(mockFetchAllPurchases).toHaveBeenCalledWith(
          expect.objectContaining({ page: 2 })
        );
      });
    });
  });

  // ─── Loading state ─────────────────────────────────────────────────────────

  describe("loading state", () => {
    it("shows skeleton rows while purchases are loading", () => {
      mockFetchAllPurchases.mockImplementation(() => new Promise(() => {}));

      render(<AdminCreditPurchasesContent />);

      const skeletons = document.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  // ─── Records count ─────────────────────────────────────────────────────────

  describe("records count", () => {
    it("shows the total record count after loading", async () => {
      mockFetchAllPurchases.mockResolvedValue(
        makePaginatedPurchases(
          [makePurchase(), makePurchase({ id: 2 })],
          { total: 2 }
        )
      );

      render(<AdminCreditPurchasesContent />);

      await waitFor(() => {
        expect(screen.getByText(/2 records/i)).toBeInTheDocument();
      });
    });
  });
});
