import type { BaseEntity } from "@/types/common";

export interface RuleHintRecord extends BaseEntity {
  rule_code: string;
  name: string;
  category: string;
  description: string;
  trigger_expression: Record<string, unknown>;
  hint_text: string;
  severity_level: string;
  is_enabled: boolean;
  sort_order: number;
}

export interface CaseRuleHintHitRecord extends BaseEntity {
  case_id: string;
  rule_hint_id: string;
  matched_payload_json: Record<string, unknown>;
  matched_at: string;
}
