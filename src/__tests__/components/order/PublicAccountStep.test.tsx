import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PublicAccountStep from "@/components/order/PublicAccountStep";
import type { ApiError } from "@/types/auth";

// ─── Module mocks ────────────────────────────────────────────────────────────

jest.mock("@/context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("next/link", () => {
  const Link = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  Link.displayName = "Link";
  return Link;
});

import { useAuth } from "@/context/AuthContext";

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

function buildAuthContext(overrides: Partial<ReturnType<typeof useAuth>> = {}): ReturnType<typeof useAuth> {
  return {
    user: null,
    permissions: [],
    isAuthenticated: false,
    isLoading: false,
    isStaff: false,
    isAdmin: false,
    hasRole: jest.fn().mockReturnValue(false),
    hasPermission: jest.fn().mockReturnValue(false),
    login: jest.fn(),
    loginWithTwoFactor: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    refreshUser: jest.fn(),
    ...overrides,
  } as ReturnType<typeof useAuth>;
}

// "Create Account" also labels the register/login tab switcher, so a plain
// role+name query is ambiguous — narrow to the form's submit button.
function getSubmitButton(name: string) {
  return screen.getAllByRole("button", { name }).find((btn) => btn.getAttribute("type") === "submit")!;
}

async function fillValidForm() {
  fireEvent.change(screen.getByPlaceholderText("First Name"), { target: { value: "Guest" } });
  fireEvent.change(screen.getByPlaceholderText("Last Name"), { target: { value: "Tester" } });
  fireEvent.change(screen.getByPlaceholderText("Email Address"), {
    target: { value: "guest@example.com" },
  });
  fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "Password123!" } });
  fireEvent.change(screen.getByPlaceholderText("Verify Password"), {
    target: { value: "Password123!" },
  });
  fireEvent.click(screen.getByRole("checkbox"));
}

describe("PublicAccountStep", () => {
  const on_next = jest.fn();
  const on_back = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows a loading spinner and does not render the form while auth state is resolving", () => {
    mockUseAuth.mockReturnValue(buildAuthContext({ isLoading: true }));
    render(<PublicAccountStep onNext={on_next} onBack={on_back} />);

    expect(screen.queryByRole("heading", { name: "Create Account" })).not.toBeInTheDocument();
    expect(on_next).not.toHaveBeenCalled();
  });

  it("auto-advances to the next step without rendering the form when already authenticated", async () => {
    mockUseAuth.mockReturnValue(buildAuthContext({ isLoading: false, isAuthenticated: true }));
    render(<PublicAccountStep onNext={on_next} onBack={on_back} />);

    await waitFor(() => expect(on_next).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("heading", { name: "Create Account" })).not.toBeInTheDocument();
  });

  it("renders the registration form when not authenticated", () => {
    mockUseAuth.mockReturnValue(buildAuthContext());
    render(<PublicAccountStep onNext={on_next} onBack={on_back} />);

    expect(screen.getByRole("heading", { name: "Create Account" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("First Name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Last Name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email Address")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Verify Password")).toBeInTheDocument();
    expect(screen.getByText("Continue with Google")).toBeInTheDocument();
    expect(on_next).not.toHaveBeenCalled();
  });

  it("disables the Facebook button instead of pretending it works", () => {
    mockUseAuth.mockReturnValue(buildAuthContext());
    render(<PublicAccountStep onNext={on_next} onBack={on_back} />);

    expect(screen.getByText("Continue with Facebook").closest("button")).toBeDisabled();
  });

  it("blocks submission and shows an error when the terms checkbox is unchecked", async () => {
    const register = jest.fn();
    mockUseAuth.mockReturnValue(buildAuthContext({ register }));
    render(<PublicAccountStep onNext={on_next} onBack={on_back} />);

    fireEvent.change(screen.getByPlaceholderText("First Name"), { target: { value: "Guest" } });
    fireEvent.change(screen.getByPlaceholderText("Last Name"), { target: { value: "Tester" } });
    fireEvent.change(screen.getByPlaceholderText("Email Address"), {
      target: { value: "guest@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "Password123!" } });
    fireEvent.change(screen.getByPlaceholderText("Verify Password"), {
      target: { value: "Password123!" },
    });
    // Terms checkbox intentionally left unchecked.
    fireEvent.click(getSubmitButton("Create Account"));

    await waitFor(() =>
      expect(
        screen.getByText("You must agree to the Terms of Service and Privacy Policy.")
      ).toBeInTheDocument()
    );
    expect(register).not.toHaveBeenCalled();
    expect(on_next).not.toHaveBeenCalled();
  });

  it("submits the registration payload and advances on success", async () => {
    const register = jest.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue(buildAuthContext({ register }));
    render(<PublicAccountStep onNext={on_next} onBack={on_back} />);

    await fillValidForm();
    fireEvent.click(getSubmitButton("Create Account"));

    await waitFor(() => expect(on_next).toHaveBeenCalledTimes(1));
    expect(register).toHaveBeenCalledWith({
      first_name: "Guest",
      last_name: "Tester",
      email: "guest@example.com",
      password: "Password123!",
      password_confirmation: "Password123!",
    });
  });

  it("surfaces field-level API errors and does not advance on a failed registration", async () => {
    const api_error: ApiError = {
      message: "The given data was invalid.",
      errors: { email: ["The email has already been taken."] },
    };
    const register = jest.fn().mockRejectedValue(api_error);
    mockUseAuth.mockReturnValue(buildAuthContext({ register }));
    render(<PublicAccountStep onNext={on_next} onBack={on_back} />);

    await fillValidForm();
    fireEvent.click(getSubmitButton("Create Account"));

    await waitFor(() =>
      expect(screen.getByText("The email has already been taken.")).toBeInTheDocument()
    );
    expect(screen.getByText("The given data was invalid.")).toBeInTheDocument();
    expect(on_next).not.toHaveBeenCalled();
  });

  it("calls onBack with the configured back_label when the back link is clicked", () => {
    mockUseAuth.mockReturnValue(buildAuthContext());
    render(<PublicAccountStep onNext={on_next} onBack={on_back} back_label="Back to Order Review" />);

    fireEvent.click(screen.getByText("Back to Order Review"));
    expect(on_back).toHaveBeenCalledTimes(1);
  });

  it("switches to the inline sign-in form without navigating away from the wizard", () => {
    mockUseAuth.mockReturnValue(buildAuthContext());
    render(<PublicAccountStep onNext={on_next} onBack={on_back} />);

    // Before switching, the tab is the only "Sign In" element on screen.
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    expect(screen.getByRole("heading", { name: "Welcome Back" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email Address")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    // Now the tab and the form's submit button both read "Sign In".
    expect(getSubmitButton("Sign In")).toBeInTheDocument();
  });
});
