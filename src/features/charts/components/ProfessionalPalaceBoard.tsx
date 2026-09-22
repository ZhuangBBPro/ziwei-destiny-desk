import { useEffect, useRef, useState } from "react";
import type { MouseEvent, PointerEvent } from "react";
import type {
  ChartPalaceRecord,
  ChartRecord,
  PalaceInterpretationCategory,
  PalaceInterpretationHit,
} from "@/types";
import { getBirthCalendarLabel, getYinYangGenderLabel } from "@/features/charts/lib/birthDisplay";
import {
  analyzeFlyingJi,
  type FlyingJiAnalysis,
  type JiOppositionRelation,
} from "@/features/charts/lib/flyingJi";
import {
  analyzePalaceSelfTransforms,
  type PalaceSelfTransformDerivative,
  type PalaceSelfTransformMarker,
} from "@/features/charts/lib/palaceSelfTransforms";
import { palaceInterpretationService } from "@/features/charts/services/palaceInterpretationService";

interface ProfessionalPalaceBoardProps {
  chart: ChartRecord;
  palaces: ChartPalaceRecord[];
  selectedPalaceCode: string;
  onSelectPalace: (palaceCode: string) => void;
}

const FALLBACK_GRID_AREAS = [
  "1 / 1 / 2 / 2",
  "1 / 2 / 2 / 3",
  "1 / 3 / 2 / 4",
  "1 / 4 / 2 / 5",
  "2 / 4 / 3 / 5",
  "3 / 4 / 4 / 5",
  "4 / 4 / 5 / 5",
  "4 / 3 / 5 / 4",
  "4 / 2 / 5 / 3",
  "4 / 1 / 5 / 2",
  "3 / 1 / 4 / 2",
  "2 / 1 / 3 / 2",
] as const;

const BRANCH_GRID_AREAS: Record<string, string> = {
  巳: "1 / 1 / 2 / 2",
  午: "1 / 2 / 2 / 3",
  未: "1 / 3 / 2 / 4",
  申: "1 / 4 / 2 / 5",
  辰: "2 / 1 / 3 / 2",
  酉: "2 / 4 / 3 / 5",
  卯: "3 / 1 / 4 / 2",
  戌: "3 / 4 / 4 / 5",
  寅: "4 / 1 / 5 / 2",
  丑: "4 / 2 / 5 / 3",
  子: "4 / 3 / 5 / 4",
  亥: "4 / 4 / 5 / 5",
};

const AUSPICIOUS_STARS = new Set([
  "左輔",
  "左辅",
  "右弼",
  "文昌",
  "文曲",
  "天魁",
  "天鉞",
  "天钺",
  "祿存",
  "禄存",
  "天馬",
  "天马",
]);

const MALEFIC_STARS = new Set([
  "擎羊",
  "陀羅",
  "陀罗",
  "火星",
  "鈴星",
  "铃星",
  "地空",
  "地劫",
]);

interface TransformEntry {
  derivative: string;
  starName: string;
}

interface ConnectionLine {
  from: {
    x: number;
    y: number;
  };
  to: {
    x: number;
    y: number;
  };
  tone: "opposite" | "triangle" | "ji-conflict";
}

interface PalaceBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

interface InterpretationPopoverState {
  palaceCode: string;
  x: number;
  y: number;
}

type JiPalaceRole = "natal-origin" | "shot-origin" | "impacted" | "entangled";

interface JiPalaceMarker {
  role: JiPalaceRole;
  label: string;
  detail: string;
}

const BOARD_CENTER = {
  x: 2,
  y: 2,
};

const INTERPRETATION_CATEGORY_LABELS: Record<PalaceInterpretationCategory, string> = {
  major: "主星",
  minor: "辅星",
  misc: "杂星",
};

export function ProfessionalPalaceBoard({
  chart,
  palaces,
  selectedPalaceCode,
  onSelectPalace,
}: ProfessionalPalaceBoardProps) {
  const orderedPalaces = normalizeNatalPalaces(palaces);
  const selectedPalace =
    orderedPalaces.find((palace) => palace.palace_code === selectedPalaceCode) ?? orderedPalaces[0];
  const transformEntries = readTransformEntries(chart.snapshot_json);
  const highlightedPalaces = getHighlightedPalaces(orderedPalaces, selectedPalace?.palace_code, transformEntries);
  const defaultTriangleLines = getDefaultTriangleLines(orderedPalaces, selectedPalace?.palace_code);
  const natalJiStarName = transformEntries.find((entry) => isJiDerivative(entry.derivative))?.starName ?? null;
  const flyingJiAnalysis = analyzeFlyingJi(orderedPalaces, natalJiStarName);
  const selfTransformsByPalace = analyzePalaceSelfTransforms(orderedPalaces);
  const [showFlyingJi, setShowFlyingJi] = useState(true);
  const [selectedJiRelationId, setSelectedJiRelationId] = useState<string | null>(null);
  const activeJiRelation =
    flyingJiAnalysis.relations.find((relation) => relation.id === selectedJiRelationId) ??
    flyingJiAnalysis.relations[0];
  const activeJiMarkers = getJiPalaceMarkers(activeJiRelation);
  const flyingJiConflictLines = getJiRelationLine(activeJiRelation);
  const [interpretationPopover, setInterpretationPopover] = useState<InterpretationPopoverState | null>(null);
  const lastTouchTapRef = useRef<{ palaceCode: string; time: number; x: number; y: number } | null>(null);
  const activeInterpretationPalace = interpretationPopover
    ? orderedPalaces.find((palace) => palace.palace_code === interpretationPopover.palaceCode)
    : undefined;
  const activeBorrowedStarSourcePalace = getBorrowedStarSourcePalace(orderedPalaces, activeInterpretationPalace);
  const [interpretationHits, setInterpretationHits] = useState<PalaceInterpretationHit[]>([]);

  function openInterpretationPopover(palace: ChartPalaceRecord, clientX: number, clientY: number) {
    onSelectPalace(palace.palace_code);
    setInterpretationPopover({
      palaceCode: palace.palace_code,
      ...getAdaptivePopoverPosition(clientX, clientY),
    });
  }

  function handlePalaceDoubleClick(event: MouseEvent<HTMLButtonElement>, palace: ChartPalaceRecord) {
    event.preventDefault();
    event.stopPropagation();
    openInterpretationPopover(palace, event.clientX, event.clientY);
  }

  function handlePalacePointerUp(event: PointerEvent<HTMLButtonElement>, palace: ChartPalaceRecord) {
    if (event.pointerType === "mouse") {
      return;
    }

    const now = Date.now();
    const lastTap = lastTouchTapRef.current;
    const distance = lastTap ? Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) : Number.POSITIVE_INFINITY;
    const isDoubleTap =
      Boolean(lastTap) && lastTap?.palaceCode === palace.palace_code && now - lastTap.time <= 420 && distance <= 36;

    if (isDoubleTap) {
      event.preventDefault();
      event.stopPropagation();
      lastTouchTapRef.current = null;
      openInterpretationPopover(palace, event.clientX, event.clientY);
      return;
    }

    lastTouchTapRef.current = {
      palaceCode: palace.palace_code,
      time: now,
      x: event.clientX,
      y: event.clientY,
    };
  }

  useEffect(() => {
    let isActive = true;

    if (!activeInterpretationPalace) {
      setInterpretationHits([]);
      return () => {
        isActive = false;
      };
    }

    Promise.all([
      palaceInterpretationService.getHitsForPalace(activeInterpretationPalace, activeInterpretationPalace, "native"),
      activeBorrowedStarSourcePalace
        ? palaceInterpretationService.getHitsForPalace(
            activeInterpretationPalace,
            activeBorrowedStarSourcePalace,
            "borrowed_opposite",
          )
        : Promise.resolve([]),
    ])
      .then((hits) => {
        if (isActive) {
          setInterpretationHits(dedupeInterpretationHits(hits.flat()));
        }
      })
      .catch((error) => {
        console.error("Failed to load palace interpretation hits", error);
        if (isActive) {
          setInterpretationHits([]);
        }
      });

    return () => {
      isActive = false;
    };
  }, [activeBorrowedStarSourcePalace?.id, activeInterpretationPalace?.id]);

  useEffect(() => {
    if (!interpretationPopover) {
      return;
    }

    const closePopover = () => setInterpretationPopover(null);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePopover();
      }
    };

    window.addEventListener("click", closePopover);
    window.addEventListener("resize", closePopover);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("click", closePopover);
      window.removeEventListener("resize", closePopover);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [interpretationPopover]);

  return (
    <div className="grid items-stretch gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="h-full overflow-hidden rounded-[2rem] border border-[#d4c4a8] bg-[#efe5d3] p-3 shadow-panel md:p-5 2xl:p-3.5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 2xl:mb-2">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#8b6b3c]">Professional Board</p>
          <h2 className="mt-1 font-serif text-2xl text-[#3a2413]">本命盘</h2>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-[#6e5840]">
          <span className="inline-flex flex-wrap items-center gap-1.5 rounded-full border border-[#d8c6a8] bg-[#fbf6ec] px-3 py-1.5 text-[#6e5840]">
            <span className="font-medium text-[#477d5e]">禄</span>
            <span className="font-medium text-[#765480]">权</span>
            <span className="font-medium text-[#47718c]">科</span>
            <span className="font-medium text-[#a54f46]">忌</span>
            <span className="border-l border-[#d8c6a8] pl-1.5">向外离心 · 向内向心</span>
          </span>
          <button
            type="button"
            aria-pressed={showFlyingJi}
            onClick={() => setShowFlyingJi((current) => !current)}
            className={`rounded-full border px-3 py-1.5 font-medium transition ${
              showFlyingJi
                ? "border-[#a12f2f] bg-[#8f2727] text-white shadow-[0_5px_18px_rgba(126,44,44,0.2)]"
                : "border-[#d8c6a8] bg-[#fbf6ec] text-[#6e5840] hover:border-[#a12f2f] hover:text-[#8f2727]"
            }`}
          >
            飞忌分析 {showFlyingJi ? "已显示" : "已隐藏"}
          </button>
          <BoardBadge label={`命宫 ${chart.life_palace_branch || "-"}`} />
          <BoardBadge label={`身宫 ${chart.body_palace_branch || "-"}`} />
          <BoardBadge label={`命主 ${chart.life_master_star || "-"}`} />
          <BoardBadge label={`身主 ${chart.body_master_star || "-"}`} />
        </div>
      </div>

      <div className="pb-2">
        <div className="mx-auto w-full max-w-[1180px]">
          <div
            className="relative grid aspect-square w-full grid-cols-4 grid-rows-4 gap-1.5 md:gap-2 xl:gap-3 2xl:aspect-[3/2] 2xl:gap-2"
            style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
          >
            <TriangleConnectionLayer lines={showFlyingJi ? flyingJiConflictLines : defaultTriangleLines} />
            <PalaceSelfTransformLayer
              palaces={orderedPalaces}
              markersByPalace={selfTransformsByPalace}
            />

            {orderedPalaces.map((palace, index) => (
              <button
                key={palace.id}
                type="button"
                style={{ gridArea: BRANCH_GRID_AREAS[palace.earthly_branch] ?? FALLBACK_GRID_AREAS[index] }}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectPalace(palace.palace_code);
                }}
                onDoubleClick={(event) => handlePalaceDoubleClick(event, palace)}
                onPointerUp={(event) => handlePalacePointerUp(event, palace)}
                onContextMenu={(event) => event.preventDefault()}
                className={buildPalaceCardClass({
                  isSelected: palace.palace_code === selectedPalace?.palace_code,
                  isHighlighted: highlightedPalaces.has(palace.palace_code),
                  jiRole: showFlyingJi ? activeJiMarkers.get(palace.palace_code)?.role : undefined,
                })}
              >
                <PalaceFace
                  palace={palace}
                  selected={palace.palace_code === selectedPalace?.palace_code}
                  transforms={findPalaceTransforms(palace, transformEntries)}
                  showTransforms
                  relationLabel={highlightedPalaces.get(palace.palace_code)}
                  jiMarker={showFlyingJi ? activeJiMarkers.get(palace.palace_code) : undefined}
                />
              </button>
            ))}

            <div
              style={{ gridArea: "2 / 2 / 4 / 4" }}
              className="relative overflow-hidden rounded-[1.4rem] border border-[#d8cab1] bg-[linear-gradient(145deg,#fffaf1_0%,#f4ead7_55%,#ecdfc6_100%)] p-2.5 md:rounded-[1.55rem] md:p-3 xl:rounded-[1.75rem] xl:p-4 2xl:p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
            >
              <div className="absolute inset-0 opacity-40">
                <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[#d6c5a8]" />
                <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-[#d6c5a8]" />
              </div>

              <div className="relative flex h-full min-h-0 flex-col justify-between gap-2.5 md:gap-3">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs uppercase tracking-[0.28em] text-[#9b7f52]">
                        {chart.chart_system}
                      </p>
                      <h3 className="mt-1 font-serif text-base leading-tight text-[#2e1a0d] break-all md:text-lg xl:mt-1.5 xl:text-[1.45rem]">
                        {chart.subject_name}
                      </h3>
                    </div>
                    <div className="shrink-0 rounded-xl border border-[#dac9ae] bg-white/70 px-2 py-1 text-right text-[10px] text-[#6e5840] xl:rounded-2xl xl:px-2.5 xl:py-1.5 xl:text-[11px]">
                      <p>{getYinYangGenderLabel(chart)}</p>
                      <p className="mt-1">{chart.five_element_class || "五行局待补"}</p>
                    </div>
                  </div>

                  <div className="mt-2 grid gap-x-2 gap-y-1 text-[10px] text-[#4f3929] md:mt-3 md:gap-y-1.5 md:text-[11px] md:grid-cols-2">
                    <SummaryLine label={getBirthCalendarLabel(chart.birth_calendar_type)} value={`${chart.birth_date} ${chart.birth_time}`} />
                    <SummaryLine label="出生地" value={chart.birth_location || "-"} />
                    <SummaryLine label="版本" value={chart.chart_version} />
                    <SummaryLine label="命主" value={chart.life_master_star || "-"} />
                    <SummaryLine label="身主" value={chart.body_master_star || "-"} />
                    <SummaryLine label="命宫" value={selectedPalace?.palace_name === "命宫" ? `${selectedPalace.heavenly_stem}${selectedPalace.earthly_branch}` : chart.life_palace_branch || "-"} />
                    <SummaryLine label="身宫" value={chart.body_palace_branch || "-"} />
                  </div>
                </div>

                <div className="space-y-2 rounded-[1rem] border border-[#dbcbae] bg-white/70 p-2.5 md:space-y-2.5 md:rounded-[1.2rem] md:p-3 xl:rounded-[1.35rem]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-[#9b7f52]">当前焦点宫位</p>
                      <h4 className="mt-1 font-serif text-sm text-[#2f1b0d] md:text-base xl:text-lg">
                        {selectedPalace?.palace_name}
                      </h4>
                    </div>
                    <div className="text-right text-[11px] text-[#7a6349] xl:text-xs">
                      <p>{selectedPalace?.heavenly_stem}{selectedPalace?.earthly_branch}</p>
                      <p className="mt-1">{readAgeRangeFromSnapshot(selectedPalace?.palace_snapshot_json ?? {}) || "年龄段待补"}</p>
                    </div>
                  </div>
                  <p className="text-[10px] leading-4 text-[#59432d] md:text-[11px] md:leading-5 xl:text-xs">
                    {selectedPalace?.major_stars_summary.join("、") || "空宫（无十四主星）"}
                  </p>
                  {transformEntries.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 xl:gap-2">
                      {transformEntries.map((item) => (
                        <span
                          key={`${item.derivative}-${item.starName}`}
                          className="rounded-full border border-[#d8c5a7] bg-[#f5ecdd] px-2 py-1 text-[9px] text-[#6c5336] xl:px-2.5 xl:text-[10px]"
                        >
                          {item.derivative} {item.starName}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <DecadeStrip palaces={orderedPalaces} selectedPalaceCode={selectedPalace?.palace_code ?? ""} />
        </div>
      </div>
      </div>

      <aside className="min-w-0 2xl:relative">
        <div className="h-full 2xl:absolute 2xl:inset-0">
          {showFlyingJi ? (
            <FlyingJiPanel
              analysis={flyingJiAnalysis}
              activeRelationId={activeJiRelation?.id ?? ""}
              onSelectRelation={setSelectedJiRelationId}
              compact
            />
          ) : (
            <section className="h-full rounded-[1.8rem] border border-[#d7b9a7] bg-[#fff8ef] p-5 shadow-panel">
              <p className="text-xs uppercase tracking-[0.28em] text-[#9a6752]">Flying Ji · Check</p>
              <h3 className="mt-2 font-serif text-xl text-[#552218]">飞宫忌冲核对</h3>
              <p className="mt-3 text-sm leading-6 text-[#7d6252]">
                点击命盘上方的“飞忌分析”，即可在这里同步核对飞忌落宫与对冲关系。
              </p>
            </section>
          )}
        </div>
      </aside>

      {interpretationPopover && activeInterpretationPalace ? (
        <PalaceInterpretationPopover
          palace={activeInterpretationPalace}
          borrowedStarSourcePalace={activeBorrowedStarSourcePalace}
          hits={interpretationHits}
          position={interpretationPopover}
          onClose={() => setInterpretationPopover(null)}
        />
      ) : null}
    </div>
  );
}

function PalaceFace({
  palace,
  selected,
  transforms,
  showTransforms,
  relationLabel,
  jiMarker,
}: {
  palace: ChartPalaceRecord;
  selected: boolean;
  transforms: TransformEntry[];
  showTransforms: boolean;
  relationLabel?: string;
  jiMarker?: JiPalaceMarker;
}) {
  const ageRange = readAgeRangeFromSnapshot(palace.palace_snapshot_json);
  const lifeStage = readName(palace.palace_snapshot_json.lifeStage);
  const starBrightness = readStarBrightness(palace.palace_snapshot_json);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden text-left">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-serif text-sm leading-none text-[#2c170a] md:text-base xl:text-lg">{palace.palace_name}</span>
            {palace.is_body_palace ? (
              <span className="rounded-md bg-[#7e2c2c]/10 px-1.5 py-0.5 text-[10px] text-[#7e2c2c]">
                身
              </span>
            ) : null}
            {relationLabel ? (
              <span className="rounded-md bg-[#2f7b66]/10 px-1.5 py-0.5 text-[10px] text-[#2f7b66]">
                {relationLabel}
              </span>
            ) : null}
            {jiMarker ? (
              <span className={getJiMarkerBadgeClass(jiMarker.role)}>
                {jiMarker.label}
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap gap-1 text-[10px] font-medium">
            <span className="rounded-md bg-[#eee1cc] px-1.5 py-0.5 text-[#71512e]">
              宫干 · {palace.heavenly_stem}
            </span>
            <span className="rounded-md bg-[#e8efe8] px-1.5 py-0.5 text-[#426656]">
              宫支 · {palace.earthly_branch}
            </span>
          </div>
        </div>
        <div className="text-right text-[10px] leading-4 text-[#7c6243] xl:text-[11px]">
          {ageRange ? <p>{ageRange}</p> : null}
          {lifeStage ? <p>{lifeStage}</p> : null}
        </div>
      </div>

      <div className={`mt-2 min-h-0 flex-1 overflow-hidden text-[11px] leading-4 md:text-[12px] md:leading-[1.15rem] xl:mt-2 xl:text-[13px] ${
        jiMarker ? "space-y-0.5 xl:space-y-1" : "space-y-1 xl:space-y-1.5"
      }`}>
        <StarLine
          label="主"
          stars={palace.major_stars_summary}
          tone="major"
          transforms={transforms}
          brightness={starBrightness}
          emptyLabel="空宫（无十四主星）"
          showTransforms={showTransforms}
        />
        <StarLine
          label="辅"
          stars={palace.minor_stars_summary}
          tone="minor"
          transforms={transforms}
          brightness={starBrightness}
          emptyLabel="无"
          showTransforms={showTransforms}
        />
        <StarLine
          label="杂"
          stars={palace.sha_stars_summary}
          tone="misc"
          transforms={transforms}
          brightness={starBrightness}
          emptyLabel="无"
          showTransforms={showTransforms}
        />
      </div>

      {jiMarker ? (
        <div className={`mt-1 shrink-0 truncate border-t pt-1 text-[9px] leading-3 xl:text-[10px] ${getJiMarkerDetailClass(jiMarker.role)}`}>
          {jiMarker.detail}
        </div>
      ) : null}

      {selected && !jiMarker ? (
        <div className="mt-1.5 shrink-0 border-t border-[#dccdb7] pt-1.5 text-[9px] text-[#6c5336] xl:text-[10px]">
          已联动下方批注与验证记录
        </div>
      ) : null}
    </div>
  );
}

function StarLine({
  label,
  stars,
  tone,
  transforms,
  brightness,
  emptyLabel,
  showTransforms,
}: {
  label: string;
  stars: string[];
  tone: "major" | "minor" | "misc";
  transforms: TransformEntry[];
  brightness: Record<string, string>;
  emptyLabel: string;
  showTransforms: boolean;
}) {
  if (stars.length === 0) {
    return (
      <div className="flex gap-2">
        <span className="min-w-5 text-[11px] uppercase tracking-[0.2em] text-[#b28d61]">{label}</span>
        <span className="text-[#7c6243]">{emptyLabel}</span>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 gap-1.5">
      <span className="min-w-4 shrink-0 text-[10px] uppercase tracking-[0.14em] text-[#b28d61]">{label}</span>
      <div className="min-w-0 flex flex-wrap gap-x-1.5 gap-y-0.5 break-all">
        {stars.map((star, starIndex) => {
          const derivative = transforms.find((item) => item.starName === star)?.derivative;
          return (
            <span
              key={`${label}-${star}-${starIndex}`}
              className={`inline-flex min-w-0 items-center gap-1 break-all ${getStarTextClass(star, tone)}`}
            >
              <span>{star}</span>
              {brightness[star] ? (
                <span className="text-[9px] font-normal leading-none text-[#8b7355]">
                  {brightness[star]}
                </span>
              ) : null}
              {showTransforms && derivative ? (
                <span className="rounded bg-[#d9472f] px-1 py-0.5 text-[10px] leading-none text-white">
                  {derivative}
                </span>
              ) : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function PalaceSelfTransformLayer({
  palaces,
  markersByPalace,
}: {
  palaces: ChartPalaceRecord[];
  markersByPalace: Map<string, PalaceSelfTransformMarker[]>;
}) {
  const arrows = palaces.flatMap((palace) => {
    const bounds = getPalaceBounds(palace);
    const markers = markersByPalace.get(palace.palace_code) ?? [];
    if (!bounds || markers.length === 0) {
      return [];
    }

    return (["centrifugal", "centripetal"] as const).flatMap((direction) => {
      const directionMarkers = markers.filter((marker) => marker.direction === direction);
      return directionMarkers.map((marker, index) =>
        createPalaceSelfTransformArrow(bounds, marker, index, directionMarkers.length),
      );
    });
  });

  if (arrows.length === 0) {
    return null;
  }

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-40 h-full w-full overflow-visible"
      viewBox="0 0 4 4"
      preserveAspectRatio="none"
    >
      {arrows.map((arrow) => {
        const path = `M ${arrow.start.x} ${arrow.start.y} L ${arrow.end.x} ${arrow.end.y} M ${arrow.headLeft.x} ${arrow.headLeft.y} L ${arrow.end.x} ${arrow.end.y} L ${arrow.headRight.x} ${arrow.headRight.y}`;

        return (
          <g key={arrow.key} fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path
              d={path}
              stroke="#fff8ed"
              strokeWidth={4.4}
              opacity={0.9}
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={path}
              stroke={getSelfTransformArrowColor(arrow.derivative)}
              strokeWidth={1.8}
              opacity={0.92}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        );
      })}
    </svg>
  );
}

function createPalaceSelfTransformArrow(
  bounds: PalaceBounds,
  marker: PalaceSelfTransformMarker,
  index: number,
  total: number,
) {
  const towardCenter = normalizeVector({
    x: BOARD_CENTER.x - bounds.centerX,
    y: BOARD_CENTER.y - bounds.centerY,
  });
  const direction = marker.direction === "centripetal"
    ? towardCenter
    : getOuterDirection(bounds);
  const anchor = marker.direction === "centripetal"
    ? getInnerAnchorPoint(bounds)
    : getOuterAnchorPoint(bounds);
  const perpendicular = { x: -direction.y, y: direction.x };
  const offset = (index - (total - 1) / 2) * 0.04;
  const offsetAnchor = {
    x: anchor.x + perpendicular.x * offset,
    y: anchor.y + perpendicular.y * offset,
  };
  const end = marker.direction === "centrifugal"
    ? {
        x: offsetAnchor.x - direction.x * 0.05,
        y: offsetAnchor.y - direction.y * 0.05,
      }
    : {
        x: offsetAnchor.x + direction.x * 0.129,
        y: offsetAnchor.y + direction.y * 0.129,
      };
  const start = {
    x: end.x - direction.x * (marker.direction === "centrifugal" ? 0.075 : 0.145),
    y: end.y - direction.y * (marker.direction === "centrifugal" ? 0.075 : 0.145),
  };
  const headBase = {
    x: end.x - direction.x * 0.045,
    y: end.y - direction.y * 0.045,
  };

  return {
    key: `${marker.sourcePalaceName}-${marker.direction}-${marker.derivative}-${marker.starName}`,
    derivative: marker.derivative,
    start,
    end,
    headLeft: {
      x: headBase.x + perpendicular.x * 0.021,
      y: headBase.y + perpendicular.y * 0.021,
    },
    headRight: {
      x: headBase.x - perpendicular.x * 0.021,
      y: headBase.y - perpendicular.y * 0.021,
    },
  };
}

function getOuterDirection(bounds: PalaceBounds) {
  if (bounds.top === 0) {
    return { x: 0, y: -1 };
  }
  if (bounds.bottom === 4) {
    return { x: 0, y: 1 };
  }
  if (bounds.left === 0) {
    return { x: -1, y: 0 };
  }
  return { x: 1, y: 0 };
}

function normalizeVector(vector: { x: number; y: number }) {
  const length = Math.hypot(vector.x, vector.y) || 1;
  return { x: vector.x / length, y: vector.y / length };
}

function getOuterAnchorPoint(bounds: PalaceBounds) {
  const isLeftEdge = bounds.left === 0;
  const isRightEdge = bounds.right === 4;
  const isTopEdge = bounds.top === 0;
  const isBottomEdge = bounds.bottom === 4;

  if (isTopEdge) {
    return { x: bounds.centerX, y: bounds.top };
  }
  if (isBottomEdge) {
    return { x: bounds.centerX, y: bounds.bottom };
  }
  if (isLeftEdge) {
    return { x: bounds.left, y: bounds.centerY };
  }
  return { x: isRightEdge ? bounds.right : bounds.centerX, y: bounds.centerY };
}

function getSelfTransformArrowColor(derivative: PalaceSelfTransformDerivative) {
  if (derivative === "祿") {
    return "#477d5e";
  }
  if (derivative === "權") {
    return "#765480";
  }
  if (derivative === "科") {
    return "#47718c";
  }
  return "#a54f46";
}

function TriangleConnectionLayer({ lines }: { lines: ConnectionLine[] }) {
  if (lines.length === 0) {
    return null;
  }

  return (
    <>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-30 h-full w-full overflow-visible text-[#7e2c2c]"
        viewBox="0 0 4 4"
        preserveAspectRatio="none"
      >
        {lines.map((line, index) => (
          <line
            key={`${line.tone}-${index}`}
            x1={line.from.x}
            y1={line.from.y}
            x2={line.to.x}
            y2={line.to.y}
            stroke={getConnectionLineColor(line.tone)}
            strokeWidth={line.tone === "ji-conflict" ? 3.4 : line.tone === "opposite" ? 2 : 1.8}
            strokeDasharray={line.tone === "ji-conflict" ? "5 4" : line.tone === "opposite" ? "8 6" : "7 6"}
            strokeLinecap="round"
            opacity={line.tone === "ji-conflict" ? 0.92 : line.tone === "opposite" ? 0.82 : 0.72}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-30 overflow-visible">
        {lines.flatMap((line, index) => {
          if (line.tone !== "ji-conflict") {
            return [];
          }

          return [
            <ConnectionEndpoint key={`from-${index}`} point={line.from} />,
            <ConnectionEndpoint key={`to-${index}`} point={line.to} />,
          ];
        })}
        {lines[0]?.tone !== "ji-conflict" ? (
          <ConnectionEndpoint point={lines[0].from} subtle />
        ) : null}
      </div>
    </>
  );
}

function ConnectionEndpoint({
  point,
  subtle = false,
}: {
  point: ConnectionLine["from"];
  subtle?: boolean;
}) {
  return (
    <span
      data-connection-endpoint={subtle ? "subtle" : "ji-conflict"}
      className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full ${
        subtle ? "h-2 w-2 bg-[#7e2c2c]/70" : "h-3 w-3 bg-[#8f2727] shadow-[0_0_0_2px_rgba(255,248,239,0.8)]"
      }`}
      style={{
        left: `${(point.x / 4) * 100}%`,
        top: `${(point.y / 4) * 100}%`,
      }}
    />
  );
}

function getConnectionLineColor(tone: ConnectionLine["tone"]) {
  if (tone === "ji-conflict") {
    return "#8f2727";
  }
  return tone === "opposite" ? "#7e2c2c" : "#2f7b66";
}

function getJiRelationLine(relation: JiOppositionRelation | undefined): ConnectionLine[] {
  if (!relation) {
    return [];
  }

  const [firstPalace, secondPalace] = getJiRelationPalaces(relation);
  const firstBounds = getPalaceBounds(firstPalace);
  const secondBounds = getPalaceBounds(secondPalace);
  const points = firstBounds && secondBounds ? getCornerConnectionPoints(firstBounds, secondBounds) : null;

  return points
    ? [{ from: points.from, to: points.to, tone: "ji-conflict" as const }]
    : [];
}

function FlyingJiPanel({
  analysis,
  activeRelationId,
  onSelectRelation,
  compact = false,
}: {
  analysis: FlyingJiAnalysis;
  activeRelationId: string;
  onSelectRelation: (relationId: string) => void;
  compact?: boolean;
}) {
  const unresolvedFlights = analysis.flights.filter((flight) => !flight.targetPalace);
  const activeRelation = analysis.relations.find((relation) => relation.id === activeRelationId) ?? analysis.relations[0];

  return (
    <section className={`${compact ? "flex h-full min-h-0 flex-col shadow-panel" : "mt-4"} overflow-hidden rounded-[1.5rem] border border-[#cfae96] bg-[#fff8ef]`}>
      <div className={`flex flex-col gap-2 border-b border-[#e0cbbb] bg-[linear-gradient(135deg,#f8e8dc_0%,#f3dfcf_100%)] px-4 py-3 ${compact ? "shrink-0" : "md:flex-row md:items-center md:justify-between"}`}>
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#9a6752]">Ji Opposition · Direction</p>
          <h3 className="mt-1 font-serif text-lg text-[#552218]">化忌对冲辨识</h3>
          <p className="mt-1 text-[11px] leading-5 text-[#7d6252]">先分清“生年忌坐宫”与“宫干飞忌”，再看力量从哪里来、冲到哪里。</p>
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
          <span className="rounded-xl border border-[#d5b29f] bg-white/70 px-2 py-1.5 text-[#714537]">
            生年忌冲<br /><strong>{analysis.natalJi ? 1 : 0}</strong>
          </span>
          <span className="rounded-xl border border-[#d6a660] bg-[#fff8e9] px-2 py-1.5 text-[#81521a]">
            射出忌<br /><strong>{analysis.shotJi.length}</strong>
          </span>
          <span className="rounded-xl bg-[#6f2942] px-2 py-1.5 text-white">
            纠缠忌<br /><strong>{analysis.entangledJi.length}</strong>
          </span>
        </div>
      </div>

      <div className={`space-y-4 p-4 ${compact ? "min-h-0 flex-1 overflow-y-auto overscroll-contain" : ""}`}>
        <div className="grid grid-cols-2 gap-2 text-[10px] leading-4">
          <div className="rounded-xl border border-[#d7a59b] bg-[#fff1ed] p-2.5 text-[#743d34]">
            <strong className="block text-[#8f2727]">① 生年化忌</strong>
            星曜先天带忌；忌坐本宫，本宫是问题发生地，对宫承受冲击。
          </div>
          <div className="rounded-xl border border-[#dbc38f] bg-[#fff9e9] p-2.5 text-[#73562a]">
            <strong className="block text-[#8a581c]">② 宫干飞忌</strong>
            宫干主动飞化；只有飞入自己的对宫，才叫射出忌。
          </div>
        </div>

        <JiRelationGroup
          title="生年忌坐宫 → 冲对宫"
          emptyText="未定位到本命生年化忌坐宫。"
          relations={analysis.natalJi ? [analysis.natalJi] : []}
          activeRelationId={activeRelation?.id ?? ""}
          onSelectRelation={onSelectRelation}
        />
        <JiRelationGroup
          title="射出忌 · A宫飞忌入自己的对宫"
          emptyText="本盘没有符合条件的射出忌。"
          relations={analysis.shotJi}
          activeRelationId={activeRelation?.id ?? ""}
          onSelectRelation={onSelectRelation}
        />
        <JiRelationGroup
          title="纠缠忌 · 对宫双方互相飞忌"
          emptyText="本盘没有形成双向纠缠忌。"
          relations={analysis.entangledJi}
          activeRelationId={activeRelation?.id ?? ""}
          onSelectRelation={onSelectRelation}
        />

        {activeRelation ? <JiRelationDetail relation={activeRelation} /> : null}

        <details className="group rounded-2xl border border-[#dfcbbb] bg-white/55">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-xs font-medium text-[#694437]">
            <span>查看全部十二宫飞忌路径</span>
            <span className="text-[10px] text-[#9a7967] group-open:hidden">展开</span>
            <span className="hidden text-[10px] text-[#9a7967] group-open:inline">收起</span>
          </summary>
          <div className={`grid gap-2 border-t border-[#ead9cc] p-3 ${compact ? "" : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}`}>
            {analysis.flights.map((flight) => (
              <div key={flight.sourcePalace.palace_code} className="rounded-xl bg-[#fbf2e8] px-3 py-2 text-[11px]">
                <p className="font-medium text-[#513326]">
                  {flight.sourcePalace.palace_name} · 宫干 {flight.sourcePalace.heavenly_stem}
                </p>
                <p className="mt-0.5 text-[#765846]">
                  {flight.jiStarName}忌 → {flight.targetPalace?.palace_name ?? "未定位"}
                </p>
              </div>
            ))}
          </div>
        </details>

        {unresolvedFlights.length > 0 ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            有 {unresolvedFlights.length} 条飞忌未找到对应星曜落宫，请核对该命盘的星曜快照。
          </p>
        ) : null}

        <p className="rounded-xl bg-[#f5eadf] px-3 py-2 text-[10px] leading-5 text-[#785c4b]">
          缓冲与加重：化禄、化科同宫或会照可缓冲；羊、陀、火、铃等煞曜叠加时冲击更明显。对冲表示结构性拉扯，不作单一事件的铁断。
        </p>
      </div>
    </section>
  );
}

function JiRelationGroup({
  title,
  emptyText,
  relations,
  activeRelationId,
  onSelectRelation,
}: {
  title: string;
  emptyText: string;
  relations: JiOppositionRelation[];
  activeRelationId: string;
  onSelectRelation: (relationId: string) => void;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium text-[#6f3024]">{title}</p>
      {relations.length > 0 ? (
        <div className="mt-2 space-y-1.5">
          {relations.map((relation) => {
            const isActive = relation.id === activeRelationId;
            return (
              <button
                key={relation.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => onSelectRelation(relation.id)}
                className={`w-full rounded-xl border px-3 py-2 text-left text-[11px] leading-4 outline-none transition ${
                  isActive
                    ? "border-[#8f2727] bg-[#8f2727] text-white shadow-[0_4px_14px_rgba(143,39,39,0.16)]"
                    : "border-[#dfc8b8] bg-white/75 text-[#59372b] hover:border-[#b97868]"
                }`}
              >
                <span className="font-medium">{getJiRelationTitle(relation)}</span>
                <span className={`mt-0.5 block text-[9px] ${isActive ? "text-white/75" : "text-[#957464]"}`}>
                  {getJiRelationSubtitle(relation)}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-1.5 rounded-xl border border-dashed border-[#decdbf] bg-white/45 px-3 py-2 text-[10px] text-[#927666]">
          {emptyText}
        </p>
      )}
    </div>
  );
}

function JiRelationDetail({ relation }: { relation: JiOppositionRelation }) {
  const [firstPalace, secondPalace] = getJiRelationPalaces(relation);

  return (
    <article className="rounded-2xl border border-[#c98d7b] bg-white/85 p-3 shadow-[0_5px_18px_rgba(93,38,25,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className={getJiTypePillClass(relation.type)}>{getJiTypeLabel(relation.type)}</span>
          <h4 className="mt-2 font-serif text-lg text-[#69291f]">{getJiRelationTitle(relation)}</h4>
        </div>
        <span className="rounded-full bg-[#f1ded6] px-2.5 py-1 text-[9px] text-[#8f2727]">方向必须分清</span>
      </div>

      <div className="mt-3 grid gap-2">
        <JiDirectionCard relation={relation} palace={firstPalace} position="first" />
        <div className="flex items-center justify-center">
          <span className="rounded-full bg-[#8f2727] px-3 py-1 text-[10px] font-medium text-white">
            {getJiDirectionLabel(relation)}
          </span>
        </div>
        <JiDirectionCard relation={relation} palace={secondPalace} position="second" />
      </div>

      <div className="mt-3 rounded-xl border border-[#ead4c7] bg-[#fff8f1] p-3">
        <p className="text-[10px] font-semibold tracking-[0.12em] text-[#8f5c45]">现实象义怎么读</p>
        <p className="mt-1.5 text-[11px] leading-5 text-[#604638]">{getJiRealityMeaning(relation)}</p>
      </div>
    </article>
  );
}

function JiDirectionCard({
  relation,
  palace,
  position,
}: {
  relation: JiOppositionRelation;
  palace: ChartPalaceRecord;
  position: "first" | "second";
}) {
  const copy = getJiDirectionCardCopy(relation, position);
  return (
    <div className={`rounded-xl border p-3 ${copy.toneClass}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="font-serif text-base text-[#632a21]">{palace.palace_name}</p>
        <span className="rounded-full bg-white/75 px-2 py-0.5 text-[9px] font-medium text-[#7c4b3d]">{copy.role}</span>
      </div>
      <p className="mt-1 text-[10px] leading-4 text-[#765246]">{copy.mechanism}</p>
      <p className="mt-2 border-t border-black/5 pt-2 text-[10px] leading-4 text-[#765f52]">关注：{getPalaceMeaning(palace)}</p>
    </div>
  );
}

function getJiRelationPalaces(relation: JiOppositionRelation) {
  if (relation.type === "natal") {
    return [relation.seatedPalace, relation.impactedPalace] as const;
  }
  if (relation.type === "shot") {
    return [relation.flight.sourcePalace, relation.flight.targetPalace] as const;
  }
  return [relation.firstFlight.sourcePalace, relation.firstFlight.targetPalace] as const;
}

function getJiPalaceMarkers(relation: JiOppositionRelation | undefined) {
  const markers = new Map<string, JiPalaceMarker>();
  if (!relation) {
    return markers;
  }

  if (relation.type === "natal") {
    markers.set(relation.seatedPalace.palace_code, {
      role: "natal-origin",
      label: "生年忌坐",
      detail: `生年 ${relation.jiStarName}化忌坐本宫 → 冲 ${relation.impactedPalace.palace_name}`,
    });
    markers.set(relation.impactedPalace.palace_code, {
      role: "impacted",
      label: "被忌冲",
      detail: `← ${relation.seatedPalace.palace_name}的生年${relation.jiStarName}忌冲入`,
    });
    return markers;
  }

  if (relation.type === "shot") {
    const { flight } = relation;
    markers.set(flight.sourcePalace.palace_code, {
      role: "shot-origin",
      label: "射出忌源",
      detail: `宫干 ${flight.sourcePalace.heavenly_stem} 飞 ${flight.jiStarName}忌 → ${flight.targetPalace.palace_name}`,
    });
    markers.set(flight.targetPalace.palace_code, {
      role: "impacted",
      label: "被忌冲",
      detail: `← ${flight.sourcePalace.palace_name}宫干飞${flight.jiStarName}忌冲入`,
    });
    return markers;
  }

  const { firstFlight, secondFlight } = relation;
  markers.set(firstFlight.sourcePalace.palace_code, {
    role: "entangled",
    label: "纠缠忌",
    detail: `飞${firstFlight.jiStarName}忌 → ${firstFlight.targetPalace.palace_name}；又被对宫飞忌冲回`,
  });
  markers.set(secondFlight.sourcePalace.palace_code, {
    role: "entangled",
    label: "纠缠忌",
    detail: `飞${secondFlight.jiStarName}忌 → ${secondFlight.targetPalace.palace_name}；又被对宫飞忌冲回`,
  });
  return markers;
}

function getJiMarkerBadgeClass(role: JiPalaceRole) {
  const base = "rounded-md px-1.5 py-0.5 text-[9px] font-medium";
  if (role === "natal-origin") {
    return `${base} bg-[#8f2727] text-white`;
  }
  if (role === "shot-origin") {
    return `${base} bg-[#d89b45]/25 text-[#81521a]`;
  }
  if (role === "entangled") {
    return `${base} bg-[#6f2942] text-white`;
  }
  return `${base} bg-[#b96352] text-white`;
}

function getJiMarkerDetailClass(role: JiPalaceRole) {
  if (role === "shot-origin") {
    return "border-[#d6a660] text-[#81521a]";
  }
  if (role === "entangled") {
    return "border-[#9d5870] text-[#6f2942]";
  }
  return "border-[#c98578] text-[#8f2727]";
}

function getJiRelationTitle(relation: JiOppositionRelation) {
  if (relation.type === "natal") {
    return `${relation.jiStarName}化忌坐${relation.seatedPalace.palace_name} → 冲${relation.impactedPalace.palace_name}`;
  }
  if (relation.type === "shot") {
    return `${relation.flight.sourcePalace.palace_name}飞${relation.flight.jiStarName}忌 → ${relation.flight.targetPalace.palace_name}`;
  }
  return `${relation.firstFlight.sourcePalace.palace_name} ↔ ${relation.firstFlight.targetPalace.palace_name}`;
}

function getJiRelationSubtitle(relation: JiOppositionRelation) {
  if (relation.type === "natal") {
    return "本宫有先天忌，对宫承受震荡";
  }
  if (relation.type === "shot") {
    return `宫干 ${relation.flight.sourcePalace.heavenly_stem} 主动投射到自己的对宫`;
  }
  return `${relation.firstFlight.jiStarName}忌去 · ${relation.secondFlight.jiStarName}忌回，双向循环`;
}

function getJiTypeLabel(type: JiOppositionRelation["type"]) {
  if (type === "natal") return "生年忌冲";
  if (type === "shot") return "射出忌";
  return "纠缠忌 · 双向";
}

function getJiTypePillClass(type: JiOppositionRelation["type"]) {
  const base = "inline-flex rounded-full px-2.5 py-1 text-[9px] font-semibold";
  if (type === "natal") return `${base} bg-[#8f2727] text-white`;
  if (type === "shot") return `${base} bg-[#f0d8a9] text-[#754914]`;
  return `${base} bg-[#6f2942] text-white`;
}

function getJiDirectionLabel(relation: JiOppositionRelation) {
  if (relation.type === "natal") {
    return `${relation.jiStarName}化忌坐守 → 冲照`;
  }
  if (relation.type === "shot") {
    return `宫干飞 ${relation.flight.jiStarName}忌 →`;
  }
  return "← 双方互飞化忌 →";
}

function getJiDirectionCardCopy(
  relation: JiOppositionRelation,
  position: "first" | "second",
) {
  if (relation.type === "natal") {
    return position === "first"
      ? { role: "问题发生地", mechanism: `生年${relation.jiStarName}化忌先天坐在这里，本宫先受伤、劳心与内耗。`, toneClass: "border-[#c98578] bg-[#fff0ec]" }
      : { role: "被冲宫", mechanism: `承受${relation.seatedPalace.palace_name}的忌冲，表现为震荡、牵连与压力投射。`, toneClass: "border-[#ddb08c] bg-[#fff8ef]" };
  }
  if (relation.type === "shot") {
    return position === "first"
      ? { role: "力量来源", mechanism: `本宫宫干${relation.flight.sourcePalace.heavenly_stem}主动飞出${relation.flight.jiStarName}忌，源头偏向本宫的顾虑、执念或耗散。`, toneClass: "border-[#d6a660] bg-[#fff8e9]" }
      : { role: "被冲宫", mechanism: "化忌飞入本宫；本宫是对面的承压位置，现实事项容易被打击或受阻。", toneClass: "border-[#c98578] bg-[#fff1ed]" };
  }

  const flight = position === "first" ? relation.firstFlight : relation.secondFlight;
  return {
    role: "既是源头，也被冲",
    mechanism: `本宫飞${flight.jiStarName}忌到对宫，同时又承受对宫飞忌冲回，形成反复循环。`,
    toneClass: "border-[#9d5870] bg-[#fff2f6]",
  };
}

const PALACE_MEANINGS: Record<string, string> = {
  命宫: "自我认同、个人状态、选择与行动方式",
  兄弟: "手足同辈、内部协作、现金周转与资源支持",
  夫妻: "婚姻伴侣、亲密关系、合作与相处模式",
  子女: "子女晚辈、作品成果、情欲表达与培养投入",
  财帛: "收入求财、金钱往来、价值感与资源配置",
  疾厄: "身体健康、情绪反应、生活习惯与隐性压力",
  遷移: "外出异地、社会环境、陌生人际与外界评价",
  迁移: "外出异地、社会环境、陌生人际与外界评价",
  交友: "朋友同事、合作圈层、部属与外部协作",
  事業: "事业工作、职责表现、职场评价与发展计划",
  事业: "事业工作、职责表现、职场评价与发展计划",
  官禄: "事业工作、职责表现、职场评价与发展计划",
  田宅: "家庭居所、不动产、家族关系与单位环境",
  福德: "精神状态、内在福气、休息享受与情绪安定",
  父母: "父母长辈、上级制度、文书证件与庇护关系",
};

function getPalaceMeaning(palace: ChartPalaceRecord) {
  return PALACE_MEANINGS[palace.palace_name] ?? `${palace.palace_name}所代表的人事与现实领域`;
}

function getJiRealityMeaning(relation: JiOppositionRelation) {
  if (relation.type === "natal") {
    return `${relation.seatedPalace.palace_name}是问题发生地，重点观察${getPalaceMeaning(relation.seatedPalace)}中的劳心、反复与内耗；压力会进一步投射到${relation.impactedPalace.palace_name}，使${getPalaceMeaning(relation.impactedPalace)}承受震荡。不是单断某件凶事，而是两宫长期容易互相牵动。`;
  }
  if (relation.type === "shot") {
    return `力量由${relation.flight.sourcePalace.palace_name}主动发出。源头多在${getPalaceMeaning(relation.flight.sourcePalace)}上的顾虑、执念或自我设限，并投射到${relation.flight.targetPalace.palace_name}，令${getPalaceMeaning(relation.flight.targetPalace)}受阻。判断时先找源头，不宜把问题全部归因于外界。`;
  }
  return `${relation.firstFlight.sourcePalace.palace_name}与${relation.firstFlight.targetPalace.palace_name}双向互飞化忌：处理${getPalaceMeaning(relation.firstFlight.sourcePalace)}时会牵伤${getPalaceMeaning(relation.firstFlight.targetPalace)}；反过来亦然。常见“顾此失彼、反复拉扯、跳不出循环”的结构。`;
}

function PalaceInterpretationPopover({
  palace,
  borrowedStarSourcePalace,
  hits,
  position,
  onClose,
}: {
  palace: ChartPalaceRecord;
  borrowedStarSourcePalace?: ChartPalaceRecord;
  hits: PalaceInterpretationHit[];
  position: InterpretationPopoverState;
  onClose: () => void;
}) {
  const nativeHits = hits.filter((hit) => hit.sourceType !== "borrowed_opposite");
  const borrowedHits = hits.filter((hit) => hit.sourceType === "borrowed_opposite");

  return (
    <div
      role="dialog"
      aria-label={`${palace.palace_name}命中文案`}
      style={{
        left: position.x,
        top: position.y,
        width: "min(420px, calc(100vw - 24px))",
        height: "min(620px, calc(100dvh - 24px))",
      }}
      className="fixed z-[90] flex flex-col overflow-hidden rounded-[1.4rem] border border-[#c9b18d] bg-[#fffaf0] shadow-[0_24px_70px_rgba(56,38,18,0.26)]"
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="shrink-0 flex items-start justify-between gap-3 border-b border-[#e0cfb2] bg-[#f5ead8] px-4 py-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#9b7f52]">双击命中文案</p>
          <h3 className="mt-1 font-serif text-lg text-[#2f1b0d]">
            {palace.palace_name} · {palace.heavenly_stem}{palace.earthly_branch}
          </h3>
          {borrowedStarSourcePalace ? (
            <p className="mt-1 text-xs text-[#7b5d39]">
              空宫借对宫：{borrowedStarSourcePalace.palace_name} · {borrowedStarSourcePalace.heavenly_stem}
              {borrowedStarSourcePalace.earthly_branch}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-[#d8c5a7] bg-white/80 px-2.5 py-1 text-xs text-[#6e5840] transition hover:border-[#7e2c2c] hover:text-[#7e2c2c]"
        >
          关闭
        </button>
      </div>

      <div
        className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-4 pb-12 pt-3 [-webkit-overflow-scrolling:touch]"
        onWheel={(event) => event.stopPropagation()}
        onTouchMove={(event) => event.stopPropagation()}
      >
        {hits.length > 0 ? (
          <div className="space-y-5">
            {nativeHits.length > 0 ? (
              <InterpretationHitSection
                title={borrowedStarSourcePalace ? "本宫原有辅杂曜命中" : "本宫星曜命中"}
                hits={nativeHits}
              />
            ) : null}
            {borrowedHits.length > 0 ? (
              <InterpretationHitSection
                title={`空宫借对宫星系命中 · ${borrowedStarSourcePalace?.palace_name ?? "对宫"}`}
                description="中州派看空宫时不抹掉本宫原有星曜，这里把对宫星系另列为借入参考。"
                hits={borrowedHits}
              />
            ) : null}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#d8c5a7] bg-white/60 p-4 text-sm leading-6 text-[#6e5840]">
            当前宫位的主星、辅星、杂星暂未命中文案。后续可以继续补充该宫位或星曜条目。
          </div>
        )}
      </div>
    </div>
  );
}

function InterpretationHitSection({
  title,
  description,
  hits,
}: {
  title: string;
  description?: string;
  hits: PalaceInterpretationHit[];
}) {
  const groupedHits = groupInterpretationHits(hits);

  return (
    <section className="space-y-3">
      <div className="rounded-2xl border border-[#e2cfaf] bg-white/65 px-3 py-2">
        <p className="text-xs font-medium text-[#6e4422]">{title}</p>
        {description ? <p className="mt-1 text-xs leading-5 text-[#6e5840]">{description}</p> : null}
      </div>

      {(["major", "minor", "misc"] as PalaceInterpretationCategory[]).map((category) => {
        const categoryHits = groupedHits.get(category) ?? [];
        if (categoryHits.length === 0) {
          return null;
        }

        return (
          <div key={category} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="h-px flex-1 bg-[#dec8a5]" />
              <span className="rounded-full bg-[#efe1ca] px-3 py-1 text-xs font-medium text-[#6f5030]">
                {INTERPRETATION_CATEGORY_LABELS[category]}
              </span>
              <span className="h-px flex-1 bg-[#dec8a5]" />
            </div>

            {categoryHits.map((hit, index) => (
              <article
                key={`${hit.category}-${hit.title}-${hit.sourceType ?? "native"}-${index}`}
                className="rounded-2xl border border-[#e2cfaf] bg-white/75 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-serif text-base text-[#3a2413]">{hit.title}</h4>
                  <span className="rounded-full bg-[#f4ead8] px-2 py-0.5 text-[10px] text-[#7b5d39]">
                    命中：{dedupeText(hit.matchedStars).join("、")}
                  </span>
                  {hit.sourceType === "borrowed_opposite" ? (
                    <span className="rounded-full bg-[#e7f0dd] px-2 py-0.5 text-[10px] text-[#4e6b2d]">
                      借：{hit.sourcePalaceName ?? "对宫"}
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 space-y-1.5 text-xs leading-5 text-[#4c3825]">
                  {hit.content.map((line, lineIndex) => (
                    <p key={`${hit.title}-${lineIndex}`}>{line}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        );
      })}
    </section>
  );
}

function groupInterpretationHits(hits: PalaceInterpretationHit[]) {
  return hits.reduce((groups, hit) => {
    const current = groups.get(hit.category) ?? [];
    current.push(hit);
    groups.set(hit.category, current);
    return groups;
  }, new Map<PalaceInterpretationCategory, PalaceInterpretationHit[]>());
}

function dedupeInterpretationHits(hits: PalaceInterpretationHit[]) {
  const seen = new Set<string>();
  return hits.filter((hit) => {
    const key = [
      hit.sourceType ?? "native",
      hit.category,
      hit.title,
      hit.matchedStars.map((star) => star.trim()).sort().join("|"),
    ].join("::");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function getBorrowedStarSourcePalace(
  palaces: ChartPalaceRecord[],
  palace: ChartPalaceRecord | undefined,
) {
  if (!palace || palace.major_stars_summary.length > 0) {
    return undefined;
  }

  const palaceIndex = palaces.findIndex((item) => item.palace_code === palace.palace_code);
  if (palaceIndex < 0) {
    return undefined;
  }

  return palaces[(palaceIndex + 6) % palaces.length];
}

function getAdaptivePopoverPosition(clientX: number, clientY: number) {
  const margin = 12;
  const width = Math.min(420, window.innerWidth - margin * 2);
  const height = Math.min(620, window.innerHeight - margin * 2);

  return {
    x: Math.min(Math.max(clientX + margin, margin), window.innerWidth - width - margin),
    y: Math.min(Math.max(clientY + margin, margin), window.innerHeight - height - margin),
  };
}

function dedupeText(items: string[]) {
  return [...new Set(items)];
}

function getStarTextClass(starName: string, tone: "major" | "minor" | "misc") {
  const sizeClass =
    tone === "major"
      ? "text-[13px] font-semibold md:text-[14px] xl:text-[15px]"
      : tone === "minor"
        ? "text-[12px] md:text-[13px] xl:text-[14px]"
        : "text-[11px] md:text-[12px] xl:text-[13px]";

  if (tone === "misc") {
    return `${sizeClass} text-[#235f8d]`;
  }

  if (MALEFIC_STARS.has(starName)) {
    return `${sizeClass} text-[#111827]`;
  }

  if (AUSPICIOUS_STARS.has(starName)) {
    return `${sizeClass} text-[#7b2cbf]`;
  }

  if (tone === "major") {
    return `${sizeClass} text-[#7e2c2c]`;
  }

  if (tone === "minor") {
    return `${sizeClass} text-[#235f8d]`;
  }

  return `${sizeClass} text-[#235f8d]`;
}

function DecadeStrip({
  palaces,
  selectedPalaceCode,
}: {
  palaces: ChartPalaceRecord[];
  selectedPalaceCode: string;
}) {
  const items = palaces
    .map((palace) => ({
      palace,
      ageRange: readAgeRangeFromSnapshot(palace.palace_snapshot_json),
      ageStart: readAgeStart(palace.palace_snapshot_json),
    }))
    .sort((a, b) => a.ageStart - b.ageStart);

  return (
    <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-[#d8c5a7] bg-[#f6edde] px-2 py-2 md:px-3 md:py-3">
      <div className="grid grid-cols-4 gap-2 md:grid-cols-6 xl:grid-cols-12">
        {items.map(({ palace, ageRange }) => (
          <div
            key={palace.id}
            className={`rounded-2xl border px-2 py-2 text-center ${
              palace.palace_code === selectedPalaceCode
                ? "border-[#7e2c2c] bg-[#fff4f1]"
                : "border-[#ddceb6] bg-white/80"
            }`}
          >
            <p className="font-serif text-sm text-[#2f1b0d] xl:text-base">{palace.palace_name}</p>
            <p className="mt-1 text-[10px] text-[#7f6545] xl:text-xs">{ageRange || "年龄段待补"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start gap-1.5">
      <span className="min-w-8 shrink-0 text-[#9b7f52]">{label}</span>
      <span className="min-w-0 break-all text-[#3d2a1b]">{value}</span>
    </div>
  );
}

function BoardBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-[#d8c6a8] bg-[#fbf6ec] px-3 py-1">
      {label}
    </span>
  );
}

function buildPalaceCardClass({
  isSelected,
  isHighlighted,
  jiRole,
}: {
  isSelected: boolean;
  isHighlighted: boolean;
  jiRole?: JiPalaceRole;
}) {
  const baseClass = "touch-manipulation select-none overflow-hidden rounded-[1.35rem] p-2 transition md:p-2.5 xl:p-3 2xl:p-2.5";

  if (jiRole === "entangled") {
    return `${baseClass} border-2 border-[#6f2942] bg-[#fff2f6] shadow-[0_8px_28px_rgba(111,41,66,0.2)]`;
  }

  if (jiRole === "natal-origin") {
    return `${baseClass} border-2 border-[#8f2727] bg-[#fff0ec] shadow-[0_8px_28px_rgba(143,39,39,0.2)]`;
  }

  if (jiRole === "shot-origin") {
    return `${baseClass} border-2 border-[#c98b34] bg-[#fff8e9] shadow-[0_8px_26px_rgba(185,121,34,0.16)]`;
  }

  if (jiRole === "impacted") {
    return `${baseClass} border-2 border-dashed border-[#b96352] bg-[#fff4ef] shadow-[0_8px_26px_rgba(143,39,39,0.14)]`;
  }

  if (isSelected) {
    return `${baseClass} border border-[#7e2c2c] bg-[#fff7f3] shadow-[0_8px_28px_rgba(126,44,44,0.16)]`;
  }

  if (isHighlighted) {
    return `${baseClass} border border-[#a88a5e] bg-[#fffaf0] shadow-[0_6px_24px_rgba(92,68,28,0.12)]`;
  }

  return `${baseClass} border border-[#d8c8ae] bg-[#f9f3e8] hover:border-[#b99a6b] hover:bg-[#fffaf1]`;
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
    const candidate =
      [record.displayName, record.formalName, record.name].find(
        (item) => typeof item === "string" && item.trim().length > 0,
      ) ?? "";

    if (typeof candidate === "string" && candidate) {
      return candidate;
    }

    if (typeof record.toString === "function") {
      const text = record.toString();
      return text === "[object Object]" ? "" : text;
    }
  }

  return "";
}

function readAgeRangeFromSnapshot(snapshot: Record<string, unknown>) {
  const ageRange = snapshot.ageRange;
  if (typeof ageRange === "string" && ageRange) {
    return ageRange;
  }

  if (Array.isArray(ageRange) && ageRange.length >= 2) {
    return `${String(ageRange[0])}-${String(ageRange[1])}`;
  }

  if (
    ageRange &&
    typeof ageRange === "object" &&
    "start" in ageRange &&
    "end" in ageRange
  ) {
    const range = ageRange as { start?: unknown; end?: unknown };
    if (range.start !== undefined && range.end !== undefined) {
      return `${String(range.start)}-${String(range.end)}`;
    }
  }

  if (snapshot.ageStart !== undefined && snapshot.ageEnd !== undefined) {
    return `${String(snapshot.ageStart)}-${String(snapshot.ageEnd)}`;
  }

  return "";
}

function readStarBrightness(snapshot: Record<string, unknown>) {
  const value = snapshot.starBrightness;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, string>;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string" && Boolean(entry[1])),
  );
}

function readAgeStart(snapshot: Record<string, unknown>) {
  if (typeof snapshot.ageStart === "number") {
    return snapshot.ageStart;
  }

  const ageRange = readAgeRangeFromSnapshot(snapshot);
  const match = ageRange.match(/^(\d+)/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function isJiDerivative(derivative: string) {
  return derivative === "忌" || derivative === "化忌" || derivative.toUpperCase() === "PROBLEM";
}

function readTransformEntries(snapshot: Record<string, unknown>): TransformEntry[] {
  const value = snapshot.bornStarDerivativeMap;
  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.entries(value as Record<string, unknown>)
    .map(([derivative, starName]) => ({
      derivative,
      starName: typeof starName === "string" ? starName : readName(starName),
    }))
    .filter((item) => item.derivative && item.starName);
}

function findPalaceTransforms(palace: ChartPalaceRecord, entries: TransformEntry[]) {
  const stars = new Set([
    ...palace.major_stars_summary,
    ...palace.minor_stars_summary,
    ...palace.sha_stars_summary,
  ]);

  return entries.filter((entry) => stars.has(entry.starName));
}

function getHighlightedPalaces(
  palaces: ChartPalaceRecord[],
  selectedPalaceCode: string | undefined,
  transformEntries: TransformEntry[],
) {
  const map = new Map<string, string>();
  const selectedIndex = palaces.findIndex((item) => item.palace_code === selectedPalaceCode);

  if (selectedIndex >= 0 && selectedPalaceCode) {
    map.set(selectedPalaceCode, "本宫");
  }

  if (selectedIndex >= 0) {
    const opposite = palaces[(selectedIndex + 6) % palaces.length];
    const triadA = palaces[(selectedIndex + 4) % palaces.length];
    const triadB = palaces[(selectedIndex + 8) % palaces.length];

    if (opposite) {
      map.set(opposite.palace_code, "对宫");
    }
    if (triadA) {
      map.set(triadA.palace_code, "三合");
    }
    if (triadB) {
      map.set(triadB.palace_code, "三合");
    }
  }

  palaces.forEach((palace) => {
    const transforms = findPalaceTransforms(palace, transformEntries);
    if (transforms.length > 0 && !map.has(palace.palace_code)) {
      map.set(
        palace.palace_code,
        transforms.map((item) => item.derivative).join(""),
      );
    }
  });

  return map;
}

function getDefaultTriangleLines(
  palaces: ChartPalaceRecord[],
  basePalaceCode: string | undefined,
): ConnectionLine[] {
  const baseIndex = palaces.findIndex((item) => item.palace_code === basePalaceCode);
  if (baseIndex < 0) {
    return [];
  }

  const basePalace = palaces[baseIndex];
  const opposite = palaces[(baseIndex + 6) % palaces.length];
  const triadA = palaces[(baseIndex + 4) % palaces.length];
  const triadB = palaces[(baseIndex + 8) % palaces.length];
  const baseBounds = getPalaceBounds(basePalace);

  if (!baseBounds) {
    return [];
  }

  return [
    { palace: opposite, tone: "opposite" as const },
    { palace: triadA, tone: "triangle" as const },
    { palace: triadB, tone: "triangle" as const },
  ].flatMap((item) => {
    const targetBounds = getPalaceBounds(item.palace);
    const connectionPoints = targetBounds ? getCornerConnectionPoints(baseBounds, targetBounds) : null;
    return connectionPoints
      ? [
          {
            from: connectionPoints.from,
            to: connectionPoints.to,
            tone: item.tone,
          },
        ]
      : [];
  });
}

function getPalaceBounds(palace: ChartPalaceRecord | undefined): PalaceBounds | null {
  if (!palace) {
    return null;
  }

  const gridArea = BRANCH_GRID_AREAS[palace.earthly_branch];
  if (!gridArea) {
    return null;
  }

  const match = gridArea.match(/^(\d+) \/ (\d+) \/ (\d+) \/ (\d+)$/);
  if (!match) {
    return null;
  }

  const rowStart = Number(match[1]);
  const columnStart = Number(match[2]);

  return {
    left: columnStart - 1,
    right: columnStart,
    top: rowStart - 1,
    bottom: rowStart,
    centerX: columnStart - 0.5,
    centerY: rowStart - 0.5,
  };
}

function getCornerConnectionPoints(from: PalaceBounds, to: PalaceBounds) {
  return {
    from: getInnerAnchorPoint(from),
    to: getInnerAnchorPoint(to),
  };
}

function getInnerAnchorPoint(bounds: PalaceBounds) {
  const isLeftEdge = bounds.left === 0;
  const isRightEdge = bounds.right === 4;
  const isTopEdge = bounds.top === 0;
  const isBottomEdge = bounds.bottom === 4;
  const isCorner = (isLeftEdge || isRightEdge) && (isTopEdge || isBottomEdge);

  if (!isCorner) {
    if (isLeftEdge) {
      return { x: bounds.right, y: bounds.centerY };
    }
    if (isRightEdge) {
      return { x: bounds.left, y: bounds.centerY };
    }
    if (isTopEdge) {
      return { x: bounds.centerX, y: bounds.bottom };
    }
    if (isBottomEdge) {
      return { x: bounds.centerX, y: bounds.top };
    }
  }

  return {
    x: bounds.centerX < BOARD_CENTER.x ? bounds.right : bounds.left,
    y: bounds.centerY < BOARD_CENTER.y ? bounds.bottom : bounds.top,
  };
}

function normalizeNatalPalaces(palaces: ChartPalaceRecord[]) {
  const bodyPalaces = palaces.filter(
    (palace) => palace.palace_code === "body" || palace.palace_name === "身宫",
  );
  const natalPalaces = palaces
    .filter((palace) => palace.palace_code !== "body" && palace.palace_name !== "身宫")
    .map((palace) => {
      const matchingBodyPalace = bodyPalaces.find(
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

  return natalPalaces.sort((a, b) => a.display_order - b.display_order);
}
