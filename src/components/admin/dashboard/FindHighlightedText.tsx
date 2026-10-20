import React from "react";
import { splitTextByFind } from "@/lib/table-find";
import styles from "./LinkBuildingOrdersTable.module.scss";

interface FindHighlightedTextProps {
  text: string;
  /** Already normalized find query (see normalizeFindQuery), empty renders the text as is. */
  normalized_query?: string;
}

/** Renders `text` with every occurrence of the find query wrapped in a <mark>. */
export default function FindHighlightedText({ text, normalized_query = "" }: FindHighlightedTextProps) {
  if (!normalized_query) return <>{text}</>;

  return (
    <>
      {splitTextByFind(text, normalized_query).map((segment, idx) =>
        segment.is_match ? (
          <mark key={idx} className={styles.find_mark}>
            {segment.text}
          </mark>
        ) : (
          <React.Fragment key={idx}>{segment.text}</React.Fragment>
        )
      )}
    </>
  );
}
