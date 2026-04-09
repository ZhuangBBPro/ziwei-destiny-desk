import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { CardSection } from "@/components/ui/CardSection";
import { EmptyState } from "@/components/ui/EmptyState";
import { FieldError } from "@/components/ui/FieldError";
import { StatusPill } from "@/components/ui/StatusPill";
import { PalaceGrid } from "@/features/charts/components/PalaceGrid";
import { chartService } from "@/features/charts/services/chartService";
import {
  caseFormSchema,
  eventFormSchema,
  noteFormSchema,
  type CaseFormValues,
  type EventFormValues,
  type NoteFormValues,
} from "@/features/cases/schemas/caseSchemas";
import { caseService } from "@/features/cases/services/caseService";
import { ruleService } from "@/features/rules/services/ruleService";
import { exportService } from "@/features/settings/services/exportService";
import { tagService } from "@/features/tags/services/tagService";
import { pushRecentChartView } from "@/lib/recentViews";
import type {
  CaseEventRecord,
  CaseNoteRecord,
  CaseRecord,
  ChartAggregate,
  RuleHintRecord,
  TagRecord,
} from "@/types";

const defaultCreateCaseValues: CaseFormValues = {
  consultation_topic: "",
  consultation_date: "",
  status: "active",
  priority_level: 3,
  source_channel: "",
  initial_summary: "",
  final_summary: "",
  client_feedback_summary: "",
  review_conclusion: "",
  is_reviewed: false,
  is_verified: false,
};

const defaultNoteValues: NoteFormValues = {
  note_type: "initial",
  title: "",
  content: "",
  related_palace_code: "",
  related_topic: "",
  sort_order: 0,
};

const defaultEventValues: EventFormValues = {
  event_type: "consultation",
  event_date: "",
  title: "",
  description: "",
  outcome_label: "",
};

export function ChartDetailPage() {
  const navigate = useNavigate();
  const { chartId = "", caseId } = useParams();

  const [aggregate, setAggregate] = useState<ChartAggregate | null>(null);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [notes, setNotes] = useState<CaseNoteRecord[]>([]);
  const [events, setEvents] = useState<CaseEventRecord[]>([]);
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [rules, setRules] = useState<RuleHintRecord[]>([]);
  const [ruleHits, setRuleHits] = useState<Array<{ rule_hint_id: string; matched_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const createCaseForm = useForm<CaseFormValues>({
    resolver: zodResolver(caseFormSchema),
    defaultValues: defaultCreateCaseValues,
  });

  const editCaseForm = useForm<CaseFormValues>({
    resolver: zodResolver(caseFormSchema),
    defaultValues: defaultCreateCaseValues,
  });

  const noteForm = useForm<NoteFormValues>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: defaultNoteValues,
  });

  const eventForm = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: defaultEventValues,
  });

  const activeCase = useMemo(() => {
    if (!caseId) {
      return cases[0] ?? null;
    }
    return cases.find((item) => item.id === caseId) ?? cases[0] ?? null;
  }, [cases, caseId]);

  async function loadCaseContext(targetCaseId: string) {
    const [nextNotes, nextEvents, nextTagIds, nextHits] = await Promise.all([
      caseService.listNotes(targetCaseId),
      caseService.listEvents(targetCaseId),
      caseService.getCaseTagIds(targetCaseId),
      caseService.listRuleHits(targetCaseId),
    ]);

    setNotes(nextNotes);
    setEvents(nextEvents);
    setSelectedTagIds(nextTagIds);
    setRuleHits(
      nextHits.map((item) => ({
        rule_hint_id: item.rule_hint_id,
        matched_at: item.matched_at,
      })),
    );
  }

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [chartAggregate, nextTags, nextRules] = await Promise.all([
        chartService.getChartAggregate(chartId),
        tagService.listTags(),
        ruleService.listRules(),
      ]);

      if (!chartAggregate) {
        setError("未找到命盘记录。");
        setAggregate(null);
        setCases([]);
        return;
      }

      const nextCases = await caseService.listCasesByChart(chartId);
      setAggregate(chartAggregate);
      setCases(nextCases);
      setTags(nextTags);
      setRules(nextRules);

      const resolvedCase = nextCases.find((item) => item.id === caseId) ?? nextCases[0] ?? null;
      if (resolvedCase) {
        await loadCaseContext(resolvedCase.id);
      } else {
        setNotes([]);
        setEvents([]);
        setSelectedTagIds([]);
        setRuleHits([]);
      }
    } catch (loadError) {
      console.error("Failed to load chart detail", loadError);
      setError("详情加载失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch((loadError) => {
      console.error(loadError);
    });
  }, [chartId, caseId]);

  useEffect(() => {
    if (chartId) {
      pushRecentChartView(chartId);
    }
  }, [chartId]);

  useEffect(() => {
    if (!activeCase) {
      editCaseForm.reset(defaultCreateCaseValues);
      return;
    }

    editCaseForm.reset({
      consultation_topic: activeCase.consultation_topic,
      consultation_date: activeCase.consultation_date ?? "",
      status: activeCase.status,
      priority_level: activeCase.priority_level,
      source_channel: activeCase.source_channel,
      initial_summary: activeCase.initial_summary,
      final_summary: activeCase.final_summary,
      client_feedback_summary: activeCase.client_feedback_summary,
      review_conclusion: activeCase.review_conclusion,
      is_reviewed: activeCase.is_reviewed,
      is_verified: activeCase.is_verified,
    });
  }, [activeCase]);

  function chooseCase(targetCaseId: string) {
    navigate(`/charts/${chartId}/cases/${targetCaseId}`);
  }

  async function handleCreateCase(values: CaseFormValues) {
    if (!aggregate) {
      return;
    }
    const record = await caseService.createMainCase({
      chart_id: aggregate.chart.id,
      consultation_topic: values.consultation_topic,
      consultation_date: values.consultation_date || null,
      status: values.status,
      priority_level: values.priority_level,
      source_channel: values.source_channel,
      initial_summary: values.initial_summary,
    });
    createCaseForm.reset(defaultCreateCaseValues);
    await load();
    chooseCase(record.id);
  }

  async function handleUpdateCase(values: CaseFormValues) {
    if (!activeCase) {
      return;
    }

    await caseService.updateCase({
      ...activeCase,
      consultation_topic: values.consultation_topic,
      consultation_date: values.consultation_date || null,
      status: values.status,
      priority_level: values.priority_level,
      source_channel: values.source_channel,
      initial_summary: values.initial_summary,
      final_summary: values.final_summary,
      client_feedback_summary: values.client_feedback_summary,
      review_conclusion: values.review_conclusion,
      is_reviewed: values.is_reviewed,
      is_verified: values.is_verified,
      closed_at: values.status === "closed" ? new Date().toISOString() : activeCase.closed_at,
    });
    await load();
  }

  async function handleSaveNote(values: NoteFormValues) {
    if (!activeCase) {
      return;
    }

    if (editingNoteId) {
      const current = notes.find((item) => item.id === editingNoteId);
      if (!current) {
        return;
      }
      await caseService.updateNote({
        ...current,
        note_type: values.note_type,
        title: values.title,
        content: values.content,
        related_palace_code: values.related_palace_code || null,
        related_topic: values.related_topic,
        sort_order: values.sort_order,
      });
    } else {
      await caseService.addNote(activeCase.id, {
        note_type: values.note_type,
        title: values.title,
        content: values.content,
        related_palace_code: values.related_palace_code || null,
        related_topic: values.related_topic,
        sort_order: values.sort_order,
      });
    }

    setEditingNoteId(null);
    noteForm.reset(defaultNoteValues);
    await loadCaseContext(activeCase.id);
  }

  async function handleSaveEvent(values: EventFormValues) {
    if (!activeCase) {
      return;
    }

    if (editingEventId) {
      const current = events.find((item) => item.id === editingEventId);
      if (!current) {
        return;
      }
      await caseService.updateEvent({
        ...current,
        event_type: values.event_type,
        event_date: values.event_date,
        title: values.title,
        description: values.description,
        outcome_label: values.outcome_label,
      });
    } else {
      await caseService.addEvent(activeCase.id, values);
    }

    setEditingEventId(null);
    eventForm.reset(defaultEventValues);
    await loadCaseContext(activeCase.id);
  }

  async function handleRefreshRules() {
    if (!activeCase) {
      return;
    }
    await caseService.refreshRuleHits(activeCase.id);
    await loadCaseContext(activeCase.id);
  }

  async function handleSaveTags() {
    if (!activeCase) {
      return;
    }
    await caseService.saveCaseTags(activeCase.id, selectedTagIds);
    await loadCaseContext(activeCase.id);
  }

  if (loading) {
    return <CardSection title="命盘详情">加载中...</CardSection>;
  }

  if (error || !aggregate) {
    return (
      <CardSection title="命盘详情">
        <p className="text-sm text-rose-600">{error || "未找到命盘数据"}</p>
      </CardSection>
    );
  }

  const ruleMap = new Map(rules.map((item) => [item.id, item]));

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,1fr)]">
      <div className="space-y-6">
        <CardSection
          title={aggregate.chart.subject_name}
          description={`${aggregate.chart.chart_system} · ${aggregate.chart.chart_version}`}
          action={
            activeCase ? (
              <button
                type="button"
                onClick={() => {
                  exportService.exportCase(activeCase.id).catch((error) => {
                    console.error("Failed to export case", error);
                  });
                }}
                className="rounded-2xl bg-ink px-4 py-3 text-sm text-white"
              >
                导出当前案例 JSON
              </button>
            ) : null
          }
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <InfoItem label="性别" value={aggregate.chart.gender === "male" ? "男" : "女"} />
            <InfoItem label="出生日期" value={aggregate.chart.birth_date} />
            <InfoItem label="出生时辰" value={aggregate.chart.birth_time} />
            <InfoItem label="时区" value={aggregate.chart.birth_timezone} />
            <InfoItem label="命宫" value={aggregate.chart.life_palace_branch || "-"} />
            <InfoItem label="身宫" value={aggregate.chart.body_palace_branch || "-"} />
            <InfoItem label="命主" value={aggregate.chart.life_master_star || "-"} />
            <InfoItem label="身主" value={aggregate.chart.body_master_star || "-"} />
            <InfoItem label="五行局" value={aggregate.chart.five_element_class || "-"} />
            <InfoItem label="出生地" value={aggregate.chart.birth_location || "-"} />
          </div>
          {aggregate.chart.remarks ? (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              {aggregate.chart.remarks}
            </div>
          ) : null}
        </CardSection>

        <CardSection title="十二宫">
          <PalaceGrid palaces={aggregate.palaces} />
        </CardSection>
      </div>

      <div className="space-y-6">
        <CardSection
          title="案例"
          description="数据模型支持一命盘多案例；第一版默认优先维护主案例。"
        >
          {cases.length === 0 ? (
            <form className="space-y-4" onSubmit={createCaseForm.handleSubmit(handleCreateCase)}>
              <div className="grid gap-4">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">咨询主题</span>
                  <input
                    {...createCaseForm.register("consultation_topic")}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                  />
                  <FieldError message={createCaseForm.formState.errors.consultation_topic?.message} />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">咨询日期</span>
                  <input
                    type="date"
                    {...createCaseForm.register("consultation_date")}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                  />
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">来源渠道</span>
                    <input
                      {...createCaseForm.register("source_channel")}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                      placeholder="线下咨询 / 转介绍 / 微信"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">优先级</span>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      {...createCaseForm.register("priority_level")}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">初始摘要</span>
                  <textarea
                    {...createCaseForm.register("initial_summary")}
                    className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                  />
                </label>
              </div>
              <button type="submit" className="rounded-2xl bg-ink px-4 py-3 text-sm text-white">
                创建主案例
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {cases.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => chooseCase(item.id)}
                    className={`rounded-2xl px-3 py-2 text-sm ${
                      activeCase?.id === item.id
                        ? "bg-ink text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {item.case_code}
                  </button>
                ))}
              </div>

              {activeCase ? (
                <form className="space-y-4" onSubmit={editCaseForm.handleSubmit(handleUpdateCase)}>
                  <div className="grid gap-4">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">咨询主题</span>
                      <input
                        {...editCaseForm.register("consultation_topic")}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                      />
                      <FieldError message={editCaseForm.formState.errors.consultation_topic?.message} />
                    </label>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="text-sm font-medium text-slate-700">咨询日期</span>
                        <input
                          type="date"
                          {...editCaseForm.register("consultation_date")}
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-medium text-slate-700">来源渠道</span>
                        <input
                          {...editCaseForm.register("source_channel")}
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-medium text-slate-700">状态</span>
                        <select
                          {...editCaseForm.register("status")}
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                        >
                          {["active", "follow_up", "reviewed", "closed", "archived"].map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-sm font-medium text-slate-700">优先级</span>
                        <input
                          type="number"
                          min={1}
                          max={5}
                          {...editCaseForm.register("priority_level")}
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                        />
                      </label>
                    </div>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">初始摘要</span>
                      <textarea
                        {...editCaseForm.register("initial_summary")}
                        className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">最终摘要</span>
                      <textarea
                        {...editCaseForm.register("final_summary")}
                        className="mt-2 min-h-20 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">客户反馈摘要</span>
                      <textarea
                        {...editCaseForm.register("client_feedback_summary")}
                        className="mt-2 min-h-20 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">复盘结论</span>
                      <textarea
                        {...editCaseForm.register("review_conclusion")}
                        className="mt-2 min-h-20 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                      />
                    </label>
                    <div className="flex flex-wrap gap-3">
                      <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <input type="checkbox" {...editCaseForm.register("is_reviewed")} />
                        <span className="text-sm text-slate-700">已复盘</span>
                      </label>
                      <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <input type="checkbox" {...editCaseForm.register("is_verified")} />
                        <span className="text-sm text-slate-700">已验证</span>
                      </label>
                    </div>
                  </div>
                  <button type="submit" className="rounded-2xl bg-ink px-4 py-3 text-sm text-white">
                    保存案例
                  </button>
                </form>
              ) : null}
            </div>
          )}
        </CardSection>

        <CardSection title="标签与规则提示">
          {!activeCase ? (
            <EmptyState title="尚未创建案例" description="规则命中和标签绑定依附于案例记录。" />
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-sm font-medium text-slate-700">案例标签</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {tags.map((tag) => {
                    const active = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() =>
                          setSelectedTagIds((current) =>
                            current.includes(tag.id)
                              ? current.filter((item) => item !== tag.id)
                              : [...current, tag.id],
                          )
                        }
                        className={`rounded-full px-3 py-2 text-xs ${
                          active ? "text-white" : "bg-white text-slate-700"
                        }`}
                        style={{
                          backgroundColor: active ? tag.color : undefined,
                          border: `1px solid ${tag.color}`,
                        }}
                      >
                        {tag.tag_name}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleSaveTags().catch((saveError) => {
                      console.error(saveError);
                    });
                  }}
                  className="mt-3 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700"
                >
                  保存标签绑定
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-700">规则命中</p>
                  <button
                    type="button"
                    onClick={() => {
                      handleRefreshRules().catch((refreshError) => {
                        console.error(refreshError);
                      });
                    }}
                    className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700"
                  >
                    重新计算命中
                  </button>
                </div>
                <div className="mt-3 space-y-3">
                  {ruleHits.length === 0 ? (
                    <EmptyState title="暂无命中" description="当前案例还没有规则命中记录。" />
                  ) : (
                    ruleHits.map((hit) => {
                      const rule = ruleMap.get(hit.rule_hint_id);
                      return (
                        <div
                          key={`${hit.rule_hint_id}-${hit.matched_at}`}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium text-slate-900">{rule?.name ?? "未知规则"}</p>
                            <StatusPill label={rule?.severity_level ?? "info"} tone="info" />
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {rule?.hint_text ?? "规则信息缺失"}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </CardSection>

        <CardSection title="批注">
          {!activeCase ? (
            <EmptyState title="尚未创建案例" description="先创建案例后再录入结构化批注。" />
          ) : (
            <div className="space-y-5">
              <form className="space-y-4" onSubmit={noteForm.handleSubmit(handleSaveNote)}>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">批注类型</span>
                    <select
                      {...noteForm.register("note_type")}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                    >
                      {["initial", "supplement", "feedback", "review", "conclusion"].map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">关联宫位编码</span>
                    <input
                      {...noteForm.register("related_palace_code")}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                      placeholder="life / career / wealth..."
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">标题</span>
                  <input
                    {...noteForm.register("title")}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                  />
                  <FieldError message={noteForm.formState.errors.title?.message} />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">主题</span>
                  <input
                    {...noteForm.register("related_topic")}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">内容</span>
                  <textarea
                    {...noteForm.register("content")}
                    className="mt-2 min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                  />
                  <FieldError message={noteForm.formState.errors.content?.message} />
                </label>
                <div className="flex gap-3">
                  <button type="submit" className="rounded-2xl bg-ink px-4 py-3 text-sm text-white">
                    {editingNoteId ? "保存批注" : "新增批注"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingNoteId(null);
                      noteForm.reset(defaultNoteValues);
                    }}
                    className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700"
                  >
                    清空
                  </button>
                </div>
              </form>

              <div className="space-y-3">
                {notes.length === 0 ? (
                  <EmptyState title="暂无批注" description="建议把验证点、宫位关联和结论拆分为结构化记录。" />
                ) : (
                  notes.map((note) => (
                    <div key={note.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-900">{note.title}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {note.note_type} · {note.related_palace_code || "未关联宫位"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingNoteId(note.id);
                              noteForm.reset({
                                note_type: note.note_type,
                                title: note.title,
                                content: note.content,
                                related_palace_code: note.related_palace_code ?? "",
                                related_topic: note.related_topic,
                                sort_order: note.sort_order,
                              });
                            }}
                            className="rounded-xl bg-white px-3 py-2 text-xs text-slate-700"
                          >
                            编辑
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              caseService.softDeleteNote(note).then(() => {
                                if (activeCase) {
                                  loadCaseContext(activeCase.id).catch((loadError) => {
                                    console.error(loadError);
                                  });
                                }
                              });
                            }}
                            className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700"
                          >
                            软删除
                          </button>
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{note.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </CardSection>

        <CardSection title="时间线 / 复盘">
          {!activeCase ? (
            <EmptyState title="尚未创建案例" description="时间线事件依附于具体案例。" />
          ) : (
            <div className="space-y-5">
              <form className="space-y-4" onSubmit={eventForm.handleSubmit(handleSaveEvent)}>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">事件类型</span>
                    <select
                      {...eventForm.register("event_type")}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                    >
                      {["consultation", "feedback", "review", "milestone", "correction"].map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">事件日期</span>
                    <input
                      type="date"
                      {...eventForm.register("event_date")}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                    />
                    <FieldError message={eventForm.formState.errors.event_date?.message} />
                  </label>
                </div>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">标题</span>
                  <input
                    {...eventForm.register("title")}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                  />
                  <FieldError message={eventForm.formState.errors.title?.message} />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">描述</span>
                  <textarea
                    {...eventForm.register("description")}
                    className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">结果标签</span>
                  <input
                    {...eventForm.register("outcome_label")}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                  />
                </label>
                <div className="flex gap-3">
                  <button type="submit" className="rounded-2xl bg-ink px-4 py-3 text-sm text-white">
                    {editingEventId ? "保存事件" : "新增事件"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEventId(null);
                      eventForm.reset(defaultEventValues);
                    }}
                    className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700"
                  >
                    清空
                  </button>
                </div>
              </form>

              <div className="space-y-3">
                {events.length === 0 ? (
                  <EmptyState title="暂无事件" description="建议记录咨询、反馈、复盘和关键里程碑。" />
                ) : (
                  events.map((event) => (
                    <div key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-900">{event.title}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {event.event_date} · {event.event_type}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingEventId(event.id);
                            eventForm.reset({
                              event_type: event.event_type,
                              event_date: event.event_date,
                              title: event.title,
                              description: event.description,
                              outcome_label: event.outcome_label,
                            });
                          }}
                          className="rounded-xl bg-white px-3 py-2 text-xs text-slate-700"
                        >
                          编辑
                        </button>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{event.description}</p>
                      {event.outcome_label ? (
                        <div className="mt-3">
                          <StatusPill label={event.outcome_label} />
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </CardSection>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-sm text-slate-700">{value}</p>
    </div>
  );
}
