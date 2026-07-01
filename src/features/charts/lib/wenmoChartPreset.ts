import type { ZiweiRawBoard, ZiweiRawCell } from "@/features/charts/lib/ziweiTypes";

export const WENMO_CHART_PRESET = Object.freeze({
  id: "wenmo-default-2026-07",
  name: "文墨天机截图口径",
  options: {
    pegasus: "year_branch",
    voidSky: "standard",
    brightness: "dou_shu_quan_shu",
    emptyStars: "primary_secondary_pair",
    angelInjury: "standard",
    kuiYue: "six_xin_tiger_horse",
    destinyMaster: "dou_shu_quan_shu",
    runtimeTransforms: "runtime_heavenly_stem",
    lifeStagesDirection: "yin_yang_forward_reverse",
    earthLifeStage: "water_earth_together",
    lateZi: "next_day",
  },
});

const LIFE_MASTER_BY_PALACE_BRANCH: Record<string, string> = {
  子: "貪狼",
  丑: "巨門",
  寅: "祿存",
  卯: "文曲",
  辰: "廉貞",
  巳: "武曲",
  午: "破軍",
  未: "武曲",
  申: "廉貞",
  酉: "文曲",
  戌: "祿存",
  亥: "巨門",
};

export const TRADITIONAL_TRANSFORMS_BY_STEM: Record<string, Record<string, string>> = {
  甲: { 祿: "廉貞", 權: "破軍", 科: "武曲", 忌: "太陽" },
  乙: { 祿: "天機", 權: "天梁", 科: "紫微", 忌: "太陰" },
  丙: { 祿: "天同", 權: "天機", 科: "文昌", 忌: "廉貞" },
  丁: { 祿: "太陰", 權: "天同", 科: "天機", 忌: "巨門" },
  戊: { 祿: "貪狼", 權: "太陰", 科: "右弼", 忌: "天機" },
  己: { 祿: "武曲", 權: "貪狼", 科: "天梁", 忌: "文曲" },
  庚: { 祿: "太陽", 權: "武曲", 科: "太陰", 忌: "天同" },
  辛: { 祿: "巨門", 權: "太陽", 科: "文曲", 忌: "文昌" },
  壬: { 祿: "天梁", 權: "紫微", 科: "左輔", 忌: "武曲" },
  癸: { 祿: "破軍", 權: "巨門", 科: "太陰", 忌: "貪狼" },
};

const PALACE_BRANCH_ORDER = ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"];

// 《紫微斗数全书》通行亮度表。顺序固定为寅至丑，与命盘地支直接对应。
const STAR_BRIGHTNESS: Record<string, string[]> = {
  紫微: ["旺", "旺", "得", "旺", "庙", "庙", "旺", "旺", "得", "旺", "平", "庙"],
  天機: ["得", "旺", "利", "平", "庙", "陷", "得", "旺", "利", "平", "庙", "陷"],
  太陽: ["旺", "庙", "旺", "旺", "旺", "得", "得", "陷", "不", "陷", "陷", "不"],
  武曲: ["得", "利", "庙", "平", "旺", "庙", "得", "利", "庙", "平", "旺", "庙"],
  天同: ["利", "平", "平", "庙", "陷", "不", "旺", "平", "平", "庙", "旺", "不"],
  廉貞: ["庙", "平", "利", "陷", "平", "利", "庙", "平", "利", "陷", "平", "利"],
  天府: ["庙", "得", "庙", "得", "旺", "庙", "得", "旺", "庙", "得", "庙", "庙"],
  太陰: ["旺", "陷", "陷", "陷", "不", "不", "利", "不", "旺", "庙", "庙", "庙"],
  貪狼: ["平", "利", "庙", "陷", "旺", "庙", "平", "利", "庙", "陷", "旺", "庙"],
  巨門: ["庙", "庙", "陷", "旺", "旺", "不", "庙", "庙", "陷", "旺", "旺", "不"],
  天相: ["庙", "陷", "得", "得", "庙", "得", "庙", "陷", "得", "得", "庙", "庙"],
  天梁: ["庙", "庙", "庙", "陷", "庙", "旺", "陷", "得", "庙", "陷", "庙", "旺"],
  七殺: ["庙", "旺", "庙", "平", "旺", "庙", "庙", "庙", "庙", "平", "旺", "庙"],
  破軍: ["得", "陷", "旺", "平", "庙", "旺", "得", "陷", "旺", "平", "庙", "旺"],
  文昌: ["陷", "利", "得", "庙", "陷", "利", "得", "庙", "陷", "利", "得", "庙"],
  文曲: ["平", "旺", "得", "庙", "陷", "旺", "得", "庙", "陷", "旺", "得", "庙"],
  火星: ["庙", "利", "陷", "得", "庙", "利", "陷", "得", "庙", "利", "陷", "得"],
  鈴星: ["庙", "利", "陷", "得", "庙", "利", "陷", "得", "庙", "利", "陷", "得"],
  擎羊: ["", "陷", "庙", "", "陷", "庙", "", "陷", "庙", "", "陷", "庙"],
  陀羅: ["陷", "", "庙", "陷", "", "庙", "陷", "", "庙", "陷", "", "庙"],
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
  禄存: "祿存",
  铃星: "鈴星",
  陀罗: "陀羅",
};

function readName(value: unknown) {
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const candidate = record.displayName ?? record.name;
    return typeof candidate === "string" ? candidate : "";
  }
  return "";
}

function normalizeStarName(value: unknown) {
  const name = readName(value);
  return STAR_NAME_ALIASES[name] ?? name;
}

function hasTemple(cell: ZiweiRawCell, templeName: string) {
  return (cell.temples ?? []).some((temple) => readName(temple).replace("宮", "宫") === templeName);
}

function removeStar(list: unknown[] | undefined, starName: string) {
  return (list ?? []).filter((star) => normalizeStarName(star) !== starName);
}

function addStar(list: unknown[] | undefined, starName: string) {
  const next = removeStar(list, starName);
  next.push(starName);
  return next;
}

function applyStandardAngelInjury(cells: ZiweiRawCell[]) {
  cells.forEach((cell) => {
    cell.miniStars = removeStar(removeStar(cell.miniStars, "天使"), "天傷");
    cell.miscStars = removeStar(removeStar(cell.miscStars, "天使"), "天傷");
  });

  const friendsPalace = cells.find((cell) => hasTemple(cell, "交友"));
  const healthPalace = cells.find((cell) => hasTemple(cell, "疾厄"));
  if (friendsPalace) {
    friendsPalace.miniStars = addStar(friendsPalace.miniStars, "天傷");
    friendsPalace.miscStars = addStar(friendsPalace.miscStars, "天傷");
  }
  if (healthPalace) {
    healthPalace.miniStars = addStar(healthPalace.miniStars, "天使");
    healthPalace.miscStars = addStar(healthPalace.miscStars, "天使");
  }
}

function applyBrightness(cells: ZiweiRawCell[]) {
  cells.forEach((cell) => {
    const branchIndex = PALACE_BRANCH_ORDER.indexOf(readName(cell.ground));
    const brightness: Record<string, string> = {};
    if (branchIndex >= 0) {
      [...(cell.majorStars ?? []), ...(cell.minorStars ?? [])].forEach((star) => {
        const starName = normalizeStarName(star);
        const level = STAR_BRIGHTNESS[starName]?.[branchIndex];
        if (level) {
          brightness[readName(star)] = level;
        }
      });
    }
    cell.starBrightness = brightness;
  });
}

export function applyWenmoChartPreset(input: ZiweiRawBoard): ZiweiRawBoard {
  const board = JSON.parse(JSON.stringify(input)) as ZiweiRawBoard;
  const cells = Array.isArray(board.cells) ? board.cells : [];
  const lifePalace = cells.find((cell) => hasTemple(cell, "命宫"));
  const lifePalaceBranch = readName(lifePalace?.ground);
  const yearStem = readName(board.config?.yearSky);

  board.destinyMaster = LIFE_MASTER_BY_PALACE_BRANCH[lifePalaceBranch] ?? board.destinyMaster;
  board.bornStarDerivativeMap = TRADITIONAL_TRANSFORMS_BY_STEM[yearStem] ?? board.bornStarDerivativeMap;
  board.chartPreset = WENMO_CHART_PRESET;

  applyStandardAngelInjury(cells);
  applyBrightness(cells);
  return board;
}
