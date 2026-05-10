import { useEffect, useRef, useState } from "react";
import type { MouseEvent, PointerEvent } from "react";
import type {
  ChartPalaceRecord,
  ChartRecord,
  PalaceInterpretationCategory,
  PalaceInterpretationHit,
} from "@/types";
import { getBirthCalendarLabel } from "@/features/charts/lib/birthDisplay";
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
  tone: "opposite" | "triangle";
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
  const [interpretationPopover, setInterpretationPopover] = useState<InterpretationPopoverState | null>(null);
  const lastTouchTapRef = useRef<{ palaceCode: string; time: number; x: number; y: number } | null>(null);
  const activeInterpretationPalace = interpretationPopover
    ? orderedPalaces.find((palace) => palace.palace_code === interpretationPopover.palaceCode)
    : undefined;
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

    palaceInterpretationService
      .getHitsForPalace(activeInterpretationPalace)
      .then((hits) => {
        if (isActive) {
          setInterpretationHits(hits);
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
  }, [activeInterpretationPalace?.id]);

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
    <div className="overflow-hidden rounded-[2rem] border border-[#d4c4a8] bg-[#efe5d3] p-3 shadow-panel md:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#8b6b3c]">Professional Board</p>
          <h2 className="mt-1 font-serif text-2xl text-[#3a2413]">本命盘</h2>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-[#6e5840]">
          <BoardBadge label={`命宫 ${chart.life_palace_branch || "-"}`} />
          <BoardBadge label={`身宫 ${chart.body_palace_branch || "-"}`} />
          <BoardBadge label={`命主 ${chart.life_master_star || "-"}`} />
          <BoardBadge label={`身主 ${chart.body_master_star || "-"}`} />
        </div>
      </div>

      <div className="pb-2">
        <div className="mx-auto w-full max-w-[1180px]">
          <div
            className="relative grid aspect-square w-full grid-cols-4 grid-rows-4 gap-1.5 md:gap-2 xl:gap-3"
            style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
          >
            <TriangleConnectionLayer lines={defaultTriangleLines} />

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
                })}
              >
                <PalaceFace
                  palace={palace}
                  selected={palace.palace_code === selectedPalace?.palace_code}
                  transforms={findPalaceTransforms(palace, transformEntries)}
                  showTransforms
                  relationLabel={highlightedPalaces.get(palace.palace_code)}
                />
              </button>
            ))}

            <div
              style={{ gridArea: "2 / 2 / 4 / 4" }}
              className="relative overflow-hidden rounded-[1.4rem] border border-[#d8cab1] bg-[linear-gradient(145deg,#fffaf1_0%,#f4ead7_55%,#ecdfc6_100%)] p-2.5 md:rounded-[1.55rem] md:p-3 xl:rounded-[1.75rem] xl:p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
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
                      <p>{chart.gender === "male" ? "阳男" : "阴女"}</p>
                      <p className="mt-1">{chart.five_element_class || "五行局待补"}</p>
                    </div>
                  </div>

                  <div className="mt-2 grid gap-x-2 gap-y-1 text-[10px] text-[#4f3929] md:mt-3 md:gap-y-1.5 md:text-[11px] md:grid-cols-2">
                    <SummaryLine label={getBirthCalendarLabel(chart.birth_calendar_type)} value={`${chart.birth_date} ${chart.birth_time}`} />
                    <SummaryLine label="时区" value={chart.birth_timezone} />
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

      {interpretationPopover && activeInterpretationPalace ? (
        <PalaceInterpretationPopover
          palace={activeInterpretationPalace}
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
}: {
  palace: ChartPalaceRecord;
  selected: boolean;
  transforms: TransformEntry[];
  showTransforms: boolean;
  relationLabel?: string;
}) {
  const ageRange = readAgeRangeFromSnapshot(palace.palace_snapshot_json);
  const lifeStage = readName(palace.palace_snapshot_json.lifeStage);

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
          </div>
          <p className="mt-1 text-[11px] tracking-[0.18em] text-[#856646]">
            {palace.heavenly_stem}
            {palace.earthly_branch}
          </p>
        </div>
        <div className="text-right text-[10px] leading-4 text-[#7c6243] xl:text-[11px]">
          {ageRange ? <p>{ageRange}</p> : null}
          {lifeStage ? <p>{lifeStage}</p> : null}
        </div>
      </div>

      <div className="mt-2 flex-1 min-h-0 space-y-1 text-[11px] leading-4 md:text-[12px] md:leading-[1.15rem] xl:mt-2 xl:space-y-1.5 xl:text-[13px]">
        <StarLine
          label="主"
          stars={palace.major_stars_summary}
          tone="major"
          transforms={transforms}
          emptyLabel="空宫（无十四主星）"
          showTransforms={showTransforms}
        />
        <StarLine
          label="辅"
          stars={palace.minor_stars_summary}
          tone="minor"
          transforms={transforms}
          emptyLabel="无"
          showTransforms={showTransforms}
        />
        <StarLine
          label="杂"
          stars={palace.sha_stars_summary}
          tone="misc"
          transforms={transforms}
          emptyLabel="无"
          showTransforms={showTransforms}
        />
      </div>

      {selected ? (
        <div className="mt-1.5 border-t border-[#dccdb7] pt-1.5 text-[9px] text-[#6c5336] xl:text-[10px]">
          点击右侧可直接记录该宫位批注与验证事件
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
  emptyLabel,
  showTransforms,
}: {
  label: string;
  stars: string[];
  tone: "major" | "minor" | "misc";
  transforms: TransformEntry[];
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
        {stars.map((star) => {
          const derivative = transforms.find((item) => item.starName === star)?.derivative;
          return (
            <span
              key={`${label}-${star}`}
              className={`inline-flex min-w-0 items-center gap-1 break-all ${getStarTextClass(star, tone)}`}
            >
              <span>{star}</span>
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

function TriangleConnectionLayer({ lines }: { lines: ConnectionLine[] }) {
  if (lines.length === 0) {
    return null;
  }

  return (
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
          stroke={line.tone === "opposite" ? "#7e2c2c" : "#2f7b66"}
          strokeWidth={line.tone === "opposite" ? 2 : 1.8}
          strokeDasharray={line.tone === "opposite" ? "8 6" : "7 6"}
          strokeLinecap="round"
          opacity={line.tone === "opposite" ? 0.82 : 0.72}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {lines[0] ? (
        <circle
          cx={lines[0].from.x}
          cy={lines[0].from.y}
          r={0.035}
          fill="#7e2c2c"
          opacity={0.72}
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
    </svg>
  );
}

function PalaceInterpretationPopover({
  palace,
  hits,
  position,
  onClose,
}: {
  palace: ChartPalaceRecord;
  hits: PalaceInterpretationHit[];
  position: InterpretationPopoverState;
  onClose: () => void;
}) {
  const groupedHits = groupInterpretationHits(hits);

  return (
    <div
      role="dialog"
      aria-label={`${palace.palace_name}命中文案`}
      style={{
        left: position.x,
        top: position.y,
        width: "min(420px, calc(100vw - 24px))",
        maxHeight: "min(620px, calc(100vh - 24px))",
      }}
      className="fixed z-[90] overflow-hidden rounded-[1.4rem] border border-[#c9b18d] bg-[#fffaf0] shadow-[0_24px_70px_rgba(56,38,18,0.26)]"
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="flex items-start justify-between gap-3 border-b border-[#e0cfb2] bg-[#f5ead8] px-4 py-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#9b7f52]">双击命中文案</p>
          <h3 className="mt-1 font-serif text-lg text-[#2f1b0d]">
            {palace.palace_name} · {palace.heavenly_stem}{palace.earthly_branch}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-[#d8c5a7] bg-white/80 px-2.5 py-1 text-xs text-[#6e5840] transition hover:border-[#7e2c2c] hover:text-[#7e2c2c]"
        >
          关闭
        </button>
      </div>

      <div className="max-h-[calc(100vh-100px)] overflow-y-auto px-4 py-3">
        {hits.length > 0 ? (
          <div className="space-y-4">
            {(["major", "minor", "misc"] as PalaceInterpretationCategory[]).map((category) => {
              const categoryHits = groupedHits.get(category) ?? [];
              if (categoryHits.length === 0) {
                return null;
              }

              return (
                <section key={category} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="h-px flex-1 bg-[#dec8a5]" />
                    <span className="rounded-full bg-[#efe1ca] px-3 py-1 text-xs font-medium text-[#6f5030]">
                      {INTERPRETATION_CATEGORY_LABELS[category]}
                    </span>
                    <span className="h-px flex-1 bg-[#dec8a5]" />
                  </div>

                  {categoryHits.map((hit, index) => (
                    <article
                      key={`${hit.category}-${hit.title}-${index}`}
                      className="rounded-2xl border border-[#e2cfaf] bg-white/75 p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-serif text-base text-[#3a2413]">{hit.title}</h4>
                        <span className="rounded-full bg-[#f4ead8] px-2 py-0.5 text-[10px] text-[#7b5d39]">
                          命中：{dedupeText(hit.matchedStars).join("、")}
                        </span>
                      </div>
                      <div className="mt-2 space-y-1.5 text-xs leading-5 text-[#4c3825]">
                        {hit.content.map((line, lineIndex) => (
                          <p key={`${hit.title}-${lineIndex}`}>{line}</p>
                        ))}
                      </div>
                    </article>
                  ))}
                </section>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#d8c5a7] bg-white/60 p-4 text-sm leading-6 text-[#6e5840]">
            {isParentPalaceName(palace.palace_name)
              ? "父母宫文案还在整理中，第一版先不展示。"
              : "当前宫位的主星、辅星、杂星暂未命中文案。后续可以继续补充该宫位或星曜条目。"}
          </div>
        )}
      </div>
    </div>
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

function isParentPalaceName(palaceName: string) {
  return palaceName === "父母" || palaceName === "父母宫" || palaceName === "父母宮";
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
}: {
  isSelected: boolean;
  isHighlighted: boolean;
}) {
  const baseClass = "touch-manipulation select-none overflow-hidden rounded-[1.35rem] p-2 transition md:p-2.5 xl:p-3";

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

function readAgeStart(snapshot: Record<string, unknown>) {
  if (typeof snapshot.ageStart === "number") {
    return snapshot.ageStart;
  }

  const ageRange = readAgeRangeFromSnapshot(snapshot);
  const match = ageRange.match(/^(\d+)/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
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
