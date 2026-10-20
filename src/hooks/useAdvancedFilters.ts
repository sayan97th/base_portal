"use client";

import { useState, useCallback, useMemo } from "react";
import type {
  AdvancedFilterJoinOperator,
  AdvancedFilterRule,
  LinkBuildingOrderAdvancedFilters,
} from "@/types/admin/link-building-order";
import {
  EMPTY_ADVANCED_FILTERS,
  createAdvancedFilterGroup,
  createAdvancedFilterId,
  createAdvancedFilterRule,
} from "@/lib/link-building-advanced-filters";

/** Where a rule lives: the top level (null) or the id of a condition group. */
export type AdvancedFilterRuleLocation = string | null;

export interface AdvancedFilterActions {
  addRule: (group_id?: AdvancedFilterRuleLocation) => void;
  updateRule: (rule_id: string, patch: Partial<AdvancedFilterRule>, group_id?: AdvancedFilterRuleLocation) => void;
  removeRule: (rule_id: string, group_id?: AdvancedFilterRuleLocation) => void;
  duplicateRule: (rule_id: string, group_id?: AdvancedFilterRuleLocation) => void;
  addGroup: () => void;
  removeGroup: (group_id: string) => void;
  setOperator: (operator: AdvancedFilterJoinOperator) => void;
  setGroupOperator: (group_id: string, operator: AdvancedFilterJoinOperator) => void;
  clearAll: () => void;
}

/** Applies `update` to the rule list at `group_id`. A group left without rules is removed. */
function updateRulesAt(
  filters: LinkBuildingOrderAdvancedFilters,
  group_id: AdvancedFilterRuleLocation,
  update: (rules: AdvancedFilterRule[]) => AdvancedFilterRule[]
): LinkBuildingOrderAdvancedFilters {
  if (group_id === null) return { ...filters, rules: update(filters.rules) };
  return {
    ...filters,
    groups: filters.groups
      .map((group) => (group.id === group_id ? { ...group, rules: update(group.rules) } : group))
      .filter((group) => group.rules.length > 0),
  };
}

/**
 * State of the monday style "Advanced filters" panel: top level rules and
 * condition groups, each joined by its own And / Or. Rules can be added,
 * edited, paused, duplicated and removed independently, so any number of
 * filters can be combined on the table at the same time.
 */
export function useAdvancedFilters() {
  const [advanced_filters, setAdvancedFilters] = useState<LinkBuildingOrderAdvancedFilters>(EMPTY_ADVANCED_FILTERS);

  const addRule = useCallback((group_id: AdvancedFilterRuleLocation = null) => {
    setAdvancedFilters((prev) => updateRulesAt(prev, group_id, (rules) => [...rules, createAdvancedFilterRule()]));
  }, []);

  const updateRule = useCallback(
    (rule_id: string, patch: Partial<AdvancedFilterRule>, group_id: AdvancedFilterRuleLocation = null) => {
      setAdvancedFilters((prev) =>
        updateRulesAt(prev, group_id, (rules) => rules.map((rule) => (rule.id === rule_id ? { ...rule, ...patch } : rule)))
      );
    },
    []
  );

  const removeRule = useCallback((rule_id: string, group_id: AdvancedFilterRuleLocation = null) => {
    setAdvancedFilters((prev) => updateRulesAt(prev, group_id, (rules) => rules.filter((rule) => rule.id !== rule_id)));
  }, []);

  /** Inserts a copy right below the original, so a similar rule is one click away. */
  const duplicateRule = useCallback((rule_id: string, group_id: AdvancedFilterRuleLocation = null) => {
    setAdvancedFilters((prev) =>
      updateRulesAt(prev, group_id, (rules) =>
        rules.flatMap((rule) =>
          rule.id === rule_id ? [rule, { ...rule, id: createAdvancedFilterId("rule"), values: [...rule.values] }] : [rule]
        )
      )
    );
  }, []);

  const addGroup = useCallback(() => {
    setAdvancedFilters((prev) => ({ ...prev, groups: [...prev.groups, createAdvancedFilterGroup()] }));
  }, []);

  const removeGroup = useCallback((group_id: string) => {
    setAdvancedFilters((prev) => ({ ...prev, groups: prev.groups.filter((group) => group.id !== group_id) }));
  }, []);

  const setOperator = useCallback((operator: AdvancedFilterJoinOperator) => {
    setAdvancedFilters((prev) => ({ ...prev, operator }));
  }, []);

  const setGroupOperator = useCallback((group_id: string, operator: AdvancedFilterJoinOperator) => {
    setAdvancedFilters((prev) => ({
      ...prev,
      groups: prev.groups.map((group) => (group.id === group_id ? { ...group, operator } : group)),
    }));
  }, []);

  const clearAll = useCallback(() => setAdvancedFilters(EMPTY_ADVANCED_FILTERS), []);

  /** Replaces the whole panel at once, e.g. when a saved filter or the saved view is applied. */
  const replaceAdvancedFilters = useCallback((filters: LinkBuildingOrderAdvancedFilters) => {
    setAdvancedFilters(filters);
  }, []);

  const advanced_filter_actions = useMemo<AdvancedFilterActions>(
    () => ({
      addRule,
      updateRule,
      removeRule,
      duplicateRule,
      addGroup,
      removeGroup,
      setOperator,
      setGroupOperator,
      clearAll,
    }),
    [addRule, updateRule, removeRule, duplicateRule, addGroup, removeGroup, setOperator, setGroupOperator, clearAll]
  );

  return { advanced_filters, advanced_filter_actions, replaceAdvancedFilters };
}
