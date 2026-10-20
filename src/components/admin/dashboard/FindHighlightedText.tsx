import React from "react";
import { getFindTermColorIdx, splitTextByFind } from "@/lib/table-find";
import styles from "./LinkBuildingOrdersTable.module.scss";

interface FindHighlightedTextProps {
  text: string;
  /** Already normalized find terms (see parseFindTerms), empty renders the text as is. */
  find_terms?: string[];
}

const EMPTY_FIND_TERMS: string[] = [];

/**
 * Renders `text` with every occurrence of every find term wrapped in a <mark>,
 * colored per term so different orders stay easy to tell apart.
 */
export default function FindHighlightedText({ text, find_terms = EMPTY_FIND_TERMS }: FindHighlightedTextProps) {
  if (find_terms.length === 0) return <>{text}</>;

  return (
    <>
      {splitTextByFind(text, find_terms).map((segment, idx) =>
        segment.is_match ? (
          <mark
            key={idx}
            className={`${styles.find_mark} ${styles[`find_term_${getFindTermColorIdx(segment.term_idx)}`]}`}
          >
            {segment.text}
          </mark>
        ) : (
          <React.Fragment key={idx}>{segment.text}</React.Fragment>
        )
      )}
    </>
  );
}
