import type { BaseEntity, BirthCalendarType, GenderType, StarCategory } from "@/types/common";

export interface ChartRecord extends BaseEntity {
  subject_name: string;
  gender: GenderType;
  birth_calendar_type: BirthCalendarType;
  birth_date: string;
  birth_time: string;
  birth_timezone: string;
  birth_location: string;
  leap_month_flag: boolean;
  true_solar_time_enabled: boolean;
  chart_system: string;
  chart_version: string;
  life_palace_branch: string;
  body_palace_branch: string;
  life_master_star: string;
  body_master_star: string;
  five_element_class: string;
  snapshot_json: Record<string, unknown>;
  raw_input_json: Record<string, unknown>;
  remarks: string;
  archived_at: string | null;
}

export interface ChartPalaceRecord extends BaseEntity {
  chart_id: string;
  palace_code: string;
  palace_name: string;
  earthly_branch: string;
  heavenly_stem: string;
  is_body_palace: boolean;
  major_stars_summary: string[];
  minor_stars_summary: string[];
  sha_stars_summary: string[];
  palace_snapshot_json: Record<string, unknown>;
  display_order: number;
}

export interface ChartStarRecord extends BaseEntity {
  chart_id: string;
  palace_id: string;
  star_name: string;
  star_category: StarCategory;
  brightness_level: string | null;
  transform_type: string | null;
  is_natal: boolean;
  notes: string;
}

export interface ChartTransformRecord extends BaseEntity {
  chart_id: string;
  transform_type: string;
  star_name: string;
  source_scope: string;
  target_palace_code: string | null;
  source_heavenly_stem: string | null;
  payload_json: Record<string, unknown>;
}

export interface ChartCreateInput {
  subject_name: string;
  gender: GenderType;
  birth_calendar_type: BirthCalendarType;
  birth_date: string;
  birth_time: string;
  birth_timezone: string;
  birth_location: string;
  leap_month_flag: boolean;
  true_solar_time_enabled: boolean;
  remarks: string;
}

export interface ChartAggregate {
  chart: ChartRecord;
  palaces: ChartPalaceRecord[];
  stars: ChartStarRecord[];
  transforms: ChartTransformRecord[];
}
