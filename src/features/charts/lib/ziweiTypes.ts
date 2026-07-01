import type { BirthCalendarType, GenderType } from "@/types";

export interface ZiweiLibraryBridge {
  DestinyBoard: new (config: unknown) => ZiweiRawBoard;
  DestinyConfigBuilder: {
    withSolar(input: Record<string, unknown>): unknown;
  };
  DayTimeGround: {
    getByName(name: string): unknown;
  };
  ConfigType: {
    SKY: unknown;
  };
  Gender: {
    M: unknown;
    F: unknown;
  };
  defaultCalendar?: {
    lunar2solar?: (
      year: number,
      month: number,
      day: number,
      isLeapMonth?: boolean,
    ) => { solarYear: number; solarMonth: number; solarDay: number };
  };
  BoardCriteria?: new (board: unknown) => unknown;
  Temple?: Record<string, unknown>;
  starByName?: (name: string) => unknown;
}

export interface ZiweiCreateConfigInput {
  subject_name: string;
  gender: GenderType;
  birth_calendar_type: BirthCalendarType;
  birth_date: string;
  birth_time: string;
  birth_timezone: string;
  birth_location: string;
  leap_month_flag: boolean;
  true_solar_time_enabled: boolean;
  manual_true_solar_time: string;
  manual_true_solar_day_offset: "-1" | "0" | "1";
  remarks: string;
}

export interface ZiweiRawCell {
  sky?: { name?: string } | string;
  ground?: { name?: string } | string;
  temples?: Array<{ name?: string } | string>;
  majorStars?: unknown[];
  minorStars?: unknown[];
  miniStars?: unknown[];
  miscStars?: unknown[];
  ageStart?: number;
  ageEnd?: number;
  ageRange?: { start?: number; end?: number } | [number, number] | string;
  lifeStage?: { name?: string } | string;
  starBrightness?: Record<string, string>;
}

export interface ZiweiRawBoard {
  config?: Record<string, unknown>;
  element?: { name?: string } | string;
  destinyMaster?: { name?: string } | string;
  bodyMaster?: { name?: string } | string;
  cells?: ZiweiRawCell[];
  toString?: () => string;
  toJSON?: () => unknown;
  getRuntimContext?: (input: Record<string, unknown>) => unknown;
  bornStarDerivativeMap?: unknown;
  chartPreset?: Record<string, unknown>;
}

export interface ZiweiMappedPalace {
  palace_code: string;
  palace_name: string;
  earthly_branch: string;
  heavenly_stem: string;
  is_body_palace: boolean;
  major_stars_summary: string[];
  minor_stars_summary: string[];
  sha_stars_summary: string[];
  display_order: number;
  palace_snapshot_json: Record<string, unknown>;
}

export interface ZiweiMappedStar {
  palace_code: string;
  star_name: string;
  star_category: "major" | "minor" | "mini" | "misc" | "sha";
  brightness_level: string | null;
  transform_type: string | null;
  notes: string;
}

export interface ZiweiMappedSnapshot {
  config: Record<string, unknown>;
  element: string;
  destinyMaster: string;
  bodyMaster: string;
  cells: Record<string, unknown>[];
  bornStarDerivativeMap?: unknown;
  chartPreset?: Record<string, unknown>;
  runtimeContextPreview?: Record<string, unknown> | null;
}

export interface ZiweiMappedBoard {
  life_palace_branch: string;
  body_palace_branch: string;
  life_master_star: string;
  body_master_star: string;
  five_element_class: string;
  palaces: ZiweiMappedPalace[];
  stars: ZiweiMappedStar[];
  transforms: Array<{
    transform_type: string;
    star_name: string;
    source_scope: string;
    target_palace_code: string | null;
    source_heavenly_stem: string | null;
    payload_json: Record<string, unknown>;
  }>;
  snapshot: ZiweiMappedSnapshot;
}
