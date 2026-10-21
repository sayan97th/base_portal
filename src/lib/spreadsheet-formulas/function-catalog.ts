/**
 * Descriptions of the formula functions, for autocomplete, the argument hint shown
 * while typing and the Functions reference panel. Every function the engine
 * supports is listed. The most used ones carry a hand written syntax, summary
 * and example, the rest of the Excel compatible catalog gets its category only.
 */

import { getSupportedFunctionNames } from "./functions";

export type FunctionCategory =
  | "Logical"
  | "Lookup"
  | "Math"
  | "Statistical"
  | "Text"
  | "Date"
  | "Info"
  | "Array"
  | "Financial"
  | "Engineering"
  | "Web";

export const FUNCTION_CATEGORIES: readonly FunctionCategory[] = [
  "Logical", "Lookup", "Math", "Statistical", "Text", "Date", "Info", "Array", "Financial", "Engineering", "Web",
];

export interface FunctionInfo {
  name: string;
  category: FunctionCategory;
  /** Argument names, optional ones in square brackets, "..." for repeating ones. */
  args: string[];
  description: string;
  example?: string;
}

type CatalogEntry = [category: FunctionCategory, args: string[], description: string, example?: string];

const DOCUMENTED_FUNCTIONS: Record<string, CatalogEntry> = {
  // Logical
  IF: ["Logical", ["condition", "value_if_true", "[value_if_false]"], "Returns one value when a condition is TRUE and another when it is FALSE.", 'IF(T2>1000, "High", "Normal")'],
  IFS: ["Logical", ["condition1", "value1", "[condition2, value2, ...]"], "Returns the value of the first condition that is TRUE.", 'IFS(S2>=70, "Top", S2>=40, "Mid", TRUE, "Low")'],
  IFERROR: ["Logical", ["value", "[value_if_error]"], "Returns the value, or a fallback when it is an error.", 'IFERROR(VLOOKUP(E2, E:Z, 3, FALSE), "")'],
  IFNA: ["Logical", ["value", "[value_if_na]"], "Returns the value, or a fallback when it is #N/A.", 'IFNA(MATCH(E2, E:E, 0), "Missing")'],
  AND: ["Logical", ["logical1", "[logical2, ...]"], "TRUE when every argument is TRUE.", "AND(S2>=40, U2>1000)"],
  OR: ["Logical", ["logical1", "[logical2, ...]"], "TRUE when at least one argument is TRUE.", 'OR(B2="Live", B2="Approved")'],
  NOT: ["Logical", ["logical"], "Reverses a logical value.", "NOT(ISBLANK(Q2))"],
  XOR: ["Logical", ["logical1", "[logical2, ...]"], "TRUE when an odd number of arguments are TRUE."],
  SWITCH: ["Logical", ["expression", "case1", "value1", "[case2, value2, ...]", "[default]"], "Compares an expression to a list of cases and returns the matching value.", 'SWITCH(AB2, "USD", "$", "EUR", "€", "")'],
  CHOOSE: ["Logical", ["index", "choice1", "[choice2, ...]"], "Returns the choice at the given position.", 'CHOOSE(2, "a", "b", "c")'],
  TRUE: ["Logical", [], "The logical value TRUE."],
  FALSE: ["Logical", [], "The logical value FALSE."],

  // Lookup
  VLOOKUP: ["Lookup", ["search_key", "range", "index", "[is_sorted]"], "Searches the first column of a range and returns the value of another column in the matching row. Use FALSE as is_sorted for an exact match.", "VLOOKUP(E2, E:Z, 4, FALSE)"],
  HLOOKUP: ["Lookup", ["search_key", "range", "index", "[is_sorted]"], "Searches the first row of a range and returns the value of another row in the matching column."],
  XLOOKUP: ["Lookup", ["search_key", "lookup_range", "result_range", "[missing_value]", "[match_mode]", "[search_mode]"], "Finds a value in one range and returns the matching item of another. Exact match by default.", 'XLOOKUP(E2, E:E, T:T, "Not found")'],
  MATCH: ["Lookup", ["search_key", "range", "[search_type]"], "Position of a value in a range. Use 0 for an exact match.", "MATCH(A2, A:A, 0)"],
  INDEX: ["Lookup", ["reference", "[row]", "[column]"], "Value at a given row and column of a range.", "INDEX(T:T, 5)"],
  LOOKUP: ["Lookup", ["search_key", "search_range", "[result_range]"], "Looks a key up in a sorted row or column and returns the matching value."],
  ROW: ["Lookup", ["[cell_reference]"], "Row number of a cell, or of the formula's own row.", "ROW()"],
  COLUMN: ["Lookup", ["cell_reference"], "Column number of a cell (A is 1).", "COLUMN(T2)"],
  ROWS: ["Lookup", ["range"], "Number of rows in a range."],
  COLUMNS: ["Lookup", ["range"], "Number of columns in a range."],
  INDIRECT: ["Lookup", ["cell_reference_as_text"], "Value of the cell named by a text, such as \"B5\".", 'INDIRECT("T" & 5)'],

  // Math
  SUM: ["Math", ["value1", "[value2, ...]"], "Adds numbers and ranges. Text and blank cells are ignored.", "SUM(T:T)"],
  SUMIF: ["Math", ["range", "criterion", "[sum_range]"], "Adds the cells that meet a criterion.", 'SUMIF(B:B, "Live", AA:AA)'],
  SUMIFS: ["Math", ["sum_range", "criteria_range1", "criterion1", "[criteria_range2, criterion2, ...]"], "Adds the cells that meet every criterion.", 'SUMIFS(AA:AA, B:B, "Live", E:E, "Acme")'],
  SUMPRODUCT: ["Math", ["array1", "[array2, ...]"], "Sum of the products of matching items of the arrays."],
  PRODUCT: ["Math", ["value1", "[value2, ...]"], "Multiplies numbers and ranges."],
  ROUND: ["Math", ["value", "[places]"], "Rounds a number to a number of decimal places.", "ROUND(AA2 * 1.15, 2)"],
  ROUNDUP: ["Math", ["value", "[places]"], "Rounds a number up, away from zero."],
  ROUNDDOWN: ["Math", ["value", "[places]"], "Rounds a number down, toward zero."],
  MROUND: ["Math", ["value", "factor"], "Rounds a number to the nearest multiple of a factor."],
  CEILING: ["Math", ["value", "[factor]"], "Rounds a number up to the nearest multiple of a factor."],
  FLOOR: ["Math", ["value", "[factor]"], "Rounds a number down to the nearest multiple of a factor."],
  INT: ["Math", ["value"], "Rounds a number down to the nearest integer."],
  TRUNC: ["Math", ["value", "[places]"], "Drops the decimal part of a number."],
  ABS: ["Math", ["value"], "Absolute value of a number."],
  MOD: ["Math", ["dividend", "divisor"], "Remainder of a division."],
  POWER: ["Math", ["base", "exponent"], "A number raised to a power."],
  SQRT: ["Math", ["value"], "Square root of a number."],
  QUOTIENT: ["Math", ["dividend", "divisor"], "Integer part of a division."],
  RAND: ["Math", [], "Random number between 0 and 1, recalculated on every change."],
  RANDBETWEEN: ["Math", ["low", "high"], "Random integer between two values."],
  PI: ["Math", [], "The number pi."],
  SIGN: ["Math", ["value"], "1 for a positive number, -1 for a negative one, 0 for zero."],
  LOG: ["Math", ["value", "[base]"], "Logarithm of a number to a base (10 by default)."],
  LN: ["Math", ["value"], "Natural logarithm of a number."],
  EXP: ["Math", ["exponent"], "e raised to a power."],
  SEQUENCE: ["Math", ["rows", "[columns]", "[start]", "[step]"], "An array of sequential numbers."],

  // Statistical
  AVERAGE: ["Statistical", ["value1", "[value2, ...]"], "Average of numbers and ranges, ignoring text and blank cells.", "AVERAGE(S:S)"],
  AVERAGEIF: ["Statistical", ["criteria_range", "criterion", "[average_range]"], "Average of the cells that meet a criterion.", 'AVERAGEIF(B:B, "Live", S:S)'],
  AVERAGEIFS: ["Statistical", ["average_range", "criteria_range1", "criterion1", "[criteria_range2, criterion2, ...]"], "Average of the cells that meet every criterion."],
  COUNT: ["Statistical", ["value1", "[value2, ...]"], "Counts the numeric values.", "COUNT(S:S)"],
  COUNTA: ["Statistical", ["value1", "[value2, ...]"], "Counts the cells that are not empty.", "COUNTA(Q:Q)"],
  COUNTBLANK: ["Statistical", ["range"], "Counts the empty cells of a range.", "COUNTBLANK(Q:Q)"],
  COUNTIF: ["Statistical", ["range", "criterion"], "Counts the cells that meet a criterion, such as \"Live\", \">40\" or \"BL-*\".", 'COUNTIF(B:B, "Live")'],
  COUNTIFS: ["Statistical", ["criteria_range1", "criterion1", "[criteria_range2, criterion2, ...]"], "Counts the rows that meet every criterion.", 'COUNTIFS(B:B, "Live", S:S, ">=50")'],
  COUNTUNIQUE: ["Statistical", ["value1", "[value2, ...]"], "Counts the unique values.", "COUNTUNIQUE(E:E)"],
  MAX: ["Statistical", ["value1", "[value2, ...]"], "Largest number.", "MAX(S:S)"],
  MIN: ["Statistical", ["value1", "[value2, ...]"], "Smallest number.", "MIN(S:S)"],
  MAXIFS: ["Statistical", ["range", "criteria_range1", "criterion1", "[criteria_range2, criterion2, ...]"], "Largest number among the cells that meet every criterion."],
  MINIFS: ["Statistical", ["range", "criteria_range1", "criterion1", "[criteria_range2, criterion2, ...]"], "Smallest number among the cells that meet every criterion."],
  MEDIAN: ["Statistical", ["value1", "[value2, ...]"], "Middle value of a set of numbers."],
  MODE: ["Statistical", ["value1", "[value2, ...]"], "Most common value of a set of numbers."],
  LARGE: ["Statistical", ["data", "n"], "The nth largest value.", "LARGE(S:S, 3)"],
  SMALL: ["Statistical", ["data", "n"], "The nth smallest value."],
  RANK: ["Statistical", ["value", "data", "[is_ascending]"], "Rank of a value within a set of numbers."],
  STDEV: ["Statistical", ["value1", "[value2, ...]"], "Standard deviation of a sample."],
  VAR: ["Statistical", ["value1", "[value2, ...]"], "Variance of a sample."],
  PERCENTILE: ["Statistical", ["data", "percentile"], "Value at a given percentile of a set of numbers."],
  QUARTILE: ["Statistical", ["data", "quartile_number"], "Value nearest to a given quartile."],

  // Text
  CONCATENATE: ["Text", ["string1", "[string2, ...]"], "Joins texts together.", 'CONCATENATE(A2, " ", E2)'],
  CONCAT: ["Text", ["value1", "value2"], "Joins two texts together."],
  TEXTJOIN: ["Text", ["delimiter", "ignore_empty", "text1", "[text2, ...]"], "Joins texts and ranges with a delimiter.", 'TEXTJOIN(", ", TRUE, E2:E10)'],
  JOIN: ["Text", ["delimiter", "value_or_array1", "[value_or_array2, ...]"], "Joins the values of arrays with a delimiter."],
  SPLIT: ["Text", ["text", "delimiter", "[split_by_each]", "[remove_empty_text]"], "Splits a text into columns around a delimiter."],
  LEFT: ["Text", ["string", "[number_of_characters]"], "First characters of a text.", "LEFT(A2, 3)"],
  RIGHT: ["Text", ["string", "[number_of_characters]"], "Last characters of a text."],
  MID: ["Text", ["string", "starting_at", "extract_length"], "Part of a text from a start position."],
  LEN: ["Text", ["text"], "Number of characters of a text.", "LEN(F2)"],
  UPPER: ["Text", ["text"], "Converts a text to upper case."],
  LOWER: ["Text", ["text"], "Converts a text to lower case."],
  PROPER: ["Text", ["text_to_capitalize"], "Capitalizes the first letter of every word."],
  TRIM: ["Text", ["text"], "Removes leading, trailing and repeated spaces."],
  CLEAN: ["Text", ["text"], "Removes non printable characters."],
  SUBSTITUTE: ["Text", ["text_to_search", "search_for", "replace_with", "[occurrence_number]"], "Replaces existing text with new text.", 'SUBSTITUTE(G2, "https://", "")'],
  REPLACE: ["Text", ["text", "position", "length", "new_text"], "Replaces part of a text by position."],
  FIND: ["Text", ["search_for", "text_to_search", "[starting_at]"], "Position of a text inside another, case sensitive."],
  SEARCH: ["Text", ["search_for", "text_to_search", "[starting_at]"], "Position of a text inside another, ignoring case."],
  REPT: ["Text", ["text_to_repeat", "number_of_repetitions"], "Repeats a text."],
  EXACT: ["Text", ["string1", "string2"], "TRUE when two texts are identical, case sensitive."],
  TEXT: ["Text", ["number", "format"], "Formats a number or date with a format code.", 'TEXT(K2, "mmm d, yyyy")'],
  VALUE: ["Text", ["text"], "Converts a text such as \"$1,250\" to a number."],
  TO_TEXT: ["Text", ["value"], "Converts a value to text."],
  REGEXMATCH: ["Text", ["text", "regular_expression"], "TRUE when a text matches a regular expression.", 'REGEXMATCH(D2, "DR 5\\d")'],
  REGEXEXTRACT: ["Text", ["text", "regular_expression"], "The part of a text matching a regular expression.", 'REGEXEXTRACT(G2, "https?://([^/]+)")'],
  REGEXREPLACE: ["Text", ["text", "regular_expression", "replacement"], "Replaces the parts of a text matching a regular expression."],
  CHAR: ["Text", ["table_number"], "Character for a character code."],
  CODE: ["Text", ["string"], "Character code of the first character."],

  // Date
  TODAY: ["Date", [], "Current date, updated every day.", "TODAY()"],
  NOW: ["Date", [], "Current date and time."],
  DATE: ["Date", ["year", "month", "day"], "Builds a date from a year, month and day.", "DATE(2026, 12, 31)"],
  DATEVALUE: ["Date", ["date_string"], "Converts a text such as \"10/21/2026\" to a date."],
  DAY: ["Date", ["date"], "Day of the month of a date."],
  MONTH: ["Date", ["date"], "Month number of a date.", "MONTH(K2)"],
  YEAR: ["Date", ["date"], "Year of a date."],
  WEEKDAY: ["Date", ["date", "[type]"], "Day of the week of a date (1 is Sunday)."],
  WEEKNUM: ["Date", ["date", "[type]"], "Week number of a date in its year."],
  DAYS: ["Date", ["end_date", "start_date"], "Number of days between two dates.", "DAYS(L2, K2)"],
  DATEDIF: ["Date", ["start_date", "end_date", "unit"], "Difference between two dates in days (\"D\"), months (\"M\") or years (\"Y\")."],
  EDATE: ["Date", ["start_date", "months"], "Date a number of months before or after a date."],
  EOMONTH: ["Date", ["start_date", "months"], "Last day of the month a number of months away."],
  NETWORKDAYS: ["Date", ["start_date", "end_date", "[holidays]"], "Working days between two dates.", "NETWORKDAYS(TODAY(), L2)"],
  WORKDAY: ["Date", ["start_date", "num_days", "[holidays]"], "Date a number of working days away."],
  YEARFRAC: ["Date", ["start_date", "end_date", "[day_count_convention]"], "Fraction of a year between two dates."],
  HOUR: ["Date", ["time"], "Hour of a time."],
  MINUTE: ["Date", ["time"], "Minute of a time."],
  SECOND: ["Date", ["time"], "Second of a time."],
  TO_DATE: ["Date", ["value"], "Shows a number as a date."],

  // Info
  ISBLANK: ["Info", ["value"], "TRUE when the cell is empty.", "ISBLANK(Q2)"],
  ISNUMBER: ["Info", ["value"], "TRUE when the value is a number."],
  ISTEXT: ["Info", ["value"], "TRUE when the value is text."],
  ISERROR: ["Info", ["value"], "TRUE when the value is any error."],
  ISERR: ["Info", ["value"], "TRUE when the value is an error other than #N/A."],
  ISNA: ["Info", ["value"], "TRUE when the value is #N/A."],
  ISLOGICAL: ["Info", ["value"], "TRUE when the value is TRUE or FALSE."],
  ISNONTEXT: ["Info", ["value"], "TRUE when the value is not text."],
  ISEVEN: ["Info", ["value"], "TRUE when the number is even."],
  ISODD: ["Info", ["value"], "TRUE when the number is odd."],
  ISURL: ["Info", ["value"], "TRUE when the value looks like a URL."],
  ISEMAIL: ["Info", ["value"], "TRUE when the value looks like an email address."],
  ISREF: ["Info", ["value"], "TRUE when the value is a cell reference."],
  N: ["Info", ["value"], "The value as a number, 0 for text."],
  T: ["Info", ["value"], "The value when it is text, otherwise an empty text."],
  NA: ["Info", [], "The #N/A error."],
  TYPE: ["Info", ["value"], "Type of a value as a number."],

  // Array
  ARRAYFORMULA: ["Array", ["array_formula"], "Evaluates a formula over whole ranges at once."],
  FILTER: ["Array", ["range", "condition1", "[condition2, ...]"], "The rows of a range that meet the conditions.", 'FILTER(E:E, B:B="Live")'],
  SORT: ["Array", ["range", "[sort_column]", "[is_ascending]", "[sort_column2, is_ascending2, ...]"], "Sorts the rows of a range."],
  UNIQUE: ["Array", ["range", "[by_column]", "[exactly_once]"], "Unique rows of a range.", "UNIQUE(E:E)"],
  FLATTEN: ["Array", ["range1", "[range2, ...]"], "All values of one or more ranges in one column."],
  TRANSPOSE: ["Array", ["array_or_range"], "Swaps the rows and columns of a range."],
  ARRAY_CONSTRAIN: ["Array", ["input_range", "num_rows", "num_cols"], "Limits an array result to a size."],

  // Financial
  PMT: ["Financial", ["rate", "number_of_periods", "present_value", "[future_value]", "[end_or_beginning]"], "Periodic payment of a loan."],
  FV: ["Financial", ["rate", "number_of_periods", "payment_amount", "[present_value]", "[end_or_beginning]"], "Future value of an investment."],
  PV: ["Financial", ["rate", "number_of_periods", "payment_amount", "[future_value]", "[end_or_beginning]"], "Present value of an investment."],
  NPV: ["Financial", ["discount", "cashflow1", "[cashflow2, ...]"], "Net present value of cash flows."],
  IRR: ["Financial", ["cashflow_amounts", "[rate_guess]"], "Internal rate of return of cash flows."],

  // Web
  HYPERLINK: ["Web", ["url", "[link_label]"], "Shows a link label for a URL."],
  ENCODEURL: ["Web", ["text"], "Encodes a text for use in a URL query."],
};

/** Category of a library function the catalog does not document, guessed from its name. */
function guessCategory(name: string): FunctionCategory {
  if (/^(IM|BESSEL|BIN2|DEC2|HEX2|OCT2|BIT|ERF|DELTA|GESTEP|COMPLEX|CONVERT)/.test(name)) return "Engineering";
  if (/^(ACCR|COUP|CUM|DB|DDB|DISC|DOLLAR|EFFECT|FV|IPMT|IRR|ISPMT|MIRR|NOMINAL|NPER|NPV|PDURATION|PMT|PPMT|PRICE|PV|RATE|RRI|SLN|SYD|TBILL|XIRR|XNPV)/.test(name)) return "Financial";
  if (/^(D(AVERAGE|COUNT|GET|MAX|MIN|PRODUCT|STDEV|SUM|VAR))/.test(name)) return "Statistical";
  if (/(DIST|INV|TEST|STDEV|VAR|COVAR|CORREL|PEARSON|FORECAST|SLOPE|INTERCEPT|RSQ|STEYX|SKEW|KURT|GAMMA|BETA|BINOM|POISSON|WEIBULL|FISHER|NORM|LOGEST|LINEST|GROWTH|TREND|PROB|STANDARDIZE|FREQUENCY|PERCENT|QUARTILE|RANK|MODE|DEVSQ|AVEDEV|GEOMEAN|HARMEAN|TRIMMEAN|PERMUT|CONFIDENCE|PHI|GAUSS|EXPON|HYPGEOM|NEGBINOM|LOGNORM|CHI|^F\.|^T\.|^Z)/.test(name)) return "Statistical";
  if (/^(DAYS|DATE|TIME|WORKDAY|NETWORKDAYS|ISOWEEKNUM|YEAR|MONTH|WEEK|EDATE|EOMONTH)/.test(name)) return "Date";
  if (/^(CHAR|CODE|UNICHAR|UNICODE|FIXED|NUMBERVALUE|ROMAN|ARABIC|BASE|DECIMAL|CLEAN|TEXT)/.test(name)) return "Text";
  if (/^(CHOOSE|HSTACK|VSTACK|TAKE|DROP|EXPAND|MMULT|MUNIT|TOCOL|TOROW)/.test(name)) return "Array";
  if (/^(IS|ERROR)/.test(name)) return "Info";
  return "Math";
}

let catalog_cache: FunctionInfo[] | null = null;

/** Every supported function with its description, sorted by name. */
export function getFunctionCatalog(): FunctionInfo[] {
  if (catalog_cache) return catalog_cache;
  catalog_cache = getSupportedFunctionNames().map((name) => {
    const entry = DOCUMENTED_FUNCTIONS[name];
    if (entry) {
      const [category, args, description, example] = entry;
      return { name, category, args, description, example };
    }
    return { name, category: guessCategory(name), args: ["..."], description: "Excel and Google Sheets compatible function." };
  });
  return catalog_cache;
}

export function getFunctionInfo(name: string): FunctionInfo | undefined {
  const upper = name.toUpperCase();
  return getFunctionCatalog().find((info) => info.name === upper);
}

/** Function suggestions for a typed prefix: names starting with it first, documented ones before the rest. */
export function suggestFunctions(prefix: string, limit = 8): FunctionInfo[] {
  const upper = prefix.toUpperCase();
  if (upper === "") return [];
  const catalog = getFunctionCatalog();
  const starts = catalog.filter((info) => info.name.startsWith(upper));
  const documented_rank = (info: FunctionInfo) => (DOCUMENTED_FUNCTIONS[info.name] ? 0 : 1);
  return starts
    .sort((a, b) => documented_rank(a) - documented_rank(b) || a.name.length - b.name.length || a.name.localeCompare(b.name))
    .slice(0, limit);
}

/** "VLOOKUP(search_key, range, index, [is_sorted])" */
export function formatFunctionSignature(info: FunctionInfo): string {
  return `${info.name}(${info.args.join(", ")})`;
}
