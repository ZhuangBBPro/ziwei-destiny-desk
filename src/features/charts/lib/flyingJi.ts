import type { ChartPalaceRecord } from "@/types";
import { TRADITIONAL_TRANSFORMS_BY_STEM } from "@/features/charts/lib/wenmoChartPreset";

const OPPOSITE_BRANCH: Record<string, string> = {
  子: "午", 丑: "未", 寅: "申", 卯: "酉", 辰: "戌", 巳: "亥",
  午: "子", 未: "丑", 申: "寅", 酉: "卯", 戌: "辰", 亥: "巳",
};

const STAR_NAME_ALIASES: Record<string, string> = {
  天机: "天機", 太阳: "太陽", 廉贞: "廉貞", 太阴: "太陰",
  贪狼: "貪狼", 巨门: "巨門", 七杀: "七殺", 破军: "破軍", 左辅: "左輔",
};

export interface FlyingJiFlight {
  sourcePalace: ChartPalaceRecord;
  targetPalace: ChartPalaceRecord | null;
  jiStarName: string;
}

export interface NatalJiOpposition {
  id: string;
  type: "natal";
  jiStarName: string;
  seatedPalace: ChartPalaceRecord;
  impactedPalace: ChartPalaceRecord;
}

export interface ShotJiRelation {
  id: string;
  type: "shot";
  flight: FlyingJiFlight & { targetPalace: ChartPalaceRecord };
}

export interface EntangledJiRelation {
  id: string;
  type: "entangled";
  firstFlight: FlyingJiFlight & { targetPalace: ChartPalaceRecord };
  secondFlight: FlyingJiFlight & { targetPalace: ChartPalaceRecord };
}

export type JiOppositionRelation = NatalJiOpposition | ShotJiRelation | EntangledJiRelation;

export interface FlyingJiAnalysis {
  flights: FlyingJiFlight[];
  natalJi: NatalJiOpposition | null;
  shotJi: ShotJiRelation[];
  entangledJi: EntangledJiRelation[];
  relations: JiOppositionRelation[];
}

export function analyzeFlyingJi(
  palaces: ChartPalaceRecord[],
  natalJiStarName: string | null = null,
): FlyingJiAnalysis {
  const flights = palaces.flatMap((sourcePalace) => {
    const jiStarName = TRADITIONAL_TRANSFORMS_BY_STEM[sourcePalace.heavenly_stem]?.忌;
    if (!jiStarName) {
      return [];
    }
    return [{ sourcePalace, targetPalace: findStarPalace(palaces, jiStarName), jiStarName }];
  });

  const natalJi = buildNatalJiOpposition(palaces, natalJiStarName);
  const shotJi = flights.flatMap((flight) => {
    if (!flight.targetPalace || !areOppositePalaces(flight.sourcePalace, flight.targetPalace)) {
      return [];
    }
    return [{
      id: `shot-${flight.sourcePalace.palace_code}-${flight.targetPalace.palace_code}`,
      type: "shot" as const,
      flight: flight as FlyingJiFlight & { targetPalace: ChartPalaceRecord },
    }];
  });

  const shotBySource = new Map(shotJi.map((relation) => [relation.flight.sourcePalace.palace_code, relation]));
  const seenEntanglements = new Set<string>();
  const entangledJi = shotJi.flatMap((firstRelation) => {
    const firstFlight = firstRelation.flight;
    const reverseRelation = shotBySource.get(firstFlight.targetPalace.palace_code);
    if (!reverseRelation || reverseRelation.flight.targetPalace.palace_code !== firstFlight.sourcePalace.palace_code) {
      return [];
    }

    const axisId = [firstFlight.sourcePalace.palace_code, firstFlight.targetPalace.palace_code].sort().join("--");
    if (seenEntanglements.has(axisId)) {
      return [];
    }
    seenEntanglements.add(axisId);
    return [{
      id: `entangled-${axisId}`,
      type: "entangled" as const,
      firstFlight,
      secondFlight: reverseRelation.flight,
    }];
  });

  return {
    flights,
    natalJi,
    shotJi,
    entangledJi,
    relations: [...(natalJi ? [natalJi] : []), ...shotJi, ...entangledJi],
  };
}

function buildNatalJiOpposition(
  palaces: ChartPalaceRecord[],
  natalJiStarName: string | null,
): NatalJiOpposition | null {
  if (!natalJiStarName) {
    return null;
  }
  const seatedPalace = findStarPalace(palaces, natalJiStarName);
  const impactedPalace = seatedPalace ? findOppositePalace(palaces, seatedPalace) : null;
  if (!seatedPalace || !impactedPalace) {
    return null;
  }
  return {
    id: `natal-${seatedPalace.palace_code}-${impactedPalace.palace_code}`,
    type: "natal",
    jiStarName: natalJiStarName,
    seatedPalace,
    impactedPalace,
  };
}

function findStarPalace(palaces: ChartPalaceRecord[], starName: string) {
  const normalizedStarName = normalizeStarName(starName);
  return palaces.find((palace) =>
    getPalaceStars(palace).some((star) => normalizeStarName(star) === normalizedStarName),
  ) ?? null;
}

function findOppositePalace(palaces: ChartPalaceRecord[], palace: ChartPalaceRecord) {
  return palaces.find((candidate) => candidate.earthly_branch === OPPOSITE_BRANCH[palace.earthly_branch]) ?? null;
}

function areOppositePalaces(first: ChartPalaceRecord, second: ChartPalaceRecord) {
  return OPPOSITE_BRANCH[first.earthly_branch] === second.earthly_branch;
}

function getPalaceStars(palace: ChartPalaceRecord) {
  return [...palace.major_stars_summary, ...palace.minor_stars_summary, ...palace.sha_stars_summary];
}

function normalizeStarName(starName: string) {
  return STAR_NAME_ALIASES[starName.trim()] ?? starName.trim();
}
