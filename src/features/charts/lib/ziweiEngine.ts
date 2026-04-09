import { AppError } from "@/lib/errors";
import { requireTimeGround } from "@/features/charts/lib/timeGroundMapper";
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
  const match = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
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

function mapGender(bridge: ZiweiLibraryBridge, gender: ZiweiCreateConfigInput["gender"]) {
  return gender === "male" ? bridge.Gender.M : bridge.Gender.F;
}

export async function createRawZiweiBoard(input: ZiweiCreateConfigInput): Promise<ZiweiRawBoard> {
  const bridge = await loadZiweiBridge();
  const { year, month, day } = parseBirthDate(input.birth_date);
  const timeGroundMapping = requireTimeGround(input.birth_time);
  const bornTimeGround = bridge.DayTimeGround.getByName(timeGroundMapping.libraryName);

  try {
    const builderInput = {
      year,
      month,
      day,
      bornTimeGround,
      configType: bridge.ConfigType.SKY,
      gender: mapGender(bridge, input.gender),
    };

    const config =
      input.birth_calendar_type === "solar"
        ? bridge.DestinyConfigBuilder.withSolar(builderInput)
        : bridge.DestinyConfigBuilder.withlunar({
            ...builderInput,
            isLeapMonth: input.leap_month_flag,
          });

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

export async function getZiweiCriteriaBridge() {
  return loadZiweiBridge();
}
