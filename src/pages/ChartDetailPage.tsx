import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { CardSection } from "@/components/ui/CardSection";
import { EmptyState } from "@/components/ui/EmptyState";
import { FieldError } from "@/components/ui/FieldError";
import { StatusPill } from "@/components/ui/StatusPill";
import { ProfessionalPalaceBoard } from "@/features/charts/components/ProfessionalPalaceBoard";
import { formatChartBirthInfo } from "@/features/charts/lib/birthDisplay";
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

type WorkspaceTab = "workbench" | "notes" | "timeline";

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
  const [selectedPalaceCode, setSelectedPalaceCode] = useState("");
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("workbench");

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

  useEffect(() => {
    if (!aggregate) {
      return;
    }

    setSelectedPalaceCode((current) => {
      const availableCodes = aggregate.palaces.map((item) => item.palace_code);
      if (current && availableCodes.includes(current)) {
        return current;
      }

      return (
        aggregate.palaces.find((item) => item.palace_code === "life")?.palace_code ??
        aggregate.palaces[0]?.palace_code ??
        ""
      );
    });
  }, [aggregate]);

  useEffect(() => {
    if (!selectedPalaceCode || editingNoteId) {
      return;
    }

    noteForm.setValue("related_palace_code", selectedPalaceCode, {
      shouldDirty: false,
      shouldTouch: false,
    });
  }, [editingNoteId, noteForm, selectedPalaceCode]);

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
  const selectedPalace =
    aggregate.palaces.find((item) => item.palace_code === selectedPalaceCode) ?? aggregate.palaces[0];
  const transformEntries = readTransformEntries(aggregate.chart.snapshot_json);
  const focusedNotes = selectedPalaceCode
    ? notes.filter((note) => note.related_palace_code === selectedPalaceCode)
    : [];
  const orderedNotes = selectedPalaceCode
    ? [
        ...focusedNotes,
        ...notes.filter((note) => note.related_palace_code !== selectedPalaceCode),
      ]
    : notes;
  const selectedPalaceRuleHits = selectedPalaceCode
    ? ruleHits.filter((hit) => {
        const rule = ruleMap.get(hit.rule_hint_id);
        const expression = rule?.trigger_expression as { palaceCode?: string } | undefined;
        return expression?.palaceCode === selectedPalaceCode;
      })
    : [];
  const selectedPalaceLabel = selectedPalace?.palace_name ?? "未选中宫位";
  const selectedPalaceAgeRange = readAgeRangeFromSnapshot(
    selectedPalace?.palace_snapshot_json ?? {},
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,#fffaf2_0%,#f3e6cf_100%)] p-5 shadow-panel">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[#9b7f52]">Ziwei Destiny Desk</p>
            <h1 className="mt-2 font-serif text-4xl text-[#2f1b0d]">{aggregate.chart.subject_name}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#5f4830]">
              盘面为工作主视图，点击任一宫位即可联动右侧批注、标签、规则提示与案例复盘区域。
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap justify-end gap-2">
              {activeCase ? (
                <button
                  type="button"
                  onClick={() => {
                    exportService.exportCase(activeCase.id).catch((exportError) => {
                      console.error("Failed to export case", exportError);
                    });
                  }}
                  className="rounded-full bg-[#2f1b0d] px-4 py-2 text-sm text-white"
                >
                  导出当前案例
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setWorkspaceTab("workbench")}
                className="rounded-full bg-white/70 px-4 py-2 text-sm text-[#654b2e]"
              >
                工作侧栏
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.95fr)_320px] xl:grid-cols-[minmax(0,1.8fr)_300px]">
        <div className="space-y-5">
          <ProfessionalPalaceBoard
            chart={aggregate.chart}
            palaces={aggregate.palaces}
            selectedPalaceCode={selectedPalaceCode}
            onSelectPalace={setSelectedPalaceCode}
          />

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
            <CardSection
              title={`焦点宫位 · ${selectedPalaceLabel}`}
              description="当前宫位摘要会跟着盘面选中状态实时联动。"
              className="border-[#eadcc7] bg-[#fffaf4]"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <FocusInfoCard
                  label="宫干支"
                  value={`${selectedPalace?.heavenly_stem ?? ""}${selectedPalace?.earthly_branch ?? ""}` || "-"}
                />
                <FocusInfoCard label="年龄区间" value={selectedPalaceAgeRange || "-"} />
                <FocusInfoCard
                  label="主星"
                  value={selectedPalace?.major_stars_summary.join("、") || "空宫（无十四主星）"}
                />
                <FocusInfoCard
                  label="辅星"
                  value={selectedPalace?.minor_stars_summary.join("、") || "无"}
                />
              </div>

              <div className="mt-4 rounded-2xl border border-[#eadbc3] bg-[#f9f1e3] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#9b7f52]">杂曜 / 煞曜 / 当前命中</p>
                <p className="mt-2 text-sm leading-7 text-[#5a432c]">
                  {selectedPalace?.sha_stars_summary.join("、") || "无"}
                </p>
                {selectedPalaceRuleHits.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedPalaceRuleHits.map((hit) => (
                      <span
                        key={`${hit.rule_hint_id}-${hit.matched_at}`}
                        className="rounded-full border border-[#d8c5a7] bg-white px-3 py-1 text-xs text-[#6c5336]"
                      >
                        {ruleMap.get(hit.rule_hint_id)?.name ?? "规则命中"}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </CardSection>

            <CardSection
              title="盘心摘要"
              description="把命理师常扫的基础信息压缩在一个区块里。"
              className="border-[#eadcc7] bg-[#fffaf4]"
            >
              <div className="space-y-3 text-sm text-slate-700">
                <CompactLine label="性别" value={aggregate.chart.gender === "male" ? "男" : "女"} />
                <CompactLine label="出生" value={formatChartBirthInfo(aggregate.chart)} />
                <CompactLine label="时区" value={aggregate.chart.birth_timezone} />
                <CompactLine label="命宫" value={aggregate.chart.life_palace_branch || "-"} />
                <CompactLine label="身宫" value={aggregate.chart.body_palace_branch || "-"} />
                <CompactLine label="命主" value={aggregate.chart.life_master_star || "-"} />
                <CompactLine label="身主" value={aggregate.chart.body_master_star || "-"} />
                <CompactLine label="五行局" value={aggregate.chart.five_element_class || "-"} />
                <CompactLine label="出生地" value={aggregate.chart.birth_location || "-"} />
              </div>
              {transformEntries.length > 0 ? (
                <div className="mt-4 rounded-2xl border border-[#eadbc3] bg-[#f7efe1] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-[#9b7f52]">本命四化</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {transformEntries.map((entry) => (
                      <span
                        key={`${entry.derivative}-${entry.starName}`}
                        className="rounded-full bg-white px-3 py-1 text-xs text-[#6b5337]"
                      >
                        {entry.derivative} {entry.starName}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {aggregate.chart.remarks ? (
                <div className="mt-4 rounded-2xl bg-[#f7f1e6] p-4 text-sm leading-6 text-[#5f4830]">
                  {aggregate.chart.remarks}
                </div>
              ) : null}
            </CardSection>
          </div>
        </div>

        <aside className="space-y-4">
          <section className="rounded-[1.8rem] border border-[#eadcc7] bg-white/90 p-4 shadow-panel">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.26em] text-[#9b7f52]">Workspace</p>
                <h2 className="mt-2 font-serif text-2xl text-[#2f1b0d]">{selectedPalaceLabel}</h2>
                <p className="mt-2 text-sm leading-6 text-[#634b32]">
                  已关联批注 {focusedNotes.length} 条，规则命中 {selectedPalaceRuleHits.length} 项。
                </p>
              </div>
              <div className="rounded-2xl border border-[#eadac2] bg-[#faf4e8] px-3 py-2 text-right text-xs text-[#6e5840]">
                <p>{selectedPalace?.heavenly_stem}{selectedPalace?.earthly_branch}</p>
                <p className="mt-1">{selectedPalaceAgeRange || "年龄段待补"}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {(selectedPalace?.major_stars_summary.length ? selectedPalace.major_stars_summary : ["空宫"]).map((star) => (
                <span
                  key={star}
                  className="rounded-full border border-[#d8c5a7] bg-[#f9f1e4] px-3 py-1 text-xs text-[#7e2c2c]"
                >
                  {star === "空宫" ? "空宫（无十四主星）" : star}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-[1.8rem] border border-[#eadcc7] bg-white/90 p-2 shadow-panel">
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: "workbench", label: "工作台" },
                { key: "notes", label: "批注" },
                { key: "timeline", label: "时间线" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setWorkspaceTab(item.key as WorkspaceTab)}
                  className={`rounded-2xl px-3 py-3 text-sm ${
                    workspaceTab === item.key
                      ? "bg-[#2f1b0d] text-white"
                      : "bg-[#f6efe4] text-[#6b5337]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </section>

          {workspaceTab === "workbench" ? (
            <div className="space-y-4">
              <CardSection
                title="案例工作区"
                description="一命盘多案例的数据结构保留，当前默认维护主案例。"
                className="border-[#eadcc7] bg-white/90"
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
                          className={`rounded-full px-3 py-2 text-sm ${
                            activeCase?.id === item.id
                              ? "bg-[#2f1b0d] text-white"
                              : "bg-[#f5eee3] text-[#6b5337]"
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

              <CardSection
                title="标签与规则提示"
                description="默认围绕当前案例工作，规则命中可随时重算。"
                className="border-[#eadcc7] bg-white/90"
              >
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
                                className={`rounded-2xl border p-4 ${
                                  (rule?.trigger_expression as { palaceCode?: string } | undefined)?.palaceCode === selectedPalaceCode
                                    ? "border-[#b98739] bg-[#fff6e8]"
                                    : "border-slate-200 bg-slate-50"
                                }`}
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
            </div>
          ) : null}

          {workspaceTab === "notes" ? (
            <CardSection
              title="宫位批注"
              description={`默认已把关联宫位指向 ${selectedPalaceLabel}，方便直接记盘。`}
              className="border-[#eadcc7] bg-white/90"
            >
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
                          noteForm.reset({
                            ...defaultNoteValues,
                            related_palace_code: selectedPalaceCode,
                          });
                        }}
                        className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700"
                      >
                        清空
                      </button>
                    </div>
                  </form>

                  <div className="space-y-3">
                    {orderedNotes.length === 0 ? (
                      <EmptyState title="暂无批注" description="建议把验证点、宫位关联和结论拆分为结构化记录。" />
                    ) : (
                      orderedNotes.map((note) => (
                        <div
                          key={note.id}
                          className={`rounded-2xl border p-4 ${
                            note.related_palace_code === selectedPalaceCode
                              ? "border-[#b98739] bg-[#fff6e8]"
                              : "border-slate-200 bg-slate-50"
                          }`}
                        >
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
          ) : null}

          {workspaceTab === "timeline" ? (
            <CardSection
              title="时间线 / 复盘"
              description="按事件日期维护咨询、反馈、复盘与关键里程碑。"
              className="border-[#eadcc7] bg-white/90"
            >
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
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function FocusInfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#eadbc3] bg-white p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-[#9b7f52]">{label}</p>
      <p className="mt-2 text-sm leading-6 text-[#5f4830]">{value}</p>
    </div>
  );
}

function CompactLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl bg-[#f7efe1] px-3 py-2">
      <span className="text-[#8b6f47]">{label}</span>
      <span className="text-right text-[#483525]">{value}</span>
    </div>
  );
}

function readAgeRangeFromSnapshot(snapshot: Record<string, unknown>) {
  const ageRange = snapshot.ageRange;
  if (typeof ageRange === "string" && ageRange) {
    return ageRange;
  }

  if (Array.isArray(ageRange) && ageRange.length >= 2) {
    return `${String(ageRange[0])}-${String(ageRange[1])}`;
  }

  if (
    ageRange &&
    typeof ageRange === "object" &&
    "start" in ageRange &&
    "end" in ageRange
  ) {
    const range = ageRange as { start?: unknown; end?: unknown };
    if (range.start !== undefined && range.end !== undefined) {
      return `${String(range.start)}-${String(range.end)}`;
    }
  }

  if (snapshot.ageStart !== undefined && snapshot.ageEnd !== undefined) {
    return `${String(snapshot.ageStart)}-${String(snapshot.ageEnd)}`;
  }

  return "";
}

function readTransformEntries(snapshot: Record<string, unknown>) {
  const value = snapshot.bornStarDerivativeMap;
  if (!value || typeof value !== "object") {
    return [] as Array<{ derivative: string; starName: string }>;
  }

  return Object.entries(value as Record<string, unknown>)
    .map(([derivative, starName]) => ({
      derivative,
      starName: typeof starName === "string" ? starName : String(starName ?? ""),
    }))
    .filter((item) => item.derivative && item.starName);
}
