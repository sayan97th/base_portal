// Helpers for the in-table "Find" (Ctrl/Cmd+F) feature. Unlike the server side
// search, find never removes rows, it only highlights the cells that match so
// they can still be compared against the rest of the page.

export interface FindTextSegment {
  text: string;
  is_match: boolean;
}

/** Trims and lowercases a find query, an empty result means "nothing to find". */
export function normalizeFindQuery(query: string): string {
  return query.trim().toLowerCase();
}

/** True when `text` contains the already normalized `normalized_query` (case insensitive). */
export function textMatchesFind(text: string, normalized_query: string): boolean {
  if (!normalized_query || !text) return false;
  return text.toLowerCase().includes(normalized_query);
}

/**
 * Splits `text` into alternating plain and matching segments, so every occurrence
 * of the query can be wrapped in a <mark> while keeping the original casing.
 */
export function splitTextByFind(text: string, normalized_query: string): FindTextSegment[] {
  if (!normalized_query || !text) return [{ text, is_match: false }];

  const lower_text = text.toLowerCase();
  const segments: FindTextSegment[] = [];
  let cursor = 0;
  let match_start = lower_text.indexOf(normalized_query);

  while (match_start !== -1) {
    if (match_start > cursor) {
      segments.push({ text: text.slice(cursor, match_start), is_match: false });
    }
    const match_end = match_start + normalized_query.length;
    segments.push({ text: text.slice(match_start, match_end), is_match: true });
    cursor = match_end;
    match_start = lower_text.indexOf(normalized_query, cursor);
  }

  if (cursor < text.length) segments.push({ text: text.slice(cursor), is_match: false });
  return segments;
}
