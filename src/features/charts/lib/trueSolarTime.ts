import cityGeoData from "@/features/charts/data/chinaCityGeo.json";
import { AppError } from "@/lib/errors";

interface BirthDateParts {
  year: number;
  month: number;
  day: number;
}

interface CityGeoRecord {
  province: string;
  city: string;
  area: string;
  lng: string;
  lat: string;
}

export interface TrueSolarBirthDateTime {
  date: BirthDateParts;
  time: string;
  offsetMinutes: number;
  longitude: number;
  latitude: number | null;
  matchedLocation: string;
}

const CHINA_STANDARD_MERIDIAN = 120;
const MINUTES_PER_DAY = 24 * 60;
const geoRecords = cityGeoData as CityGeoRecord[];

export function resolveTrueSolarBirthDateTime({
  date,
  time,
  location,
}: {
  date: BirthDateParts;
  time: string;
  location: string;
}): TrueSolarBirthDateTime {
  const clockTime = parseClockTime(time);
  if (!clockTime) {
    throw new AppError("启用真太阳时时，出生时间必须是 HH:mm 格式。", "INVALID_TRUE_SOLAR_CLOCK_TIME", {
      time,
    });
  }

  const geo = resolveLocationGeo(location);
  if (!geo) {
    throw new AppError(
      "无法识别出生地经度，请用出生地点选择器选择省市区，或暂时关闭真太阳时。",
      "TRUE_SOLAR_LOCATION_NOT_FOUND",
      { location },
    );
  }

  const equationOfTimeMinutes = getEquationOfTimeMinutes(date, clockTime);
  const longitudeOffsetMinutes = (geo.longitude - CHINA_STANDARD_MERIDIAN) * 4;
  const offsetMinutes = Math.round(longitudeOffsetMinutes + equationOfTimeMinutes);
  const adjusted = addMinutesToLocalDateTime(date, clockTime.hour * 60 + clockTime.minute + offsetMinutes);

  return {
    date: adjusted.date,
    time: minutesToClockText(adjusted.minutes),
    offsetMinutes,
    longitude: geo.longitude,
    latitude: geo.latitude,
    matchedLocation: geo.label,
  };
}

function parseClockTime(input: string) {
  const match = input.trim().replace(/：/g, ":").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return { hour, minute };
}

function resolveLocationGeo(location: string) {
  const normalizedLocation = normalizeLocationText(location);
  if (!normalizedLocation) {
    return null;
  }

  let bestMatch: {
    score: number;
    longitude: number;
    latitude: number | null;
    label: string;
  } | null = null;

  for (const record of geoRecords) {
    const score = getGeoMatchScore(record, normalizedLocation);
    if (score <= 0 || (bestMatch && score <= bestMatch.score)) {
      continue;
    }

    const longitude = Number(record.lng);
    if (!Number.isFinite(longitude)) {
      continue;
    }

    const latitude = Number(record.lat);
    bestMatch = {
      score,
      longitude,
      latitude: Number.isFinite(latitude) ? latitude : null,
      label: [record.province, normalizeCityName(record.city), record.area].filter(Boolean).join(" "),
    };
  }

  return bestMatch;
}

function getGeoMatchScore(record: CityGeoRecord, normalizedLocation: string) {
  let score = 0;
  const province = normalizeLocationText(record.province);
  const city = normalizeLocationText(normalizeCityName(record.city));
  const area = normalizeLocationText(record.area);

  if (province && normalizedLocation.includes(province)) {
    score += 4;
  }

  if (city && normalizedLocation.includes(city)) {
    score += 8;
  }

  if (area && normalizedLocation.includes(area)) {
    score += 16;
  }

  // Prefer city-level records over unrelated area records when the user only selected a city.
  if (!area) {
    score += 1;
  }

  return score;
}

function normalizeLocationText(input: string) {
  return input.replace(/\s+/g, "").replace(/自治州/g, "州").replace(/地区/g, "").trim();
}

function normalizeCityName(input: string) {
  return input === "市辖区" ? "" : input;
}

function getEquationOfTimeMinutes(date: BirthDateParts, clockTime: { hour: number; minute: number }) {
  const dayOfYear = getDayOfYear(date);
  const decimalHour = clockTime.hour + clockTime.minute / 60;
  const gamma = (2 * Math.PI) / 365 * (dayOfYear - 1 + (decimalHour - 12) / 24);

  // NOAA approximation. Result is minutes to add to local mean solar time.
  return 229.18 * (
    0.000075 +
    0.001868 * Math.cos(gamma) -
    0.032077 * Math.sin(gamma) -
    0.014615 * Math.cos(2 * gamma) -
    0.040849 * Math.sin(2 * gamma)
  );
}

function getDayOfYear(date: BirthDateParts) {
  return Math.floor(
    (Date.UTC(date.year, date.month - 1, date.day) - Date.UTC(date.year, 0, 0)) / 86_400_000,
  );
}

function addMinutesToLocalDateTime(date: BirthDateParts, totalMinutes: number) {
  let dayOffset = Math.floor(totalMinutes / MINUTES_PER_DAY);
  let minutes = totalMinutes % MINUTES_PER_DAY;

  if (minutes < 0) {
    minutes += MINUTES_PER_DAY;
    dayOffset -= 1;
  }

  const adjustedDate = new Date(Date.UTC(date.year, date.month - 1, date.day + dayOffset));
  return {
    date: {
      year: adjustedDate.getUTCFullYear(),
      month: adjustedDate.getUTCMonth() + 1,
      day: adjustedDate.getUTCDate(),
    },
    minutes,
  };
}

function minutesToClockText(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
