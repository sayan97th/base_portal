"use client";

import { useEffect, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import {
  searchPartnershipDomains,
  type PartnershipDomainSuggestion,
} from "@/services/admin/link-building-dashboard.service";

const SEARCH_DEBOUNCE_MS = 250;

const NO_SUGGESTIONS: PartnershipDomainSuggestion[] = [];

interface PartnershipDomainSuggestionsState {
  suggestions: PartnershipDomainSuggestion[];
  /** True until the suggestions for the latest typed text have loaded. */
  is_loading: boolean;
}

/**
 * Domain suggestions (with their niche) for the Partnership cell being edited.
 * Loads nothing while `is_enabled` is false, so every other cell of the grid can
 * call it unconditionally. A slow response never overwrites a newer search.
 */
export function usePartnershipDomainSuggestions(query: string, is_enabled: boolean): PartnershipDomainSuggestionsState {
  const debounced_query = useDebounce(query, SEARCH_DEBOUNCE_MS);
  const [result, setResult] = useState<{ query: string; suggestions: PartnershipDomainSuggestion[] } | null>(null);

  useEffect(() => {
    if (!is_enabled) return;

    let is_current = true;
    searchPartnershipDomains(debounced_query)
      .then((suggestions) => {
        if (is_current) setResult({ query: debounced_query, suggestions });
      })
      .catch(() => {
        if (is_current) setResult({ query: debounced_query, suggestions: NO_SUGGESTIONS });
      });

    return () => {
      is_current = false;
    };
  }, [debounced_query, is_enabled]);

  if (!is_enabled) return { suggestions: NO_SUGGESTIONS, is_loading: false };
  return {
    suggestions: result?.suggestions ?? NO_SUGGESTIONS,
    is_loading: result?.query !== query,
  };
}
