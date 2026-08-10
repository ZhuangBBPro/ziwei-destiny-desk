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
  七杀: "七殺",
  破军: "破軍",
  左辅: "左輔",
};

const TRANSFORM_DERIVATIVES = ["祿", "權", "科", "忌"] as const;

export type PalaceSelfTransformDirection = "centrifugal" | "centripetal";
export type PalaceSelfTransformDerivative = (typeof TRANSFORM_DERIVATIVES)[number];

export interface PalaceSelfTransformMarker {
  direction: PalaceSelfTransformDirection;
  derivative: PalaceSelfTransformDerivative;
  starName: string;
  targetPalaceBranch: string;
  sourcePalaceName: string;
  sourcePalaceStem: string;
}

export function analyzePalaceSelfTransforms(palaces: ChartPalaceRecord[]) {
  const markersByPalace = new Map<string, PalaceSelfTransformMarker[]>();

  palaces.forEach((palace) => {
    const oppositePalace = palaces.find(
      (candidate) => candidate.earthly_branch === OPPOSITE_BRANCH[palace.earthly_branch],
    );
    const markers = [
      ...getTransformMarkers(palace, palace, "centrifugal"),
      ...(oppositePalace ? getTransformMarkers(palace, oppositePalace, "centripetal") : []),
    ];

    markersByPalace.set(palace.palace_code, markers);
  });

  return markersByPalace;
}

function getTransformMarkers(
  targetPalace: ChartPalaceRecord,
  sourcePalace: ChartPalaceRecord,
  direction: PalaceSelfTransformDirection,
) {
  const transforms = TRADITIONAL_TRANSFORMS_BY_STEM[sourcePalace.heavenly_stem];
  if (!transforms) {
    return [];
  }

  const palaceStars = getPalaceStars(targetPalace);

  return TRANSFORM_DERIVATIVES.flatMap((derivative) => {
    const transformedStar = transforms[derivative];
    const matchingStar = palaceStars.find(
      (starName) => normalizeStarName(starName) === normalizeStarName(transformedStar),
    );

    return matchingStar
      ? [{
          direction,
          derivative,
          starName: matchingStar,
          targetPalaceBranch: targetPalace.earthly_branch,
          sourcePalaceName: sourcePalace.palace_name,
          sourcePalaceStem: sourcePalace.heavenly_stem,
        }]
      : [];
  });
}

function getPalaceStars(palace: ChartPalaceRecord) {
  return [
    ...palace.major_stars_summary,
    ...palace.minor_stars_summary,
    ...palace.sha_stars_summary,
  ];
}

function normalizeStarName(starName: string) {
  const trimmedName = starName.trim();
  return STAR_NAME_ALIASES[trimmedName] ?? trimmedName;
}
