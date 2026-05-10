import type {
  CaseEventRecord,
  CaseNoteRecord,
  CaseRecord,
  CaseRuleHintHitRecord,
  CaseTagRecord,
  ChartPalaceRecord,
  ChartRecord,
  ChartStarRecord,
  ChartTransformRecord,
  PalaceInterpretationRecord,
  RuleHintRecord,
  TagRecord,
} from "@/types";

export interface AppDatabaseTables {
  charts: ChartRecord;
  chart_palaces: ChartPalaceRecord;
  chart_stars: ChartStarRecord;
  chart_transforms: ChartTransformRecord;
  case_records: CaseRecord;
  case_notes: CaseNoteRecord;
  case_events: CaseEventRecord;
  tags: TagRecord;
  case_tags: CaseTagRecord;
  rule_hints: RuleHintRecord;
  case_rule_hint_hits: CaseRuleHintHitRecord;
  palace_interpretations: PalaceInterpretationRecord;
}

export const appDbStores: Record<keyof AppDatabaseTables, string> = {
  charts:
    "id, subject_name, gender, birth_date, created_at, updated_at, life_master_star, archived_at",
  chart_palaces:
    "id, chart_id, palace_code, earthly_branch, heavenly_stem, display_order, updated_at",
  chart_stars:
    "id, chart_id, palace_id, star_name, star_category, transform_type, updated_at",
  chart_transforms:
    "id, chart_id, transform_type, star_name, target_palace_code, updated_at",
  case_records:
    "id, chart_id, case_code, consultation_topic, status, created_at, updated_at, last_activity_at",
  case_notes:
    "id, case_id, note_type, related_palace_code, related_topic, created_at, updated_at, deleted_at",
  case_events: "id, case_id, event_type, event_date, created_at, updated_at",
  tags: "id, tag_name, tag_group, is_builtin, updated_at",
  case_tags: "id, case_id, tag_id, created_at",
  rule_hints: "id, rule_code, category, is_enabled, sort_order, updated_at",
  case_rule_hint_hits: "id, case_id, rule_hint_id, matched_at, created_at, updated_at",
  palace_interpretations:
    "id, palace_name, category, is_enabled, sort_order, source, updated_at",
};

export const appDbStoresV1 = {
  charts: appDbStores.charts,
  chart_palaces: appDbStores.chart_palaces,
  chart_stars: appDbStores.chart_stars,
  chart_transforms: appDbStores.chart_transforms,
  case_records: appDbStores.case_records,
  case_notes: appDbStores.case_notes,
  case_events: appDbStores.case_events,
  tags: appDbStores.tags,
  case_tags: appDbStores.case_tags,
  rule_hints: appDbStores.rule_hints,
  case_rule_hint_hits: appDbStores.case_rule_hint_hits,
};
