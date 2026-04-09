import { appDb } from "@/db/appDb";

export class ExportRepository {
  async exportCaseBundle(caseId: string) {
    const caseRecord = await appDb.case_records.get(caseId);
    if (!caseRecord) {
      return null;
    }

    const chart = await appDb.charts.get(caseRecord.chart_id);
    const [palaces, stars, transforms, notes, events, caseTags, hits] = await Promise.all([
      appDb.chart_palaces.where("chart_id").equals(caseRecord.chart_id).toArray(),
      appDb.chart_stars.where("chart_id").equals(caseRecord.chart_id).toArray(),
      appDb.chart_transforms.where("chart_id").equals(caseRecord.chart_id).toArray(),
      appDb.case_notes.where("case_id").equals(caseId).toArray(),
      appDb.case_events.where("case_id").equals(caseId).toArray(),
      appDb.case_tags.where("case_id").equals(caseId).toArray(),
      appDb.case_rule_hint_hits.where("case_id").equals(caseId).toArray(),
    ]);

    const tagIds = caseTags.map((item) => item.tag_id);
    const tags = tagIds.length
      ? await appDb.tags.where("id").anyOf(tagIds).toArray()
      : [];
    const ruleHintIds = hits.map((item) => item.rule_hint_id);
    const ruleHints = ruleHintIds.length
      ? await appDb.rule_hints.where("id").anyOf(ruleHintIds).toArray()
      : [];

    return {
      exported_at: new Date().toISOString(),
      chart,
      palaces,
      stars,
      transforms,
      case_record: caseRecord,
      notes,
      events,
      tags,
      case_tags: caseTags,
      rule_hints: ruleHints,
      case_rule_hint_hits: hits,
    };
  }

  async exportAllData() {
    const [
      charts,
      chart_palaces,
      chart_stars,
      chart_transforms,
      case_records,
      case_notes,
      case_events,
      tags,
      case_tags,
      rule_hints,
      case_rule_hint_hits,
    ] = await Promise.all([
      appDb.charts.toArray(),
      appDb.chart_palaces.toArray(),
      appDb.chart_stars.toArray(),
      appDb.chart_transforms.toArray(),
      appDb.case_records.toArray(),
      appDb.case_notes.toArray(),
      appDb.case_events.toArray(),
      appDb.tags.toArray(),
      appDb.case_tags.toArray(),
      appDb.rule_hints.toArray(),
      appDb.case_rule_hint_hits.toArray(),
    ]);

    return {
      exported_at: new Date().toISOString(),
      charts,
      chart_palaces,
      chart_stars,
      chart_transforms,
      case_records,
      case_notes,
      case_events,
      tags,
      case_tags,
      rule_hints,
      case_rule_hint_hits,
    };
  }
}

export const exportRepository = new ExportRepository();
