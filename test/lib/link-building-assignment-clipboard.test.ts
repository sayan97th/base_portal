/**
 * Copy and paste of the Client Account and Assigned To cells of the link building
 * orders grid: a copy writes the name the cell shows, a paste resolves it back.
 */

import {
  getAssignmentCellText,
  isAssignmentColumnKey,
  resolveAssignmentPasteValue,
  type AssignmentUserLists,
} from "@/lib/link-building-assignment-clipboard";

const users: AssignmentUserLists = {
  client_users: [
    { id: 10, name: "Tyler Smith", email: "tyler@acme.com", avatar_url: null, company: "Acme Corp" },
    { id: 11, name: "Jane Doe", email: "jane@globex.com", avatar_url: null, company: "" },
    { id: 12, name: "Sam Lee", email: "sam@acme.com", avatar_url: null, company: "Acme Corp" },
  ],
  admin_users: [
    { id: 1, name: "Abby Allan", email: "abby@base.com", avatar_url: null },
    { id: 2, name: "Tyler Coley", email: "tyler@base.com", avatar_url: null },
  ],
};

describe("isAssignmentColumnKey", () => {
  it("recognizes only the two assignment columns", () => {
    expect(isAssignmentColumnKey("user_id")).toBe(true);
    expect(isAssignmentColumnKey("assigned_admin_user_id")).toBe(true);
    expect(isAssignmentColumnKey("status")).toBe(false);
  });
});

describe("getAssignmentCellText", () => {
  it("shows the client's company, or the name when there is no company", () => {
    expect(getAssignmentCellText("user_id", 10, users)).toBe("Acme Corp");
    expect(getAssignmentCellText("user_id", 11, users)).toBe("Jane Doe");
  });

  it("shows the team member's name", () => {
    expect(getAssignmentCellText("assigned_admin_user_id", 2, users)).toBe("Tyler Coley");
  });

  it("is empty when unassigned or the user is unknown", () => {
    expect(getAssignmentCellText("user_id", null, users)).toBe("");
    expect(getAssignmentCellText("assigned_admin_user_id", 99, users)).toBe("");
  });
});

describe("resolveAssignmentPasteValue", () => {
  it("unassigns on a blank value", () => {
    expect(resolveAssignmentPasteValue("user_id", "  ", users)).toEqual({ status: "resolved", user_id: null });
  });

  it("matches a team member by name ignoring casing and extra spaces", () => {
    expect(resolveAssignmentPasteValue("assigned_admin_user_id", "  abby   ALLAN ", users)).toEqual({
      status: "resolved",
      user_id: 1,
    });
  });

  it("matches by email and by id", () => {
    expect(resolveAssignmentPasteValue("assigned_admin_user_id", "tyler@base.com", users)).toEqual({
      status: "resolved",
      user_id: 2,
    });
    expect(resolveAssignmentPasteValue("user_id", "11", users)).toEqual({ status: "resolved", user_id: 11 });
  });

  it("matches a client account by name when it has no company", () => {
    expect(resolveAssignmentPasteValue("user_id", "Jane Doe", users)).toEqual({ status: "resolved", user_id: 11 });
  });

  it("does not guess when a company belongs to several client accounts", () => {
    expect(resolveAssignmentPasteValue("user_id", "Acme Corp", users)).toEqual({ status: "unmatched" });
  });

  it("reports text matching no user", () => {
    expect(resolveAssignmentPasteValue("assigned_admin_user_id", "Nobody", users)).toEqual({ status: "unmatched" });
  });
});
