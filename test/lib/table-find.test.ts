/**
 * Tests for the in-table find (Ctrl/Cmd+F) helpers: splitting a query into
 * several terms so a few orders can be compared at once, turning a pasted
 * spreadsheet column into a query, and marking every term inside a cell.
 */

import {
  MAX_FIND_TERMS,
  getFindTermColorIdx,
  joinFindTerms,
  parseFindTerms,
  splitTextByFind,
  textMatchesAnyFindTerm,
  toSingleLineFindQuery,
} from "@/lib/table-find";

describe("parseFindTerms", () => {
  it("returns no terms for a blank query", () => {
    expect(parseFindTerms("   ")).toEqual([]);
  });

  it("keeps a single term with spaces as one term", () => {
    expect(parseFindTerms("  Landscaping Insurance ")).toEqual(["landscaping insurance"]);
  });

  it("splits on commas, semicolons, tabs and line breaks", () => {
    expect(parseFindTerms("BL-4544, BL-4860;BL-11525\tBL-0001\nBL-0002")).toEqual([
      "bl-4544",
      "bl-4860",
      "bl-11525",
      "bl-0001",
      "bl-0002",
    ]);
  });

  it("keeps a quoted term together even when it holds a separator", () => {
    expect(parseFindTerms('"Allan, Abigail", BL-1')).toEqual(["allan, abigail", "bl-1"]);
  });

  it("drops empty and repeated terms", () => {
    expect(parseFindTerms("BL-1,, bl-1 , ,BL-2")).toEqual(["bl-1", "bl-2"]);
  });

  it(`caps the query at ${MAX_FIND_TERMS} terms`, () => {
    const query = Array.from({ length: MAX_FIND_TERMS + 5 }, (_, idx) => `BL-${idx}`).join(",");
    expect(parseFindTerms(query)).toHaveLength(MAX_FIND_TERMS);
  });
});

describe("joinFindTerms", () => {
  it("round trips through parseFindTerms, quoting terms that hold a separator", () => {
    const terms = ["bl-1", "allan, abigail"];
    expect(joinFindTerms(terms)).toBe('bl-1, "allan, abigail"');
    expect(parseFindTerms(joinFindTerms(terms))).toEqual(terms);
  });
});

describe("toSingleLineFindQuery", () => {
  it("turns a pasted spreadsheet column into a comma separated list", () => {
    expect(toSingleLineFindQuery("BL-4544\r\nBL-4860\n\nBL-11525\n")).toBe("BL-4544, BL-4860, BL-11525");
  });

  it("splits cells copied side by side", () => {
    expect(toSingleLineFindQuery("BL-1\tBL-2")).toBe("BL-1, BL-2");
  });
});

describe("textMatchesAnyFindTerm", () => {
  it("matches when any term is found, ignoring case", () => {
    expect(textMatchesAnyFindTerm("BL-4860", ["bl-4544", "bl-4860"])).toBe(true);
  });

  it("does not match empty text or an empty term list", () => {
    expect(textMatchesAnyFindTerm("", ["bl-1"])).toBe(false);
    expect(textMatchesAnyFindTerm("BL-1", [])).toBe(false);
  });
});

describe("splitTextByFind", () => {
  it("returns the text untouched when there is nothing to find", () => {
    expect(splitTextByFind("BL-1", [])).toEqual([{ text: "BL-1", is_match: false, term_idx: -1 }]);
  });

  it("marks every occurrence of every term, keeping the original casing", () => {
    expect(splitTextByFind("Acme and ACME Blog", ["acme", "blog"])).toEqual([
      { text: "Acme", is_match: true, term_idx: 0 },
      { text: " and ", is_match: false, term_idx: -1 },
      { text: "ACME", is_match: true, term_idx: 0 },
      { text: " ", is_match: false, term_idx: -1 },
      { text: "Blog", is_match: true, term_idx: 1 },
    ]);
  });

  it("prefers the longest term when two start at the same position", () => {
    expect(splitTextByFind("BL-123", ["bl-1", "bl-12"])).toEqual([
      { text: "BL-12", is_match: true, term_idx: 1 },
      { text: "3", is_match: false, term_idx: -1 },
    ]);
  });
});

describe("getFindTermColorIdx", () => {
  it("cycles through the highlight colors", () => {
    expect(getFindTermColorIdx(0)).toBe(0);
    expect(getFindTermColorIdx(6)).toBe(0);
    expect(getFindTermColorIdx(7)).toBe(1);
  });
});
