import type { BaseEntity } from "@/types/common";

export type PalaceInterpretationCategory = "major" | "minor" | "misc";
export type PalaceInterpretationMatchMode = "any" | "all";

export interface PalaceInterpretationDefaultEntry {
  category: PalaceInterpretationCategory;
  title: string;
  aliases: string[];
  matchMode: PalaceInterpretationMatchMode;
  content: string[];
}

export interface PalaceInterpretationRecord extends BaseEntity {
  palace_name: string;
  category: PalaceInterpretationCategory;
  title: string;
  aliases: string[];
  match_mode: PalaceInterpretationMatchMode;
  content: string[];
  is_enabled: boolean;
  sort_order: number;
  source: "builtin" | "custom";
}

export interface PalaceInterpretationHit {
  category: PalaceInterpretationCategory;
  title: string;
  aliases: string[];
  matchMode: PalaceInterpretationMatchMode;
  content: string[];
  matchedStars: string[];
  sourceType?: "native" | "borrowed_opposite";
  sourcePalaceName?: string;
}
