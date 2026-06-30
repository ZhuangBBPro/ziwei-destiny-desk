import { v4 as uuidv4 } from "uuid";
import { dayjs } from "@/lib/dayjs";
import { APP_CHART_SYSTEM, APP_CHART_VERSION } from "@/lib/constants";
import { AppError } from "@/lib/errors";
import type {
  ChartAggregate,
  ChartCreateInput,
  ChartPalaceRecord,
  ChartRecord,
  ChartStarRecord,
  ChartTransformRecord,
} from "@/types";
import type { ZiweiCreateConfigInput, ZiweiMappedBoard, ZiweiRawBoard } from "@/features/charts/lib/ziweiTypes";

const TEMPLE_CODE_MAP: Record<string, string> = {
  命宫: "life",
  兄弟: "siblings",
  夫妻: "marriage",
  子女: "children",
  财帛: "wealth",
  疾厄: "health",
  迁移: "travel",
  交友: "friends",
  事业: "career",
  田宅: "property",
  福德: "fortune",
  父母: "parents",
};

const BODY_TEMPLE_NAME = "身宫";

function readName(input: unknown): string {
  if (typeof input === "string") {
    return input;
  }

  if (input && typeof input === "object") {
    const record = input as {
      name?: unknown;
      displayName?: unknown;
      formalName?: unknown;
      key?: unknown;
      toString?: () => string;
    };

    const candidates = [record.displayName, record.formalName, record.name];
    const named = candidates.find((value) => typeof value === "string" && value.trim().length > 0);
    if (typeof named === "string") {
      return named;
    }

    if (typeof record.toString === "function") {
      const text = record.toString();
      if (typeof text === "string" && text !== "[object Object]") {
        return text;
      }
    }

    if (typeof record.key === "string") {
      return record.key;
    }
  }

  return "";
}

function isDisplayValueBroken(value: string | null | undefined) {
  if (!value || !value.trim()) {
    return true;
  }

  return /^[A-Z0-9_]+$/.test(value.trim());
}

function toPlainJson(input: unknown): Record<string, unknown> {
  if (input === null || input === undefined) {
    return {};
  }
  return JSON.parse(
    JSON.stringify(input, (_, value) => {
      if (value instanceof Map) {
        return Object.fromEntries(value);
      }
      return value;
    }),
  ) as Record<string, unknown>;
}

function normalizeTempleName(input: string) {
  return input.replace("宮", "宫");
}

function normalizeStarList(list: unknown[] | undefined) {
  if (!Array.isArray(list)) {
    return [];
  }

  return list.map((item) => {
    if (typeof item === "string") {
      return { star_name: item, brightness_level: null, transform_type: null };
    }

    const record = item as Record<string, unknown>;
    return {
      star_name:
        readName(record.name) ||
        readName(record.star) ||
        String(record.key ?? record.name ?? "未知星曜"),
      brightness_level:
        typeof record.brightness === "number" || typeof record.brightness === "string"
          ? String(record.brightness)
          : null,
      transform_type: readName(record.derivative) || readName(record.transform) || null,
    };
  });
}

export function mapRawZiweiBoard(board: ZiweiRawBoard): ZiweiMappedBoard {
  const serializedBoard =
    typeof board.toJSON === "function"
      ? (board.toJSON() as ZiweiRawBoard)
      : board;

  const cells = Array.isArray(serializedBoard.cells) ? serializedBoard.cells : [];
  if (!serializedBoard.config || cells.length === 0) {
    throw new AppError("排盘结果不完整，无法建立命盘快照。", "ZIWEI_BOARD_INCOMPLETE", board);
  }
  const cellSnapshots = cells.map((cell) => toPlainJson(cell));

  const palaces = cells.flatMap((cell, index) => {
    const temples = Array.isArray(cell.temples) ? cell.temples.map(readName).map(normalizeTempleName) : [];
    const majorStars = normalizeStarList(cell.majorStars);
    const minorStars = normalizeStarList(cell.minorStars);
    const miniStars = normalizeStarList(cell.miniStars);
    const miscStars = normalizeStarList(cell.miscStars);
    const earthly_branch = readName(cell.ground) || "";
    const heavenly_stem = readName(cell.sky) || "";
    const is_body_palace = temples.some((item) => item === "身宫");

    const natalTemples = temples.filter((templeName) => templeName !== BODY_TEMPLE_NAME);

    return natalTemples.map((templeName) => ({
      palace_code: TEMPLE_CODE_MAP[templeName] ?? templeName,
      palace_name: templeName,
      earthly_branch,
      heavenly_stem,
      is_body_palace,
      major_stars_summary: majorStars.map((item) => item.star_name),
      minor_stars_summary: [...minorStars, ...miniStars].map((item) => item.star_name),
      sha_stars_summary: miscStars.map((item) => item.star_name),
      display_order: index,
      palace_snapshot_json: cellSnapshots[index],
    }));
  });

  const lifePalace = palaces.find((item) => item.palace_name === "命宫");
  const bodyPalace = palaces.find((item) => item.is_body_palace);

  return {
    life_palace_branch: lifePalace?.earthly_branch ?? "",
    body_palace_branch: bodyPalace?.earthly_branch ?? "",
    life_master_star: readName(serializedBoard.destinyMaster),
    body_master_star: readName(serializedBoard.bodyMaster),
    five_element_class: readName(serializedBoard.element),
    palaces,
    stars: palaces.flatMap((palace) => {
      const cell = palace.palace_snapshot_json;
      return [
        ...normalizeStarList(cell.majorStars as unknown[] | undefined).map((star) => ({
          palace_code: palace.palace_code,
          star_name: star.star_name,
          star_category: "major" as const,
          brightness_level: star.brightness_level,
          transform_type: star.transform_type,
          notes: "",
        })),
        ...normalizeStarList(cell.minorStars as unknown[] | undefined).map((star) => ({
          palace_code: palace.palace_code,
          star_name: star.star_name,
          star_category: "minor" as const,
          brightness_level: star.brightness_level,
          transform_type: star.transform_type,
          notes: "",
        })),
        ...normalizeStarList(cell.miniStars as unknown[] | undefined).map((star) => ({
          palace_code: palace.palace_code,
          star_name: star.star_name,
          star_category: "mini" as const,
          brightness_level: star.brightness_level,
          transform_type: star.transform_type,
          notes: "",
        })),
        ...normalizeStarList(cell.miscStars as unknown[] | undefined).map((star) => ({
          palace_code: palace.palace_code,
          star_name: star.star_name,
          star_category: "misc" as const,
          brightness_level: star.brightness_level,
          transform_type: star.transform_type,
          notes: "",
        })),
      ];
    }),
    // TODO: fortel-ziweidoushu 的四化结构待在实际安装包导出与运行结果确认后进一步拆表。
    // 当前版本先把相关原始结构优先保存在 snapshot_json 中，保证展示与持久化稳定。
    transforms: [],
    snapshot: {
      config: toPlainJson(serializedBoard.config),
      element: readName(serializedBoard.element),
      destinyMaster: readName(serializedBoard.destinyMaster),
      bodyMaster: readName(serializedBoard.bodyMaster),
      cells: cellSnapshots,
      bornStarDerivativeMap: toPlainJson(
        (serializedBoard as Record<string, unknown>).bornStarDerivativeMap ??
          (board as Record<string, unknown>).bornStarDerivativeMap,
      ),
      runtimeContextPreview: null,
    },
  };
}

export function buildChartAggregate(
  input: ChartCreateInput,
  mappedBoard: ZiweiMappedBoard,
): ChartAggregate {
  const now = dayjs().toISOString();
  const chartId = uuidv4();

  const chart: ChartRecord = {
    id: chartId,
    subject_name: input.subject_name,
    gender: input.gender,
    birth_calendar_type: input.birth_calendar_type,
    birth_date: input.birth_date,
    birth_time: input.birth_time,
    birth_timezone: input.birth_timezone,
    birth_location: input.birth_location,
    leap_month_flag: input.leap_month_flag,
    true_solar_time_enabled: input.true_solar_time_enabled || Boolean(input.manual_true_solar_time),
    manual_true_solar_time: input.manual_true_solar_time,
    manual_true_solar_day_offset: input.manual_true_solar_day_offset,
    chart_system: APP_CHART_SYSTEM,
    chart_version: APP_CHART_VERSION,
    life_palace_branch: mappedBoard.life_palace_branch,
    body_palace_branch: mappedBoard.body_palace_branch,
    life_master_star: mappedBoard.life_master_star,
    body_master_star: mappedBoard.body_master_star,
    five_element_class: mappedBoard.five_element_class,
    snapshot_json: mappedBoard.snapshot as unknown as Record<string, unknown>,
    raw_input_json: toPlainJson(input),
    remarks: input.remarks,
    created_at: now,
    updated_at: now,
    archived_at: null,
  };

  const palaceIdByCode = new Map<string, string>();

  const palaces: ChartPalaceRecord[] = mappedBoard.palaces.map((palace) => {
    const id = uuidv4();
    palaceIdByCode.set(palace.palace_code, id);
    return {
      id,
      chart_id: chartId,
      palace_code: palace.palace_code,
      palace_name: palace.palace_name,
      earthly_branch: palace.earthly_branch,
      heavenly_stem: palace.heavenly_stem,
      is_body_palace: palace.is_body_palace,
      major_stars_summary: palace.major_stars_summary,
      minor_stars_summary: palace.minor_stars_summary,
      sha_stars_summary: palace.sha_stars_summary,
      palace_snapshot_json: palace.palace_snapshot_json,
      display_order: palace.display_order,
      created_at: now,
      updated_at: now,
    };
  });

  const stars: ChartStarRecord[] = mappedBoard.stars.map((star) => ({
    id: uuidv4(),
    chart_id: chartId,
    palace_id: palaceIdByCode.get(star.palace_code) ?? "",
    star_name: star.star_name,
    star_category: star.star_category,
    brightness_level: star.brightness_level,
    transform_type: star.transform_type,
    is_natal: true,
    notes: star.notes,
    created_at: now,
    updated_at: now,
  }));

  const transforms: ChartTransformRecord[] = mappedBoard.transforms.map((item) => ({
    id: uuidv4(),
    chart_id: chartId,
    transform_type: item.transform_type,
    star_name: item.star_name,
    source_scope: item.source_scope,
    target_palace_code: item.target_palace_code,
    source_heavenly_stem: item.source_heavenly_stem,
    payload_json: item.payload_json,
    created_at: now,
    updated_at: now,
  }));

  return {
    chart,
    palaces,
    stars,
    transforms,
  };
}

export function toZiweiCreateConfigInput(input: ChartCreateInput): ZiweiCreateConfigInput {
  return { ...input };
}

function readSnapshotCellList(snapshot: Record<string, unknown>, key: string) {
  const value = snapshot[key];
  return Array.isArray(value) ? normalizeStarList(value) : [];
}

function repairPalaceRecord(palace: ChartPalaceRecord): ChartPalaceRecord {
  const snapshot = palace.palace_snapshot_json;
  const temples = Array.isArray(snapshot.temples)
    ? snapshot.temples.map(readName).map(normalizeTempleName).filter(Boolean)
    : [];
  const majorStars = readSnapshotCellList(snapshot, "majorStars").map((item) => item.star_name);
  const minorStars = [
    ...readSnapshotCellList(snapshot, "minorStars"),
    ...readSnapshotCellList(snapshot, "miniStars"),
  ].map((item) => item.star_name);
  const miscStars = readSnapshotCellList(snapshot, "miscStars").map((item) => item.star_name);

  return {
    ...palace,
    palace_name:
      palace.palace_name === BODY_TEMPLE_NAME
        ? temples.find((temple) => temple !== BODY_TEMPLE_NAME) ?? palace.palace_name
        : palace.palace_name || temples.find((temple) => temple !== BODY_TEMPLE_NAME) || palace.palace_code,
    earthly_branch: palace.earthly_branch || readName(snapshot.ground),
    heavenly_stem: palace.heavenly_stem || readName(snapshot.sky),
    is_body_palace: palace.is_body_palace || temples.includes("身宫"),
    major_stars_summary:
      palace.major_stars_summary.length > 0 && !palace.major_stars_summary.every(isDisplayValueBroken)
        ? palace.major_stars_summary
        : majorStars,
    minor_stars_summary:
      palace.minor_stars_summary.length > 0 && !palace.minor_stars_summary.every(isDisplayValueBroken)
        ? palace.minor_stars_summary
        : minorStars,
    sha_stars_summary:
      palace.sha_stars_summary.length > 0 && !palace.sha_stars_summary.every(isDisplayValueBroken)
        ? palace.sha_stars_summary
        : miscStars,
  };
}

export function repairChartRecordDisplay(chart: ChartRecord, palaces: ChartPalaceRecord[] = []): ChartRecord {
  const snapshot = chart.snapshot_json;
  const lifePalace = palaces.find((item) => item.palace_name === "命宫" || item.palace_code === "life");
  const bodyPalace = palaces.find((item) => item.is_body_palace || item.palace_name === "身宫" || item.palace_code === "body");

  return {
    ...chart,
    life_palace_branch: !isDisplayValueBroken(chart.life_palace_branch)
      ? chart.life_palace_branch
      : lifePalace?.earthly_branch ?? chart.life_palace_branch,
    body_palace_branch: !isDisplayValueBroken(chart.body_palace_branch)
      ? chart.body_palace_branch
      : bodyPalace?.earthly_branch ?? chart.body_palace_branch,
    life_master_star: !isDisplayValueBroken(chart.life_master_star)
      ? chart.life_master_star
      : readName(snapshot.destinyMaster),
    body_master_star: !isDisplayValueBroken(chart.body_master_star)
      ? chart.body_master_star
      : readName(snapshot.bodyMaster),
    five_element_class: !isDisplayValueBroken(chart.five_element_class)
      ? chart.five_element_class
      : readName(snapshot.element),
  };
}

export function repairChartAggregateDisplay(aggregate: ChartAggregate): ChartAggregate {
  const palaces = mergeBodyPalaceOverlay(aggregate.palaces.map(repairPalaceRecord));
  return {
    ...aggregate,
    chart: repairChartRecordDisplay(aggregate.chart, palaces),
    palaces,
  };
}

function mergeBodyPalaceOverlay(palaces: ChartPalaceRecord[]) {
  const bodyOnlyPalaces = palaces.filter(
    (palace) => palace.palace_code === "body" || palace.palace_name === BODY_TEMPLE_NAME,
  );
  const natalPalaces = palaces.filter(
    (palace) => palace.palace_code !== "body" && palace.palace_name !== BODY_TEMPLE_NAME,
  );

  if (bodyOnlyPalaces.length === 0) {
    return natalPalaces;
  }

  return natalPalaces.map((palace) => {
    const matchingBodyPalace = bodyOnlyPalaces.find(
      (bodyPalace) =>
        bodyPalace.display_order === palace.display_order ||
        (
          bodyPalace.earthly_branch &&
          bodyPalace.earthly_branch === palace.earthly_branch
        ),
    );

    return matchingBodyPalace
      ? {
          ...palace,
          is_body_palace: true,
        }
      : palace;
  });
}
