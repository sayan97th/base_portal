import { render, screen } from "@testing-library/react";
import TableStatusFooter from "@/components/admin/dashboard/TableStatusFooter";

function renderFooter(overrides: Partial<React.ComponentProps<typeof TableStatusFooter>> = {}) {
  return render(
    <TableStatusFooter
      is_loading={false}
      has_loaded_once
      total={31_245}
      loaded_row_count={31_245}
      is_loading_more_rows={false}
      visible_column_count={30}
      total_column_count={35}
      {...overrides}
    />
  );
}

describe("TableStatusFooter", () => {
  it("says it is loading before the first rows arrive", () => {
    renderFooter({ has_loaded_once: false, is_loading: true });

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows how many rows the sheet holds and the visible columns", () => {
    renderFooter();

    const footer = screen.getByRole("group", { name: "Table status" });
    expect(footer).toHaveTextContent("31,245 rows");
    expect(footer).toHaveTextContent("30 of 35 columns visible");
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("says there are no rows for an empty result set", () => {
    renderFooter({ total: 0, loaded_row_count: 0 });

    expect(screen.getByText("No rows")).toBeInTheDocument();
  });

  it("shows the loading progress while the rest of the rows arrive", () => {
    renderFooter({ loaded_row_count: 8_200, is_loading_more_rows: true });

    const progress = screen.getByRole("progressbar", { name: "Loading rows" });
    expect(progress).toHaveAttribute("aria-valuenow", "8200");
    expect(progress).toHaveAttribute("aria-valuemax", "31245");
    expect(screen.getByText("Loading 8,200 of 31,245 rows")).toBeInTheDocument();
  });

  it("shows the selection summary it is given", () => {
    renderFooter({ selection_summary: <button type="button">Sum: 60</button> });

    expect(screen.getByRole("button", { name: "Sum: 60" })).toBeInTheDocument();
  });
});
