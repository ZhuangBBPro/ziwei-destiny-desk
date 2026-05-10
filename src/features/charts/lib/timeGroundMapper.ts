import { AppError } from "@/lib/errors";

const GROUND_NAMES = [
  "早子时",
  "夜子时",
  "子时",
  "丑时",
  "寅时",
  "卯时",
  "辰时",
  "巳时",
  "午时",
  "未时",
  "申时",
  "酉时",
  "戌时",
  "亥时",
] as const;

export type TimeGroundName = (typeof GROUND_NAMES)[number];

export interface TimeGroundMappingResult {
  normalizedName: TimeGroundName;
  libraryName: string;
}

function toLibraryName(name: TimeGroundName) {
  const map: Record<TimeGroundName, string> = {
    "早子时": "早子時",
    "夜子时": "夜子時",
    "子时": "夜子時",
    "丑时": "丑時",
    "寅时": "寅時",
    "卯时": "卯時",
    "辰时": "辰時",
    "巳时": "巳時",
    "午时": "午時",
    "未时": "未時",
    "申时": "申時",
    "酉时": "酉時",
    "戌时": "戌時",
    "亥时": "亥時",
  };

  return map[name];
}

export function normalizeTimeGroundInput(input: string): TimeGroundMappingResult | null {
  const normalized = normalizeClockText(input);
  if ((GROUND_NAMES as readonly string[]).includes(normalized)) {
    return {
      normalizedName: normalized as TimeGroundName,
      libraryName: toLibraryName(normalized as TimeGroundName),
    };
  }

  const match = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  const normalizedName = mapClockTimeToGround(hour, minute);
  return {
    normalizedName,
    libraryName: toLibraryName(normalizedName),
  };
}

function normalizeClockText(input: string) {
  const normalized = input
    .trim()
    .replace(/：/g, ":")
    .replace(/時/g, "时")
    .replace(/\s+/g, "");

  const chineseTimeMatch = normalized.match(/^(凌晨|早上|上午|中午|下午|晚上|夜里)?(\d{1,2})点(半|(\d{1,2})分?)?$/);
  if (!chineseTimeMatch) {
    return normalized;
  }

  const meridiem = chineseTimeMatch[1] ?? "";
  let hour = Number(chineseTimeMatch[2]);
  const minute = chineseTimeMatch[3] === "半" ? 30 : Number(chineseTimeMatch[4] ?? 0);

  if (["下午", "晚上", "夜里"].includes(meridiem) && hour < 12) {
    hour += 12;
  }

  if (meridiem === "凌晨" && hour === 12) {
    hour = 0;
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function mapClockTimeToGround(hour: number, minute: number): TimeGroundName {
  const minutes = hour * 60 + minute;

  // 库实际把子时拆为“夜子時(23:00-23:59)”与“早子時(00:00-00:59)”。
  // 我们保留常见十二时辰输入，同时在映射到库时显式处理跨日边界。
  if (minutes >= 23 * 60) {
    return "夜子时";
  }
  if (minutes < 60) {
    return "早子时";
  }
  if (minutes < 3 * 60) {
    return "丑时";
  }
  if (minutes < 5 * 60) {
    return "寅时";
  }
  if (minutes < 7 * 60) {
    return "卯时";
  }
  if (minutes < 9 * 60) {
    return "辰时";
  }
  if (minutes < 11 * 60) {
    return "巳时";
  }
  if (minutes < 13 * 60) {
    return "午时";
  }
  if (minutes < 15 * 60) {
    return "未时";
  }
  if (minutes < 17 * 60) {
    return "申时";
  }
  if (minutes < 19 * 60) {
    return "酉时";
  }
  if (minutes < 21 * 60) {
    return "戌时";
  }
  return "亥时";
}

export function requireTimeGround(input: string) {
  const mapped = normalizeTimeGroundInput(input);
  if (!mapped) {
    throw new AppError("出生时辰无法映射，请输入十二时辰、HH:mm 或 11点半。", "INVALID_TIME_GROUND", {
      input,
    });
  }
  return mapped;
}
