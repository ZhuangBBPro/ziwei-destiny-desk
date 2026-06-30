import { appDb } from "@/db/appDb";
import { builtinRuleHintsSeed, builtinTagsSeed } from "@/db/seeds";
import { caseService } from "@/features/cases/services/caseService";
import { chartService } from "@/features/charts/services/chartService";
import { palaceInterpretationService } from "@/features/charts/services/palaceInterpretationService";
import { tagService } from "@/features/tags/services/tagService";
import { DEFAULT_BIRTH_TIMEZONE } from "@/lib/constants";
import { dayjs } from "@/lib/dayjs";

export async function ensureAppSeeds() {
  const [tagCount, ruleCount] = await Promise.all([
    appDb.tags.count(),
    appDb.rule_hints.count(),
  ]);

  if (tagCount === 0) {
    await appDb.tags.bulkPut(builtinTagsSeed);
  }

  if (ruleCount === 0) {
    await appDb.rule_hints.bulkPut(builtinRuleHintsSeed);
  }

  await palaceInterpretationService.ensureDefaultLibrarySeeded();

  const chartCount = await appDb.charts.count();
  if (chartCount > 0) {
    return;
  }

  await createDemoCaseSeed();
}

export async function createDemoCaseSeed() {
  try {
    const chartCount = await appDb.charts.count();
    const suffix = chartCount + 1;
    const consultationDate = dayjs().format("YYYY-MM-DD");
    const reviewDate = dayjs().add(7, "day").format("YYYY-MM-DD");

    const aggregate = await chartService.createChart({
      subject_name: `示例命主 ${suffix}`,
      gender: "female",
      birth_calendar_type: "solar",
      birth_date: "1992-08-14",
      birth_time: "23:30",
      birth_timezone: DEFAULT_BIRTH_TIMEZONE,
      birth_location: "上海",
      leap_month_flag: false,
      true_solar_time_enabled: false,
      manual_true_solar_time: "",
      manual_true_solar_day_offset: "0",
      remarks: `系统自动生成的示例案例 ${suffix}，用于体验命盘、批注、标签和时间线。`,
    });

    const caseRecord = await caseService.createMainCase({
      chart_id: aggregate.chart.id,
      consultation_topic: "事业与迁移方向",
      consultation_date: consultationDate,
      status: "follow_up",
      priority_level: 3,
      source_channel: "示例数据",
      initial_summary:
        "命主关注职业发展节点与异地机会，适合先体验案例编辑、批注记录和规则提示流程。",
    });

    await caseService.updateCase({
      ...caseRecord,
      final_summary: "示例结论：先记录结构，再结合后续反馈做复盘，不自动生成断语。",
      client_feedback_summary: "示例反馈：近期正在比较两个工作机会，并关注是否搬迁。",
      review_conclusion: "示例复盘：建议把迁移、事业、财帛三组信息拆分记录，避免长文本混杂。",
      is_reviewed: true,
      is_verified: false,
    });

    await caseService.addNote(caseRecord.id, {
      note_type: "initial",
      title: "首次观察",
      content: "先查看命宫、事业宫、迁移宫的主星与辅星组合，再决定后续跟踪重点。",
      related_palace_code: "life",
      related_topic: "总体结构",
      sort_order: 10,
    });

    await caseService.addNote(caseRecord.id, {
      note_type: "review",
      title: "复盘提醒",
      content: "示例案例建议把阶段性反馈写入时间线，而不是只堆在总结文本里。",
      related_palace_code: "travel",
      related_topic: "迁移验证",
      sort_order: 20,
    });

    await caseService.addEvent(caseRecord.id, {
      event_type: "consultation",
      event_date: consultationDate,
      title: "首次咨询",
      description: "建立示例命盘并记录初始问题，便于测试案例详情页操作流。",
      outcome_label: "已建档",
    });

    await caseService.addEvent(caseRecord.id, {
      event_type: "review",
      event_date: reviewDate,
      title: "一周后复盘",
      description: "用于体验 follow_up 案例、批注和规则命中刷新。",
      outcome_label: "待跟进",
    });

    const tags = await tagService.listTags();
    const selectedTags = tags
      .filter((tag) =>
        ["事业", "迁移", "待回访"].includes(tag.tag_name),
      )
      .map((tag) => tag.id);

    if (selectedTags.length > 0) {
      await caseService.saveCaseTags(caseRecord.id, selectedTags);
    }

    await caseService.refreshRuleHits(caseRecord.id);
    return {
      chartId: aggregate.chart.id,
      caseId: caseRecord.id,
      subjectName: aggregate.chart.subject_name,
    };
  } catch (error) {
    console.error("Failed to seed demo case", error);
    throw error;
  }
}
