import type { ChartPalaceRecord } from "@/types";

interface PalaceGridProps {
  palaces: ChartPalaceRecord[];
}

export function PalaceGrid({ palaces }: PalaceGridProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {palaces.map((palace) => (
        <PalaceCard
          key={palace.id}
          palace={palace}
        />
      ))}
    </div>
  );
}

function PalaceCard({ palace }: { palace: ChartPalaceRecord }) {
  const ageRange = readAgeRangeFromSnapshot(palace.palace_snapshot_json);
  const lifeStage = readName(palace.palace_snapshot_json.lifeStage);

  return (
    <article
      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-medium text-slate-900">{palace.palace_name}</h3>
          <p className="text-xs text-slate-500">
            {palace.heavenly_stem}
            {palace.earthly_branch}
          </p>
        </div>
        {palace.is_body_palace ? (
          <span className="rounded-full bg-lacquer/10 px-2 py-1 text-xs text-lacquer">
            身宫
          </span>
        ) : null}
      </div>
      {(ageRange || lifeStage) ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {ageRange ? (
            <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-600">
              年龄 {ageRange}
            </span>
          ) : null}
          {lifeStage ? (
            <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-600">
              阶段 {lifeStage}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="mt-4 space-y-3 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">主星</p>
          <p className="mt-1 text-slate-700">
            {palace.major_stars_summary.join("、") || "空宫（无十四主星）"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">辅星</p>
          <p className="mt-1 text-slate-700">
            {palace.minor_stars_summary.join("、") || "暂无"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">杂曜 / 煞曜</p>
          <p className="mt-1 text-slate-700">
            {palace.sha_stars_summary.join("、") || "暂无"}
          </p>
        </div>
      </div>
    </article>
  );
}

function readName(value: unknown) {
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object") {
    const record = value as {
      name?: unknown;
      displayName?: unknown;
      formalName?: unknown;
      toString?: () => string;
    };

    const maybeName =
      [record.displayName, record.formalName, record.name].find(
        (item) => typeof item === "string" && item.trim().length > 0,
      ) ?? "";

    if (typeof maybeName === "string" && maybeName) {
      return maybeName;
    }

    if (typeof record.toString === "function") {
      const text = record.toString();
      return text !== "[object Object]" ? text : "";
    }
  }
  return "";
}

function readAgeRange(value: unknown) {
  if (!value) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value) && value.length >= 2) {
    return `${value[0]}-${value[1]}`;
  }
  if (typeof value === "object") {
    const record = value as { start?: unknown; end?: unknown };
    if (record.start !== undefined && record.end !== undefined) {
      return `${String(record.start)}-${String(record.end)}`;
    }
  }
  return "";
}

function readAgeRangeFromSnapshot(snapshot: Record<string, unknown>) {
  return (
    readAgeRange(snapshot.ageRange) ||
    (snapshot.ageStart !== undefined && snapshot.ageEnd !== undefined
      ? `${String(snapshot.ageStart)}-${String(snapshot.ageEnd)}`
      : "")
  );
}
