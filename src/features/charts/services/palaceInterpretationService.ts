import { v4 as uuidv4 } from "uuid";
import { palaceInterpretationRepository } from "@/db/repositories/palaceInterpretationRepository";
import { dayjs } from "@/lib/dayjs";
import type {
  ChartPalaceRecord,
  PalaceInterpretationCategory,
  PalaceInterpretationHit,
  PalaceInterpretationMatchMode,
  PalaceInterpretationRecord,
} from "@/types";
import {
  EDITABLE_PALACE_NAMES,
  PALACE_INTERPRETATION_LIBRARY,
  getDefaultPalaceInterpretationHits,
  normalizePalaceName,
  normalizeStarName,
} from "@/features/charts/lib/palaceInterpretationLibrary";

export interface SavePalaceInterpretationInput {
  id?: string;
  palace_name: string;
  category: PalaceInterpretationCategory;
  title: string;
  aliases: string[];
  match_mode: PalaceInterpretationMatchMode;
  content: string[];
  is_enabled: boolean;
  sort_order: number;
  source?: PalaceInterpretationRecord["source"];
}

export class PalaceInterpretationService {
  private duplicateCleanupPromise: Promise<void> | null = null;

  listEditablePalaces() {
    return [...EDITABLE_PALACE_NAMES];
  }

  async ensureDefaultLibrarySeeded() {
    const count = await palaceInterpretationRepository.count();
    if (count > 0) {
      await this.syncMissingDefaultEntries();
      await this.cleanupDuplicateEntries();
      return;
    }

    const now = dayjs().toISOString();
    const records = Object.entries(PALACE_INTERPRETATION_LIBRARY).flatMap(
      ([palaceName, entries]) =>
        entries.map((entry, index): PalaceInterpretationRecord => ({
          id: uuidv4(),
          palace_name: palaceName,
          category: entry.category,
          title: entry.title,
          aliases: entry.aliases,
          match_mode: entry.matchMode,
          content: entry.content,
          is_enabled: true,
          sort_order: index + 1,
          source: "builtin",
          created_at: now,
          updated_at: now,
        })),
    );

    await palaceInterpretationRepository.bulkSave(records);
    await this.syncMissingDefaultEntries();
    await this.cleanupDuplicateEntries();
  }

  async listEntriesByPalace(palaceName: string) {
    await this.ensureDefaultLibrarySeeded();
    return dedupeRecords(await palaceInterpretationRepository.listByPalace(normalizePalaceName(palaceName)));
  }

  async listAllEntries() {
    await this.ensureDefaultLibrarySeeded();
    return dedupeRecords(await palaceInterpretationRepository.listAll());
  }

  async saveEntry(input: SavePalaceInterpretationInput) {
    const now = dayjs().toISOString();
    const previous = input.id ? await palaceInterpretationRepository.get(input.id) : undefined;
    const record: PalaceInterpretationRecord = {
      id: input.id ?? uuidv4(),
      palace_name: normalizePalaceName(input.palace_name),
      category: input.category,
      title: input.title.trim(),
      aliases: dedupeText(input.aliases.map((item) => item.trim()).filter(Boolean)),
      match_mode: input.match_mode,
      content: input.content.map((item) => item.trim()).filter(Boolean),
      is_enabled: input.is_enabled,
      sort_order: input.sort_order,
      source: input.source ?? previous?.source ?? "custom",
      created_at: previous?.created_at ?? now,
      updated_at: now,
    };

    await palaceInterpretationRepository.save(record);
    return record;
  }

  async deleteEntry(id: string) {
    await palaceInterpretationRepository.delete(id);
  }

  async getHitsForPalace(palace: ChartPalaceRecord): Promise<PalaceInterpretationHit[]> {
    try {
      await this.ensureDefaultLibrarySeeded();
      const entries = (await palaceInterpretationRepository.listByPalace(
        normalizePalaceName(palace.palace_name),
      )).filter((entry) => entry.is_enabled);

      if (entries.length === 0) {
        return [];
      }

      const starNames = [
        ...palace.major_stars_summary,
        ...palace.minor_stars_summary,
        ...palace.sha_stars_summary,
      ];
      const normalizedStarNames = new Set(starNames.map(normalizeStarName));

      return entries
        .map((entry): PalaceInterpretationHit | null => {
          const normalizedAliases = entry.aliases.map(normalizeStarName);
          const matchedStars = starNames.filter((starName) =>
            normalizedAliases.includes(normalizeStarName(starName)),
          );
          const isMatched =
            entry.match_mode === "all"
              ? [...new Set(normalizedAliases)].every((alias) => normalizedStarNames.has(alias))
              : matchedStars.length > 0;

          return isMatched
            ? {
                category: entry.category,
                title: entry.title,
                aliases: entry.aliases,
                matchMode: entry.match_mode,
                content: entry.content,
                matchedStars: matchedStars.length > 0 ? matchedStars : entry.aliases,
              }
            : null;
        })
        .filter((entry): entry is PalaceInterpretationHit => Boolean(entry));
    } catch (error) {
      console.error("Failed to load editable palace interpretations", error);
      return getDefaultPalaceInterpretationHits(palace);
    }
  }

  private async cleanupDuplicateEntries() {
    if (!this.duplicateCleanupPromise) {
      this.duplicateCleanupPromise = (async () => {
        const records = await palaceInterpretationRepository.listAll();
        const seen = new Set<string>();
        const duplicateIds: string[] = [];

        records.forEach((record) => {
          const key = getRecordDedupeKey(record);
          if (seen.has(key)) {
            duplicateIds.push(record.id);
            return;
          }
          seen.add(key);
        });

        await Promise.all(duplicateIds.map((id) => palaceInterpretationRepository.delete(id)));
      })();
    }

    return this.duplicateCleanupPromise;
  }

  private async syncMissingDefaultEntries() {
    const records = await palaceInterpretationRepository.listAll();
    const existingKeys = new Set(records.map(getRecordDedupeKey));
    const now = dayjs().toISOString();
    const missingRecords = Object.entries(PALACE_INTERPRETATION_LIBRARY).flatMap(
      ([palaceName, entries]) =>
        entries.flatMap((entry, index) => {
          const record: PalaceInterpretationRecord = {
            id: uuidv4(),
            palace_name: palaceName,
            category: entry.category,
            title: entry.title,
            aliases: entry.aliases,
            match_mode: entry.matchMode,
            content: entry.content,
            is_enabled: true,
            sort_order: index + 1,
            source: "builtin",
            created_at: now,
            updated_at: now,
          };

          return existingKeys.has(getRecordDedupeKey(record)) ? [] : [record];
        }),
    );

    if (missingRecords.length > 0) {
      await palaceInterpretationRepository.bulkSave(missingRecords);
    }
  }
}

function dedupeText(items: string[]) {
  return [...new Set(items)];
}

function dedupeRecords(records: PalaceInterpretationRecord[]) {
  const seen = new Set<string>();
  return records.filter((record) => {
    const key = getRecordDedupeKey(record);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function getRecordDedupeKey(record: PalaceInterpretationRecord) {
  return [
    record.palace_name,
    record.category,
    record.title,
    record.match_mode,
    record.aliases.join("|"),
    record.content.join("|"),
  ].join("::");
}

export const palaceInterpretationService = new PalaceInterpretationService();
