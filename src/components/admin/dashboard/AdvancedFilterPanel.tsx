"use client";

import React from "react";
import type { AdvancedFilterJoinOperator, LinkBuildingOrderAdvancedFilters } from "@/types/admin/link-building-order";
import {
  countActiveAdvancedRules,
  hasAdvancedFilterRules,
  type AdvancedFilterColumn,
} from "@/lib/link-building-advanced-filters";
import type { AdvancedFilterActions } from "@/hooks/useAdvancedFilters";
import FilterFieldMenu from "./FilterFieldMenu";
import AdvancedFilterRuleRow from "./AdvancedFilterRuleRow";

interface AdvancedFilterPanelProps {
  columns: AdvancedFilterColumn[];
  advanced_filters: LinkBuildingOrderAdvancedFilters;
  actions: AdvancedFilterActions;
  loadValues: (key: string, search: string) => Promise<string[]>;
}

const JOIN_OPTIONS: { value: AdvancedFilterJoinOperator; label: string }[] = [
  { value: "and", label: "And" },
  { value: "or", label: "Or" },
];

const joinLabel = (operator: AdvancedFilterJoinOperator) => (operator === "or" ? "Or" : "And");

/**
 * The word in front of a rule, as on monday: "Where" for the first one, an
 * And / Or picker on the second (which sets the join for its whole level), and
 * a read only echo of that join on every rule after it.
 */
function JoinPrefix({
  index,
  operator,
  onChange,
}: {
  index: number;
  operator: AdvancedFilterJoinOperator;
  onChange: (operator: AdvancedFilterJoinOperator) => void;
}) {
  if (index === 0) {
    return <span className="pl-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">Where</span>;
  }
  if (index === 1) {
    return (
      <FilterFieldMenu<{ value: AdvancedFilterJoinOperator; label: string }>
        label="Join filters with"
        width_class="w-16"
        options={JOIN_OPTIONS}
        getOptionId={(option) => option.value}
        isSelected={(option) => option.value === operator}
        onSelect={(option) => onChange(option.value)}
        renderValue={() => <span className="font-medium">{joinLabel(operator)}</span>}
        renderOption={(option) => <span>{option.label}</span>}
      />
    );
  }
  return (
    <span className="pl-1.5 text-xs font-medium text-gray-400 dark:text-gray-500" title="Change it on the second filter">
      {joinLabel(operator)}
    </span>
  );
}

function PlusIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

const add_button_class =
  "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 dark:text-brand-400 dark:hover:bg-brand-500/10";

/**
 * Content of the monday style "Advanced filters" view. Admins combine as many
 * rules as they need, join them with And / Or, and nest condition groups for
 * mixed logic such as "Status is Live or (DR > 50 and Company contains Acme)".
 * Changes apply to the table right away and are saved with the rest of the view
 * to the admin's account.
 */
export default function AdvancedFilterPanel({ columns, advanced_filters, actions, loadValues }: AdvancedFilterPanelProps) {
  const has_rules = hasAdvancedFilterRules(advanced_filters);
  const active_rule_count = countActiveAdvancedRules(advanced_filters);
  const top_level_count = advanced_filters.rules.length + advanced_filters.groups.length;

  return (
    <div>
      <div className="max-h-[min(55vh,30rem)] overflow-y-auto px-3 pb-1 pt-3">
        {top_level_count === 0 ? (
          <div className="flex flex-col items-center px-4 py-6 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
              </svg>
            </span>
            <p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-200">No filters yet</p>
            <p className="mt-1 max-w-sm text-xs text-gray-400 dark:text-gray-500">
              Pick a column, a condition and a value. Add more filters and join them with And or Or, or group them for mixed logic.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {advanced_filters.rules.map((rule, index) => (
              <AdvancedFilterRuleRow
                key={rule.id}
                rule={rule}
                columns={columns}
                loadValues={loadValues}
                prefix={<JoinPrefix index={index} operator={advanced_filters.operator} onChange={actions.setOperator} />}
                onChange={(patch) => actions.updateRule(rule.id, patch)}
                onRemove={() => actions.removeRule(rule.id)}
                onDuplicate={() => actions.duplicateRule(rule.id)}
              />
            ))}

            {advanced_filters.groups.map((group, group_index) => (
              <div key={group.id} className="flex items-start gap-1.5 px-1 py-1">
                <div className="flex h-10 w-16 shrink-0 items-center">
                  <JoinPrefix
                    index={advanced_filters.rules.length + group_index}
                    operator={advanced_filters.operator}
                    onChange={actions.setOperator}
                  />
                </div>
                <div className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50/70 p-1.5 dark:border-gray-700 dark:bg-gray-900/40">
                  <div className="flex items-center justify-between px-1.5 pb-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      Condition group
                    </span>
                    <button
                      type="button"
                      onClick={() => actions.removeGroup(group.id)}
                      aria-label="Remove this condition group"
                      title="Remove this condition group"
                      className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="space-y-1">
                    {group.rules.map((rule, index) => (
                      <AdvancedFilterRuleRow
                        key={rule.id}
                        rule={rule}
                        columns={columns}
                        loadValues={loadValues}
                        prefix={
                          <JoinPrefix
                            index={index}
                            operator={group.operator}
                            onChange={(operator) => actions.setGroupOperator(group.id, operator)}
                          />
                        }
                        onChange={(patch) => actions.updateRule(rule.id, patch, group.id)}
                        onRemove={() => actions.removeRule(rule.id, group.id)}
                        onDuplicate={() => actions.duplicateRule(rule.id, group.id)}
                      />
                    ))}
                  </div>
                  <button type="button" onClick={() => actions.addRule(group.id)} className={`${add_button_class} mt-1`}>
                    <PlusIcon />
                    New filter in group
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-2">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => actions.addRule()} className={add_button_class}>
            <PlusIcon />
            New filter
          </button>
          <button type="button" onClick={actions.addGroup} className={add_button_class}>
            <PlusIcon />
            New group
          </button>
        </div>
        {has_rules && active_rule_count === 0 && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400">Complete a filter to apply it to the table.</p>
        )}
      </div>
    </div>
  );
}
