import type { BirthCalendarType, ChartRecord } from "@/types";

export function getBirthCalendarLabel(calendarType: BirthCalendarType) {
  return calendarType === "lunar" ? "农历" : "阳历";
}

export function formatChartBirthInfo(chart: Pick<ChartRecord, "birth_calendar_type" | "birth_date" | "birth_time">) {
  return `${getBirthCalendarLabel(chart.birth_calendar_type)} ${chart.birth_date} ${chart.birth_time}`;
}

const HEAVENLY_STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;

// 阴阳由「生年天干」决定，与性别无关：甲丙戊庚壬为阳，乙丁己辛癸为阴。
const YANG_STEMS = new Set<string>(["甲", "丙", "戊", "庚", "壬"]);
const YIN_STEMS = new Set<string>(["乙", "丁", "己", "辛", "癸"]);

function readStemText(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const candidate = record.displayName ?? record.name ?? record.key;
    if (typeof candidate === "string") {
      return candidate.trim();
    }
  }
  return "";
}

/**
 * 取生年天干。优先读排盘快照里的 config.yearSky；
 * 快照缺字段时用农历年份反推（年干 =（农历年 - 4）% 10）。
 */
export function getBirthYearStem(chart: Pick<ChartRecord, "snapshot_json">): string {
  const config = (chart.snapshot_json as { config?: Record<string, unknown> } | undefined)?.config;
  if (!config) {
    return "";
  }

  const stem = readStemText(config.yearSky);
  if (YANG_STEMS.has(stem) || YIN_STEMS.has(stem)) {
    return stem;
  }

  const lunarYear = Number(config.year);
  if (Number.isInteger(lunarYear) && lunarYear > 0) {
    return HEAVENLY_STEMS[(((lunarYear - 4) % 10) + 10) % 10];
  }

  return "";
}

/** 生年天干的阴阳属性，取不到时返回空串（不猜）。 */
export function getBirthPolarity(chart: Pick<ChartRecord, "snapshot_json">): "阳" | "阴" | "" {
  const stem = getBirthYearStem(chart);
  if (YANG_STEMS.has(stem)) {
    return "阳";
  }
  if (YIN_STEMS.has(stem)) {
    return "阴";
  }
  return "";
}

export function getGenderLabel(gender: ChartRecord["gender"]) {
  return gender === "male" ? "男" : "女";
}

/** 例：壬午年女命 → 「阳女」。阴阳判不出时只显示「男/女」。 */
export function getYinYangGenderLabel(chart: Pick<ChartRecord, "gender" | "snapshot_json">): string {
  return `${getBirthPolarity(chart)}${getGenderLabel(chart.gender)}`;
}
