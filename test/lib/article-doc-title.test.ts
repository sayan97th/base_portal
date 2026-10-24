/**
 * Tests for the Article cell doc preview helpers: recognizing Google Docs links
 * and looking up each doc title once.
 */

import {
  clearArticleDocTitleCache,
  getCachedArticleDocTitle,
  isGoogleDocLink,
  loadArticleDocTitle,
} from "@/lib/article-doc-title";
import { getArticleDocTitle } from "@/services/admin/link-building-dashboard.service";

jest.mock("@/services/admin/link-building-dashboard.service", () => ({
  getArticleDocTitle: jest.fn(),
}));

const mocked_get_title = getArticleDocTitle as jest.MockedFunction<typeof getArticleDocTitle>;

const DOC_URL = "https://docs.google.com/document/d/1Q0BbC9es8daEQBWL2Qvkll19lUhIoZ8e/edit";

describe("isGoogleDocLink", () => {
  it.each([
    DOC_URL,
    "https://docs.google.com/document/d/1Q0BbC9es8daEQBWL2Qvkll19lUhIoZ8e/edit#heading=h.j03i5j3bs68n",
    "https://docs.google.com/document/u/0/d/1Q0BbC9es8daEQBWL2Qvkll19lUhIoZ8e/edit",
    "https://docs.google.com/spreadsheets/d/1Q0BbC9es8daEQBWL2Qvkll19lUhIoZ8e/edit",
    "https://drive.google.com/file/d/1Q0BbC9es8daEQBWL2Qvkll19lUhIoZ8e/view?usp=sharing",
    "https://drive.google.com/open?id=1Q0BbC9es8daEQBWL2Qvkll19lUhIoZ8e",
  ])("accepts %s", (url) => {
    expect(isGoogleDocLink(url)).toBe(true);
  });

  it.each([
    "https://example.com/document/d/1Q0BbC9es8daEQBWL2Qvkll19lUhIoZ8e/edit",
    "https://docs.google.com.evil.test/document/d/1Q0BbC9es8daEQBWL2Qvkll19lUhIoZ8e/edit",
    "https://docs.google.com/",
    "not a link",
  ])("rejects %s", (url) => {
    expect(isGoogleDocLink(url)).toBe(false);
  });
});

describe("loadArticleDocTitle", () => {
  beforeEach(() => {
    clearArticleDocTitleCache();
    mocked_get_title.mockReset();
  });

  it("requests each doc once and shares the request between callers", async () => {
    mocked_get_title.mockResolvedValue({ url: DOC_URL, document_id: "x", kind: "document", title: "My article", status: "ok" });

    const [first, second] = await Promise.all([loadArticleDocTitle(DOC_URL), loadArticleDocTitle(DOC_URL)]);
    await loadArticleDocTitle(` ${DOC_URL} `);

    expect(first.title).toBe("My article");
    expect(second.title).toBe("My article");
    expect(mocked_get_title).toHaveBeenCalledTimes(1);
    expect(getCachedArticleDocTitle(DOC_URL)?.title).toBe("My article");
  });

  it("does not keep a result Google did not answer, so the next hover tries again", async () => {
    mocked_get_title.mockResolvedValue({ url: DOC_URL, document_id: "x", kind: "document", title: null, status: "unavailable" });

    await loadArticleDocTitle(DOC_URL);
    await loadArticleDocTitle(DOC_URL);

    expect(mocked_get_title).toHaveBeenCalledTimes(2);
    expect(getCachedArticleDocTitle(DOC_URL)).toBeUndefined();
  });
});
