import type { ChartPalaceRecord } from "@/types";
import { TRADITIONAL_TRANSFORMS_BY_STEM } from "@/features/charts/lib/wenmoChartPreset";

const OPPOSITE_BRANCH: Record<string, string> = {
  子: "午",
  丑: "未",
  寅: "申",
  卯: "酉",
  辰: "戌",
  巳: "亥",
  午: "子",
  未: "丑",
  申: "寅",
  酉: "卯",
  戌: "辰",
  亥: "巳",
};

const STAR_NAME_ALIASES: Record<string, string> = {
  天机: "天機",
  太阳: "太陽",
  廉贞: "廉貞",
  太阴: "太陰",
  贪狼: "貪狼",
  巨门: "巨門",
  文昌: "文昌",
  文曲: "文曲",
  武曲: "武曲",
  天同: "天同",
};

export interface FlyingJiFlight {
  sourcePalace: ChartPalaceRecord;
  targetPalace: ChartPalaceRecord | null;
  jiStarName: string;
}

export interface FlyingJiConflict {
  id: string;
  first: FlyingJiFlight;
  second: FlyingJiFlight;
}

export interface FlyingJiAnalysis {
  flights: FlyingJiFlight[];
  conflicts: FlyingJiConflict[];
}

export function analyzeFlyingJi(palaces: ChartPalaceRecord[]): FlyingJiAnalysis {
  const flights = palaces.flatMap((sourcePalace) => {
    const jiStarName = TRADITIONAL_TRANSFORMS_BY_STEM[sourcePalace.heavenly_stem]?.忌;
    if (!jiStarName) {
      return [];
    }

    const normalizedJiStarName = normalizeStarName(jiStarName);
    const targetPalace =
      palaces.find((palace) => getPalaceStars(palace).some((star) => normalizeStarName(star) === normalizedJiStarName)) ??
      null;

    return [{ sourcePalace, targetPalace, jiStarName }];
  });

  const conflicts: FlyingJiConflict[] = [];

  flights.forEach((first, firstIndex) => {
    flights.slice(firstIndex + 1).forEach((second) => {
      if (!first.targetPalace || !second.targetPalace) {
        return;
      }

      if (OPPOSITE_BRANCH[first.targetPalace.earthly_branch] !== second.targetPalace.earthly_branch) {
        return;
      }

      conflicts.push({
        id: [first.sourcePalace.palace_code, second.sourcePalace.palace_code].sort().join("--"),
        first,
        second,
      });
    });
  });

  return { flights, conflicts };
}

function getPalaceStars(palace: ChartPalaceRecord) {
  return [
    ...palace.major_stars_summary,
    ...palace.minor_stars_summary,
    ...palace.sha_stars_summary,
  ];
}

function normalizeStarName(starName: string) {
  return STAR_NAME_ALIASES[starName.trim()] ?? starName.trim();
}
