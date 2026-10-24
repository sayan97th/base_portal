import { useEffect, useState } from "react";
import { getCachedArticleDocTitle, loadArticleDocTitle } from "@/lib/article-doc-title";
import type { ArticleDocTitle } from "@/types/admin/link-building-order";

interface LoadedTitle {
  url: string;
  result: ArticleDocTitle | null;
  has_error: boolean;
}

interface ArticleDocTitleState {
  result: ArticleDocTitle | null;
  is_loading: boolean;
  has_error: boolean;
}

/**
 * Title of the Google Doc behind an Article link. It is only requested once
 * `is_enabled` turns true (the preview card opens), so rendering the table never
 * sends a request per row. A title already looked up in this tab shows at once.
 */
export function useArticleDocTitle(url: string, is_enabled: boolean): ArticleDocTitleState {
  const [loaded, setLoaded] = useState<LoadedTitle | null>(null);

  const cached = getCachedArticleDocTitle(url);
  const loaded_for_url = loaded?.url === url ? loaded : null;
  const has_url = url.trim() !== "";

  useEffect(() => {
    if (!is_enabled || !has_url || getCachedArticleDocTitle(url)) return;

    let is_cancelled = false;
    loadArticleDocTitle(url)
      .then((result) => {
        if (!is_cancelled) setLoaded({ url, result, has_error: false });
      })
      .catch(() => {
        if (!is_cancelled) setLoaded({ url, result: null, has_error: true });
      });

    return () => {
      is_cancelled = true;
    };
  }, [url, has_url, is_enabled]);

  return {
    result: cached ?? loaded_for_url?.result ?? null,
    is_loading: is_enabled && has_url && !cached && loaded_for_url === null,
    has_error: !cached && (loaded_for_url?.has_error ?? false),
  };
}
