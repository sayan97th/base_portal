/**
 * Tests for the ClientAssignCell component.
 *
 * Key invariant verified here: the company name is always the primary identifier
 * shown in the table cell. The contact person's name appears only as a secondary
 * label when a company is present, and never as the primary label on its own.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ClientAssignCell from "@/components/admin/dashboard/ClientAssignCell";
import type { ClientUserOption } from "@/services/admin/link-building-dashboard.service";

// Mock ClientSearchableSelect so the dropdown portal never mounts in jsdom.
jest.mock(
  "@/components/admin/dashboard/ClientSearchableSelect",
  () =>
    function MockClientSearchableSelect() {
      return <div data-testid="client-searchable-select" />;
    }
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeClient(overrides: Partial<ClientUserOption> = {}): ClientUserOption {
  return {
    id:         1,
    name:       "Tyler Smith",
    email:      "tyler@acme.com",
    avatar_url: null,
    company:    "Acme Corp",
    ...overrides,
  };
}

function renderCell(props: Partial<React.ComponentProps<typeof ClientAssignCell>> = {}) {
  const defaults = {
    user_id:        null,
    client_users:   [] as ClientUserOption[],
    is_editing:     false,
    onStartEdit:    jest.fn(),
    onAssignClient: jest.fn(),
    onCancelEdit:   jest.fn(),
  };

  // ClientAssignCell renders a <> fragment (td + optional portal).
  // Wrap in a <table><tbody><tr> to keep the DOM valid.
  return render(
    <table>
      <tbody>
        <tr>
          <ClientAssignCell {...defaults} {...props} />
        </tr>
      </tbody>
    </table>
  );
}

// ─── Company name as primary identifier ──────────────────────────────────────

describe("client display name — company over contact person", () => {
  it("shows company name as the primary label when company is set", () => {
    const client = makeClient({ company: "Acme Corp", name: "Tyler Smith" });

    renderCell({ user_id: 1, client_users: [client] });

    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("shows contact name as a secondary label when company is set", () => {
    const client = makeClient({ company: "Acme Corp", name: "Tyler Smith" });

    renderCell({ user_id: 1, client_users: [client] });

    // Both labels visible: company primary, contact secondary
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("Tyler Smith")).toBeInTheDocument();
  });

  it("does NOT show company name as secondary label (avoids duplication)", () => {
    const client = makeClient({ company: "Acme Corp", name: "Tyler Smith" });

    renderCell({ user_id: 1, client_users: [client] });

    // "Acme Corp" appears exactly once — as the primary label only
    const matches = screen.getAllByText("Acme Corp");
    expect(matches).toHaveLength(1);
  });

  it("shows contact name as the only label when company is empty", () => {
    const client = makeClient({ company: "", name: "Jane Doe" });

    renderCell({ user_id: 1, client_users: [client] });

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
  });

  it("does not show a secondary contact-name span when company is empty", () => {
    const client = makeClient({ company: "", name: "Jane Doe" });

    renderCell({ user_id: 1, client_users: [client] });

    // "Jane Doe" appears exactly once — no secondary duplicate
    const matches = screen.getAllByText("Jane Doe");
    expect(matches).toHaveLength(1);
  });

  it("uses company initial for the avatar fallback when company is set", () => {
    const client = makeClient({ company: "Acme Corp", name: "Tyler Smith", avatar_url: null });

    renderCell({ user_id: 1, client_users: [client] });

    // Avatar initial should be "A" (first letter of "Acme Corp"), not "T" for Tyler
    const avatar_span = screen.getByText("A");
    expect(avatar_span).toBeInTheDocument();
  });

  it("uses contact initial for the avatar fallback when company is empty", () => {
    const client = makeClient({ company: "", name: "Jane Doe", avatar_url: null });

    renderCell({ user_id: 1, client_users: [client] });

    expect(screen.getByText("J")).toBeInTheDocument();
  });

  it("renders the avatar image when avatar_url is provided", () => {
    const client = makeClient({
      company:    "Acme Corp",
      name:       "Tyler Smith",
      avatar_url: "https://cdn.example.com/tyler.jpg",
    });

    renderCell({ user_id: 1, client_users: [client] });

    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://cdn.example.com/tyler.jpg");
    expect(img).toHaveAttribute("alt", "Tyler Smith");
  });
});

// ─── Unassigned state ─────────────────────────────────────────────────────────

describe("unassigned state", () => {
  it("shows the unassigned placeholder when user_id is null", () => {
    renderCell({ user_id: null, client_users: [makeClient()] });

    expect(screen.getByText("— Unassigned —")).toBeInTheDocument();
  });

  it("shows the unassigned placeholder when user_id does not match any client", () => {
    const client = makeClient({ id: 99 });

    renderCell({ user_id: 1, client_users: [client] });

    expect(screen.getByText("— Unassigned —")).toBeInTheDocument();
  });
});

// ─── Interaction ──────────────────────────────────────────────────────────────

describe("cell interaction", () => {
  it("calls onStartEdit when the cell is clicked in display mode", () => {
    const on_start_edit = jest.fn();

    renderCell({
      is_editing:  false,
      onStartEdit: on_start_edit,
      client_users: [makeClient()],
    });

    fireEvent.click(screen.getByTitle("Click to assign a client account"));

    expect(on_start_edit).toHaveBeenCalledTimes(1);
  });

  it("does not call onStartEdit when already in editing mode", () => {
    const on_start_edit = jest.fn();

    renderCell({
      is_editing:   true,
      user_id:      1,
      client_users: [makeClient()],
      onStartEdit:  on_start_edit,
    });

    fireEvent.click(screen.getByTitle("Click to assign a client account"));

    expect(on_start_edit).not.toHaveBeenCalled();
  });

  it("renders the searchable select dropdown when is_editing is true", () => {
    renderCell({
      is_editing:   true,
      user_id:      1,
      client_users: [makeClient()],
    });

    expect(screen.getByTestId("client-searchable-select")).toBeInTheDocument();
  });

  it("does not render the searchable select dropdown when is_editing is false", () => {
    renderCell({
      is_editing:   false,
      user_id:      1,
      client_users: [makeClient()],
    });

    expect(screen.queryByTestId("client-searchable-select")).not.toBeInTheDocument();
  });
});
