import { z } from "zod";

export const ruleExpressionSchema = z.object({
  mode: z.enum(["palace_has_any_star", "palace_has_all_stars"]),
  palaceCode: z.string().trim().min(1, "请输入宫位编码"),
  starNames: z.array(z.string().trim().min(1)).min(1, "至少填写一颗星曜"),
});

export const ruleFormSchema = z.object({
  id: z.string().optional(),
  rule_code: z.string().trim().min(1, "请输入规则编码"),
  name: z.string().trim().min(1, "请输入规则名称"),
  category: z.string().trim().min(1, "请输入分类"),
  description: z.string().trim(),
  trigger_expression: ruleExpressionSchema,
  hint_text: z.string().trim().min(1, "请输入提示文案"),
  severity_level: z.string().trim().min(1, "请输入等级"),
  is_enabled: z.boolean(),
  sort_order: z.coerce.number().default(0),
});

export type RuleFormValues = z.infer<typeof ruleFormSchema>;
