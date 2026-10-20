"use client";

import React from "react";
import type { AdvancedFilterRule } from "@/types/admin/link-building-order";
import {
  ADVANCED_FILTER_OPERATORS,
  getAdvancedOperatorInput,
  getAdvancedOperatorOption,
  getColumnChangePatch,
  getOperatorChangePatch,
  type AdvancedFilterColumn,
  type AdvancedFilterOperatorOption,
} from "@/lib/link-building-advanced-filters";
import FilterFieldMenu from "./FilterFieldMenu";
import AdvancedFilterValuesPicker from "./AdvancedFilterValuesPicker";

interface AdvancedFilterRuleRowProps {
  rule: AdvancedFilterRule;
  columns: AdvancedFilterColumn[];
  /** "Where" for the first rule, the And / Or join for the others. */
  prefix: React.ReactNode;
  onChange: (patch: Partial<AdvancedFilterRule>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  loadValues: (key: string, search: string) => Promise<string[]>;
}

const value_input_class =
  "h-8 w-full min-w-0 rounded-lg border border-gray-200 bg-white px-2.5 text-xs text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:[color-scheme:dark]";

const icon_button_base_class =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30";
const icon_button_class = `${icon_button_base_class} hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200`;
const remove_button_class = `${icon_button_base_class} hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400`;

function RuleValueInput({
  rule,
  column,
  onChange,
  loadValues,
}: {
  rule: AdvancedFilterRule;
  column: AdvancedFilterColumn | undefined;
  onChange: (patch: Partial<AdvancedFilterRule>) => void;
  loadValues: (key: string, search: string) => Promise<string[]>;
}) {
  const input = getAdvancedOperatorInput(rule.operator);

  if (!column || input === "none") {
    return (
      <div
        aria-hidden="true"
        className="flex h-8 min-w-0 flex-1 basis-40 items-center rounded-lg border border-dashed border-gray-200 px-2.5 text-xs text-gray-300 dark:border-gray-700 dark:text-gray-600"
      >
        {column ? "No value needed" : "Value"}
      </div>
    );
  }

  if (input === "values") {
    return (
      <AdvancedFilterValuesPicker
        column={column}
        values={rule.values}
        onChange={(values) => onChange({ values })}
        loadValues={loadValues}
      />
    );
  }

  if (input === "range") {
    return (
      <div className="flex min-w-0 flex-1 basis-40 items-center gap-1.5">
        <input
          type="number"
          inputMode="decimal"
          value={rule.value}
          onChange={(e) => onChange({ value: e.target.value })}
          placeholder="From"
          aria-label={`${column.label} from`}
          className={value_input_class}
        />
        <span className="shrink-0 text-[11px] text-gray-400">and</span>
        <input
          type="number"
          inputMode="decimal"
          value={rule.value_to}
          onChange={(e) => onChange({ value_to: e.target.value })}
          placeholder="To"
          aria-label={`${column.label} to`}
          className={value_input_class}
        />
      </div>
    );
  }

  return (
    <div className="min-w-0 flex-1 basis-40">
      <input
        type={input === "date" ? "date" : input === "number" ? "number" : "text"}
        inputMode={input === "number" ? "decimal" : undefined}
        value={rule.value}
        onChange={(e) => onChange({ value: e.target.value })}
        placeholder={input === "number" ? "Enter a number" : "Enter a value"}
        aria-label={`${column.label} value`}
        className={value_input_class}
      />
    </div>
  );
}

/**
 * One Advanced filters rule, read like a sentence: "Where Status is Live".
 * Picking another column keeps the condition when the new column supports it,
 * and values are cleared whenever they no longer fit. A paused rule stays in
 * the list, faded, without narrowing the table.
 */
export default function AdvancedFilterRuleRow({
  rule,
  columns,
  prefix,
  onChange,
  onRemove,
  onDuplicate,
  loadValues,
}: AdvancedFilterRuleRowProps) {
  const column = columns.find((candidate) => candidate.key === rule.key);
  const operators = column ? ADVANCED_FILTER_OPERATORS[column.kind] : [];
  const selected_operator = column ? getAdvancedOperatorOption(column.kind, rule.operator) : undefined;
  const pause_label = rule.is_disabled ? "Turn this filter on" : "Pause this filter";

  return (
    <div
      className={`group/rule flex flex-wrap items-center gap-1.5 rounded-lg px-1 py-1 transition-colors hover:bg-gray-50 sm:flex-nowrap dark:hover:bg-gray-800/60 ${
        rule.is_disabled ? "opacity-50" : ""
      }`}
      data-paused={rule.is_disabled}
    >
      <div className="flex w-16 shrink-0 items-center">{prefix}</div>

      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 sm:flex-nowrap">
        <FilterFieldMenu<AdvancedFilterColumn>
          label="Column"
          width_class="w-full sm:w-44 sm:shrink-0"
          menu_min_width={220}
          menu_heading="Columns"
          options={columns}
          getOptionId={(option) => option.key}
          getSearchText={(option) => option.label}
          search_placeholder="Search columns"
          isSelected={(option) => option.key === rule.key}
          onSelect={(option) => {
            if (option.key !== rule.key) onChange(getColumnChangePatch(rule, column, option));
          }}
          renderValue={() =>
            column ? (
              <>
                {column.swatch_class && <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${column.swatch_class}`} aria-hidden="true" />}
                <span className="truncate">{column.label}</span>
              </>
            ) : (
              <span className="truncate text-gray-400 dark:text-gray-500">Column</span>
            )
          }
          renderOption={(option) => (
            <>
              {option.swatch_class && <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${option.swatch_class}`} aria-hidden="true" />}
              <span className="truncate">{option.label}</span>
            </>
          )}
        />

        <FilterFieldMenu<AdvancedFilterOperatorOption>
          label="Condition"
          width_class="w-full sm:w-40 sm:shrink-0"
          menu_min_width={200}
          disabled={!column}
          options={operators}
          getOptionId={(option) => option.value}
          isSelected={(option) => option.value === rule.operator}
          onSelect={(option) => {
            if (option.value !== rule.operator) onChange(getOperatorChangePatch(rule, option.value));
          }}
          renderValue={() =>
            selected_operator ? (
              <span className="truncate">{selected_operator.label}</span>
            ) : (
              <span className="truncate text-gray-400 dark:text-gray-500">Condition</span>
            )
          }
          renderOption={(option) => <span>{option.label}</span>}
        />

        <RuleValueInput
          // Remounts when the column changes, so a picker never shows another column's state.
          key={rule.key ?? "none"}
          rule={rule}
          column={column}
          onChange={onChange}
          loadValues={loadValues}
        />
      </div>

      <div className="flex shrink-0 items-center">
        <button
          type="button"
          onClick={() => onChange({ is_disabled: !rule.is_disabled })}
          aria-label={pause_label}
          aria-pressed={rule.is_disabled}
          title={pause_label}
          className={`${icon_button_class} ${rule.is_disabled ? "" : "sm:opacity-0 sm:group-hover/rule:opacity-100 sm:focus-visible:opacity-100"}`}
        >
          {rule.is_disabled ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </button>
        <button
          type="button"
          onClick={onDuplicate}
          aria-label="Duplicate this filter"
          title="Duplicate this filter"
          className={`${icon_button_class} sm:opacity-0 sm:group-hover/rule:opacity-100 sm:focus-visible:opacity-100`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove this filter"
          title="Remove this filter"
          className={remove_button_class}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
