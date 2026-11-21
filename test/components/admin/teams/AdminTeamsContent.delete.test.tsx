/**
 * Delete flow of the admin teams list (src/components/admin/teams/AdminTeamsContent.tsx).
 * Teams that still have members require typing the team name before deleting.
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminTeamsContent from "@/components/admin/teams/AdminTeamsContent";
import type { AdminTeam } from "@/types/admin/teams";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/services/admin/teams.service", () => ({
  listAdminTeams: jest.fn(),
  deleteAdminTeam: jest.fn(),
  toggleAdminTeamStatus: jest.fn(),
}));

import { deleteAdminTeam, listAdminTeams } from "@/services/admin/teams.service";

const mock_list = listAdminTeams as jest.MockedFunction<typeof listAdminTeams>;
const mock_delete = deleteAdminTeam as jest.MockedFunction<typeof deleteAdminTeam>;

function makeTeam(overrides: Partial<AdminTeam> = {}): AdminTeam {
  return {
    id: "team-1",
    name: "Marketing",
    description: "Outreach team",
    color: "#3B82F6",
    is_active: true,
    created_by: 1,
    members_count: 3,
    creator: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function mockTeams(teams: AdminTeam[]) {
  mock_list.mockResolvedValue({
    data: teams,
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: teams.length,
  } as Awaited<ReturnType<typeof listAdminTeams>>);
}

async function openDeleteDialog(team_index = 0) {
  const delete_buttons = await screen.findAllByTitle("Delete team");
  await userEvent.click(delete_buttons[team_index]);
  return screen.getByRole("alertdialog", { name: "Delete team" });
}

describe("AdminTeamsContent delete flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requires typing the team name when the team has members", async () => {
    mockTeams([makeTeam()]);
    mock_delete.mockResolvedValue(undefined);
    render(<AdminTeamsContent />);

    const dialog = await openDeleteDialog();
    const confirm_button = within(dialog).getByRole("button", { name: "Delete team" });

    expect(within(dialog).getByText("3 members")).toBeInTheDocument();
    expect(within(dialog).getByText("All members will be removed from this team.")).toBeInTheDocument();
    expect(confirm_button).toBeDisabled();

    await userEvent.type(within(dialog).getByLabelText(/to confirm/i), "marketing");
    expect(confirm_button).toBeDisabled();

    await userEvent.clear(within(dialog).getByLabelText(/to confirm/i));
    await userEvent.type(within(dialog).getByLabelText(/to confirm/i), "Marketing");
    expect(confirm_button).toBeEnabled();

    await userEvent.click(confirm_button);
    expect(mock_delete).toHaveBeenCalledWith("team-1");
  });

  it("does not require typing for empty teams", async () => {
    mockTeams([makeTeam({ members_count: 0 })]);
    mock_delete.mockResolvedValue(undefined);
    render(<AdminTeamsContent />);

    const dialog = await openDeleteDialog();

    expect(within(dialog).queryByLabelText(/to confirm/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/All members will be removed/)).not.toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole("button", { name: "Delete team" }));
    expect(mock_delete).toHaveBeenCalledWith("team-1");
  });

  it("reloads the list and confirms the deletion", async () => {
    mockTeams([makeTeam({ members_count: 0 })]);
    mock_delete.mockResolvedValue(undefined);
    render(<AdminTeamsContent />);

    const dialog = await openDeleteDialog();
    mockTeams([]);
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete team" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(await screen.findByText('Team "Marketing" deleted.')).toBeInTheDocument();
    expect(mock_list).toHaveBeenCalledTimes(2);
  });

  it("closes with Escape without deleting", async () => {
    mockTeams([makeTeam()]);
    render(<AdminTeamsContent />);

    await openDeleteDialog();
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(mock_delete).not.toHaveBeenCalled();
  });

  it("shows an error when the API fails", async () => {
    mockTeams([makeTeam({ members_count: 0 })]);
    mock_delete.mockRejectedValue(new Error("Server error"));
    render(<AdminTeamsContent />);

    const dialog = await openDeleteDialog();
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete team" }));

    expect(await screen.findByText("Failed to delete team.")).toBeInTheDocument();
  });
});
