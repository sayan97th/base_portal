import { getArticleDocTitle } from "@/services/admin/link-building-dashboard.service";
import type { ArticleDocTitle } from "@/types/admin/link-building-order";

const DOCS_LINK_PATTERN = /^\/(?:u\/\d+\/)?(document|spreadsheets|presentation|forms)(?:\/u\/\d+)?\/d\/[A-Za-z0-9_-]{10,}/;
const DRIVE_FILE_PATTERN = /^\/(?:u\/\d+\/)?file\/d\/[A-Za-z0-9_-]{10,}/;

/**
 * True for a Google Docs, Sheets, Slides, Forms or Drive file link, the links
 * whose title the server can look up. Mirrors GoogleDocTitleService::parseLink.
 */
export function isGoogleDocLink(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  const host = parsed.hostname.toLowerCase();
  if (host === "docs.google.com") return DOCS_LINK_PATTERN.test(parsed.pathname);
  if (host === "drive.google.com") {
    return DRIVE_FILE_PATTERN.test(parsed.pathname) || (/^\/(open|uc)$/.test(parsed.pathname) && parsed.searchParams.has("id"));
  }
  return false;
}

/** Short name of the Google product a link opens, for the preview card. */
export function getGoogleDocKindLabel(kind: ArticleDocTitle["kind"]): string {
  switch (kind) {
    case "spreadsheets":
      return "Google Sheets";
    case "presentation":
      return "Google Slides";
    case "forms":
      return "Google Forms";
    case "file":
      return "Google Drive";
    default:
      return "Google Docs";
  }
}

// Titles already looked up in this tab, so hovering the same doc again (or the
// same doc on another row) shows its title right away. Network errors are not
// kept, so the next hover tries again.
const titles_by_url = new Map<string, ArticleDocTitle>();
const requests_by_url = new Map<string, Promise<ArticleDocTitle>>();

export function getCachedArticleDocTitle(url: string): ArticleDocTitle | undefined {
  return titles_by_url.get(url.trim());
}

/** Looks up a doc title once per link, sharing the request between cells that ask at the same time. */
export function loadArticleDocTitle(url: string): Promise<ArticleDocTitle> {
  const key = url.trim();
  const cached = titles_by_url.get(key);
  if (cached) return Promise.resolve(cached);

  const pending = requests_by_url.get(key);
  if (pending) return pending;

  const request = getArticleDocTitle(key)
    .then((result) => {
      if (result.status !== "unavailable") titles_by_url.set(key, result);
      return result;
    })
    .finally(() => {
      requests_by_url.delete(key);
    });
  requests_by_url.set(key, request);
  return request;
}

/** Clears the titles kept in this tab. Used by tests. */
export function clearArticleDocTitleCache(): void {
  titles_by_url.clear();
  requests_by_url.clear();
}
