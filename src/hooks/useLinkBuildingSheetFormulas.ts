import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createFormulaColumn,
  deleteFormulaColumn,
  listSheetFormulas,
  saveSummaryFormula,
  updateFormulaColumn,
} from "@/services/admin/link-building-sheet-formulas.service";
import type {
  LinkBuildingOrderFormulaColumnPayload,
  LinkBuildingOrderSheetFormula,
  LinkBuildingOrderSheetFormulas,
} from "@/types/admin/link-building-order";

export interface UseLinkBuildingSheetFormulasReturn {
  /** Formula columns in display order. */
  formula_columns: LinkBuildingOrderSheetFormula[];
  /** Stored formula of each totals row cell, by the key of the column it sits under. */
  summary_formulas: Record<string, string>;
  is_loaded: boolean;
  /** Reloads every formula, for example after another admin changed one. */
  reload: () => Promise<void>;
  createColumn: (
    payload: Required<Pick<LinkBuildingOrderFormulaColumnPayload, "name" | "formula">> &
      Pick<LinkBuildingOrderFormulaColumnPayload, "format">
  ) => Promise<LinkBuildingOrderSheetFormula>;
  updateColumn: (id: number, payload: LinkBuildingOrderFormulaColumnPayload) => Promise<LinkBuildingOrderSheetFormula>;
  deleteColumn: (id: number) => Promise<void>;
  /** Sets (or clears, with null) the totals cell under a column. */
  saveSummary: (target_key: string, formula: string | null) => Promise<void>;
}

/**
 * Team wide formulas of the Link Building Orders spreadsheet: the formula columns
 * and the totals row. Changes are applied locally right away and every other open
 * table reloads them through the collaboration channel.
 */
export function useLinkBuildingSheetFormulas(): UseLinkBuildingSheetFormulasReturn {
  const [formulas, setFormulas] = useState<LinkBuildingOrderSheetFormulas>({ columns: [], summary: [] });
  const [is_loaded, setIsLoaded] = useState(false);
  // Responses of an older reload never overwrite a newer one.
  const request_id_ref = useRef(0);

  const reload = useCallback(async () => {
    const request_id = ++request_id_ref.current;
    try {
      const next = await listSheetFormulas();
      if (request_id === request_id_ref.current) setFormulas(next);
    } finally {
      if (request_id === request_id_ref.current) setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    reload().catch(() => {/* non-critical, the table works without formula columns */ });
  }, [reload]);

  const createColumn = useCallback<UseLinkBuildingSheetFormulasReturn["createColumn"]>(async (payload) => {
    const column = await createFormulaColumn(payload);
    setFormulas((prev) => ({
      ...prev,
      columns: [...prev.columns.filter((c) => c.id !== column.id), column].sort((a, b) => a.position - b.position || a.id - b.id),
    }));
    return column;
  }, []);

  const updateColumn = useCallback<UseLinkBuildingSheetFormulasReturn["updateColumn"]>(async (id, payload) => {
    const column = await updateFormulaColumn(id, payload);
    setFormulas((prev) => ({
      ...prev,
      columns: prev.columns.map((c) => (c.id === id ? column : c)).sort((a, b) => a.position - b.position || a.id - b.id),
    }));
    return column;
  }, []);

  const deleteColumn = useCallback(async (id: number) => {
    await deleteFormulaColumn(id);
    setFormulas((prev) => {
      const removed_key = prev.columns.find((c) => c.id === id)?.key;
      return {
        columns: prev.columns.filter((c) => c.id !== id),
        summary: prev.summary.filter((s) => s.target_key !== removed_key),
      };
    });
  }, []);

  const saveSummary = useCallback(async (target_key: string, formula: string | null) => {
    setFormulas(await saveSummaryFormula(target_key, formula));
  }, []);

  const summary_formulas = useMemo(
    () => Object.fromEntries(formulas.summary.map((s) => [s.target_key ?? s.key, s.formula])),
    [formulas.summary]
  );

  return {
    formula_columns: formulas.columns,
    summary_formulas,
    is_loaded,
    reload,
    createColumn,
    updateColumn,
    deleteColumn,
    saveSummary,
  };
}
