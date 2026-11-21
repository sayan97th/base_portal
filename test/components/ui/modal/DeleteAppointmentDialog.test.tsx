import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DeleteAppointmentDialog, {
  formatAppointmentDate,
} from "@/components/ui/modal/DeleteAppointmentDialog";

describe("DeleteAppointmentDialog", () => {
  it("shows the appointment reference, client, status and date", () => {
    render(
      <DeleteAppointmentDialog
        is_open
        appointment_type="SME appointment"
        appointment_id={42}
        client_name="Jane Doe"
        status_label="Scheduled"
        scheduled_at="2026-03-10T15:30:00Z"
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByRole("alertdialog", { name: "Delete appointment" })).toBeInTheDocument();
    expect(screen.getByText("SME appointment")).toBeInTheDocument();
    expect(screen.getByText("#42 · Jane Doe")).toBeInTheDocument();
    expect(screen.getByText(/^Scheduled · Mar 10, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/does not cancel the meeting in Calendly/)).toBeInTheDocument();
  });

  it("falls back gracefully when client and date are missing", () => {
    render(
      <DeleteAppointmentDialog
        is_open
        appointment_type="Scheduled call"
        appointment_id={7}
        client_name=""
        scheduled_at={null}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText("#7")).toBeInTheDocument();
    expect(screen.getByText("Not scheduled yet")).toBeInTheDocument();
  });

  it("forwards confirm and close actions", async () => {
    const on_confirm = jest.fn();
    const on_close = jest.fn();
    render(
      <DeleteAppointmentDialog
        is_open
        appointment_type="SEO package appointment"
        appointment_id={1}
        onConfirm={on_confirm}
        onClose={on_close}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Delete appointment" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(on_confirm).toHaveBeenCalledTimes(1);
    expect(on_close).toHaveBeenCalledTimes(1);
  });

  it("formats invalid or empty dates as null", () => {
    expect(formatAppointmentDate(null)).toBeNull();
    expect(formatAppointmentDate("not a date")).toBeNull();
  });
});
