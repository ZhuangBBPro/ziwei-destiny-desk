import { v4 as uuidv4 } from "uuid";
import { dayjs } from "@/lib/dayjs";
import type { RuleHintRecord, TagRecord } from "@/types";

function makeBase() {
  const now = dayjs().toISOString();
  return {
    id: uuidv4(),
    created_at: now,
    updated_at: now,
  };
}

export const builtinTagsSeed: TagRecord[] = [
  ["婚恋", "topic", "#c06c84"],
  ["事业", "topic", "#355c7d"],
  ["财运", "topic", "#f8b400"],
  ["健康", "topic", "#6c9a8b"],
  ["迁移", "topic", "#4d8076"],
  ["晚婚倾向", "structure", "#8c5e58"],
  ["迁移强", "structure", "#4f6f52"],
  ["财帛波动", "structure", "#d17b0f"],
  ["已验证", "result", "#2a9d8f"],
  ["误判", "result", "#b23a48"],
  ["待回访", "result", "#577590"],
  ["破财风险", "risk", "#b56576"],
  ["关系冲突", "risk", "#8d0801"],
  ["高压期", "risk", "#6d597a"],
].map(([tag_name, tag_group, color]) => ({
  ...makeBase(),
  tag_name,
  tag_group: tag_group as TagRecord["tag_group"],
  color,
  description: "",
  is_builtin: true,
}));

export const builtinRuleHintsSeed: RuleHintRecord[] = [
  {
    ...makeBase(),
    rule_code: "palace-has-star",
    name: "指定宫位含目标星曜",
    category: "structure",
    description: "用于提示某宫是否含指定星曜",
    trigger_expression: {
      mode: "palace_has_any_star",
      palaceCode: "career",
      starNames: ["紫微"],
    },
    hint_text: "目标宫位出现核心星曜，请结合案例主题重点复核。",
    severity_level: "info",
    is_enabled: true,
    sort_order: 10,
  },
  {
    ...makeBase(),
    rule_code: "palace-has-all-stars",
    name: "指定宫位同时具备多颗星",
    category: "structure",
    description: "用于提示组合结构",
    trigger_expression: {
      mode: "palace_has_all_stars",
      palaceCode: "wealth",
      starNames: ["武曲", "贪狼"],
    },
    hint_text: "该宫位命中组合结构，请在批注中记录验证情况。",
    severity_level: "warning",
    is_enabled: true,
    sort_order: 20,
  },
];
