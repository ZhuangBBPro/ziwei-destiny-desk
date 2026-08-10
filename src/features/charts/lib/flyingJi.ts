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

export interface FlyingJiConflictAxis {
  id: string;
  firstTargetPalace: ChartPalaceRecord;
  secondTargetPalace: ChartPalaceRecord;
  firstFlights: FlyingJiFlight[];
  secondFlights: FlyingJiFlight[];
}

export interface FlyingJiAnalysis {
  flights: FlyingJiFlight[];
  conflictAxes: FlyingJiConflictAxis[];
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

  const flightsByTarget = new Map<string, FlyingJiFlight[]>();
  flights.forEach((flight) => {
    if (!flight.targetPalace) {
      return;
    }
    const current = flightsByTarget.get(flight.targetPalace.palace_code) ?? [];
    current.push(flight);
    flightsByTarget.set(flight.targetPalace.palace_code, current);
  });

  const seenAxes = new Set<string>();
  const conflictAxes = palaces.flatMap((firstTargetPalace) => {
    const secondTargetPalace = palaces.find(
      (palace) => palace.earthly_branch === OPPOSITE_BRANCH[firstTargetPalace.earthly_branch],
    );
    if (!secondTargetPalace) {
      return [];
    }

    const id = [firstTargetPalace.palace_code, secondTargetPalace.palace_code].sort().join("--");
    if (seenAxes.has(id)) {
      return [];
    }
    seenAxes.add(id);

    const firstFlights = flightsByTarget.get(firstTargetPalace.palace_code) ?? [];
    const secondFlights = flightsByTarget.get(secondTargetPalace.palace_code) ?? [];
    if (firstFlights.length === 0 || secondFlights.length === 0) {
      return [];
    }

    return [{ id, firstTargetPalace, secondTargetPalace, firstFlights, secondFlights }];
  });

  return { flights, conflictAxes };
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
