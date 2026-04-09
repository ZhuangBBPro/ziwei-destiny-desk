import { appDb } from "@/db/appDb";
import type { RuleHintRecord } from "@/types";

export class RuleRepository {
  async listRules() {
    return appDb.rule_hints.orderBy("sort_order").toArray();
  }

  async saveRule(record: RuleHintRecord) {
    await appDb.rule_hints.put(record);
    return record;
  }
}

export const ruleRepository = new RuleRepository();
