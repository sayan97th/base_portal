/**
 * Remove member and delete team flows of the admin team detail page
 * (src/components/admin/teams/AdminTeamDetail.tsx).
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminTeamDetail from "@/components/admin/teams/AdminTeamDetail";
import type { AdminTeamDetail as TeamDetail, AdminTeamMember } from "@/types/admin/teams";

const mock_push = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mock_push }),
}));

jest.mock("@/services/admin/teams.service", () => ({
  getAdminTeam: jest.fn(),
  removeAdminTeamMember: jest.fn(),
  addAdminTeamMember: jest.fn(),
  updateAdminTeamMemberRole: jest.fn(),
  deleteAdminTeam: jest.fn(),
  fetchStaffUsersForTeam: jest.fn().mockResolvedValue([]),
}));

import {
  deleteAdminTeam,
  getAdminTeam,
  removeAdminTeamMember,
} from "@/services/admin/teams.service";

const mock_get = getAdminTeam as jest.MockedFunction<typeof getAdminTeam>;
const mock_remove = removeAdminTeamMember as jest.MockedFunction<typeof removeAdminTeamMember>;
const mock_delete = deleteAdminTeam as jest.MockedFunction<typeof deleteAdminTeam>;

function makeMember(overrides: Partial<AdminTeamMember> = {}): AdminTeamMember {
  return {
    id: 10,
    first_name: "Jane",
    last_name: "Doe",
    email: "jane@example.com",
    job_title: null,
    profile_photo_url: null,
    role: "member",
    joined_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeTeam(members: AdminTeamMember[]): TeamDetail {
  return {
    id: "team-1",
    name: "Marketing",
    description: null,
    color: "#3B82F6",
    is_active: true,
    created_by: 1,
    members_count: members.length,
    creator: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    members,
  };
}

describe("AdminTeamDetail remove member flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mock_get.mockResolvedValue(
      makeTeam([makeMember(), makeMember({ id: 11, first_name: "John", last_name: "Smith", email: "john@example.com" })])
    );
  });

  async function openRemoveDialogForFirstMember() {
    const remove_buttons = await screen.findAllByTitle("Remove member");
    await userEvent.click(remove_buttons[0]);
    return screen.getByRole("alertdialog", { name: "Remove member" });
  }

  it("uses the remove variant with the member preview", async () => {
    render(<AdminTeamDetail team_id="team-1" />);

    const dialog = await openRemoveDialogForFirstMember();

    expect(within(dialog).getByText("Jane Doe")).toBeInTheDocument();
    expect(within(dialog).getByText("jane@example.com")).toBeInTheDocument();
    expect(within(dialog).queryByText(/cannot be undone/i)).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Remove member" })).toBeInTheDocument();
  });

  it("removes the member from the list", async () => {
    mock_remove.mockResolvedValue(undefined);
    render(<AdminTeamDetail team_id="team-1" />);

    const dialog = await openRemoveDialogForFirstMember();
    await userEvent.click(within(dialog).getByRole("button", { name: "Remove member" }));

    expect(mock_remove).toHaveBeenCalledWith("team-1", 10);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(screen.queryByText("jane@example.com")).not.toBeInTheDocument();
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
  });

  it("keeps the member when the API fails", async () => {
    mock_remove.mockRejectedValue(new Error("Server error"));
    render(<AdminTeamDetail team_id="team-1" />);

    const dialog = await openRemoveDialogForFirstMember();
    await userEvent.click(within(dialog).getByRole("button", { name: "Remove member" }));

    expect(await screen.findByText("Failed to remove member.")).toBeInTheDocument();
    expect(screen.getAllByText("jane@example.com").length).toBeGreaterThan(0);
  });
});

describe("AdminTeamDetail delete team flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  async function openDeleteTeamDialog() {
    await userEvent.click(await screen.findByRole("button", { name: "Delete" }));
    return screen.getByRole("alertdialog", { name: "Delete team" });
  }

  it("requires the team name when there are members and redirects after deleting", async () => {
    mock_get.mockResolvedValue(makeTeam([makeMember()]));
    mock_delete.mockResolvedValue(undefined);
    render(<AdminTeamDetail team_id="team-1" />);

    const dialog = await openDeleteTeamDialog();
    const confirm_button = within(dialog).getByRole("button", { name: "Delete team" });

    expect(within(dialog).getByText("1 member")).toBeInTheDocument();
    expect(confirm_button).toBeDisabled();

    await userEvent.type(within(dialog).getByLabelText(/to confirm/i), "Marketing");
    await userEvent.click(confirm_button);

    expect(mock_delete).toHaveBeenCalledWith("team-1");
    await waitFor(() => expect(mock_push).toHaveBeenCalledWith("/admin/teams"));
  });

  it("deletes an empty team without typing", async () => {
    mock_get.mockResolvedValue(makeTeam([]));
    mock_delete.mockResolvedValue(undefined);
    render(<AdminTeamDetail team_id="team-1" />);

    const dialog = await openDeleteTeamDialog();
    expect(within(dialog).queryByLabelText(/to confirm/i)).not.toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole("button", { name: "Delete team" }));

    expect(mock_delete).toHaveBeenCalledWith("team-1");
  });

  it("stays on the page and unlocks the dialog when the API fails", async () => {
    mock_get.mockResolvedValue(makeTeam([]));
    mock_delete.mockRejectedValue(new Error("Server error"));
    render(<AdminTeamDetail team_id="team-1" />);

    const dialog = await openDeleteTeamDialog();
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete team" }));

    expect(await screen.findByText("Failed to delete team.")).toBeInTheDocument();
    expect(mock_push).not.toHaveBeenCalled();
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeEnabled();
  });
});
