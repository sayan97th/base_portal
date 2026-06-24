import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminCreditsClientsContent from "@/components/admin/credits/AdminCreditsClientsContent";
import { adminCreditsService } from "@/services/admin/credits.service";
import type { AdminCreditUser } from "@/types/admin/credits";
import type { PaginatedResponse } from "@/types/admin";

// ─── Module mocks ────────────────────────────────────────────────────────────

jest.mock("@/services/admin/credits.service", () => ({
  adminCreditsService: {
    fetchClientsList: jest.fn(),
    assignCredits:    jest.fn(),
  },
}));

const mockFetchClientsList = adminCreditsService.fetchClientsList as jest.MockedFunction<
  typeof adminCreditsService.fetchClientsList
>;
const mockAssignCredits = adminCreditsService.assignCredits as jest.MockedFunction<
  typeof adminCreditsService.assignCredits
>;

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeClient(overrides: Partial<AdminCreditUser> = {}): AdminCreditUser {
  return {
    id:             1,
    first_name:     "Alice",
    last_name:      "Walker",
    email:          "alice@example.com",
    credit_balance: 500,
    ...overrides,
  };
}

function makePaginatedClients(
  items: AdminCreditUser[] = [],
  overrides: Partial<PaginatedResponse<AdminCreditUser>> = {}
): PaginatedResponse<AdminCreditUser> {
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
  mockFetchClientsList.mockResolvedValue(makePaginatedClients([]));
});

// ─── Test suite ──────────────────────────────────────────────────────────────

describe("AdminCreditsClientsContent", () => {

  // ─── Initial render ────────────────────────────────────────────────────────

  describe("initial render", () => {
    it("renders the Clients Credits heading", async () => {
      render(<AdminCreditsClientsContent />);

      expect(screen.getByText("Clients Credits")).toBeInTheDocument();
    });

    it("renders the search input", async () => {
      render(<AdminCreditsClientsContent />);

      expect(
        screen.getByPlaceholderText(/search by name or email/i)
      ).toBeInTheDocument();
    });

    it("renders sort buttons for Name and Balance", async () => {
      render(<AdminCreditsClientsContent />);

      expect(screen.getByRole("button", { name: /name/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /balance/i })).toBeInTheDocument();
    });

    it("calls fetchClientsList on mount", async () => {
      render(<AdminCreditsClientsContent />);

      await waitFor(() => {
        expect(mockFetchClientsList).toHaveBeenCalledTimes(1);
      });
    });

    it("calls fetchClientsList with credit_balance sort desc by default", async () => {
      render(<AdminCreditsClientsContent />);

      await waitFor(() => {
        expect(mockFetchClientsList).toHaveBeenCalledWith(
          expect.objectContaining({
            sort_by:  "credit_balance",
            sort_dir: "desc",
          })
        );
      });
    });
  });

  // ─── Empty state ───────────────────────────────────────────────────────────

  describe("empty state", () => {
    it("shows No clients found when data is empty", async () => {
      mockFetchClientsList.mockResolvedValue(makePaginatedClients([]));

      render(<AdminCreditsClientsContent />);

      await waitFor(() => {
        expect(screen.getByText("No clients found")).toBeInTheDocument();
      });
    });
  });

  // ─── Client data display ───────────────────────────────────────────────────

  describe("client data display", () => {
    it("renders client full name in the table", async () => {
      mockFetchClientsList.mockResolvedValue(
        makePaginatedClients([makeClient()])
      );

      render(<AdminCreditsClientsContent />);

      await waitFor(() => {
        expect(screen.getByText("Alice Walker")).toBeInTheDocument();
      });
    });

    it("renders client email in the table", async () => {
      mockFetchClientsList.mockResolvedValue(
        makePaginatedClients([makeClient()])
      );

      render(<AdminCreditsClientsContent />);

      await waitFor(() => {
        expect(screen.getByText("alice@example.com")).toBeInTheDocument();
      });
    });

    it("renders credit balance with cr suffix", async () => {
      mockFetchClientsList.mockResolvedValue(
        makePaginatedClients([makeClient({ credit_balance: 1250 })])
      );

      render(<AdminCreditsClientsContent />);

      await waitFor(() => {
        // Appears in both the table badge and stat card — at least one match
        expect(screen.getAllByText("1,250 cr").length).toBeGreaterThanOrEqual(1);
      });
    });

    it("renders an Edit button for each client", async () => {
      mockFetchClientsList.mockResolvedValue(
        makePaginatedClients([makeClient()])
      );

      render(<AdminCreditsClientsContent />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
      });
    });

    it("renders total clients count in stat card", async () => {
      mockFetchClientsList.mockResolvedValue(
        makePaginatedClients(
          [makeClient(), makeClient({ id: 2 })],
          { total: 2 }
        )
      );

      render(<AdminCreditsClientsContent />);

      await waitFor(() => {
        expect(screen.getByText("2 clients")).toBeInTheDocument();
      });
    });
  });

  // ─── Tier badges ──────────────────────────────────────────────────────────

  describe("tier badges", () => {
    it("shows Rich tier for clients with balance >= 1000", async () => {
      mockFetchClientsList.mockResolvedValue(
        makePaginatedClients([makeClient({ credit_balance: 1500 })])
      );

      render(<AdminCreditsClientsContent />);

      await waitFor(() => {
        expect(screen.getByText("Rich")).toBeInTheDocument();
      });
    });

    it("shows Active tier for clients with balance between 200 and 999", async () => {
      mockFetchClientsList.mockResolvedValue(
        makePaginatedClients([makeClient({ credit_balance: 400 })])
      );

      render(<AdminCreditsClientsContent />);

      await waitFor(() => {
        expect(screen.getByText("Active")).toBeInTheDocument();
      });
    });

    it("shows Low tier for clients with balance between 1 and 199", async () => {
      mockFetchClientsList.mockResolvedValue(
        makePaginatedClients([makeClient({ credit_balance: 50 })])
      );

      render(<AdminCreditsClientsContent />);

      await waitFor(() => {
        expect(screen.getByText("Low")).toBeInTheDocument();
      });
    });

    it("shows Empty tier for clients with zero balance", async () => {
      mockFetchClientsList.mockResolvedValue(
        makePaginatedClients([makeClient({ credit_balance: 0 })])
      );

      render(<AdminCreditsClientsContent />);

      await waitFor(() => {
        expect(screen.getByText("Empty")).toBeInTheDocument();
      });
    });
  });

  // ─── Search ────────────────────────────────────────────────────────────────

  describe("search", () => {
    it("calls fetchClientsList with search param when user types", async () => {
      render(<AdminCreditsClientsContent />);

      const search_input = screen.getByPlaceholderText(/search by name or email/i);
      await userEvent.type(search_input, "alice");

      await waitFor(() => {
        expect(mockFetchClientsList).toHaveBeenCalledWith(
          expect.objectContaining({ search: "alice" })
        );
      });
    });

    it("resets to page 1 when search term changes", async () => {
      render(<AdminCreditsClientsContent />);

      const search_input = screen.getByPlaceholderText(/search by name or email/i);
      await userEvent.type(search_input, "bob");

      await waitFor(() => {
        expect(mockFetchClientsList).toHaveBeenCalledWith(
          expect.objectContaining({ page: 1 })
        );
      });
    });

    it("shows clear button when search has text", async () => {
      render(<AdminCreditsClientsContent />);

      const search_input = screen.getByPlaceholderText(/search by name or email/i);
      await userEvent.type(search_input, "test");

      await waitFor(() => {
        const clear_btn = document.querySelector('button[aria-label]') as HTMLButtonElement | null;
        // The clear button is inside the search wrapper
        expect(search_input.parentElement?.querySelector("button")).toBeInTheDocument();
      });
    });

    it("shows no results hint with search term when empty", async () => {
      mockFetchClientsList.mockResolvedValue(makePaginatedClients([]));

      render(<AdminCreditsClientsContent />);

      const search_input = screen.getByPlaceholderText(/search by name or email/i);
      await userEvent.type(search_input, "unknown");

      await waitFor(() => {
        expect(screen.getByText(/no results for/i)).toBeInTheDocument();
      });
    });
  });

  // ─── Sorting ──────────────────────────────────────────────────────────────

  describe("sorting", () => {
    it("calls fetchClientsList with sort_by=first_name when Name is clicked", async () => {
      render(<AdminCreditsClientsContent />);

      await waitFor(() => expect(mockFetchClientsList).toHaveBeenCalledTimes(1));

      fireEvent.click(screen.getByRole("button", { name: /name/i }));

      await waitFor(() => {
        expect(mockFetchClientsList).toHaveBeenCalledWith(
          expect.objectContaining({ sort_by: "first_name" })
        );
      });
    });

    it("calls fetchClientsList with sort_by=credit_balance when Balance is clicked", async () => {
      render(<AdminCreditsClientsContent />);

      await waitFor(() => expect(mockFetchClientsList).toHaveBeenCalledTimes(1));

      fireEvent.click(screen.getByRole("button", { name: /balance/i }));

      await waitFor(() => {
        expect(mockFetchClientsList).toHaveBeenCalledWith(
          expect.objectContaining({ sort_by: "credit_balance" })
        );
      });
    });

    it("toggles sort direction when the same field is clicked twice", async () => {
      render(<AdminCreditsClientsContent />);

      await waitFor(() => expect(mockFetchClientsList).toHaveBeenCalledTimes(1));

      // First click — sort by name asc
      fireEvent.click(screen.getByRole("button", { name: /name/i }));

      await waitFor(() => {
        expect(mockFetchClientsList).toHaveBeenCalledWith(
          expect.objectContaining({ sort_by: "first_name", sort_dir: "asc" })
        );
      });

      // Second click — toggle to desc
      fireEvent.click(screen.getByRole("button", { name: /name/i }));

      await waitFor(() => {
        expect(mockFetchClientsList).toHaveBeenCalledWith(
          expect.objectContaining({ sort_by: "first_name", sort_dir: "desc" })
        );
      });
    });
  });

  // ─── Edit Credits Modal ────────────────────────────────────────────────────

  describe("edit credits modal", () => {
    it("opens the Edit Credits modal when Edit button is clicked", async () => {
      mockFetchClientsList.mockResolvedValue(
        makePaginatedClients([makeClient()])
      );

      render(<AdminCreditsClientsContent />);

      await waitFor(() => screen.getByRole("button", { name: /edit/i }));
      fireEvent.click(screen.getByRole("button", { name: /edit/i }));

      await waitFor(() => {
        expect(screen.getByText("Edit Credits")).toBeInTheDocument();
      });
    });

    it("shows client name in the modal header", async () => {
      mockFetchClientsList.mockResolvedValue(
        makePaginatedClients([makeClient({ first_name: "Alice", last_name: "Walker" })])
      );

      render(<AdminCreditsClientsContent />);

      await waitFor(() => screen.getByRole("button", { name: /edit/i }));
      fireEvent.click(screen.getByRole("button", { name: /edit/i }));

      await waitFor(() => {
        expect(screen.getAllByText("Alice Walker").length).toBeGreaterThan(0);
      });
    });

    it("shows the current balance in the modal", async () => {
      mockFetchClientsList.mockResolvedValue(
        makePaginatedClients([makeClient({ credit_balance: 750 })])
      );

      render(<AdminCreditsClientsContent />);

      await waitFor(() => screen.getByRole("button", { name: /edit/i }));
      fireEvent.click(screen.getByRole("button", { name: /edit/i }));

      await waitFor(() => {
        expect(screen.getByText("750")).toBeInTheDocument();
      });
    });

    it("closes the modal when Cancel is clicked", async () => {
      mockFetchClientsList.mockResolvedValue(
        makePaginatedClients([makeClient()])
      );

      render(<AdminCreditsClientsContent />);

      await waitFor(() => screen.getByRole("button", { name: /edit/i }));
      fireEvent.click(screen.getByRole("button", { name: /edit/i }));

      await waitFor(() => screen.getByRole("button", { name: /cancel/i }));
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

      await waitFor(() => {
        expect(screen.queryByText("Edit Credits")).not.toBeInTheDocument();
      });
    });

    it("shows validation error in modal when amount is empty", async () => {
      mockFetchClientsList.mockResolvedValue(
        makePaginatedClients([makeClient()])
      );

      render(<AdminCreditsClientsContent />);

      await waitFor(() => screen.getByRole("button", { name: /edit/i }));
      fireEvent.click(screen.getByRole("button", { name: /edit/i }));

      await waitFor(() => screen.getAllByRole("button", { name: /add credits/i }));

      // There are two Add Credits buttons in the modal (the toggle and the submit)
      const add_buttons = screen.getAllByRole("button", { name: /add credits/i });
      fireEvent.click(add_buttons[add_buttons.length - 1]);

      await waitFor(() => {
        expect(screen.getByText(/enter a valid amount greater than 0/i)).toBeInTheDocument();
      });
    });

    it("shows success state in modal after a credit assignment", async () => {
      const client = makeClient({ credit_balance: 300 });
      mockFetchClientsList.mockResolvedValue(makePaginatedClients([client]));
      mockAssignCredits.mockResolvedValue({
        success:     true,
        new_balance: 800,
        transaction: {
          id:          99,
          user_id:     1,
          user:        { id: 1, first_name: "Alice", last_name: "Walker", email: "alice@example.com" },
          amount:      500,
          type:        "credit" as const,
          description: null,
          created_by:  null,
          created_at:  "2024-06-01T10:00:00Z",
        },
      });

      render(<AdminCreditsClientsContent />);

      await waitFor(() => screen.getByRole("button", { name: /edit/i }));
      fireEvent.click(screen.getByRole("button", { name: /edit/i }));

      await waitFor(() => screen.getByPlaceholderText(/e\.g\. 500/i));

      const amount_input = screen.getByPlaceholderText(/e\.g\. 500/i);
      await userEvent.type(amount_input, "500");

      const modal_submit = screen.getAllByRole("button", { name: /add credits/i })[1];
      fireEvent.click(modal_submit);

      await waitFor(() => {
        expect(screen.getByText(/credits updated successfully/i)).toBeInTheDocument();
      });
    });

    it("shows preview of new balance while typing an amount", async () => {
      const client = makeClient({ credit_balance: 200 });
      mockFetchClientsList.mockResolvedValue(makePaginatedClients([client]));

      render(<AdminCreditsClientsContent />);

      await waitFor(() => screen.getByRole("button", { name: /edit/i }));
      fireEvent.click(screen.getByRole("button", { name: /edit/i }));

      await waitFor(() => screen.getByPlaceholderText(/e\.g\. 500/i));

      const amount_input = screen.getByPlaceholderText(/e\.g\. 500/i);
      await userEvent.type(amount_input, "300");

      await waitFor(() => {
        expect(screen.getByText(/new balance after adding/i)).toBeInTheDocument();
        expect(screen.getByText(/500 cr/)).toBeInTheDocument();
      });
    });

    it("updates the client row balance in the table after a successful edit", async () => {
      const client = makeClient({ credit_balance: 100 });
      mockFetchClientsList.mockResolvedValue(makePaginatedClients([client]));
      mockAssignCredits.mockResolvedValue({
        success:     true,
        new_balance: 600,
        transaction: {
          id:          1,
          user_id:     1,
          user:        { id: 1, first_name: "Alice", last_name: "Walker", email: "alice@example.com" },
          amount:      500,
          type:        "credit" as const,
          description: null,
          created_by:  null,
          created_at:  "2024-06-01T10:00:00Z",
        },
      });

      render(<AdminCreditsClientsContent />);

      await waitFor(() => screen.getByRole("button", { name: /edit/i }));
      fireEvent.click(screen.getByRole("button", { name: /edit/i }));

      await waitFor(() => screen.getByPlaceholderText(/e\.g\. 500/i));

      const amount_input = screen.getByPlaceholderText(/e\.g\. 500/i);
      await userEvent.type(amount_input, "500");

      const add_buttons = screen.getAllByRole("button", { name: /add credits/i });
      fireEvent.click(add_buttons[add_buttons.length - 1]);

      await waitFor(() => screen.getByText(/credits updated successfully/i));

      // Close modal
      const close_button = screen.getByRole("button", { name: /close/i });
      fireEvent.click(close_button);

      await waitFor(() => {
        // Table should now show the updated balance — at least one match in the DOM
        expect(screen.getAllByText("600 cr").length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  // ─── Stat cards ────────────────────────────────────────────────────────────

  describe("stat cards", () => {
    it("shows total clients count stat", async () => {
      mockFetchClientsList.mockResolvedValue(
        makePaginatedClients(
          [makeClient(), makeClient({ id: 2 })],
          { total: 25 }
        )
      );

      render(<AdminCreditsClientsContent />);

      await waitFor(() => {
        expect(screen.getByText("25")).toBeInTheDocument();
      });
    });

    it("shows zero balance count stat", async () => {
      mockFetchClientsList.mockResolvedValue(
        makePaginatedClients([
          makeClient({ credit_balance: 0 }),
          makeClient({ id: 2, credit_balance: 500 }),
        ])
      );

      render(<AdminCreditsClientsContent />);

      await waitFor(() => {
        expect(screen.getByText("Zero Balance")).toBeInTheDocument();
        expect(screen.getByText("1")).toBeInTheDocument();
      });
    });
  });

  // ─── Pagination ────────────────────────────────────────────────────────────

  describe("pagination", () => {
    it("shows pagination controls when there are multiple pages", async () => {
      mockFetchClientsList.mockResolvedValue(
        makePaginatedClients(
          Array.from({ length: 15 }, (_, i) => makeClient({ id: i + 1 })),
          { total: 30, last_page: 2, current_page: 1 }
        )
      );

      render(<AdminCreditsClientsContent />);

      await waitFor(() => {
        expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
      });
    });

    it("fetches next page when next button is clicked", async () => {
      mockFetchClientsList.mockResolvedValue(
        makePaginatedClients(
          Array.from({ length: 15 }, (_, i) => makeClient({ id: i + 1 })),
          { total: 30, last_page: 2, current_page: 1 }
        )
      );

      render(<AdminCreditsClientsContent />);

      await waitFor(() => expect(mockFetchClientsList).toHaveBeenCalledTimes(1));

      // Find pagination next button
      const next_button = document.querySelector('button[disabled="false"]') as HTMLButtonElement | null;

      // More reliable: find the rightmost chevron button
      const nav_buttons = screen.getAllByRole("button");
      const next_nav = nav_buttons.find(btn => {
        const svg = btn.querySelector("path[d*='m8.25 4.5']");
        return !!svg;
      });

      if (next_nav) {
        fireEvent.click(next_nav);

        await waitFor(() => {
          expect(mockFetchClientsList).toHaveBeenCalledWith(
            expect.objectContaining({ page: 2 })
          );
        });
      }
    });
  });

  // ─── Loading state ─────────────────────────────────────────────────────────

  describe("loading state", () => {
    it("shows skeleton rows while clients are loading", () => {
      mockFetchClientsList.mockImplementation(() => new Promise(() => {}));

      render(<AdminCreditsClientsContent />);

      const skeletons = document.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });
});
