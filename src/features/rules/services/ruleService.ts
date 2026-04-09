import { v4 as uuidv4 } from "uuid";
import { ruleRepository } from "@/db/repositories/ruleRepository";
import { dayjs } from "@/lib/dayjs";
import type { RuleHintRecord } from "@/types";

export class RuleService {
  async listRules() {
    return ruleRepository.listRules();
  }

  async saveRule(input: Omit<RuleHintRecord, "id" | "created_at" | "updated_at"> & { id?: string }) {
    const now = dayjs().toISOString();
    const existing = input.id ? (await ruleRepository.listRules()).find((item) => item.id === input.id) : null;
    const record: RuleHintRecord = {
      id: input.id ?? uuidv4(),
      rule_code: input.rule_code,
      name: input.name,
      category: input.category,
      description: input.description,
      trigger_expression: input.trigger_expression,
      hint_text: input.hint_text,
      severity_level: input.severity_level,
      is_enabled: input.is_enabled,
      sort_order: input.sort_order,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
    await ruleRepository.saveRule(record);
    return record;
  }
}

export const ruleService = new RuleService();
