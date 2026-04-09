import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { CardSection } from "@/components/ui/CardSection";
import { FieldError } from "@/components/ui/FieldError";
import { EmptyState } from "@/components/ui/EmptyState";
import { ruleFormSchema, type RuleFormValues } from "@/features/rules/schemas/ruleSchema";
import { ruleService } from "@/features/rules/services/ruleService";
import { exportService } from "@/features/settings/services/exportService";
import { tagFormSchema, type TagFormValues } from "@/features/tags/schemas/tagSchema";
import { tagService } from "@/features/tags/services/tagService";
import type { RuleHintRecord, TagRecord } from "@/types";

const defaultTagValues: TagFormValues = {
  tag_name: "",
  tag_group: "custom",
  color: "#355c7d",
  description: "",
  is_builtin: false,
};

const defaultRuleValues: RuleFormValues = {
  rule_code: "",
  name: "",
  category: "structure",
  description: "",
  trigger_expression: {
    mode: "palace_has_any_star",
    palaceCode: "career",
    starNames: ["紫微"],
  },
  hint_text: "",
  severity_level: "info",
  is_enabled: true,
  sort_order: 100,
};

export function SettingsPage() {
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [rules, setRules] = useState<RuleHintRecord[]>([]);
  const [selectedTag, setSelectedTag] = useState<TagRecord | null>(null);
  const [selectedRule, setSelectedRule] = useState<RuleHintRecord | null>(null);

  const tagForm = useForm<TagFormValues>({
    resolver: zodResolver(tagFormSchema),
    defaultValues: defaultTagValues,
  });

  const ruleForm = useForm<RuleFormValues>({
    resolver: zodResolver(ruleFormSchema),
    defaultValues: defaultRuleValues,
  });

  async function load() {
    const [nextTags, nextRules] = await Promise.all([
      tagService.listTags(),
      ruleService.listRules(),
    ]);
    setTags(nextTags);
    setRules(nextRules);
  }

  useEffect(() => {
    load().catch((error) => {
      console.error("Failed to load settings", error);
    });
  }, []);

  useEffect(() => {
    if (!selectedTag) {
      tagForm.reset(defaultTagValues);
      return;
    }
    tagForm.reset(selectedTag);
  }, [selectedTag]);

  useEffect(() => {
    if (!selectedRule) {
      ruleForm.reset(defaultRuleValues);
      return;
    }
    ruleForm.reset(selectedRule);
  }, [selectedRule]);

  const submitTag = tagForm.handleSubmit(async (values) => {
    await tagService.saveTag(values);
    setSelectedTag(null);
    await load();
  });

  const submitRule = ruleForm.handleSubmit(async (values) => {
    await ruleService.saveRule(values);
    setSelectedRule(null);
    await load();
  });

  const watchedStarNames = ruleForm.watch("trigger_expression.starNames") ?? [];

  return (
    <div className="space-y-4">
      <CardSection
        title="标签管理"
        description="支持新增、编辑标签，并在案例详情页绑定多个标签。"
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="space-y-3">
            {tags.length === 0 ? (
              <EmptyState title="暂无标签" description="内置标签初始化失败时，可在这里手动补录。" />
            ) : (
              tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => setSelectedTag(tag)}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <div>
                      <p className="font-medium text-slate-900">{tag.tag_name}</p>
                      <p className="text-xs text-slate-500">{tag.tag_group}</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500">
                    {tag.is_builtin ? "内置" : "自定义"}
                  </span>
                </button>
              ))
            )}
          </div>

          <form className="space-y-4" onSubmit={submitTag}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">标签名称</span>
                <input
                  {...tagForm.register("tag_name")}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                />
                <FieldError message={tagForm.formState.errors.tag_name?.message} />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">标签分组</span>
                <select
                  {...tagForm.register("tag_group")}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                >
                  {["topic", "structure", "result", "risk", "custom"].map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">颜色</span>
                <input
                  {...tagForm.register("color")}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                />
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input type="checkbox" {...tagForm.register("is_builtin")} />
                <span className="text-sm text-slate-700">内置标签</span>
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">说明</span>
              <textarea
                {...tagForm.register("description")}
                className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
              />
            </label>
            <div className="flex gap-3">
              <button type="submit" className="rounded-2xl bg-ink px-4 py-3 text-sm text-white">
                保存标签
              </button>
              <button
                type="button"
                onClick={() => setSelectedTag(null)}
                className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700"
              >
                新建
              </button>
            </div>
          </form>
        </div>
      </CardSection>

      <CardSection
        title="规则提示"
        description="第一版使用轻量 JSON 条件，命中结果会在案例详情页落库展示。"
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="space-y-3">
            {rules.length === 0 ? (
              <EmptyState title="暂无规则" description="可以先建立简单的宫位含星规则。" />
            ) : (
              rules.map((rule) => (
                <button
                  key={rule.id}
                  type="button"
                  onClick={() => setSelectedRule(rule)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{rule.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{rule.rule_code}</p>
                    </div>
                    <span className="text-xs text-slate-500">
                      {rule.is_enabled ? "启用" : "停用"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{rule.hint_text}</p>
                </button>
              ))
            )}
          </div>

          <form className="space-y-4" onSubmit={submitRule}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">规则编码</span>
                <input
                  {...ruleForm.register("rule_code")}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                />
                <FieldError message={ruleForm.formState.errors.rule_code?.message} />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">名称</span>
                <input
                  {...ruleForm.register("name")}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                />
                <FieldError message={ruleForm.formState.errors.name?.message} />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">类别</span>
                <input
                  {...ruleForm.register("category")}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">等级</span>
                <input
                  {...ruleForm.register("severity_level")}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">说明</span>
              <textarea
                {...ruleForm.register("description")}
                className="mt-2 min-h-20 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
              />
            </label>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">模式</span>
                <select
                  {...ruleForm.register("trigger_expression.mode")}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                >
                  <option value="palace_has_any_star">palace_has_any_star</option>
                  <option value="palace_has_all_stars">palace_has_all_stars</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">宫位编码</span>
                <input
                  {...ruleForm.register("trigger_expression.palaceCode")}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">星曜</span>
                <input
                  value={watchedStarNames.join("、")}
                  onChange={(event) =>
                    ruleForm.setValue(
                      "trigger_expression.starNames",
                      event.target.value
                        .split(/[、,，]/)
                        .map((item) => item.trim())
                        .filter(Boolean),
                    )
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                  placeholder="紫微、贪狼"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">提示文案</span>
              <textarea
                {...ruleForm.register("hint_text")}
                className="mt-2 min-h-20 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
              />
              <FieldError message={ruleForm.formState.errors.hint_text?.message} />
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input type="checkbox" {...ruleForm.register("is_enabled")} />
                <span className="text-sm text-slate-700">启用规则</span>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">排序</span>
                <input
                  type="number"
                  {...ruleForm.register("sort_order")}
                  className="mt-2 w-28 rounded-2xl border border-slate-200 bg-white px-4 py-3"
                />
              </label>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="rounded-2xl bg-ink px-4 py-3 text-sm text-white">
                保存规则
              </button>
              <button
                type="button"
                onClick={() => setSelectedRule(null)}
                className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700"
              >
                新建
              </button>
            </div>
          </form>
        </div>
      </CardSection>

      <CardSection
        title="数据导出"
        description="支持导出全部本地数据为 JSON；单案例导出在详情页操作。"
      >
        <button
          type="button"
          onClick={() => {
            exportService.exportAll().catch((error) => {
              console.error("Failed to export all data", error);
            });
          }}
          className="rounded-2xl bg-ink px-4 py-3 text-sm text-white"
        >
          导出全部数据 JSON
        </button>
      </CardSection>
    </div>
  );
}
