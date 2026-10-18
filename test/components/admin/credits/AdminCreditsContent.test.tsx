import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminCreditsContent from "@/components/admin/credits/AdminCreditsContent";
import { adminCreditsService } from "@/services/admin/credits.service";
import type {
  AdminCreditUser,
  AdminCreditsStats,
  AdminCreditTransaction,
} from "@/types/admin/credits";
import type { PaginatedResponse } from "@/types/admin";

// ─── Module mocks ────────────────────────────────────────────────────────────

jest.mock("@/services/admin/credits.service", () => ({
  adminCreditsService: {
    fetchStats:       jest.fn(),
    searchClients:    jest.fn(),
    assignCredits:    jest.fn(),
    fetchTransactions: jest.fn(),
  },
}));

const mockFetchStats        = adminCreditsService.fetchStats        as jest.MockedFunction<typeof adminCreditsService.fetchStats>;
const mockSearchClients     = adminCreditsService.searchClients     as jest.MockedFunction<typeof adminCreditsService.searchClients>;
const mockAssignCredits     = adminCreditsService.assignCredits     as jest.MockedFunction<typeof adminCreditsService.assignCredits>;
const mockFetchTransactions = adminCreditsService.fetchTransactions as jest.MockedFunction<typeof adminCreditsService.fetchTransactions>;

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeStats(overrides: Partial<AdminCreditsStats> = {}): AdminCreditsStats {
  return {
    total_credits_issued:    5000,
    users_with_credits:      12,
    credits_used_this_month: 800,
    ...overrides,
  };
}

function makeClient(overrides: Partial<AdminCreditUser> = {}): AdminCreditUser {
  return {
    id:             1,
    first_name:     "John",
    last_name:      "Doe",
    email:          "john@example.com",
    credit_balance: 500,
    ...overrides,
  };
}

function makeTransaction(overrides: Partial<AdminCreditTransaction> = {}): AdminCreditTransaction {
  return {
    id:          1,
    user_id:     1,
    user:        { id: 1, first_name: "John", last_name: "Doe", email: "john@example.com" },
    amount:      100,
    type:        "credit",
    description: "Test credit",
    created_by:  null,
    created_at:  "2024-06-01T10:00:00Z",
    ...overrides,
  };
}

function makePaginatedTransactions(
  items: AdminCreditTransaction[] = [],
  overrides: Partial<PaginatedResponse<AdminCreditTransaction>> = {}
): PaginatedResponse<AdminCreditTransaction> {
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

  mockFetchStats.mockResolvedValue(makeStats());
  mockSearchClients.mockResolvedValue([]);
  mockFetchTransactions.mockResolvedValue(makePaginatedTransactions([]));
});

// ─── Test suite ──────────────────────────────────────────────────────────────

describe("AdminCreditsContent", () => {

  // ─── Page render ───────────────────────────────────────────────────────────

  describe("initial render", () => {
    it("renders the Credits Management heading", async () => {
      render(<AdminCreditsContent />);

      expect(screen.getByText("Credits Management")).toBeInTheDocument();
    });

    it("renders the Assign Credits form section", async () => {
      render(<AdminCreditsContent />);

      expect(screen.getByText("Assign Credits")).toBeInTheDocument();
    });

    it("renders the Transaction History section", async () => {
      render(<AdminCreditsContent />);

      expect(screen.getByText("Transaction History")).toBeInTheDocument();
    });

    it("calls fetchStats on mount", async () => {
      render(<AdminCreditsContent />);

      await waitFor(() => {
        expect(mockFetchStats).toHaveBeenCalledTimes(1);
      });
    });

    it("calls fetchTransactions on mount", async () => {
      render(<AdminCreditsContent />);

      await waitFor(() => {
        expect(mockFetchTransactions).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ─── Stats cards ──────────────────────────────────────────────────────────

  describe("stats cards", () => {
    it("displays total credits issued from API", async () => {
      mockFetchStats.mockResolvedValue(makeStats({ total_credits_issued: 12500 }));

      render(<AdminCreditsContent />);

      await waitFor(() => {
        expect(screen.getByText("12,500")).toBeInTheDocument();
      });
    });

    it("displays users with credits from API", async () => {
      mockFetchStats.mockResolvedValue(makeStats({ users_with_credits: 42 }));

      render(<AdminCreditsContent />);

      await waitFor(() => {
        expect(screen.getByText("42")).toBeInTheDocument();
      });
    });

    it("displays credits used this month from API", async () => {
      mockFetchStats.mockResolvedValue(makeStats({ credits_used_this_month: 1200 }));

      render(<AdminCreditsContent />);

      await waitFor(() => {
        expect(screen.getByText("1,200")).toBeInTheDocument();
      });
    });

    it("shows skeleton loaders while stats are loading", () => {
      // Never resolves during this test
      mockFetchStats.mockImplementation(() => new Promise(() => {}));

      render(<AdminCreditsContent />);

      const skeletons = document.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  // ─── Assign credits form ───────────────────────────────────────────────────

  describe("assign credits form", () => {
    it("renders the client selector", async () => {
      render(<AdminCreditsContent />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/select or search a client/i)).toBeInTheDocument();
      });
    });

    it("renders the Add Credits and Deduct Credits operation buttons", async () => {
      render(<AdminCreditsContent />);

      // Multiple "Add Credits" buttons exist (toggle + submit); verify at least one is present
      expect(screen.getAllByRole("button", { name: /add credits/i }).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByRole("button", { name: /deduct credits/i }).length).toBeGreaterThanOrEqual(1);
    });

    it("renders the amount input field", async () => {
      render(<AdminCreditsContent />);

      expect(screen.getByPlaceholderText(/e\.g\. 500/i)).toBeInTheDocument();
    });

    it("renders the note/description textarea", async () => {
      render(<AdminCreditsContent />);

      expect(screen.getByPlaceholderText(/reason for this credit adjustment/i)).toBeInTheDocument();
    });

    it("shows client error when submitting without selecting a client", async () => {
      render(<AdminCreditsContent />);

      await waitFor(() => screen.getByPlaceholderText(/e\.g\. 500/i));

      const amount_input = screen.getByPlaceholderText(/e\.g\. 500/i);
      await userEvent.type(amount_input, "100");

      const submit_button = screen.getAllByRole("button", { name: /add credits/i })[1];
      fireEvent.click(submit_button);

      await waitFor(() => {
        expect(screen.getByText(/please select a client/i)).toBeInTheDocument();
      });
    });

    it("shows amount error when submitting with empty amount", async () => {
      render(<AdminCreditsContent />);

      // Submit with no amount and no client
      const submit_button = screen.getAllByRole("button", { name: /add credits/i })[1];
      fireEvent.click(submit_button);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid amount/i)).toBeInTheDocument();
      });
    });

    it("shows amount error when amount is zero", async () => {
      render(<AdminCreditsContent />);

      const amount_input = screen.getByPlaceholderText(/e\.g\. 500/i);
      fireEvent.change(amount_input, { target: { value: "0" } });

      // Submit the form directly to guarantee the submit event fires
      const form = document.querySelector("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid amount/i)).toBeInTheDocument();
      });
    });

    it("displays a success message with the new balance after assignment", async () => {
      const client = makeClient({ credit_balance: 200 });

      mockSearchClients.mockResolvedValue([client]);
      mockAssignCredits.mockResolvedValue({
        success:     true,
        new_balance: 700,
        transaction: makeTransaction({ amount: 500, type: "credit" }),
      });

      render(<AdminCreditsContent />);

      // Open dropdown and select client
      const search_input = screen.getByPlaceholderText(/select or search a client/i);
      fireEvent.focus(search_input);

      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("John Doe"));

      // Fill amount
      const amount_input = screen.getByPlaceholderText(/e\.g\. 500/i);
      await userEvent.type(amount_input, "500");

      // Submit
      const submit_button = screen.getAllByRole("button", { name: /add credits/i })[1];
      fireEvent.click(submit_button);

      await waitFor(() => {
        expect(screen.getByText(/credits updated/i)).toBeInTheDocument();
      });
    });

    it("calls assignCredits service with correct payload on successful submit", async () => {
      const client = makeClient({ id: 42, credit_balance: 100 });

      mockSearchClients.mockResolvedValue([client]);
      mockAssignCredits.mockResolvedValue({
        success:     true,
        new_balance: 600,
        transaction: makeTransaction({ user_id: 42, amount: 500 }),
      });

      render(<AdminCreditsContent />);

      // Open and select client
      const search_input = screen.getByPlaceholderText(/select or search a client/i);
      fireEvent.focus(search_input);

      await waitFor(() => screen.getByText("John Doe"));
      fireEvent.click(screen.getByText("John Doe"));

      // Fill amount
      const amount_input = screen.getByPlaceholderText(/e\.g\. 500/i);
      await userEvent.type(amount_input, "500");

      // Submit
      const submit_button = screen.getAllByRole("button", { name: /add credits/i })[1];
      fireEvent.click(submit_button);

      await waitFor(() => {
        expect(mockAssignCredits).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: 42,
            amount:  500,
            type:    "credit",
          })
        );
      });
    });

    it("shows API error message when assignCredits fails", async () => {
      const client = makeClient();

      mockSearchClients.mockResolvedValue([client]);
      mockAssignCredits.mockRejectedValue({ message: "Server error, please try again." });

      render(<AdminCreditsContent />);

      const search_input = screen.getByPlaceholderText(/select or search a client/i);
      fireEvent.focus(search_input);

      await waitFor(() => screen.getByText("John Doe"));
      fireEvent.click(screen.getByText("John Doe"));

      const amount_input = screen.getByPlaceholderText(/e\.g\. 500/i);
      await userEvent.type(amount_input, "100");

      const submit_button = screen.getAllByRole("button", { name: /add credits/i })[1];
      fireEvent.click(submit_button);

      await waitFor(() => {
        expect(screen.getByText(/server error, please try again/i)).toBeInTheDocument();
      });
    });

    it("refreshes stats and transactions after successful credit assignment", async () => {
      const client = makeClient();

      mockSearchClients.mockResolvedValue([client]);
      mockAssignCredits.mockResolvedValue({
        success:     true,
        new_balance: 600,
        transaction: makeTransaction(),
      });

      render(<AdminCreditsContent />);

      await waitFor(() => expect(mockFetchStats).toHaveBeenCalledTimes(1));

      const search_input = screen.getByPlaceholderText(/select or search a client/i);
      fireEvent.focus(search_input);

      await waitFor(() => screen.getByText("John Doe"));
      fireEvent.click(screen.getByText("John Doe"));

      const amount_input = screen.getByPlaceholderText(/e\.g\. 500/i);
      await userEvent.type(amount_input, "100");

      const submit_button = screen.getAllByRole("button", { name: /add credits/i })[1];
      fireEvent.click(submit_button);

      await waitFor(() => {
        expect(mockFetchStats).toHaveBeenCalledTimes(2);
      });
    });
  });

  // ─── Client search dropdown ────────────────────────────────────────────────

  describe("client search dropdown", () => {
    it("loads all clients when dropdown opens", async () => {
      mockSearchClients.mockResolvedValue([
        makeClient({ id: 1, first_name: "Alice", last_name: "Smith" }),
        makeClient({ id: 2, first_name: "Bob", last_name: "Jones" }),
      ]);

      render(<AdminCreditsContent />);

      const search_input = screen.getByPlaceholderText(/select or search a client/i);
      fireEvent.focus(search_input);

      await waitFor(() => {
        expect(screen.getByText("Alice Smith")).toBeInTheDocument();
        expect(screen.getByText("Bob Jones")).toBeInTheDocument();
      });
    });

    it("shows client email in the dropdown list", async () => {
      mockSearchClients.mockResolvedValue([
        makeClient({ email: "alice@company.com" }),
      ]);

      render(<AdminCreditsContent />);

      const search_input = screen.getByPlaceholderText(/select or search a client/i);
      fireEvent.focus(search_input);

      await waitFor(() => {
        expect(screen.getByText("alice@company.com")).toBeInTheDocument();
      });
    });

    it("shows client credit balance in the dropdown list", async () => {
      mockSearchClients.mockResolvedValue([
        makeClient({ credit_balance: 1500 }),
      ]);

      render(<AdminCreditsContent />);

      const search_input = screen.getByPlaceholderText(/select or search a client/i);
      fireEvent.focus(search_input);

      await waitFor(() => {
        expect(screen.getByText("1,500 cr")).toBeInTheDocument();
      });
    });

    it("shows client balance card after selecting a client", async () => {
      const client = makeClient({ credit_balance: 300 });
      mockSearchClients.mockResolvedValue([client]);

      render(<AdminCreditsContent />);

      const search_input = screen.getByPlaceholderText(/select or search a client/i);
      fireEvent.focus(search_input);

      await waitFor(() => screen.getByText("John Doe"));
      fireEvent.click(screen.getByText("John Doe"));

      await waitFor(() => {
        expect(screen.getByText("Current balance")).toBeInTheDocument();
      });
    });
  });

  // ─── Transaction history ───────────────────────────────────────────────────

  describe("transaction history", () => {
    it("shows empty state when no transactions exist", async () => {
      mockFetchTransactions.mockResolvedValue(makePaginatedTransactions([]));

      render(<AdminCreditsContent />);

      await waitFor(() => {
        expect(screen.getByText(/no transactions yet/i)).toBeInTheDocument();
      });
    });

    it("displays transaction rows when data is available", async () => {
      mockFetchTransactions.mockResolvedValue(
        makePaginatedTransactions([makeTransaction()])
      );

      render(<AdminCreditsContent />);

      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeInTheDocument();
      });
    });

    it("renders positive amounts with + prefix for credit type", async () => {
      mockFetchTransactions.mockResolvedValue(
        makePaginatedTransactions([makeTransaction({ amount: 250, type: "credit" })])
      );

      render(<AdminCreditsContent />);

      await waitFor(() => {
        expect(screen.getByText("+250")).toBeInTheDocument();
      });
    });

    it("renders negative amounts with − prefix for debit type", async () => {
      mockFetchTransactions.mockResolvedValue(
        makePaginatedTransactions([makeTransaction({ amount: 100, type: "debit" })])
      );

      render(<AdminCreditsContent />);

      await waitFor(() => {
        expect(screen.getByText("−100")).toBeInTheDocument();
      });
    });

    it("shows Added badge for credit type transactions", async () => {
      mockFetchTransactions.mockResolvedValue(
        makePaginatedTransactions([makeTransaction({ type: "credit" })])
      );

      render(<AdminCreditsContent />);

      await waitFor(() => {
        expect(screen.getByText("Added")).toBeInTheDocument();
      });
    });

    it("shows Deducted badge for debit type transactions", async () => {
      mockFetchTransactions.mockResolvedValue(
        makePaginatedTransactions([makeTransaction({ type: "debit" })])
      );

      render(<AdminCreditsContent />);

      await waitFor(() => {
        expect(screen.getByText("Deducted")).toBeInTheDocument();
      });
    });

    it("renders transaction filter buttons: All, Added, Deducted", async () => {
      render(<AdminCreditsContent />);

      expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Added" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Deducted" })).toBeInTheDocument();
    });

    it("refetches transactions with type=credit when Added filter is clicked", async () => {
      mockFetchTransactions.mockResolvedValue(makePaginatedTransactions([]));

      render(<AdminCreditsContent />);

      await waitFor(() => expect(mockFetchTransactions).toHaveBeenCalledTimes(1));

      fireEvent.click(screen.getByRole("button", { name: "Added" }));

      await waitFor(() => {
        expect(mockFetchTransactions).toHaveBeenCalledWith(
          expect.objectContaining({ type: "credit" })
        );
      });
    });

    it("refetches transactions with type=debit when Deducted filter is clicked", async () => {
      mockFetchTransactions.mockResolvedValue(makePaginatedTransactions([]));

      render(<AdminCreditsContent />);

      await waitFor(() => expect(mockFetchTransactions).toHaveBeenCalledTimes(1));

      fireEvent.click(screen.getByRole("button", { name: "Deducted" }));

      await waitFor(() => {
        expect(mockFetchTransactions).toHaveBeenCalledWith(
          expect.objectContaining({ type: "debit" })
        );
      });
    });

    it("shows pagination controls when there are multiple pages", async () => {
      mockFetchTransactions.mockResolvedValue(
        makePaginatedTransactions(
          Array.from({ length: 15 }, (_, i) => makeTransaction({ id: i + 1 })),
          { last_page: 3, total: 45, current_page: 1 }
        )
      );

      render(<AdminCreditsContent />);

      await waitFor(() => {
        expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
      });
    });
  });

  // ─── 1:1 parity note ──────────────────────────────────────────────────────

  describe("credit parity info", () => {
    it("shows the 1 credit = $1.00 parity note", async () => {
      render(<AdminCreditsContent />);

      expect(screen.getByText(/1 credit equals \$1\.00/i)).toBeInTheDocument();
    });
  });
});
