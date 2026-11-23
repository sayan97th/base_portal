/**
 * Tests for the instant coupon status control
 * (src/components/admin/coupons/status/CouponStatusControl.tsx).
 *
 * The control must let an admin disable a coupon at any time, save the change
 * on its own (without the Save Changes button), roll back on failure, and
 * render its picker where nothing can clip it: a portal on desktop that flips
 * above the cell near the bottom of the screen, and a bottom sheet on phones.
 */

import React, { useState } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import CouponStatusControl, {
  type CouponStatusControlProps,
} from "@/components/admin/coupons/status/CouponStatusControl";
import type { Coupon } from "@/types/admin/coupons";

jest.mock("@/services/admin/coupons.service", () => ({
  toggleAdminCouponStatus: jest.fn(),
}));

import { toggleAdminCouponStatus } from "@/services/admin/coupons.service";

const mock_toggle = toggleAdminCouponStatus as jest.MockedFunction<typeof toggleAdminCouponStatus>;

const original_match_media = window.matchMedia;

function makeCoupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    id: "coupon-1",
    code: "TESTLAUNCH100",
    name: "Test Launch Special",
    description: null,
    discount_type: "fixed_amount",
    discount_value: 100,
    applies_to: "minimum_purchase",
    product_types: [],
    dr_tier_ids: [],
    dr_tiers: [],
    minimum_purchase_amount: 800,
    max_discount_amount: null,
    starts_at: null,
    expires_at: null,
    usage_limit: 50,
    usage_per_user: null,
    times_used: 0,
    is_active: true,
    created_at: "2026-11-01T00:00:00+00:00",
    updated_at: "2026-11-01T00:00:00+00:00",
    ...overrides,
  };
}

/** Mirrors the edit page: the parent keeps the saved coupon and passes it back down. */
function Harness({
  initial_is_active = true,
  starts_at = null,
  expires_at = null,
  variant,
  onStatusSaved,
}: {
  initial_is_active?: boolean;
  starts_at?: string | null;
  expires_at?: string | null;
  variant?: CouponStatusControlProps["variant"];
  onStatusSaved?: (coupon: Coupon) => void;
}) {
  const [is_active, setIsActive] = useState(initial_is_active);
  return (
    <CouponStatusControl
      coupon_id="coupon-1"
      coupon_code="TESTLAUNCH100"
      is_active={is_active}
      starts_at={starts_at}
      expires_at={expires_at}
      variant={variant}
      onStatusSaved={(coupon) => {
        setIsActive(coupon.is_active);
        onStatusSaved?.(coupon);
      }}
    />
  );
}

function getTrigger(): HTMLElement {
  return screen.getByRole("button", { name: /change status/i });
}

function openMenu(): HTMLElement {
  fireEvent.click(getTrigger());
  return screen.getByRole("menu");
}

function mockMobileViewport(matches: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: matches && query.includes("max-width"),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockMobileViewport(false);
});

afterEach(() => {
  window.matchMedia = original_match_media;
  document.body.style.overflow = "";
});

// ── Status display ───────────────────────────────────────────────────────────

describe("status display", () => {
  it("shows Active with its description for an enabled coupon without dates", () => {
    render(<Harness />);

    expect(getTrigger()).toHaveTextContent("Active");
    expect(screen.getByText("Live. Clients can apply this coupon at checkout.")).toBeInTheDocument();
  });

  it("shows Disabled for an inactive coupon", () => {
    render(<Harness initial_is_active={false} />);

    expect(getTrigger()).toHaveTextContent("Disabled");
  });

  it("shows Expired when the coupon is enabled but its end date has passed", () => {
    render(<Harness expires_at="2000-01-01" />);

    expect(getTrigger()).toHaveTextContent("Expired");
    expect(screen.getByText(/its end date has passed/i)).toBeInTheDocument();
  });

  it("shows Scheduled when the coupon starts in the future", () => {
    render(<Harness starts_at="2999-01-01" />);

    expect(getTrigger()).toHaveTextContent("Scheduled");
  });

  it("hides the description in the compact variant", () => {
    render(<Harness variant="compact" />);

    expect(getTrigger()).toHaveTextContent("Active");
    expect(screen.queryByText(/Clients can apply this coupon/)).not.toBeInTheDocument();
  });
});

// ── Picker menu ──────────────────────────────────────────────────────────────

describe("picker menu", () => {
  it("renders the menu in a portal on document.body so cards cannot clip it", () => {
    const { container } = render(<Harness />);

    const menu = openMenu();

    expect(menu.parentElement).toBe(document.body);
    expect(container.contains(menu)).toBe(false);
    expect(getTrigger()).toHaveAttribute("aria-expanded", "true");
  });

  it("marks the current status and focuses it when opened", () => {
    render(<Harness />);
    openMenu();

    const enabled_option = screen.getByRole("menuitemradio", { name: "Enabled" });
    expect(enabled_option).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("menuitemradio", { name: "Disabled" })).toHaveAttribute("aria-checked", "false");
    expect(enabled_option).toHaveFocus();
  });

  it("moves focus between options with the arrow keys", () => {
    render(<Harness />);
    const menu = openMenu();

    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(screen.getByRole("menuitemradio", { name: "Disabled" })).toHaveFocus();

    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(screen.getByRole("menuitemradio", { name: "Enabled" })).toHaveFocus();

    fireEvent.keyDown(menu, { key: "ArrowUp" });
    expect(screen.getByRole("menuitemradio", { name: "Disabled" })).toHaveFocus();
  });

  it("closes with Escape and returns focus to the status cell", () => {
    render(<Harness />);
    openMenu();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(getTrigger()).toHaveFocus();
  });

  it("closes when clicking outside", () => {
    render(
      <div>
        <Harness />
        <p>Outside</p>
      </div>
    );
    openMenu();

    fireEvent.pointerDown(screen.getByText("Outside"));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("toggles closed when the status cell is clicked again", () => {
    render(<Harness />);
    openMenu();

    fireEvent.click(getTrigger());

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens below the cell when there is room", () => {
    render(<Harness />);
    jest.spyOn(getTrigger(), "getBoundingClientRect").mockReturnValue({
      top: 100, bottom: 140, left: 500, right: 668, width: 168, height: 40, x: 500, y: 100, toJSON: () => ({}),
    });

    const menu = openMenu();

    expect(menu).toHaveAttribute("data-placement", "bottom");
    expect(menu).toHaveAttribute("data-ready", "true");
    expect(menu.style.top).toBe("150px");
  });

  it("flips above the cell when it sits at the bottom of the screen", () => {
    render(<Harness />);
    const viewport_height = window.innerHeight;
    jest.spyOn(getTrigger(), "getBoundingClientRect").mockReturnValue({
      top: viewport_height - 30,
      bottom: viewport_height - 2,
      left: 500, right: 668, width: 168, height: 28, x: 500, y: viewport_height - 30, toJSON: () => ({}),
    });

    const menu = openMenu();

    expect(menu).toHaveAttribute("data-placement", "top");
  });
});

// ── Saving ───────────────────────────────────────────────────────────────────

describe("saving the status", () => {
  it("disables the coupon right away and notifies the parent", async () => {
    const on_status_saved = jest.fn();
    mock_toggle.mockResolvedValueOnce(makeCoupon({ is_active: false }));
    render(<Harness onStatusSaved={on_status_saved} />);

    openMenu();
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Disabled" }));

    expect(mock_toggle).toHaveBeenCalledWith("coupon-1", false);
    await waitFor(() => expect(screen.getByText("Coupon disabled")).toBeInTheDocument());
    expect(on_status_saved).toHaveBeenCalledWith(expect.objectContaining({ is_active: false }));
    expect(getTrigger()).toHaveTextContent("Disabled");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("shows the new status and blocks the cell while the request is in flight", async () => {
    const request = deferred<Coupon>();
    mock_toggle.mockReturnValueOnce(request.promise);
    render(<Harness />);

    openMenu();
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Disabled" }));

    expect(getTrigger()).toBeDisabled();
    expect(getTrigger()).toHaveAttribute("aria-busy", "true");
    expect(getTrigger()).toHaveTextContent("Disabled");
    expect(screen.getByText("Saving...")).toBeInTheDocument();

    await act(async () => request.resolve(makeCoupon({ is_active: false })));

    expect(getTrigger()).not.toBeDisabled();
  });

  it("does not call the API when the current status is selected", () => {
    render(<Harness />);

    openMenu();
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Enabled" }));

    expect(mock_toggle).not.toHaveBeenCalled();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("rolls back and shows the error when the request fails", async () => {
    const on_status_saved = jest.fn();
    mock_toggle.mockRejectedValueOnce({ message: "Coupon not found." });
    render(<Harness onStatusSaved={on_status_saved} />);

    openMenu();
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Disabled" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Coupon not found.");
    expect(getTrigger()).toHaveTextContent("Active");
    expect(on_status_saved).not.toHaveBeenCalled();
  });

  it.each([
    ["an error with an empty message", new Error("")],
    ["a value that is not an error object", "boom"],
  ])("uses a generic message for %s", async (_label, rejection) => {
    mock_toggle.mockRejectedValueOnce(rejection);
    render(<Harness />);

    openMenu();
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Disabled" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The status could not be updated. Please try again."
    );
  });

  it("can undo the last change", async () => {
    mock_toggle
      .mockResolvedValueOnce(makeCoupon({ is_active: false }))
      .mockResolvedValueOnce(makeCoupon({ is_active: true }));
    render(<Harness />);

    openMenu();
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Disabled" }));
    fireEvent.click(await screen.findByRole("button", { name: "Undo" }));

    expect(mock_toggle).toHaveBeenLastCalledWith("coupon-1", true);
    await waitFor(() => expect(screen.getByText("Coupon enabled")).toBeInTheDocument());
    expect(getTrigger()).toHaveTextContent("Active");
    // An undo cannot be undone again.
    expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument();
  });

  it("hides the saved message after a few seconds", async () => {
    jest.useFakeTimers();
    try {
      mock_toggle.mockResolvedValueOnce(makeCoupon({ is_active: false }));
      render(<Harness />);

      openMenu();
      fireEvent.click(screen.getByRole("menuitemradio", { name: "Disabled" }));
      await act(async () => {});
      expect(screen.getByText("Coupon disabled")).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(6000);
      });

      expect(screen.queryByText("Coupon disabled")).not.toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });
});

// ── Mobile ───────────────────────────────────────────────────────────────────

describe("on phones", () => {
  beforeEach(() => mockMobileViewport(true));

  it("opens a bottom sheet with the coupon code and option hints", () => {
    render(<Harness />);
    openMenu();

    expect(screen.getByText("Coupon status")).toBeInTheDocument();
    expect(screen.getAllByText("TESTLAUNCH100").length).toBeGreaterThan(0);
    expect(screen.getByRole("menuitemradio", { name: /Paused, clients cannot redeem it/ })).toBeInTheDocument();
  });

  it("locks the page scroll while open and restores it when closed", () => {
    render(<Harness />);
    openMenu();

    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });

  it("saves the status from the sheet", async () => {
    mock_toggle.mockResolvedValueOnce(makeCoupon({ is_active: false }));
    render(<Harness />);

    openMenu();
    fireEvent.click(screen.getByRole("menuitemradio", { name: /^Disabled/ }));

    expect(mock_toggle).toHaveBeenCalledWith("coupon-1", false);
    await waitFor(() => expect(getTrigger()).toHaveTextContent("Disabled"));
  });
});
