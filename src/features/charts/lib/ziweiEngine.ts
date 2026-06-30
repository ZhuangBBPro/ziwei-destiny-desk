import { AppError } from "@/lib/errors";
import { requireTimeGround } from "@/features/charts/lib/timeGroundMapper";
import { resolveTrueSolarBirthDateTime } from "@/features/charts/lib/trueSolarTime";
import type {
  ZiweiCreateConfigInput,
  ZiweiLibraryBridge,
  ZiweiRawBoard,
} from "@/features/charts/lib/ziweiTypes";
import fortelBundleUrl from "fortel-ziweidoushu/dist/bundle.js?url";

let cachedBridge: ZiweiLibraryBridge | null = null;
let browserBundlePromise: Promise<ZiweiLibraryBridge> | null = null;

function getBrowserGlobalBridge() {
  return (globalThis as Record<string, unknown>)["fortel-ziweidoushu"] as
    | ZiweiLibraryBridge
    | undefined;
}

async function loadBrowserBundleBridge(): Promise<ZiweiLibraryBridge> {
  const existing = getBrowserGlobalBridge();
  if (existing) {
    return existing;
  }

  if (!browserBundlePromise) {
    browserBundlePromise = new Promise<ZiweiLibraryBridge>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = fortelBundleUrl;
      script.async = true;

      script.onload = () => {
        const bridge = getBrowserGlobalBridge();
        if (bridge) {
          resolve(bridge);
          return;
        }
        reject(new Error("fortel-ziweidoushu browser bundle loaded but global export was not found"));
      };

      script.onerror = () => {
        reject(new Error("Failed to load fortel-ziweidoushu browser bundle"));
      };

      document.head.appendChild(script);
    });
  }

  return browserBundlePromise;
}

async function loadZiweiBridge(): Promise<ZiweiLibraryBridge> {
  if (cachedBridge) {
    return cachedBridge;
  }

  try {
    const mod =
      typeof window !== "undefined"
        ? await loadBrowserBundleBridge()
        : ((await import("fortel-ziweidoushu")) as unknown as ZiweiLibraryBridge);
    cachedBridge = mod;
    return mod;
  } catch (error) {
    console.error("Failed to load fortel-ziweidoushu", error);
    throw new AppError(
      "真实排盘库加载失败，请确认依赖已正确安装。",
      "ZIWEI_LIBRARY_LOAD_FAILED",
      error,
    );
  }
}

function parseBirthDate(input: string) {
  const trimmed = input.trim();
  const compactNormalized = trimmed.replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3");
  const normalized = compactNormalized.replace(
    /^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/,
    (_, year: string, month: string, day: string) =>
      `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`,
  );
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new AppError("出生日期格式不合法，请使用 YYYY-MM-DD。", "INVALID_BIRTH_DATE", {
      input,
    });
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function assertValidSolarDate(
  input: ZiweiCreateConfigInput,
  date: { year: number; month: number; day: number },
) {
  const { year, month, day } = date;
  const nativeDate = new Date(Date.UTC(year, month - 1, day));
  if (
    nativeDate.getUTCFullYear() !== year ||
    nativeDate.getUTCMonth() !== month - 1 ||
    nativeDate.getUTCDate() !== day
  ) {
    throw new AppError("阳历出生日期不存在，请重新检查年月日。", "INVALID_SOLAR_DATE", input);
  }
}

function resolveSolarBirthDate(
  bridge: ZiweiLibraryBridge,
  input: ZiweiCreateConfigInput,
  date: { year: number; month: number; day: number },
) {
  const { year, month, day } = date;

  if (input.birth_calendar_type === "solar") {
    assertValidSolarDate(input, date);
    return date;
  }

  const calendar = bridge.defaultCalendar;
  if (!calendar?.lunar2solar) {
    throw new AppError(
      "农历转阳历失败：排盘库未提供农历转换能力。",
      "LUNAR_CONVERTER_NOT_AVAILABLE",
      input,
    );
  }

  try {
    const convertedDate = calendar.lunar2solar(year, month, day, input.leap_month_flag);
    const solarDate = {
      year: convertedDate.solarYear,
      month: convertedDate.solarMonth,
      day: convertedDate.solarDay,
    };
    assertValidSolarDate(input, solarDate);
    return solarDate;
  } catch (error) {
    throw new AppError(
      input.leap_month_flag
        ? "农历闰月日期不合法：该年份可能没有对应闰月，或日期超出当月范围。"
        : "农历出生日期不存在，请重新检查年月日和闰月选项。",
      "INVALID_LUNAR_DATE",
      error,
    );
  }
}

function mapGender(bridge: ZiweiLibraryBridge, gender: ZiweiCreateConfigInput["gender"]) {
  return gender === "male" ? bridge.Gender.M : bridge.Gender.F;
}

export async function createRawZiweiBoard(input: ZiweiCreateConfigInput): Promise<ZiweiRawBoard> {
  const bridge = await loadZiweiBridge();
  const { year, month, day } = parseBirthDate(input.birth_date);
  const solarBirthDate = resolveSolarBirthDate(bridge, input, { year, month, day });
  const manualTrueSolarTime = (input.manual_true_solar_time ?? "").trim();
  const automaticTrueSolarDateTime = !manualTrueSolarTime && input.true_solar_time_enabled
    ? resolveTrueSolarBirthDateTime({
        date: solarBirthDate,
        time: input.birth_time,
        location: input.birth_location,
      })
    : null;
  const effectiveBirthDate = manualTrueSolarTime
    ? addDays(solarBirthDate, Number(input.manual_true_solar_day_offset ?? "0"))
    : automaticTrueSolarDateTime?.date ?? solarBirthDate;
  const effectiveBirthTime = manualTrueSolarTime || automaticTrueSolarDateTime?.time || input.birth_time;
  const timeGroundMapping = requireTimeGround(effectiveBirthTime);
  const bornTimeGround = bridge.DayTimeGround.getByName(timeGroundMapping.libraryName);

  try {
    const builderInput = {
      year: effectiveBirthDate.year,
      month: effectiveBirthDate.month,
      day: effectiveBirthDate.day,
      bornTimeGround,
      configType: bridge.ConfigType.SKY,
      gender: mapGender(bridge, input.gender),
    };

    const config = bridge.DestinyConfigBuilder.withSolar(builderInput);

    return new bridge.DestinyBoard(config);
  } catch (error) {
    console.error("Failed to create ziwei board", error);
    throw new AppError(
      "排盘失败，请检查出生资料是否完整且与历法设置一致。",
      "ZIWEI_BOARD_CREATE_FAILED",
      error,
    );
  }
}

function addDays(date: { year: number; month: number; day: number }, dayOffset: number) {
  const adjustedDate = new Date(Date.UTC(date.year, date.month - 1, date.day + dayOffset));
  return {
    year: adjustedDate.getUTCFullYear(),
    month: adjustedDate.getUTCMonth() + 1,
    day: adjustedDate.getUTCDate(),
  };
}

export async function preloadZiweiEngine() {
  await loadZiweiBridge();
}

export async function getZiweiCriteriaBridge() {
  return loadZiweiBridge();
}
