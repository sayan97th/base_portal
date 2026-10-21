/**
 * The value model (numbers and dates typed as text, coercion and comparison
 * rules, error values) and how results are formatted for cells, formula columns
 * and TEXT().
 */

import {
  FORMULA_COLUMN_FORMATS,
  FormulaError,
  compareScalars,
  dateToSerial,
  flattenValues,
  formatDateSerial,
  formatGeneralNumber,
  formatScalar,
  formatWithColumnFormat,
  formatWithPattern,
  isMatrix,
  isStackOverflow,
  parseDateText,
  parseNumberText,
  serialToDate,
  toBoolean,
  toFormulaError,
  toMatrix,
  toNumber,
  toText,
} from "@/lib/spreadsheet-formulas";

const code = (value: unknown) => (value instanceof FormulaError ? value.code : value);

describe("FormulaError", () => {
  it("is an Error with a code and a default explanation", () => {
    const error = new FormulaError("#DIV/0!");
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe("#DIV/0!");
    expect(error.detail).toBe("Division by zero.");
    expect(new FormulaError("#N/A", "Custom").detail).toBe("Custom");
  });

  it("converts any thrown value to an error value", () => {
    expect(toFormulaError(new Error("#N/A")).code).toBe("#N/A");
    expect(toFormulaError(new Error("Invalid string length"))).toMatchObject({
      code: "#VALUE!",
      detail: "Invalid string length",
    });
    expect(toFormulaError("#NUM!").code).toBe("#NUM!");
    const original = new FormulaError("#REF!");
    expect(toFormulaError(original)).toBe(original);
  });

  it("recognizes a stack overflow in every browser", () => {
    expect(isStackOverflow(new RangeError("Maximum call stack size exceeded"))).toBe(true);
    const firefox_error = new Error("too much recursion");
    firefox_error.name = "InternalError";
    expect(isStackOverflow(firefox_error)).toBe(true);
    expect(isStackOverflow(new RangeError("Invalid array length"))).toBe(false);
    expect(isStackOverflow(new Error("boom"))).toBe(false);
  });
});

describe("parseNumberText", () => {
  it("reads numbers the way people type them in a sheet", () => {
    expect(parseNumberText("1250")).toBe(1250);
    expect(parseNumberText("-3.5")).toBe(-3.5);
    expect(parseNumberText("+7")).toBe(7);
    expect(parseNumberText("1,250.00")).toBe(1250);
    expect(parseNumberText("1,234,567")).toBe(1234567);
    expect(parseNumberText("$150")).toBe(150);
    expect(parseNumberText("€99.90")).toBe(99.9);
    expect(parseNumberText("£5")).toBe(5);
    expect(parseNumberText("45%")).toBe(0.45);
    expect(parseNumberText(".5")).toBe(0.5);
    expect(parseNumberText("1e3")).toBe(1000);
    expect(parseNumberText(" 42 ")).toBe(42);
  });

  it("rejects text that is not a number", () => {
    expect(parseNumberText("")).toBeNull();
    expect(parseNumberText("abc")).toBeNull();
    expect(parseNumberText("12abc")).toBeNull();
    expect(parseNumberText("1,25")).toBeNull();
    expect(parseNumberText("10/21/2026")).toBeNull();
  });
});

describe("dates", () => {
  it("counts days since 12/30/1899", () => {
    expect(dateToSerial(new Date(1899, 11, 30))).toBe(0);
    expect(dateToSerial(new Date(1900, 0, 1))).toBe(2);
    expect(dateToSerial(new Date(2026, 9, 21))).toBe(46316);
    expect(dateToSerial(new Date(2026, 9, 21, 12, 0, 0))).toBe(46316.5);
  });

  it("converts serial numbers back to dates, times included", () => {
    const date = serialToDate(46316.75);
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([2026, 9, 21, 18]);
  });

  it("reads the date formats of the table", () => {
    expect(parseDateText("10/21/2026")).toBe(46316);
    expect(parseDateText(" 1/5/26 ")).toBe(dateToSerial(new Date(2026, 0, 5)));
    expect(parseDateText("1/5/75")).toBe(dateToSerial(new Date(1975, 0, 5)));
    expect(parseDateText("2026-1-5")).toBe(dateToSerial(new Date(2026, 0, 5)));
    expect(parseDateText("02/29/2028")).toBe(dateToSerial(new Date(2028, 1, 29)));
  });

  it("rejects dates that do not exist", () => {
    expect(parseDateText("02/29/2027")).toBeNull();
    expect(parseDateText("13/01/2026")).toBeNull();
    expect(parseDateText("00/10/2026")).toBeNull();
    expect(parseDateText("21.10.2026")).toBeNull();
    expect(parseDateText("")).toBeNull();
  });
});

describe("coercion", () => {
  it("reads values as numbers", () => {
    expect(toNumber(null)).toBe(0);
    expect(toNumber(true)).toBe(1);
    expect(toNumber("")).toBe(0);
    expect(toNumber("  ")).toBe(0);
    expect(toNumber("$1,200")).toBe(1200);
    expect(toNumber("10/21/2026")).toBe(46316);
    expect(code(toNumber("abc"))).toBe("#VALUE!");
    expect(code(toNumber(new FormulaError("#N/A")))).toBe("#N/A");
  });

  it("reads values as text", () => {
    expect(toText(null)).toBe("");
    expect(toText(false)).toBe("FALSE");
    expect(toText(0.1 + 0.2)).toBe("0.3");
    expect(toText(1e21)).toBe("1e+21");
  });

  it("reads values as booleans", () => {
    expect(toBoolean(null)).toBe(false);
    expect(toBoolean(2)).toBe(true);
    expect(toBoolean(" True ")).toBe(true);
    expect(toBoolean("")).toBe(false);
    expect(code(toBoolean("yes"))).toBe("#VALUE!");
  });
});

describe("compareScalars", () => {
  it("orders numbers before text before booleans", () => {
    expect(compareScalars(999, "a")).toBeLessThan(0);
    expect(compareScalars("zzz", false)).toBeLessThan(0);
    expect(compareScalars(true, 1)).toBeGreaterThan(0);
  });

  it("compares text without regard to case", () => {
    expect(compareScalars("Acme", "ACME")).toBe(0);
    expect(compareScalars("apple", "Banana")).toBeLessThan(0);
  });

  it("reads a blank cell as 0, an empty text or FALSE depending on the other side", () => {
    expect(compareScalars(null, 0)).toBe(0);
    expect(compareScalars(null, "")).toBe(0);
    expect(compareScalars(null, false)).toBe(0);
    expect(compareScalars(null, 1)).toBeLessThan(0);
    expect(compareScalars(null, null)).toBe(0);
  });
});

describe("matrix helpers", () => {
  it("flattens, wraps and tells matrices apart", () => {
    expect(flattenValues([1, [[2, 3], [4, null]], undefined, "a"])).toEqual([1, 2, 3, 4, null, "a"]);
    expect(toMatrix(5)).toEqual([[5]]);
    expect(isMatrix([[1]])).toBe(true);
    expect(isMatrix(1)).toBe(false);
  });
});

describe("formatGeneralNumber and formatScalar", () => {
  it("shows numbers without float noise", () => {
    expect(formatGeneralNumber(1 / 3)).toBe("0.333333333333333");
    expect(formatGeneralNumber(-0)).toBe("0");
    expect(formatGeneralNumber(1250.5)).toBe("1250.5");
    expect(formatGeneralNumber(Infinity)).toBe("#NUM!");
  });

  it("shows every kind of value", () => {
    expect(formatScalar(null)).toBe("");
    expect(formatScalar(false)).toBe("FALSE");
    expect(formatScalar("text")).toBe("text");
    expect(formatScalar(new FormulaError("#REF!"))).toBe("#REF!");
    expect(formatScalar(46316, "date")).toBe("10/21/2026");
    expect(formatScalar(46316.5, "datetime")).toBe("10/21/2026 12:00:00");
    expect(formatDateSerial(46316)).toBe("10/21/2026");
  });
});

describe("formatWithColumnFormat", () => {
  it("offers every format of the formula column dialog", () => {
    expect(FORMULA_COLUMN_FORMATS.map((format) => format.value)).toEqual([
      "auto",
      "number",
      "currency",
      "percent",
      "date",
      "text",
    ]);
  });

  it("shows a number in the chosen format", () => {
    expect(formatWithColumnFormat(1250.5, "auto", null)).toBe("1250.5");
    expect(formatWithColumnFormat(1250.5, "number", null)).toBe("1,250.50");
    expect(formatWithColumnFormat(1250.5, "currency", null)).toBe("$1,250.50");
    expect(formatWithColumnFormat(-3, "currency", null)).toBe("-$3.00");
    expect(formatWithColumnFormat(0.125, "percent", null)).toBe("12.50%");
    expect(formatWithColumnFormat(46316, "date", null)).toBe("10/21/2026");
    expect(formatWithColumnFormat(46316, "auto", "date")).toBe("10/21/2026");
    expect(formatWithColumnFormat(0.1 + 0.2, "text", null)).toBe("0.3");
  });

  it("shows text, blanks and errors as they are", () => {
    expect(formatWithColumnFormat("Acme", "currency", null)).toBe("Acme");
    expect(formatWithColumnFormat(null, "number", null)).toBe("");
    expect(formatWithColumnFormat(new FormulaError("#N/A"), "currency", null)).toBe("#N/A");
  });
});

describe("formatWithPattern (TEXT)", () => {
  const serial = dateToSerial(new Date(2026, 9, 21, 14, 5, 9));

  it("formats numbers", () => {
    expect(formatWithPattern(-1234.5, "#,##0.00")).toBe("-1,234.50");
    expect(formatWithPattern(0.5, "#.##")).toBe(".5");
    expect(formatWithPattern(0.256, "0%")).toBe("26%");
    expect(formatWithPattern(5, "\\$0")).toBe("$5");
    expect(formatWithPattern(5, "_(0_)")).toBe("5");
    expect(formatWithPattern(1234.567, "General")).toBe("1234.567");
    expect(formatWithPattern(1234.567, "")).toBe("1234.567");
  });

  it("picks the section for positive, negative, zero and text values", () => {
    const pattern = '0.0;(0.0);"zero";"text: "@';
    expect(formatWithPattern(2, pattern)).toBe("2.0");
    expect(formatWithPattern(-2, pattern)).toBe("(2.0)");
    expect(formatWithPattern(0, pattern)).toBe("zero");
    expect(formatWithPattern("Acme", pattern)).toBe("text: Acme");
    expect(formatWithPattern("Acme", "@!")).toBe("Acme!");
    expect(formatWithPattern("Acme", "0.00")).toBe("Acme");
  });

  it("formats dates and times", () => {
    expect(formatWithPattern(serial, "mmmm")).toBe("October");
    expect(formatWithPattern(serial, "mmmmm")).toBe("O");
    expect(formatWithPattern(serial, "ddd yy")).toBe("Wed 26");
    expect(formatWithPattern(serial, "d/m")).toBe("21/10");
    expect(formatWithPattern(serial, "h:mm a/p")).toBe("2:05 P");
    expect(formatWithPattern(serial, "mm:ss")).toBe("05:09");
    expect(formatWithPattern(serial, '"Day" d')).toBe("Day 21");
  });

  it("passes errors through", () => {
    const error = new FormulaError("#N/A");
    expect(formatWithPattern(error, "0.00")).toBe(error);
  });
});
