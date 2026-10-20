// Helpers for the in-table "Find" (Ctrl/Cmd+F) feature. Unlike the server side
// search, find never removes rows, it only highlights the cells that match so
// they can still be compared against the rest of the page.

export interface FindTextSegment {
  text: string;
  is_match: boolean;
  /** Index of the find term this segment matched, -1 for plain text. */
  term_idx: number;
}

/** Upper bound of terms in one find query, kept in line with the API's FIND_MAX_TERMS. */
export const MAX_FIND_TERMS = 25;

/** How many distinct highlight colors the terms cycle through (find_term_0 to find_term_5). */
export const FIND_TERM_COLOR_COUNT = 6;

// A quoted phrase, or a run of text up to the next separator. Commas, semicolons,
// tabs and line breaks separate terms, so "BL-4544, BL-4860" or a column of order
// ids pasted from a spreadsheet finds every one of them at once.
const FIND_TERM_PATTERN = /"([^"]*)"|([^,;\t\r\n"]+)/g;

/** Trims and lowercases a find query, an empty result means "nothing to find". */
export function normalizeFindQuery(query: string): string {
  return query.trim().toLowerCase();
}

/**
 * Splits a find query into normalized, deduplicated terms. Wrapping a term in
 * double quotes keeps a separator inside it, e.g. "Allan, Abigail".
 */
export function parseFindTerms(query: string): string[] {
  const terms: string[] = [];
  for (const match of query.matchAll(FIND_TERM_PATTERN)) {
    const term = normalizeFindQuery(match[1] ?? match[2] ?? "");
    if (term && !terms.includes(term)) terms.push(term);
    if (terms.length === MAX_FIND_TERMS) break;
  }
  return terms;
}

/**
 * Turns pasted multi line text (a column copied from a spreadsheet) into a single
 * line query, since a text input silently drops line breaks and would glue the
 * values together.
 */
export function toSingleLineFindQuery(pasted_text: string): string {
  return pasted_text
    .split(/[\t\r\n]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

/** Builds a query back from terms (the inverse of parseFindTerms), quoting terms that hold a separator. */
export function joinFindTerms(find_terms: string[]): string {
  return find_terms.map((term) => (/[,;]/.test(term) ? `"${term}"` : term)).join(", ");
}

/** True when `text` contains any of the already normalized `find_terms` (case insensitive). */
export function textMatchesAnyFindTerm(text: string, find_terms: string[]): boolean {
  if (find_terms.length === 0 || !text) return false;
  const lower_text = text.toLowerCase();
  return find_terms.some((term) => lower_text.includes(term));
}

/** Highlight color slot of a find term, so each term keeps the same color everywhere. */
export function getFindTermColorIdx(term_idx: number): number {
  return term_idx % FIND_TERM_COLOR_COUNT;
}

/**
 * Splits `text` into alternating plain and matching segments, so every occurrence
 * of every term can be wrapped in a <mark> while keeping the original casing.
 * When two terms overlap, the one that starts first wins, then the longest one.
 */
export function splitTextByFind(text: string, find_terms: string[]): FindTextSegment[] {
  if (find_terms.length === 0 || !text) return [{ text, is_match: false, term_idx: -1 }];

  const lower_text = text.toLowerCase();
  const segments: FindTextSegment[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    let match_start = -1;
    let match_term_idx = -1;

    find_terms.forEach((term, term_idx) => {
      const start = lower_text.indexOf(term, cursor);
      if (start === -1) return;
      const is_earlier = match_start === -1 || start < match_start;
      const is_longer_at_same_start = start === match_start && term.length > find_terms[match_term_idx].length;
      if (is_earlier || is_longer_at_same_start) {
        match_start = start;
        match_term_idx = term_idx;
      }
    });

    if (match_start === -1) break;

    if (match_start > cursor) {
      segments.push({ text: text.slice(cursor, match_start), is_match: false, term_idx: -1 });
    }
    const match_end = match_start + find_terms[match_term_idx].length;
    segments.push({ text: text.slice(match_start, match_end), is_match: true, term_idx: match_term_idx });
    cursor = match_end;
  }

  if (cursor < text.length) segments.push({ text: text.slice(cursor), is_match: false, term_idx: -1 });
  return segments;
}
