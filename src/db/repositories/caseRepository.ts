import { appDb } from "@/db/appDb";
import type {
  CaseEventRecord,
  CaseNoteRecord,
  CaseRecord,
  CaseRuleHintHitRecord,
  CaseTagRecord,
} from "@/types";

export interface CaseQueryInput {
  keyword?: string;
  noteKeyword?: string;
  status?: string;
  tagIds?: string[];
  sortBy?: "created_at" | "last_activity_at";
}

export class CaseRepository {
  async createCase(record: CaseRecord) {
    await appDb.case_records.put(record);
    return record;
  }

  async updateCase(record: CaseRecord) {
    await appDb.case_records.put(record);
    return record;
  }

  async getCase(caseId: string) {
    return appDb.case_records.get(caseId);
  }

  async deleteCase(caseId: string) {
    await this.deleteCaseRecord(caseId, false);
  }

  async deleteCaseWithChart(caseId: string) {
    await this.deleteCaseRecord(caseId, true);
  }

  private async deleteCaseRecord(caseId: string, includeChart: boolean) {
    const caseRecord = await appDb.case_records.get(caseId);
    if (!caseRecord) {
      return;
    }

    const [notes, events, tags, ruleHits, palaces, stars, transforms] = await Promise.all([
      appDb.case_notes.where("case_id").equals(caseId).toArray(),
      appDb.case_events.where("case_id").equals(caseId).toArray(),
      appDb.case_tags.where("case_id").equals(caseId).toArray(),
      appDb.case_rule_hint_hits.where("case_id").equals(caseId).toArray(),
      includeChart ? appDb.chart_palaces.where("chart_id").equals(caseRecord.chart_id).toArray() : [],
      includeChart ? appDb.chart_stars.where("chart_id").equals(caseRecord.chart_id).toArray() : [],
      includeChart ? appDb.chart_transforms.where("chart_id").equals(caseRecord.chart_id).toArray() : [],
    ]);

    await appDb.transaction(
      "rw",
      [
        appDb.charts,
        appDb.chart_palaces,
        appDb.chart_stars,
        appDb.chart_transforms,
        appDb.case_records,
        appDb.case_notes,
        appDb.case_events,
        appDb.case_tags,
        appDb.case_rule_hint_hits,
      ],
      async () => {
        await appDb.case_records.delete(caseId);
        await appDb.case_notes.bulkDelete(notes.map((item) => item.id));
        await appDb.case_events.bulkDelete(events.map((item) => item.id));
        await appDb.case_tags.bulkDelete(tags.map((item) => item.id));
        await appDb.case_rule_hint_hits.bulkDelete(ruleHits.map((item) => item.id));
        if (includeChart) {
          await appDb.charts.delete(caseRecord.chart_id);
          await appDb.chart_palaces.bulkDelete(palaces.map((item) => item.id));
          await appDb.chart_stars.bulkDelete(stars.map((item) => item.id));
          await appDb.chart_transforms.bulkDelete(transforms.map((item) => item.id));
        }
      },
    );
  }

  async listCasesByChart(chartId: string) {
    const items = await appDb.case_records.where("chart_id").equals(chartId).toArray();
    return items.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }

  async createNote(record: CaseNoteRecord) {
    await appDb.case_notes.put(record);
    return record;
  }

  async updateNote(record: CaseNoteRecord) {
    await appDb.case_notes.put(record);
    return record;
  }

  async listNotes(caseId: string) {
    const items = await appDb.case_notes.where("case_id").equals(caseId).toArray();
    return items
      .filter((item) => !item.deleted_at)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async createEvent(record: CaseEventRecord) {
    await appDb.case_events.put(record);
    return record;
  }

  async updateEvent(record: CaseEventRecord) {
    await appDb.case_events.put(record);
    return record;
  }

  async listEvents(caseId: string) {
    const items = await appDb.case_events.where("case_id").equals(caseId).toArray();
    return items.sort((a, b) => a.event_date.localeCompare(b.event_date));
  }

  async replaceCaseTags(caseId: string, records: CaseTagRecord[]) {
    const current = await appDb.case_tags.where("case_id").equals(caseId).toArray();
    await appDb.transaction("rw", appDb.case_tags, async () => {
      await appDb.case_tags.bulkDelete(current.map((item) => item.id));
      if (records.length > 0) {
        await appDb.case_tags.bulkPut(records);
      }
    });
  }

  async listCaseTags(caseId: string) {
    return appDb.case_tags.where("case_id").equals(caseId).toArray();
  }

  async replaceRuleHits(caseId: string, hits: CaseRuleHintHitRecord[]) {
    const current = await appDb.case_rule_hint_hits.where("case_id").equals(caseId).toArray();
    await appDb.transaction("rw", appDb.case_rule_hint_hits, async () => {
      await appDb.case_rule_hint_hits.bulkDelete(current.map((item) => item.id));
      if (hits.length > 0) {
        await appDb.case_rule_hint_hits.bulkPut(hits);
      }
    });
  }

  async listRuleHits(caseId: string) {
    return appDb.case_rule_hint_hits.where("case_id").equals(caseId).toArray();
  }

  async queryCases(input: CaseQueryInput) {
    const cases = await appDb.case_records.toArray();
    const notes = input.noteKeyword ? await appDb.case_notes.toArray() : [];
    const caseTags = input.tagIds?.length ? await appDb.case_tags.toArray() : [];

    let result = [...cases];

    if (input.keyword) {
      const keyword = input.keyword.trim().toLowerCase();
      result = result.filter((item) => {
        return (
          item.case_code.toLowerCase().includes(keyword) ||
          item.consultation_topic.toLowerCase().includes(keyword) ||
          item.initial_summary.toLowerCase().includes(keyword) ||
          item.final_summary.toLowerCase().includes(keyword)
        );
      });
    }

    if (input.status) {
      result = result.filter((item) => item.status === input.status);
    }

    if (input.noteKeyword) {
      const noteKeyword = input.noteKeyword.trim().toLowerCase();
      const matchedCaseIds = new Set(
        notes
          .filter((note) => !note.deleted_at)
          .filter((note) => note.title.toLowerCase().includes(noteKeyword) || note.content.toLowerCase().includes(noteKeyword))
          .map((note) => note.case_id),
      );
      result = result.filter((item) => matchedCaseIds.has(item.id));
    }

    if (input.tagIds?.length) {
      const required = new Set(input.tagIds);
      const caseMap = new Map<string, Set<string>>();
      for (const link of caseTags) {
        if (!caseMap.has(link.case_id)) {
          caseMap.set(link.case_id, new Set());
        }
        caseMap.get(link.case_id)!.add(link.tag_id);
      }
      result = result.filter((item) => {
        const ids = caseMap.get(item.id);
        if (!ids) {
          return false;
        }
        return [...required].every((tagId) => ids.has(tagId));
      });
    }

    const sortBy = input.sortBy ?? "updated_at";
    return result.sort((a, b) => {
      const left = (b[sortBy] ?? "") as string;
      const right = (a[sortBy] ?? "") as string;
      return left.localeCompare(right);
    });
  }
}

export const caseRepository = new CaseRepository();
