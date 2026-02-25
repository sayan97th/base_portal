export type Permission = "orders" | "tickets" | "invoices";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "owner" | "member";
  permissions: Permission[];
}

export interface Team {
  id: string;
  name: string;
  members: TeamMember[];
}
