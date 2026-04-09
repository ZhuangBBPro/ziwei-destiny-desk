import { v4 as uuidv4 } from "uuid";
import { dayjs } from "@/lib/dayjs";
import type {
  CaseRuleHintHitRecord,
  ChartAggregate,
  RuleHintRecord,
} from "@/types";

function getPalaceByCode(aggregate: ChartAggregate, palaceCode: string) {
  return aggregate.palaces.find((item) => item.palace_code === palaceCode);
}

function getPalaceStarSet(aggregate: ChartAggregate, palaceCode: string) {
  const palace = getPalaceByCode(aggregate, palaceCode);
  if (!palace) {
    return new Set<string>();
  }
  return new Set([
    ...palace.major_stars_summary,
    ...palace.minor_stars_summary,
    ...palace.sha_stars_summary,
  ]);
}

export function evaluateRuleHints(
  aggregate: ChartAggregate,
  caseId: string,
  rules: RuleHintRecord[],
): CaseRuleHintHitRecord[] {
  const now = dayjs().toISOString();

  return rules.flatMap((rule) => {
    if (!rule.is_enabled) {
      return [];
    }

    const expr = rule.trigger_expression as {
      mode?: string;
      palaceCode?: string;
      starNames?: string[];
    };

    if (!expr.mode || !expr.palaceCode || !Array.isArray(expr.starNames)) {
      return [];
    }

    const starSet = getPalaceStarSet(aggregate, expr.palaceCode);
    const hit =
      expr.mode === "palace_has_any_star"
        ? expr.starNames.some((name) => starSet.has(name))
        : expr.mode === "palace_has_all_stars"
          ? expr.starNames.every((name) => starSet.has(name))
          : false;

    if (!hit) {
      return [];
    }

    return [
      {
        id: uuidv4(),
        case_id: caseId,
        rule_hint_id: rule.id,
        matched_payload_json: {
          trigger_expression: rule.trigger_expression,
          matchedStars: expr.starNames.filter((name) => starSet.has(name)),
        },
        matched_at: now,
        created_at: now,
        updated_at: now,
      },
    ];
  });
}
