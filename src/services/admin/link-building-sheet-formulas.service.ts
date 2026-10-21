import { apiClient } from "@/lib/api-client";
import type {
  LinkBuildingOrderFormulaColumnPayload,
  LinkBuildingOrderSheetFormula,
  LinkBuildingOrderSheetFormulas,
} from "@/types/admin/link-building-order";

const BASE_URL = "/api/admin/link-building-orders/sheet-formulas";

/**
 * GET /api/admin/link-building-orders/sheet-formulas
 * The team's formula columns (in display order) and totals row cells.
 */
export async function listSheetFormulas(): Promise<LinkBuildingOrderSheetFormulas> {
  const res = await apiClient.get<{ data: LinkBuildingOrderSheetFormulas }>(BASE_URL);
  return res.data;
}

/**
 * POST /api/admin/link-building-orders/sheet-formulas/columns
 * Adds a formula column after the existing ones.
 */
export async function createFormulaColumn(
  payload: Required<Pick<LinkBuildingOrderFormulaColumnPayload, "name" | "formula">> &
    Pick<LinkBuildingOrderFormulaColumnPayload, "format">
): Promise<LinkBuildingOrderSheetFormula> {
  const res = await apiClient.post<{ message: string; data: LinkBuildingOrderSheetFormula }>(
    `${BASE_URL}/columns`,
    payload
  );
  return res.data;
}

/**
 * PUT /api/admin/link-building-orders/sheet-formulas/columns/{id}
 * Renames a formula column or changes its formula, format or position.
 */
export async function updateFormulaColumn(
  id: number,
  payload: LinkBuildingOrderFormulaColumnPayload
): Promise<LinkBuildingOrderSheetFormula> {
  const res = await apiClient.put<{ message: string; data: LinkBuildingOrderSheetFormula }>(
    `${BASE_URL}/columns/${id}`,
    payload
  );
  return res.data;
}

/**
 * DELETE /api/admin/link-building-orders/sheet-formulas/columns/{id}
 * Also clears the totals cell under the column.
 */
export async function deleteFormulaColumn(id: number): Promise<void> {
  await apiClient.delete<{ message: string }>(`${BASE_URL}/columns/${id}`);
}

/**
 * PUT /api/admin/link-building-orders/sheet-formulas/summary
 * Sets the totals cell under a column, or clears it when the formula is null.
 */
export async function saveSummaryFormula(
  target_key: string,
  formula: string | null
): Promise<LinkBuildingOrderSheetFormulas> {
  const res = await apiClient.put<{ message: string; data: LinkBuildingOrderSheetFormulas }>(
    `${BASE_URL}/summary`,
    { target_key, formula }
  );
  return res.data;
}
