/**
 * Delete flow shared by the four admin appointment detail pages. All of them
 * render DeleteAppointmentDialog, so the same scenarios run against each one:
 *
 * - src/components/admin/premium-mentions/AdminPremiumMentionsAppointmentDetail.tsx
 * - src/components/admin/seo-packages-appointments/AdminSeoPackagesAppointmentDetail.tsx
 * - src/components/admin/sme-appointments/AdminSmeAppointmentDetail.tsx
 * - src/components/admin/scheduled-calls/AdminScheduledCallDetail.tsx
 */

import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminPremiumMentionsAppointmentDetail from "@/components/admin/premium-mentions/AdminPremiumMentionsAppointmentDetail";
import AdminSeoPackagesAppointmentDetail from "@/components/admin/seo-packages-appointments/AdminSeoPackagesAppointmentDetail";
import AdminSmeAppointmentDetail from "@/components/admin/sme-appointments/AdminSmeAppointmentDetail";
import AdminScheduledCallDetail from "@/components/admin/scheduled-calls/AdminScheduledCallDetail";

const mock_push = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mock_push, back: jest.fn() }),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// The date picker library needs a real layout engine, a stub is enough here.
jest.mock("flatpickr", () => ({
  __esModule: true,
  default: jest.fn(() => ({ destroy: jest.fn(), setDate: jest.fn() })),
}));

function mockServiceModule(service_name: string) {
  return {
    [service_name]: {
      fetchAppointmentById: jest.fn(),
      updateAppointment: jest.fn(),
      deleteAppointment: jest.fn(),
    },
  };
}

jest.mock("@/services/admin/premium-mentions.service", () =>
  mockServiceModule("adminPremiumMentionsAppointmentService")
);
jest.mock("@/services/admin/seo-packages-appointment.service", () =>
  mockServiceModule("adminSeoPackagesAppointmentService")
);
jest.mock("@/services/admin/sme-appointment.service", () =>
  mockServiceModule("adminSmeAppointmentService")
);
jest.mock("@/services/admin/scheduled-call.service", () =>
  mockServiceModule("adminScheduledCallService")
);

import { adminPremiumMentionsAppointmentService } from "@/services/admin/premium-mentions.service";
import { adminSeoPackagesAppointmentService } from "@/services/admin/seo-packages-appointment.service";
import { adminSmeAppointmentService } from "@/services/admin/sme-appointment.service";
import { adminScheduledCallService } from "@/services/admin/scheduled-call.service";

interface MockedAppointmentService {
  fetchAppointmentById: jest.Mock;
  updateAppointment: jest.Mock;
  deleteAppointment: jest.Mock;
}

const base_appointment = {
  id: 42,
  event_uri: "https://api.calendly.com/scheduled_events/EVT",
  invitee_uri: "https://api.calendly.com/scheduled_events/EVT/invitees/INV",
  status: "pending",
  scheduled_at: "2026-03-10T15:30:00Z",
  created_at: "2026-03-01T10:00:00Z",
  updated_at: "2026-03-01T10:00:00Z",
  notes: "",
  admin_notes: "",
  user: { id: 7, first_name: "Jane", last_name: "Doe", email: "jane@example.com" },
};

interface DetailCase {
  name: string;
  appointment_type: string;
  list_route: string;
  service: MockedAppointmentService;
  appointment: Record<string, unknown>;
  renderPage: () => void;
}

const detail_cases: DetailCase[] = [
  {
    name: "Premium Mentions",
    appointment_type: "Premium Mentions appointment",
    list_route: "/admin/premium-mentions/appointments",
    service: adminPremiumMentionsAppointmentService as unknown as MockedAppointmentService,
    appointment: { ...base_appointment, plan_id: "authority" },
    renderPage: () => render(<AdminPremiumMentionsAppointmentDetail appointment_id={42} />),
  },
  {
    name: "SEO Packages",
    appointment_type: "SEO package appointment",
    list_route: "/admin/seo-packages-appointments",
    service: adminSeoPackagesAppointmentService as unknown as MockedAppointmentService,
    appointment: { ...base_appointment, seo_package_id: "growth" },
    renderPage: () => render(<AdminSeoPackagesAppointmentDetail appointment_id={42} />),
  },
  {
    name: "SME",
    appointment_type: "SME appointment",
    list_route: "/admin/sme-appointments",
    service: adminSmeAppointmentService as unknown as MockedAppointmentService,
    appointment: { ...base_appointment, service_type: "authored", selected_tiers: {} },
    renderPage: () => render(<AdminSmeAppointmentDetail appointment_id={42} />),
  },
  {
    name: "Scheduled Calls",
    appointment_type: "Scheduled call",
    list_route: "/admin/scheduled-calls",
    service: adminScheduledCallService as unknown as MockedAppointmentService,
    appointment: { ...base_appointment },
    renderPage: () => render(<AdminScheduledCallDetail appointment_id={42} />),
  },
];

async function openDeleteDialog() {
  await userEvent.click(await screen.findByRole("button", { name: "Delete" }));
  return screen.getByRole("alertdialog", { name: "Delete appointment" });
}

describe.each(detail_cases)("$name appointment detail delete flow", (detail_case) => {
  beforeEach(() => {
    jest.clearAllMocks();
    detail_case.service.fetchAppointmentById.mockResolvedValue(detail_case.appointment);
  });

  it("previews the appointment and warns about Calendly", async () => {
    detail_case.renderPage();

    const dialog = await openDeleteDialog();

    expect(within(dialog).getByText(detail_case.appointment_type)).toBeInTheDocument();
    expect(within(dialog).getByText("#42 · Jane Doe")).toBeInTheDocument();
    expect(within(dialog).getByText(/^Pending · Mar 10, 2026/)).toBeInTheDocument();
    expect(within(dialog).getByText(/does not cancel the meeting in Calendly/)).toBeInTheDocument();
  });

  it("deletes the appointment and returns to the list", async () => {
    detail_case.service.deleteAppointment.mockResolvedValue(undefined);
    detail_case.renderPage();

    const dialog = await openDeleteDialog();
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete appointment" }));

    expect(detail_case.service.deleteAppointment).toHaveBeenCalledWith(42);
    await waitFor(() => expect(mock_push).toHaveBeenCalledWith(detail_case.list_route));
  });

  it("cancel keeps the appointment", async () => {
    detail_case.renderPage();

    const dialog = await openDeleteDialog();
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(detail_case.service.deleteAppointment).not.toHaveBeenCalled();
    expect(mock_push).not.toHaveBeenCalled();
  });

  it("tells the admin when the deletion fails", async () => {
    detail_case.service.deleteAppointment.mockRejectedValue(new Error("Server error"));
    detail_case.renderPage();

    const dialog = await openDeleteDialog();
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete appointment" }));

    expect(await screen.findByText("Failed to delete appointment. Please try again.")).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(mock_push).not.toHaveBeenCalled();
  });
});
