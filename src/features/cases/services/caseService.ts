import { v4 as uuidv4 } from "uuid";
import { caseRepository, type CaseQueryInput } from "@/db/repositories/caseRepository";
import { tagRepository } from "@/db/repositories/tagRepository";
import { ruleRepository } from "@/db/repositories/ruleRepository";
import { chartRepository } from "@/db/repositories/chartRepository";
import { dayjs } from "@/lib/dayjs";
import { evaluateRuleHints } from "@/features/rules/lib/ruleMatcher";
import { chartService } from "@/features/charts/services/chartService";
import type {
  CaseEventRecord,
  CaseNoteRecord,
  CaseRecord,
  CaseTagRecord,
  TagRecord,
} from "@/types";

export interface CreateCaseInput {
  chart_id: string;
  consultation_topic: string;
  consultation_date: string | null;
  status: CaseRecord["status"];
  priority_level: number;
  source_channel: string;
  initial_summary: string;
}

export class CaseService {
  async createMainCase(input: CreateCaseInput) {
    const now = dayjs().toISOString();
    const record: CaseRecord = {
      id: uuidv4(),
      chart_id: input.chart_id,
      case_code: `CASE-${dayjs().format("YYYYMMDD-HHmmss")}`,
      consultation_topic: input.consultation_topic,
      consultation_date: input.consultation_date,
      status: input.status,
      priority_level: input.priority_level,
      source_channel: input.source_channel,
      initial_summary: input.initial_summary,
      final_summary: "",
      client_feedback_summary: "",
      review_conclusion: "",
      is_reviewed: false,
      is_verified: false,
      opened_at: now,
      last_activity_at: now,
      closed_at: null,
      created_at: now,
      updated_at: now,
    };

    await caseRepository.createCase(record);
    return record;
  }

  async updateCase(record: CaseRecord) {
    const next: CaseRecord = {
      ...record,
      updated_at: dayjs().toISOString(),
      last_activity_at: dayjs().toISOString(),
    };
    await caseRepository.updateCase(next);
    return next;
  }

  async deleteCase(caseId: string) {
    await caseRepository.deleteCaseWithChart(caseId);
  }

  async listCasesByChart(chartId: string) {
    return caseRepository.listCasesByChart(chartId);
  }

  async addNote(caseId: string, input: Omit<CaseNoteRecord, "id" | "case_id" | "created_at" | "updated_at" | "deleted_at">) {
    const now = dayjs().toISOString();
    const record: CaseNoteRecord = {
      id: uuidv4(),
      case_id: caseId,
      note_type: input.note_type,
      title: input.title,
      content: input.content,
      related_palace_code: input.related_palace_code,
      related_topic: input.related_topic,
      sort_order: input.sort_order,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };
    await caseRepository.createNote(record);
    return record;
  }

  async updateNote(record: CaseNoteRecord) {
    const next = { ...record, updated_at: dayjs().toISOString() };
    await caseRepository.updateNote(next);
    return next;
  }

  async softDeleteNote(record: CaseNoteRecord) {
    const next = {
      ...record,
      updated_at: dayjs().toISOString(),
      deleted_at: dayjs().toISOString(),
    };
    await caseRepository.updateNote(next);
    return next;
  }

  async listNotes(caseId: string) {
    return caseRepository.listNotes(caseId);
  }

  async addEvent(caseId: string, input: Omit<CaseEventRecord, "id" | "case_id" | "created_at" | "updated_at">) {
    const now = dayjs().toISOString();
    const record: CaseEventRecord = {
      id: uuidv4(),
      case_id: caseId,
      event_type: input.event_type,
      event_date: input.event_date,
      title: input.title,
      description: input.description,
      outcome_label: input.outcome_label,
      created_at: now,
      updated_at: now,
    };
    await caseRepository.createEvent(record);
    return record;
  }

  async updateEvent(record: CaseEventRecord) {
    const next = { ...record, updated_at: dayjs().toISOString() };
    await caseRepository.updateEvent(next);
    return next;
  }

  async listEvents(caseId: string) {
    return caseRepository.listEvents(caseId);
  }

  async saveCaseTags(caseId: string, tagIds: string[]) {
    const now = dayjs().toISOString();
    const links: CaseTagRecord[] = tagIds.map((tagId) => ({
      id: uuidv4(),
      case_id: caseId,
      tag_id: tagId,
      created_at: now,
    }));
    await caseRepository.replaceCaseTags(caseId, links);
    return links;
  }

  async getCaseTagIds(caseId: string) {
    const links = await caseRepository.listCaseTags(caseId);
    return links.map((item) => item.tag_id);
  }

  async refreshRuleHits(caseId: string) {
    const caseRecord = await caseRepository.getCase(caseId);
    if (!caseRecord) {
      return [];
    }
    const aggregate = await chartService.getChartAggregate(caseRecord.chart_id);
    if (!aggregate) {
      return [];
    }
    const rules = await ruleRepository.listRules();
    const hits = evaluateRuleHints(aggregate, caseId, rules);
    await caseRepository.replaceRuleHits(caseId, hits);
    return hits;
  }

  async listRuleHits(caseId: string) {
    return caseRepository.listRuleHits(caseId);
  }

  async queryCaseLibrary(input: CaseQueryInput) {
    const baseCasesPromise = caseRepository.queryCases({
      ...input,
      keyword: undefined,
    });

    const [baseCases, tags] = await Promise.all([
      baseCasesPromise,
      tagRepository.listTags(),
    ]);
    const [charts, caseTags] = await Promise.all([
      Promise.all(baseCases.map((item) => chartRepository.getChart(item.chart_id))),
      Promise.all(baseCases.map((item) => caseRepository.listCaseTags(item.id))),
    ]);

    const chartMap = new Map(
      charts.filter(Boolean).map((chart) => [chart!.id, chart!]),
    );
    const tagMap = new Map(tags.map((tag) => [tag.id, tag]));
    const caseTagMap = new Map<string, TagRecord[]>();

    baseCases.forEach((item, index) => {
      const linkedTags = (caseTags[index] ?? [])
        .map((link) => tagMap.get(link.tag_id))
        .filter(Boolean) as TagRecord[];
      caseTagMap.set(item.id, linkedTags);
    });

    const keyword = input.keyword?.trim().toLowerCase();
    const filtered = keyword
      ? baseCases.filter((item) => {
          const chart = chartMap.get(item.chart_id);
          const subjectName = chart?.subject_name.toLowerCase() ?? "";
          return (
            subjectName.includes(keyword) ||
            item.case_code.toLowerCase().includes(keyword) ||
            item.consultation_topic.toLowerCase().includes(keyword) ||
            item.initial_summary.toLowerCase().includes(keyword) ||
            item.final_summary.toLowerCase().includes(keyword)
          );
        })
      : baseCases;

    return {
      cases: filtered.map((item) => ({
        ...item,
        chart_subject_name: chartMap.get(item.chart_id)?.subject_name ?? "",
        tags: caseTagMap.get(item.id) ?? [],
      })),
      tags,
    };
  }
}

export const caseService = new CaseService();
