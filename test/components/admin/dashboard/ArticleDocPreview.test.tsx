/**
 * Tests for the Article cell doc preview: hovering or selecting the cell shows
 * the linked doc's title, with the row's Article Title as the fallback.
 */

import React, { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import ArticleDocPreview from "@/components/admin/dashboard/ArticleDocPreview";
import { clearArticleDocTitleCache } from "@/lib/article-doc-title";
import { getArticleDocTitle } from "@/services/admin/link-building-dashboard.service";
import type { ArticleDocTitle } from "@/types/admin/link-building-order";

jest.mock("@/services/admin/link-building-dashboard.service", () => ({
  getArticleDocTitle: jest.fn(),
}));

const mocked_get_title = getArticleDocTitle as jest.MockedFunction<typeof getArticleDocTitle>;

const DOC_URL = "https://docs.google.com/document/d/1Q0BbC9es8daEQBWL2Qvkll19lUhIoZ8e/edit";

function titleResponse(overrides: Partial<ArticleDocTitle> = {}): ArticleDocTitle {
  return { url: DOC_URL, document_id: "1Q0BbC9es8daEQBWL2Qvkll19lUhIoZ8e", kind: "document", title: "My article.docx", status: "ok", ...overrides };
}

function Cell({ url = DOC_URL, fallback_title = "", is_active = false }: { url?: string; fallback_title?: string; is_active?: boolean }) {
  const [cell_el, setCellEl] = useState<HTMLTableCellElement | null>(null);
  return (
    <table>
      <tbody>
        <tr>
          <td ref={setCellEl} data-testid="article-cell">
            <ArticleDocPreview url={url} fallback_title={fallback_title} anchor_el={cell_el} is_active={is_active}>
              doc link
            </ArticleDocPreview>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

async function hoverCell() {
  fireEvent.mouseEnter(screen.getByTestId("article-cell"));
  await act(async () => {
    jest.advanceTimersByTime(400);
  });
}

describe("ArticleDocPreview", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    clearArticleDocTitleCache();
    mocked_get_title.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("does not request the title until the cell is hovered", () => {
    render(<Cell />);
    expect(mocked_get_title).not.toHaveBeenCalled();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("shows the doc title on hover and hides it when the mouse leaves", async () => {
    mocked_get_title.mockResolvedValue(titleResponse());
    render(<Cell />);

    await hoverCell();

    expect(mocked_get_title).toHaveBeenCalledWith(DOC_URL);
    expect(await screen.findByText("My article.docx")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open doc/i })).toHaveAttribute("href", DOC_URL);

    fireEvent.mouseLeave(screen.getByTestId("article-cell"));
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("shows the title while the cell is selected, like clicking a link in Google Sheets", async () => {
    mocked_get_title.mockResolvedValue(titleResponse());
    render(<Cell is_active />);

    expect(await screen.findByText("My article.docx")).toBeInTheDocument();
  });

  it("falls back to the Article Title column for a private doc", async () => {
    mocked_get_title.mockResolvedValue(titleResponse({ title: null, status: "private" }));
    render(<Cell fallback_title="Title typed in the sheet" is_active />);

    expect(await screen.findByText("Title typed in the sheet")).toBeInTheDocument();
    expect(screen.getByText(/not shared with "Anyone with the link"/)).toBeInTheDocument();
  });

  it("previews the Article Title of a link outside Google without calling the server", async () => {
    render(<Cell url="https://example.com/article" fallback_title="Guest post title" is_active />);

    expect(screen.getByText("Guest post title")).toBeInTheDocument();
    expect(mocked_get_title).not.toHaveBeenCalled();
  });
});
